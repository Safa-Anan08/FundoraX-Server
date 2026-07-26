const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  toEmail: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  actionRoute: {
    type: String,
    default: '/dashboard',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  time: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
