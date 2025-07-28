/**
 * Secure File Upload Middleware
 * Provides secure file upload handling with validation and sanitization
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Allowed file types and their MIME types
const allowedImageTypes = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

const allowedAudioTypes = {
  'audio/wav': '.wav',
  'audio/mp3': '.mp3',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm'
};

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validates file type and size
 */
const fileFilter = (allowedTypes, maxSize) => {
  return (req, file, cb) => {
    try {
      // Check if file type is allowed
      if (!allowedTypes[file.mimetype]) {
        return cb(new Error(`Invalid file type. Allowed types: ${Object.keys(allowedTypes).join(', ')}`));
      }

      // Additional security: check file extension matches MIME type
      const expectedExtension = allowedTypes[file.mimetype];
      const actualExtension = path.extname(file.originalname).toLowerCase();
      
      if (actualExtension !== expectedExtension) {
        return cb(new Error('File extension does not match file type'));
      }

      // File is valid
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  };
};

/**
 * Generates secure filename
 */
const generateSecureFilename = (originalname) => {
  const extension = path.extname(originalname);
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${timestamp}_${randomBytes}${extension}`;
};

/**
 * Memory storage configuration (for processing without saving to disk)
 */
const memoryStorage = multer.memoryStorage();

/**
 * Secure image upload configuration
 */
const imageUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1, // Only allow one file at a time
    fields: 10, // Limit number of form fields
    parts: 20 // Limit number of parts
  },
  fileFilter: fileFilter(allowedImageTypes, MAX_IMAGE_SIZE)
});

/**
 * Secure audio upload configuration
 */
const audioUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_AUDIO_SIZE,
    files: 1,
    fields: 10,
    parts: 20
  },
  fileFilter: fileFilter(allowedAudioTypes, MAX_AUDIO_SIZE)
});

/**
 * General secure upload configuration
 */
const secureUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
    fields: 10,
    parts: 20
  },
  fileFilter: fileFilter({...allowedImageTypes, ...allowedAudioTypes}, MAX_IMAGE_SIZE)
});

/**
 * Error handling middleware for file uploads
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File too large',
          message: 'File size exceeds the maximum allowed limit'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files',
          message: 'Only one file is allowed per request'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field',
          message: 'File field name is not allowed'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: error.message
        });
    }
  }
  
  if (error.message) {
    return res.status(400).json({
      success: false,
      error: 'File validation error',
      message: error.message
    });
  }
  
  next(error);
};

/**
 * Validates uploaded file buffer for additional security
 */
const validateFileBuffer = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const file = req.file;
  const buffer = file.buffer;

  try {
    // Check for common file signature patterns
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'audio/wav': [0x52, 0x49, 0x46, 0x46],
      'audio/mp3': [0xFF, 0xFB], // MP3 frame header
      'audio/mpeg': [0xFF, 0xFB]
    };

    const signature = signatures[file.mimetype];
    if (signature) {
      const fileHeader = Array.from(buffer.slice(0, signature.length));
      const matches = signature.every((byte, index) => fileHeader[index] === byte);
      
      if (!matches) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file format',
          message: 'File content does not match the declared file type'
        });
      }
    }

    // Add secure filename to request
    req.file.secureFilename = generateSecureFilename(file.originalname);
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'File validation error',
      message: 'Unable to validate file content'
    });
  }
};

module.exports = {
  imageUpload,
  audioUpload,
  secureUpload,
  handleUploadError,
  validateFileBuffer,
  generateSecureFilename
};