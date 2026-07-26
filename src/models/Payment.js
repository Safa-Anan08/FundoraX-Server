const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  packageTitle: {
    type: String,
    required: true,
  },
  credits: {
    type: Number,
    required: true,
  },
  amountUSD: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    default: 'Stripe',
  },
  transactionId: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['credit_purchase', 'withdrawal'],
    default: 'credit_purchase',
  },
  status: {
    type: String,
    default: 'completed',
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Payment', paymentSchema);
