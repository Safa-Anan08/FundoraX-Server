const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Campaign title is required'],
    trim: true,
  },
  story: {
    type: String,
    required: [true, 'Campaign story is required'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  fundingGoal: {
    type: Number,
    required: [true, 'Funding goal is required'],
    min: [1, 'Funding goal must be greater than 0'],
  },
  minContribution: {
    type: Number,
    required: [true, 'Minimum contribution is required'],
    default: 1,
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required'],
  },
  rewardInfo: {
    type: String,
    default: '',
  },
  image: {
    type: String,
    required: [true, 'Campaign image URL is required'],
  },
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
  raisedAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Campaign', campaignSchema);
