# SafeEscape Cloud Deployment Issues Analysis

## Problems Identified

1. **Missing Credentials Files**
   - Error: `"ENOENT: no such file or directory, open '/app/config/vertexai-service-Account.json'"`
   - This indicates that the voice service cannot access the credentials file

2. **Gemini API Key Missing**
   - The Gemini chat service is returning 500 errors, likely due to missing API key

3. **Route Registration Issues**
   - Several health check endpoints are returning 404 errors which suggests the routes aren't being properly registered

## Solutions

### 1. Fix Credentials Access

The cloud deployment needs to use environment variables for credentials instead of file paths. The current error shows that the Voice service is trying to read credentials from a file that doesn't exist in the cloud environment.

#### Voice Service Fix

Create a `fix-voice-cloud.js` file with the following changes:

```javascript
/**
 * Voice Service for cloud environment
 * Uses environment variables instead of local files for credentials
 */

const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const logger = require('../../utils/logging/logger');

// Helper to create credentials from environment variable
function getCredentials(envVar) {
  try {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} environment variable not set`);
    }
    return JSON.parse(process.env[envVar]);
  } catch (error) {
    logger.error(`Error parsing ${envVar}:`, error);
    throw error;
  }
}

// Create clients for Speech and Text-to-Speech using environment variables
let speechClient, ttsClient;

try {
  const credentials = process.env.K_SERVICE ? 
    getCredentials('VERTEXAI_CREDENTIALS') : 
    { keyFilename: require('path').resolve(__dirname, '../../config/vertexai-service-Account.json') };

  speechClient = new speech.SpeechClient(credentials);
  ttsClient = new textToSpeech.TextToSpeechClient(credentials);
  
  logger.info('Voice services initialized with credentials');
} catch (error) {
  logger.error('Failed to initialize voice services:', error);
  
  // Create placeholder clients - they'll fail but won't crash the app
  speechClient = {
    recognize: () => Promise.reject(new Error('Speech client not properly initialized')),
    streamingRecognize: () => {
      const stream = new require('stream').Duplex();
      stream._read = () => {};
      return stream;
    }
  };
  
  ttsClient = {
    synthesizeSpeech: () => Promise.reject(new Error('TTS client not properly initialized'))
  };
}

// Export rest of the file with updated clients
```

### 2. Fix Gemini Service

Create a `fix-gemini-cloud.js` file with the following changes:

```javascript
/**
 * Gemini Service for cloud environment
 * Uses environment variables for API key
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require('../../utils/logging/logger');

// Store chat sessions (in production, use a database)
const chatSessions = new Map();

// System prompt for emergency and first aid context
const SYSTEM_PROMPT = `You are the SafeEscape Emergency Assistant, an AI trained to provide 
helpful guidance during emergencies and first aid situations. Always prioritize user safety.`;

class GeminiService {
  constructor() {
    // Check for API key with better logging
    if (!process.env.GEMINI_API_KEY) {
      logger.error('CRITICAL ERROR: GEMINI_API_KEY is not set in environment variables');
      logger.error('The Gemini service will not function without an API key');
      
      // In cloud environment, log more details
      if (process.env.K_SERVICE) {
        logger.error('Cloud Run detected, ensure GEMINI_API_KEY is set in environment variables');
      } else {
        logger.error('Please check your .env file at the project root');
      }
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "MISSING_API_KEY");
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      logger.info('Gemini service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Gemini service:', error);
    }
  }
  
  // Export rest of the class methods
}

module.exports = new GeminiService();
```

### 3. Update Dockerfile for Environment Variables

Create a `fix-dockerfile.txt` file with the following changes:

```dockerfile
FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Set essential environment variables
ENV NODE_ENV=production
ENV ENABLE_PUBSUB=true
ENV ENABLE_SOCKET=true
ENV K_SERVICE=safescape-backend
ENV FIREBASE_AUTH_EMULATOR_HOST=false

# Create service account directories if they don't exist
RUN mkdir -p /app/config

# Add startup script with better error handling
RUN echo '#!/bin/sh\n\
echo "Starting SafeEscape backend..."\n\
echo "Checking environment:"\n\
if [ -n "$FIREBASE_CREDENTIALS" ]; then\n\
  echo "- FIREBASE_CREDENTIALS: Available"\n\
  echo $FIREBASE_CREDENTIALS > /app/config/firebase-credentials.json\n\
  export GOOGLE_APPLICATION_CREDENTIALS="/app/config/firebase-credentials.json"\n\
else\n\
  echo "⚠️ WARNING: FIREBASE_CREDENTIALS not set"\n\
fi\n\
if [ -n "$VERTEXAI_CREDENTIALS" ]; then\n\
  echo "- VERTEXAI_CREDENTIALS: Available"\n\
else\n\
  echo "⚠️ WARNING: VERTEXAI_CREDENTIALS not set"\n\
fi\n\
if [ -n "$GEMINI_API_KEY" ]; then\n\
  echo "- GEMINI_API_KEY: Available"\n\
else\n\
  echo "⚠️ WARNING: GEMINI_API_KEY not set"\n\
fi\n\
node server.js\n\
' > /app/startup.sh && chmod +x /app/startup.sh

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start the server with our wrapper script
CMD ["/app/startup.sh"]
```

## Deployment Recommendations

1. **Set Required Environment Variables**:
   - Add the following environment variables to Cloud Run:
     - `GEMINI_API_KEY`: Your Google Generative AI API key
     - `VERTEXAI_CREDENTIALS`: The JSON content of your service account with Speech-to-Text/Text-to-Speech permissions
     - `FIREBASE_CREDENTIALS`: The JSON content of your Firebase service account

2. **Enable Required APIs**:
   - Ensure the following APIs are enabled in Google Cloud Console:
     - Cloud Speech-to-Text API
     - Cloud Text-to-Speech API
     - Generative AI API
     - Firebase API

3. **Update Service Files**:
   - Replace the credentials loading code in both voice and Gemini services to use environment variables as shown above

4. **Add Health Check Routes**:
   - Add explicit health check routes to all API endpoints
   - Ensure these routes don't rely on external services

5. **Deploy with Additional Memory**:
   - Increase the memory allocation for the Cloud Run instance to handle voice processing
   - Recommended: At least 512MB, preferably 1GB

## Testing After Deployment

After making these changes and redeploying, run the diagnostic tool again to verify that the endpoints are working correctly.
