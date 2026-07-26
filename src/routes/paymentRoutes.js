const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmCreditPurchase,
  getPaymentHistory,
  getWalletSummary,
  stripeWebhook,
} = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

router.post('/webhook', stripeWebhook); // Stripe Webhook (No JWT, verifies raw signature)
router.post('/create-intent', verifyToken, createPaymentIntent);
router.post('/confirm', verifyToken, confirmCreditPurchase);
router.get('/history', verifyToken, getPaymentHistory);
router.get('/summary', verifyToken, getWalletSummary);

module.exports = router;
