const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
  },
  campaignTitle: {
    type: String,
    required: true,
  },
  contributionAmount: {
    type: Number,
    required: true,
    min: 1,
  },
  supporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  supporterEmail: {
    type: String,
    required: true,
  },
  supporterName: {
    type: String,
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
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
});

module.exports = mongoose.model('Contribution', contributionSchema);
