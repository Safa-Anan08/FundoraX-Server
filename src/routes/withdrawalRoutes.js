const express = require('express');
const router = express.Router();
const {
  requestWithdrawal,
  getCreatorWithdrawals,
  getAdminWithdrawalRequests,
  approveWithdrawal,
} = require('../controllers/withdrawalController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.post('/request', verifyToken, authorizeRoles('Creator', 'Admin'), requestWithdrawal);
router.get('/my-withdrawals', verifyToken, authorizeRoles('Creator', 'Admin'), getCreatorWithdrawals);
router.get('/admin/all', verifyToken, authorizeRoles('Admin'), getAdminWithdrawalRequests);
router.patch('/admin/approve/:id', verifyToken, authorizeRoles('Admin'), approveWithdrawal);

module.exports = router;
