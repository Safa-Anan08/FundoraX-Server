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

// Initiate Google OAuth Authorization Flow
exports.googleAuth = (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!googleClientId) {
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

    // 1. Exchange auth code for access token
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
      console.error('[Google OAuth Error] Failed to get access token:', tokenData);
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Failed to obtain token from Google')}`);
    }

    // 2. Fetch verified profile from Google UserInfo endpoint
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoResponse.json();
    if (!googleUser.email) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Google user profile email not found')}`);
    }

    const email = googleUser.email.toLowerCase();

    // 3. Search MongoDB by verified Google email
    let user = await User.findOne({ email });

    if (!user) {
      // NEW USER BUSINESS RULE: MUST ALWAYS be 'Supporter' with exactly 50 credits!
      user = await User.create({
        name: googleUser.name || 'Google User',
        email: email,
        googleId: googleUser.id,
        photo: googleUser.picture || 'https://i.ibb.co/MgsTCzP/default-avatar.png',
        role: 'Supporter', // MUST ALWAYS be Supporter
        credits: 50,        // MUST ALWAYS be 50 credits
      });
    }
    // EXISTING USER BUSINESS RULE:
    // Do NOT create duplicate user, do NOT add extra 50 credits, do NOT change existing role/credits!

    // 4. Generate JWT token
    const token = generateToken(user);

    // 5. Redirect browser to frontend with token
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

    const cleanEmail = email.toLowerCase();
    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // NEW USER BUSINESS RULE: MUST ALWAYS be Supporter with 50 credits
      user = await User.create({
        name: name || 'Google User',
        email: cleanEmail,
        googleId,
        photo: photo || 'https://i.ibb.co/MgsTCzP/default-avatar.png',
        role: 'Supporter', // MUST be Supporter
        credits: 50,        // MUST be 50
      });
    }
    // EXISTING USER: Keep existing user's role and credits, do NOT add extra credits!

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
