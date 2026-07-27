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

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      console.warn(`[DB Duplicate Key Warning] Registration rejected for existing email: ${cleanEmail}`);
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRole = role === 'Creator' ? 'Creator' : 'Supporter';
    const initialCredits = userRole === 'Creator' ? 20 : 50;

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      photo: photo || 'https://i.ibb.co/MgsTCzP/default-avatar.png',
      role: userRole,
      credits: initialCredits,
    });

    console.log(`[DB Insert Success] Registered User: ${newUser.email} (ID: ${newUser._id}, Role: ${newUser.role}, Credits: ${newUser.credits})`);

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
    if (error.code === 11000) {
      console.error('[DB Duplicate Error] Mongo E11000 duplicate key on User email:', error.keyValue);
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    console.error('[DB Insert Failure] Registration error:', error.message);
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

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      console.warn(`[DB Query Warning] Login attempt failed for non-existent email: ${cleanEmail}`);
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.warn(`[Auth Warning] Invalid password attempt for email: ${cleanEmail}`);
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
    }

    const token = generateToken(user);
    console.log(`[Auth Success] User logged in: ${user.email} (Role: ${user.role})`);

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
    console.error('[Auth Error] Login exception:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Initiate Google OAuth Authorization Flow
exports.googleAuth = (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!googleClientId) {
    console.error('[Google OAuth Error] Missing GOOGLE_CLIENT_ID in server environment');
    return res.status(500).json({ success: false, message: 'Google Client ID is not configured on server' });
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(googleClientId)}&` +
    `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid profile email')}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(googleAuthUrl);
};

// Handle Google OAuth Callback
exports.googleCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google authentication failed: no code provided')}`);
    }

    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error('[Google OAuth Error] Failed to obtain access token:', tokenData);
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Failed to obtain token from Google')}`);
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoResponse.json();
    if (!googleUser.email) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google user profile email not found')}`);
    }

    const email = googleUser.email.toLowerCase();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: googleUser.name || 'Google User',
        email: email,
        googleId: googleUser.id,
        photo: googleUser.picture || 'https://i.ibb.co/MgsTCzP/default-avatar.png',
        role: 'Supporter',
        credits: 50,
      });
      console.log(`[DB Insert Success] Created new Google User: ${user.email} (Credits: 50)`);
    } else {
      console.log(`[DB Query Success] Matched existing Google User: ${user.email}`);
    }

    const token = generateToken(user);
    return res.redirect(`${clientUrl}/login?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('[Google Callback Exception]', error);
    return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(error.message || 'Google OAuth error')}`);
  }
};

// Google Login / OAuth API handler
exports.googleLogin = async (req, res) => {
  try {
    const { email, name, photo, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      user = await User.create({
        name: name || 'Google User',
        email: cleanEmail,
        googleId,
        photo: photo || 'https://i.ibb.co/MgsTCzP/default-avatar.png',
        role: 'Supporter',
        credits: 50,
      });
      console.log(`[DB Insert Success] Created new Google API User: ${user.email}`);
    } else {
      console.log(`[DB Query Success] Matched existing Google API User: ${user.email}`);
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
    console.error('[Google Login Error]', error.message);
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
    console.error('[GetMe Error]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
