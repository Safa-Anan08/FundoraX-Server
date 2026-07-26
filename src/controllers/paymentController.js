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
  'Premium': { credits: 1500, priceUSD: 110 }
};

// 1. Create Stripe Payment Intent securely
exports.createPaymentIntent = async (req, res) => {
  try {
    const { packageTitle } = req.body;
    
    // Server-side validation of package prevents malicious credit tampering
    const pkg = CREDIT_PACKAGES[packageTitle];
    if (!pkg) {
      return res.status(400).json({ success: false, message: 'Invalid package selected' });
    }

    const { credits, priceUSD: amountUSD } = pkg;

    // Create a PaymentIntent with the exact amount in cents
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountUSD * 100),
      currency: 'usd',
      // Automatic payment methods let Stripe handle card/apple pay etc
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.id,
        userEmail: req.user.email,
        packageTitle: packageTitle,
        credits: String(credits),
        amountUSD: String(amountUSD)
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      packageTitle,
      credits,
      amountUSD,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Webhook: The ONLY source of truth for adding credits safely
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    // We expect the raw body buffer here, provided by express.raw() in server.js
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook Error] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotently handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Extract our securely injected metadata
    const { userId, userEmail, packageTitle, credits, amountUSD } = paymentIntent.metadata;
    const creditAmount = Number(credits);
    const transactionId = paymentIntent.id; // Reliable unique Stripe ID

    try {
      // 1. Idempotency Check: Don't process the same payment twice
      const existingPayment = await Payment.findOne({ transactionId });
      if (existingPayment) {
        console.log(`[Webhook Idempotency] Payment ${transactionId} already processed.`);
        return res.json({ received: true });
      }

      // 2. Retrieve user
      const user = await User.findById(userId);
      if (!user) {
        console.error(`[Webhook Error] User not found: ${userId}`);
        return res.status(404).json({ error: 'User not found' });
      }

      // 3. Atomically add credits
      user.credits += creditAmount;
      await user.save();

      // 4. Save Payment Record
      await Payment.create({
        user: user._id,
        userEmail: userEmail,
        packageTitle: packageTitle,
        credits: creditAmount,
        amountUSD: Number(amountUSD),
        paymentMethod: 'Stripe',
        transactionId: transactionId,
        type: 'credit_purchase',
        status: 'completed',
      });

      // 5. Notify the user securely
      try {
        await Notification.create({
          toEmail: userEmail,
          message: `Your Stripe payment was successful! Added ${creditAmount} credits for $${amountUSD}.`,
          actionRoute: '/dashboard/payment-history',
        });
      } catch (notifErr) {
        console.warn('[Webhook Notification Error]', notifErr.message);
      }

      console.log(`[Webhook Success] Added ${creditAmount} credits to ${userEmail} (TXN: ${transactionId})`);
    } catch (err) {
      console.error('[Webhook Processing Error]', err);
      return res.status(500).json({ error: 'Database processing failed' });
    }
  } else if (event.type === 'payment_intent.payment_failed') {
     console.log(`[Webhook Info] Payment Intent failed: ${event.data.object.id}`);
     // Optionally log failed payment record to database, but DO NOT add credits.
  } else if (event.type === 'payment_intent.canceled') {
     console.log(`[Webhook Info] Payment Intent canceled: ${event.data.object.id}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
};

// 3. Confirm Credit Purchase (Frontend fallback/polling handler)
// We keep this endpoint so the frontend can check if the credit was successfully added
// without relying purely on WebSockets. It will not add credits itself anymore.
exports.confirmCreditPurchase = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'Payment Intent ID required' });
    }

    // Check if the webhook already processed it
    const existingPayment = await Payment.findOne({ transactionId: paymentIntentId });
    if (existingPayment) {
      const user = await User.findById(req.user.id);
      return res.json({
        success: true,
        message: 'Payment successfully processed!',
        credits: user.credits,
        payment: existingPayment,
      });
    }

    // If it hasn't processed, retrieve from Stripe to check status
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (intent.status === 'succeeded') {
       // Wait a moment in case webhook is slightly behind
       return res.json({ 
         success: true, 
         message: 'Payment succeeded, verifying via webhook...',
         pendingWebhook: true
       });
    } else {
       return res.status(400).json({ 
         success: false, 
         message: `Payment status is ${intent.status}. Credits not added.` 
       });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get User Payment History
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userEmail: req.user.email }).sort({ date: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Supporter Credit Wallet Summary
exports.getWalletSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Aggregate total credits purchased
    const payments = await Payment.find({ userEmail: user.email, type: 'credit_purchase', status: 'completed' });
    const totalPurchased = payments.reduce((acc, p) => acc + (p.credits || 0), 0);

    // Aggregate total credits contributed
    const contributions = await Contribution.find({ supporterEmail: user.email });
    const totalContributed = contributions
      .filter((c) => c.status !== 'rejected')
      .reduce((acc, c) => acc + (c.contributionAmount || 0), 0);

    // Aggregate total credits refunded
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
