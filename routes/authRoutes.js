const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Auth-related routes
router.post('/signup', auth.signup);
router.post('/login', auth.login);

// Email verification
router.get('/verify-email/:token', auth.verifyEmail);

// Profile (Protected)
router.get('/profile', authMiddleware, auth.getProfile);

// Password change (Protected)
router.post('/change-password', authMiddleware, auth.changePassword); // Sends verification email
router.get('/verify-password-change/:token', auth.verifyPasswordChangeFromEmailLink); // Verify via email link

// Username change
router.post('/request-username-change', authMiddleware, auth.requestUsernameChange);
router.get('/confirm-username/:token', auth.confirmUsernameChange);

// Delete all
router.post('/delete-account', authMiddleware, auth.initiateDeleteAccount); // 🔒 Protected
router.get('/confirm-delete/:token', auth.confirmDeleteAccount);

module.exports = router;