const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Payment = require('../models/Payment');

// Admin: Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Update User Role
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['Supporter', 'Creator', 'Admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ success: true, message: `User role updated to ${role}`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Delete User
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Dashboard Overview Statistics
exports.getAdminStats = async (req, res) => {
  try {
    const totalSupporters = await User.countDocuments({ role: 'Supporter' });
    const totalCreators = await User.countDocuments({ role: 'Creator' });

    const users = await User.find();
    const totalAvailableCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);

    const payments = await Payment.find({ type: 'credit_purchase', status: 'completed' });
    const totalPaymentsProcessed = payments.reduce((sum, p) => sum + (p.amountUSD || 0), 0);

    const pendingCampaignsCount = await Campaign.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      stats: {
        totalSupporters,
        totalCreators,
        totalAvailableCredits,
        totalPaymentsProcessed,
        pendingCampaignsCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// All Roles: Update Profile (Self)
exports.updateProfile = async (req, res) => {
  try {
    const { name, photo } = req.body;
    
    // We get the user ID strictly from the JWT token via verifyToken middleware
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        return res.status(400).json({ success: false, message: 'Name must be between 2 and 50 characters' });
      }
      user.name = trimmedName;
    }

    if (photo) {
      user.photo = photo;
    }

    await user.save();

    // Return updated user data (excluding password)
    const updatedUser = await User.findById(userId).select('-password');
    
    res.json({ success: true, message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
