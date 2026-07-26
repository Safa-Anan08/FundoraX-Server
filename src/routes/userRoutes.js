const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, deleteUser, getAdminStats, updateProfile } = require('../controllers/userController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.patch('/profile', verifyToken, updateProfile); // Profile update for self

router.get('/admin/all', verifyToken, authorizeRoles('Admin'), getAllUsers);
router.patch('/admin/role/:id', verifyToken, authorizeRoles('Admin'), updateUserRole);
router.delete('/admin/delete/:id', verifyToken, authorizeRoles('Admin'), deleteUser);
router.get('/admin/stats', verifyToken, authorizeRoles('Admin'), getAdminStats);

module.exports = router;
