const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

// Request Withdrawal (Creator)
exports.requestWithdrawal = async (req, res) => {
  try {
    const { withdrawalCredit, paymentSystem, accountNumber } = req.body;
    const credits = Number(withdrawalCredit);

    if (!credits || credits < 200) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient credit. Minimum withdrawal is 200 credits.',
      });
    }

    if (!paymentSystem || !accountNumber) {
      return res.status(400).json({ success: false, message: 'Payment system and account number are required' });
    }

    const creatorUser = await User.findById(req.user.id);
    if (!creatorUser) {
      return res.status(404).json({ success: false, message: 'Creator user not found' });
    }

    if (creatorUser.credits < credits) {
      return res.status(400).json({
        success: false,
        message: `Insufficient credit. You requested ${credits} credits, but only have ${creatorUser.credits} available.`,
      });
    }

    // Rate: 20 credits = $1 USD
    const withdrawalAmount = credits / 20;

    const withdrawal = await Withdrawal.create({
      creator: creatorUser._id,
      creatorEmail: creatorUser.email,
      creatorName: creatorUser.name,
      withdrawalCredit: credits,
      withdrawalAmount,
      paymentSystem,
      accountNumber,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully. Pending Admin payout approval.',
      withdrawal,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Creator Withdrawals History
exports.getCreatorWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ creatorEmail: req.user.email }).sort({ withdrawDate: -1 });
    res.json({ success: true, count: withdrawals.length, withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get All Pending Withdrawal Requests
exports.getAdminWithdrawalRequests = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().sort({ withdrawDate: -1 });
    res.json({ success: true, count: withdrawals.length, withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Payout Success / Approve Withdrawal
exports.approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Withdrawal request is already ${withdrawal.status}` });
    }

    const creatorUser = await User.findOne({ email: withdrawal.creatorEmail });
    if (creatorUser) {
      // Deduct requested credits from creator user
      creatorUser.credits = Math.max(0, creatorUser.credits - withdrawal.withdrawalCredit);
      await creatorUser.save();
    }

    withdrawal.status = 'approved';
    await withdrawal.save();

    // Create payment history record for creator
    await Payment.create({
      user: withdrawal.creator,
      userEmail: withdrawal.creatorEmail,
      packageTitle: `Withdrawal Payout (${withdrawal.withdrawalCredit} Credits)`,
      credits: withdrawal.withdrawalCredit,
      amountUSD: withdrawal.withdrawalAmount,
      paymentMethod: withdrawal.paymentSystem,
      transactionId: 'WD_PAY_' + Date.now(),
      type: 'withdrawal',
      status: 'completed',
    });

    // Notify creator
    await Notification.create({
      toEmail: withdrawal.creatorEmail,
      message: `Your withdrawal request of ${withdrawal.withdrawalCredit} credits ($${withdrawal.withdrawalAmount} USD) via ${withdrawal.paymentSystem} has been PAID!`,
      actionRoute: '/dashboard/creator-withdrawals',
    });

    res.json({ success: true, message: 'Withdrawal payout processed successfully', withdrawal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
