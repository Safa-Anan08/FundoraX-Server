const express = require('express');
const router = express.Router();
const {
  createCampaign,
  getApprovedCampaigns,
  getTopFundedCampaigns,
  getCampaignById,
  getMyCampaigns,
  updateCampaign,
  deleteCampaign,
  getAllCampaignsAdmin,
  approveCampaign,
  rejectCampaign,
} = require('../controllers/campaignController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public routes
router.get('/approved', getApprovedCampaigns);
router.get('/top-funded', getTopFundedCampaigns);
router.get('/details/:id', getCampaignById);

// Creator routes
router.post('/create', verifyToken, authorizeRoles('Creator', 'Admin'), createCampaign);
router.get('/my-campaigns', verifyToken, authorizeRoles('Creator', 'Admin'), getMyCampaigns);
router.put('/update/:id', verifyToken, authorizeRoles('Creator', 'Admin'), updateCampaign);
router.delete('/delete/:id', verifyToken, authorizeRoles('Creator', 'Admin'), deleteCampaign);

// Admin routes
router.get('/admin/all', verifyToken, authorizeRoles('Admin'), getAllCampaignsAdmin);
router.patch('/admin/approve/:id', verifyToken, authorizeRoles('Admin'), approveCampaign);
router.patch('/admin/reject/:id', verifyToken, authorizeRoles('Admin'), rejectCampaign);

module.exports = router;
