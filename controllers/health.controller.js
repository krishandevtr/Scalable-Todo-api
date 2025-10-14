const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

const healthCheckController = asyncHandler(async (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: {}
    };

    // Check MongoDB connection
    try {
        if (mongoose.connection.readyState === 1) {
            healthcheck.services.mongodb = {
                status: 'healthy',
                responseTime: 'N/A'
            };
        } else {
            healthcheck.services.mongodb = {
                status: 'unhealthy',
                error: 'Database connection not ready'
            };
        }
    } catch (error) {
        healthcheck.services.mongodb = {
            status: 'unhealthy',
            error: error.message
        };
    }

    // Check Redis connection (if configured)
    if (process.env.REDIS_URL) {
        try {
            // Note: Add Redis client check here when implementing caching
            healthcheck.services.redis = {
                status: 'not_implemented',
                message: 'Redis check will be implemented with caching'
            };
        } catch (error) {
            healthcheck.services.redis = {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    // Check if any service is unhealthy
    const isHealthy = Object.values(healthcheck.services).every(
        service => service.status === 'healthy' || service.status === 'not_implemented'
    );

    const statusCode = isHealthy ? 200 : 503;
    
    res.status(statusCode).json({
        success: isHealthy,
        data: healthcheck
    });
});

const readinessCheckController = asyncHandler(async (req, res) => {
    // Check if all required services are ready
    const isMongoReady = mongoose.connection.readyState === 1;
    
    if (isMongoReady) {
        res.status(200).json({
            success: true,
            message: 'Service is ready',
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(503).json({
            success: false,
            message: 'Service is not ready',
            timestamp: new Date().toISOString(),
            reason: 'Database connection not ready'
        });
    }
});

const livenessCheckController = asyncHandler(async (req, res) => {
    // Simple liveness check - if the server responds, it's alive
    res.status(200).json({
        success: true,
        message: 'Service is alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = {
    healthCheckController,
    readinessCheckController,
    livenessCheckController
};