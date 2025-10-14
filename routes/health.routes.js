const router = require('express').Router();
const { 
    healthCheckController, 
    readinessCheckController, 
    livenessCheckController 
} = require('../controllers/health.controller');

// Health check endpoints (no authentication required)
router.get('/', healthCheckController);
router.get('/health', healthCheckController);
router.get('/ready', readinessCheckController);
router.get('/live', livenessCheckController);

module.exports = router;