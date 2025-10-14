const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Access token required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user || !user.isActive) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token or user not found' 
            });
        }

        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expired' 
            });
        }
        
        return res.status(403).json({ 
            success: false,
            message: 'Invalid token' 
        });
    }
};

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    const refreshToken = jwt.sign(
        { userId, type: 'refresh' }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
    
    return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

module.exports = {
    authenticateToken,
    generateTokens,
    verifyRefreshToken
};