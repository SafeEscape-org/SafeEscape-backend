const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET environment variable is not set');
      return res.status(500).json({ 
        success: false,
        error: 'AUTH_CONFIG_ERROR',
        message: 'Authentication service is not properly configured' 
      });
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Authorization header is required' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Bearer token is required' 
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user information to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid authentication token' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired' 
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'AUTH_ERROR',
        message: 'Authentication service error' 
      });
    }
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !process.env.JWT_SECRET) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    // Don't fail on invalid token for optional auth
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
}; 