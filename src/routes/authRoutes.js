const express = require('express');
const router = express.Router();
const { register, login, googleLogin, googleAuth, googleCallback, getMe } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);

// Real Google OAuth Redirect Flow
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

router.get('/me', verifyToken, getMe);

module.exports = router;
