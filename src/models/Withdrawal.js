const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  creatorEmail: {
    type: String,
    required: true,
  },
  creatorName: {
    type: String,
    required: true,
  },
  withdrawalCredit: {
    type: Number,
    required: true,
    min: [200, 'Minimum withdrawal is 200 credits'],
  },
  withdrawalAmount: {
    type: Number,
    required: true,
  },
  paymentSystem: {
    type: String,
    required: true,
    enum: ['Stripe', 'bKash', 'Rocket', 'Nagad'],
  },
  accountNumber: {
    type: String,
    required: true,
  },
  withdrawDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
