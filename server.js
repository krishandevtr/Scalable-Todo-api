const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const todoRoutes = require('./routes/todo.routes');
const healthRoutes = require('./routes/health.routes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');

// Import services
const connectDB = require('./lib/connectDB');
const { cache } = require('./lib/cache');

const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? 
        (process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())) : 
        ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
app.use(apiLimiter);

// Health check routes (no rate limiting or auth)
app.use('/health', healthRoutes);
app.use('/', healthRoutes); // Root redirects to health

// API routes with versioning
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/todo`, todoRoutes);

// Backwards compatibility (without versioning)
app.use('/api/auth', authRoutes);
app.use('/api/todo', todoRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        availableEndpoints: {
            health: '/health',
            auth: `/api/${API_VERSION}/auth`,
            todos: `/api/${API_VERSION}/todo`
        }
    });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`\n📤 Received ${signal}. Starting graceful shutdown...`);
    
    // Close HTTP server
    server.close(() => {
        console.log('📤 HTTP server closed.');
    });
    
    try {
        // Close cache connection
        await cache.disconnect();
        console.log('📤 Cache connection closed.');
        
        // Close database connection (handled by connectDB.js)
        console.log('📤 Database connection will be closed by connectDB module.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDB();
        
        // Connect to cache (optional)
        await cache.connect();
        
        // Start HTTP server
        const server = app.listen(PORT, () => {
            console.log('🚀 Server started successfully!');
            console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Server running on port ${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/health`);
            console.log(`🔗 API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
            console.log(`📖 API Documentation: ./API_DOCUMENTATION.md`);
        });
        
        // Export server for graceful shutdown
        global.server = server;
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Fix the server reference for graceful shutdown
let server;
const startServerFixed = async () => {
    try {
        await connectDB();
        await cache.connect();
        
        server = app.listen(PORT, () => {
            console.log('🚀 Server started successfully!');
            console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Server running on port ${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/health`);
            console.log(`🔗 API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
            console.log(`📖 API Documentation: ./API_DOCUMENTATION.md`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServerFixed();
