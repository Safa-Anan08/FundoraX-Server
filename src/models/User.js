const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
  },
  googleId: {
    type: String,
  },
  photo: {
    type: String,
    default: 'https://i.ibb.co/MgsTCzP/default-avatar.png',
  },
  role: {
    type: String,
    enum: ['Supporter', 'Creator', 'Admin'],
    default: 'Supporter',
  },
  credits: {
    type: Number,
    default: 50, // Supporter=50, Creator=20 (set in auth controller during registration)
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
