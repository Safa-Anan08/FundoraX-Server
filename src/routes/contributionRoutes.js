const express = require('express');
const router = express.Router();
const {
  createContribution,
  getSupporterContributions,
  getCreatorPendingContributions,
  approveContribution,
  rejectContribution,
} = require('../controllers/contributionController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.post('/submit', verifyToken, authorizeRoles('Supporter', 'Admin'), createContribution);
router.get('/my-contributions', verifyToken, getSupporterContributions);
router.get('/creator/pending', verifyToken, authorizeRoles('Creator', 'Admin'), getCreatorPendingContributions);
router.patch('/approve/:id', verifyToken, authorizeRoles('Creator', 'Admin'), approveContribution);
router.patch('/reject/:id', verifyToken, authorizeRoles('Creator', 'Admin'), rejectContribution);

module.exports = router;
