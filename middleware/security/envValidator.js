/**
 * Environment Variable Validation Middleware
 * Ensures all required environment variables are present and valid
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'FIREBASE_PROJECT_ID',
  'GOOGLE_CLOUD_PROJECT_ID',
  'GEMINI_API_KEY'
];

const optionalEnvVars = [
  'FIREBASE_CREDENTIALS',
  'VERTEXAI_CREDENTIALS',
  'GOOGLE_MAPS_API_KEY',
  'OPENWEATHER_API_KEY',
  'MONGODB_URI'
];

/**
 * Validates environment variables on startup
 */
function validateEnvironment() {
  const missingVars = [];
  const warnings = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Check optional variables and warn if missing
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  // Log warnings for optional variables
  if (warnings.length > 0) {
    console.warn('⚠️ Optional environment variables not set:', warnings.join(', '));
  }

  // Throw error for missing required variables
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️ JWT_SECRET should be at least 32 characters long for security');
  }

  console.log('✅ Environment variables validated successfully');
}

module.exports = {
  validateEnvironment,
  requiredEnvVars,
  optionalEnvVars
};