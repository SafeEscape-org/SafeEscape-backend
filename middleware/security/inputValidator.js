/**
 * Input Validation Middleware
 * Sanitizes and validates user inputs to prevent injection attacks
 */

const validator = require('validator');

/**
 * Sanitizes string input by removing potential XSS and injection attempts
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Escape HTML to prevent XSS
  sanitized = validator.escape(sanitized);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validates and sanitizes location data
 */
function validateLocation(location) {
  if (!location || typeof location !== 'object') {
    throw new Error('Invalid location data');
  }

  const { latitude, longitude, city, state, country } = location;

  // Validate coordinates
  if (latitude !== undefined && !validator.isFloat(String(latitude), { min: -90, max: 90 })) {
    throw new Error('Invalid latitude value');
  }
  
  if (longitude !== undefined && !validator.isFloat(String(longitude), { min: -180, max: 180 })) {
    throw new Error('Invalid longitude value');
  }

  // Sanitize text fields
  const sanitizedLocation = {};
  if (latitude !== undefined) sanitizedLocation.latitude = parseFloat(latitude);
  if (longitude !== undefined) sanitizedLocation.longitude = parseFloat(longitude);
  if (city) sanitizedLocation.city = sanitizeString(city);
  if (state) sanitizedLocation.state = sanitizeString(state);
  if (country) sanitizedLocation.country = sanitizeString(country);

  return sanitizedLocation;
}

/**
 * Validates user ID format
 */
function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }
  
  // Check if it's a valid UUID or Firebase UID format
  if (!validator.isUUID(userId) && !validator.isAlphanumeric(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  return sanitizeString(userId);
}

/**
 * Validates email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email');
  }
  
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  return validator.normalizeEmail(email);
}

/**
 * General input validation middleware
 */
const validateInput = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid input data',
      message: error.message
    });
  }
};

/**
 * Recursively sanitizes object properties
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validates voice input data
 */
const validateVoiceInput = (req, res, next) => {
  try {
    const { audio, audioConfig } = req.body;
    
    if (!audio) {
      return res.status(400).json({
        success: false,
        error: 'Audio data is required'
      });
    }
    
    // Validate audio is base64 string
    if (typeof audio !== 'string' || !validator.isBase64(audio)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid audio data format'
      });
    }
    
    // Validate audio config if provided
    if (audioConfig && typeof audioConfig === 'object') {
      const allowedEncodings = ['LINEAR16', 'FLAC', 'MULAW', 'AMR', 'AMR_WB', 'OGG_OPUS', 'SPEEX_WITH_HEADER_BYTE', 'WEBM_OPUS'];
      
      if (audioConfig.encoding && !allowedEncodings.includes(audioConfig.encoding)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid audio encoding'
        });
      }
      
      if (audioConfig.sampleRateHertz && (!Number.isInteger(audioConfig.sampleRateHertz) || audioConfig.sampleRateHertz < 8000 || audioConfig.sampleRateHertz > 48000)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid sample rate'
        });
      }
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid voice input data',
      message: error.message
    });
  }
};

module.exports = {
  validateInput,
  validateVoiceInput,
  validateLocation,
  validateUserId,
  validateEmail,
  sanitizeString,
  sanitizeObject
};