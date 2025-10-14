const router = require('express').Router();
const {
    loginController,
    signupController,
    refreshTokenController,
    logoutController,
    getUserProfileController
} = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

// Auth routes with stricter rate limiting
router.post('/login', authLimiter, loginController);
router.post('/signup', authLimiter, signupController);
router.post('/refresh', authLimiter, refreshTokenController);
router.post('/logout', logoutController);

// Protected routes
router.get('/profile', authenticateToken, getUserProfileController);

module.exports = router;
