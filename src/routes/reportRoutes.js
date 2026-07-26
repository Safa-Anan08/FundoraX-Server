const express = require('express');
const router = express.Router();
const { createReport, getAllReports, suspendCampaign } = require('../controllers/reportController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.post('/submit', verifyToken, createReport);
router.get('/admin/all', verifyToken, authorizeRoles('Admin'), getAllReports);
router.patch('/admin/suspend/:campaignId', verifyToken, authorizeRoles('Admin'), suspendCampaign);

module.exports = router;
