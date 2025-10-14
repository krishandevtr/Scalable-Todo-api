const User = require("../models/user.model");
const { generateTokens, verifyRefreshToken } = require('../middleware/auth.middleware');
const { asyncHandler, AppError } = require('../middleware/errorHandler.middleware');

const loginController = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
        throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
        throw new AppError('Account is deactivated', 401);
    }

    // Check password
    const isValidPassword = await user.compare(password);
    if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            accessToken
        }
    });
});

const signupController = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
        throw new AppError('Name, email, and password are required', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError('User with this email already exists', 400);
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            accessToken
        }
    });
});

const refreshTokenController = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
        throw new AppError('Refresh token not found', 401);
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Set new refresh token
    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            accessToken
        }
    });
});

const logoutController = asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken');
    res.status(200).json({
        success: true,
        message: 'Logout successful'
    });
});

const getUserProfileController = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    
    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        }
    });
});

module.exports = {
    loginController,
    signupController,
    refreshTokenController,
    logoutController,
    getUserProfileController
};
