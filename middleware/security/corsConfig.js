/**
 * Secure CORS Configuration
 * Provides environment-specific CORS settings
 */

const getCorsOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isCloudRun = process.env.K_SERVICE !== undefined;

  if (isProduction) {
    // Production CORS - restrictive
    return {
      origin: [
        'https://safeescape.app',
        'https://www.safeescape.app',
        'https://safeescape-frontend.web.app',
        // Add your production domains here
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      optionsSuccessStatus: 200
    };
  } else if (isCloudRun) {
    // Cloud Run development - semi-restrictive
    return {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5000',
        'http://localhost:8080',
        /^https:\/\/.*\.run\.app$/,
        /^https:\/\/.*\.web\.app$/
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      optionsSuccessStatus: 200
    };
  } else {
    // Local development - permissive but logged
    console.warn('⚠️ Running in development mode with permissive CORS');
    return {
      origin: true, // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      optionsSuccessStatus: 200
    };
  }
};

module.exports = {
  getCorsOptions
};