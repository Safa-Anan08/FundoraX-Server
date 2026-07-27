const Payment = require('../models/Payment');
const User = require('../models/User');
const Contribution = require('../models/Contribution');
const Notification = require('../models/Notification');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Trusted Server-Side Package Configuration
const CREDIT_PACKAGES = {
  'Starter': { credits: 100, priceUSD: 10 },
  'Popular': { credits: 300, priceUSD: 25 },
  'Growth': { credits: 800, priceUSD: 60 },
  'Premium': { credits: 1500, priceUSD: 110 },
};

// 1. Create Stripe Payment Intent securely
exports.createPaymentIntent = async (req, res) => {
  try {
    const { packageTitle } = req.body;

    const pkg = CREDIT_PACKAGES[packageTitle];
    if (!pkg) {
      console.warn(`[Payment Warning] Invalid package requested: ${packageTitle}`);
      return res.status(400).json({ success: false, message: 'Invalid package selected' });
    }

    const { credits, priceUSD: amountUSD } = pkg;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountUSD * 100),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.id,
        userEmail: req.user.email,
        packageTitle: packageTitle,
        credits: String(credits),
        amountUSD: String(amountUSD),
      },
    });

    console.log(`[PaymentIntent Created] ID: ${paymentIntent.id} for User: ${req.user.email} ($${amountUSD} USD -> ${credits} Credits)`);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      packageTitle,
      credits,
      amountUSD,
    });
  } catch (error) {
    console.error('[PaymentIntent Error]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function: Process Successful Payment Idempotently
const processPaymentSuccess = async (paymentIntentId, metadata) => {
  const existingPayment = await Payment.findOne({ transactionId: paymentIntentId });
  if (existingPayment) {
    console.log(`[Payment Idempotency] Transaction ${paymentIntentId} already processed.`);
    return { success: true, payment: existingPayment, alreadyProcessed: true };
  }

  const { userId, userEmail, packageTitle, credits, amountUSD } = metadata || {};
  const creditAmount = Number(credits);

  if (!userId || !creditAmount) {
    throw new Error('Invalid metadata on PaymentIntent');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found for ID ${userId}`);
  }

  // Atomically add credits
  user.credits += creditAmount;
  await user.save();

  // Create Payment Document
  const payment = await Payment.create({
    user: user._id,
    userEmail: userEmail || user.email,
    packageTitle: packageTitle || 'Credit Top-Up',
    credits: creditAmount,
    amountUSD: Number(amountUSD || 0),
    paymentMethod: 'Stripe',
    transactionId: paymentIntentId,
    type: 'credit_purchase',
    status: 'completed',
  });

  // Create Notification Document
  try {
    await Notification.create({
      toEmail: userEmail || user.email,
      message: `Your Stripe payment was successful! Added ${creditAmount} credits for $${amountUSD}.`,
      actionRoute: '/dashboard/payment-history',
    });
  } catch (notifErr) {
    console.warn('[Notification Warning]', notifErr.message);
  }

  console.log(`[DB Insert & Credit Update] Added ${creditAmount} credits to ${user.email} (TXN: ${paymentIntentId}). New Balance: ${user.credits}`);
  return { success: true, payment, user };
};

// 2. Webhook Handler
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook Signature Error]', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    try {
      await processPaymentSuccess(paymentIntent.id, paymentIntent.metadata);
    } catch (err) {
      console.error('[Webhook Processing Error]', err.message);
      return res.status(500).json({ error: 'Database processing failed' });
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    console.log(`[Webhook Event] Payment Intent failed: ${event.data.object.id}`);
  }

  res.json({ received: true });
};

// 3. Confirm Credit Purchase (Frontend sync handler)
exports.confirmCreditPurchase = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'Payment Intent ID required' });
    }

    let existingPayment = await Payment.findOne({ transactionId: paymentIntentId });
    if (existingPayment) {
      const user = await User.findById(req.user.id);
      return res.json({
        success: true,
        message: 'Payment successfully processed!',
        credits: user ? user.credits : 0,
        payment: existingPayment,
      });
    }

    // Retrieve from Stripe if Webhook hasn't arrived yet
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status === 'succeeded') {
      const result = await processPaymentSuccess(intent.id, intent.metadata);
      const user = await User.findById(req.user.id);
      return res.json({
        success: true,
        message: 'Payment verified and credits added successfully!',
        credits: user ? user.credits : 0,
        payment: result.payment,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Payment status is ${intent.status}. Credits not added.`,
      });
    }
  } catch (error) {
    console.error('[Confirm Credit Purchase Error]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Get User Payment History
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userEmail: req.user.email }).sort({ date: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get Supporter Credit Wallet Summary
exports.getWalletSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const payments = await Payment.find({ userEmail: user.email, type: 'credit_purchase', status: 'completed' });
    const totalPurchased = payments.reduce((acc, p) => acc + (p.credits || 0), 0);

    const contributions = await Contribution.find({ supporterEmail: user.email });
    const totalContributed = contributions
      .filter((c) => c.status !== 'rejected')
      .reduce((acc, c) => acc + (c.contributionAmount || 0), 0);

    const totalRefunded = contributions
      .filter((c) => c.status === 'rejected')
      .reduce((acc, c) => acc + (c.contributionAmount || 0), 0);

    res.json({
      success: true,
      summary: {
        availableCredits: user.credits,
        totalPurchased,
        totalContributed,
        totalRefunded,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
