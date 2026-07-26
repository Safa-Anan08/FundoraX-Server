const express = require('express');
const router = express.Router();
const { getUserNotifications, markAsRead } = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getUserNotifications);
router.patch('/read/:id', verifyToken, markAsRead);

module.exports = router;
