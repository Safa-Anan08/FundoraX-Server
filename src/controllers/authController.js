const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fundorax_super_secret_jwt_key_2026_safe',
    { expiresIn: '7d' }
  );
};

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password, photo, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRole = role === 'Creator' ? 'Creator' : 'Supporter';
    // Default initial credits assignment rule: Supporter -> 50, Creator -> 20
    const initialCredits = userRole === 'Creator' ? 20 : 50;

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      photo: photo || 'https://i.ibb.co/MgsTCzP/default-avatar.png',
      role: userRole,
      credits: initialCredits,
    });

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        photo: newUser.photo,
        role: newUser.role,
        credits: newUser.credits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role,
        credits: user.credits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Google Login / OAuth handler
exports.googleLogin = async (req, res) => {
  try {
    const { email, name, photo, googleId, role } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email is required' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      const userRole = role === 'Creator' ? 'Creator' : 'Supporter';
      const initialCredits = userRole === 'Creator' ? 20 : 50;

      user = await User.create({
        name: name || 'Google User',
        email: email.toLowerCase(),
        googleId,
        photo: photo || 'https://i.ibb.co/MgsTCzP/default-avatar.png',
        role: userRole,
        credits: initialCredits,
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Google Sign-In successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role,
        credits: user.credits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Current Logged-In User Profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role,
        credits: user.credits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
