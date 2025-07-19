/**
 * Secure Error Handler
 * Prevents information disclosure while providing useful error information
 */

const logger = require('../../utils/logging/logger');

/**
 * Security-focused error handler
 */
const secureErrorHandler = (err, req, res, next) => {
  // Log the full error for debugging
  logger.error('Application error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Determine error type and appropriate response
  let statusCode = err.statusCode || err.status || 500;
  let message = 'Internal server error';
  let errorCode = 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input data';
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication required';
    errorCode = 'AUTH_ERROR';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access denied';
    errorCode = 'ACCESS_DENIED';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
    errorCode = 'NOT_FOUND';
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too many requests';
    errorCode = 'RATE_LIMIT';
  } else if (statusCode === 400) {
    message = 'Bad request';
    errorCode = 'BAD_REQUEST';
  } else if (statusCode === 401) {
    message = 'Authentication required';
    errorCode = 'AUTH_REQUIRED';
  } else if (statusCode === 403) {
    message = 'Access forbidden';
    errorCode = 'FORBIDDEN';
  } else if (statusCode === 404) {
    message = 'Resource not found';
    errorCode = 'NOT_FOUND';
  }

  // In development, provide more detailed error information
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const errorResponse = {
    success: false,
    error: errorCode,
    message: message,
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  };

  // Add detailed error information in development
  if (isDevelopment && err.message) {
    errorResponse.details = err.message;
  }

  // Add stack trace in development for 500 errors
  if (isDevelopment && statusCode === 500 && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  logger.warn('404 - Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested resource was not found',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
};

/**
 * Async error wrapper to catch unhandled promise rejections
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  secureErrorHandler,
  notFoundHandler,
  asyncErrorHandler
};