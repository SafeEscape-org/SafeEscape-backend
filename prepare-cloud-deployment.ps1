# PowerShell script to prepare the SafeEscape backend for cloud deployment

Write-Host "=== SafeEscape Cloud Deployment Preparation Tool ===" -ForegroundColor Cyan
Write-Host "This script will prepare your SafeEscape backend for deployment to Cloud Run."
Write-Host

# Check if we're in the right directory
if (-not (Test-Path -Path "server.js") -or -not (Test-Path -Path "cloud-run-startup.js")) {
    Write-Host "Error: This script must be run from the root of the SafeEscape backend project." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project structure verified" -ForegroundColor Green

# Create a temporary directory for cloud deployment files
if (-not (Test-Path -Path ".cloud-deploy")) {
    New-Item -ItemType Directory -Path ".cloud-deploy" | Out-Null
}

if (-not (Test-Path -Path ".cloud-deploy\config")) {
    New-Item -ItemType Directory -Path ".cloud-deploy\config" | Out-Null
}

Write-Host "📁 Created temporary deployment directory: .cloud-deploy" -ForegroundColor Green

# Update Voice Service for cloud environment
Write-Host "🔧 Preparing Voice Service for cloud environment..." -ForegroundColor Yellow

$voiceServiceContent = @'
/**
 * Voice Service for cloud environment
 */
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const logger = require('../../utils/logging/logger');
const path = require('path');

// Create clients for Speech and Text-to-Speech
let speechClient, ttsClient;

try {
  // Use environment variables in Cloud Run, file paths in local development
  if (process.env.K_SERVICE) {
    // Cloud Run environment - use environment variables
    logger.info('Initializing voice services in Cloud Run environment');
    
    // Try to read from environment variable first
    if (process.env.VERTEXAI_CREDENTIALS) {
      logger.info('Using VERTEXAI_CREDENTIALS from environment variable');
      const credentials = JSON.parse(process.env.VERTEXAI_CREDENTIALS);
      speechClient = new speech.SpeechClient({ credentials });
      ttsClient = new textToSpeech.TextToSpeechClient({ credentials });
    }
    // Fall back to file written by startup script
    else {
      logger.info('Using credentials file written by startup script');
      const keyFilePath = path.resolve(__dirname, '../../config/vertexai-service-Account.json');
      speechClient = new speech.SpeechClient({ keyFilename: keyFilePath });
      ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename: keyFilePath });
    }
  } else {
    // Local development - use file paths
    logger.info('Initializing voice services in local environment');
    
    const keyFilePath = path.resolve(__dirname, '../../config/vertexai-service-Account.json');
    speechClient = new speech.SpeechClient({ keyFilename: keyFilePath });
    ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename: keyFilePath });
  }
  
  logger.info('Voice services initialized successfully');
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

// Re-export existing functions from the original service
// This part requires manual update with the actual functions from voiceService.js
module.exports = {
  speechToText: require('./voiceService').speechToText,
  textToSpeechAudio: require('./voiceService').textToSpeechAudio,
  streamingSpeechToText: require('./voiceService').streamingSpeechToText,
  speechClient,
  ttsClient
};
'@

Set-Content -Path ".cloud-deploy\voiceService.js" -Value $voiceServiceContent
Write-Host "✅ Voice Service prepared for cloud environment" -ForegroundColor Green

# Update Gemini Service for cloud environment
Write-Host "🔧 Preparing Gemini Service for cloud environment..." -ForegroundColor Yellow

$geminiServiceContent = @'
/**
 * Gemini Service for cloud environment
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require('../../utils/logging/logger');

// Store chat sessions (in production, use a database)
const chatSessions = new Map();

// System prompt for emergency and first aid context
const SYSTEM_PROMPT = `You are the SafeEscape Emergency Assistant, an AI trained to provide 
helpful guidance during emergencies and first aid situations. Always prioritize user safety.
For medical emergencies, always remind users to call emergency services (911 in US) first.`;

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
  
  // Re-export existing methods from the original service
  // This requires adding all the methods from the original geminiService.js
  
  /**
   * Get all active sessions (for debugging/admin)
   * @returns {Object} - Map of all sessions with metadata
   */
  getActiveSessions() {
    // Return only metadata, not the full chat objects
    const sessionInfo = {};
    
    chatSessions.forEach((session, id) => {
      sessionInfo[id] = {
        emergencyType: session?.emergencyType || 'unknown',
        location: session?.location || 'unknown',
        messageCount: session?.history?.length || 0,
        createdAt: session?.createdAt || new Date()
      };
    });
    
    return sessionInfo;
  }
}

module.exports = new GeminiService();
'@

Set-Content -Path ".cloud-deploy\geminiService.js" -Value $geminiServiceContent
Write-Host "✅ Gemini Service prepared for cloud environment" -ForegroundColor Green

# Create enhanced Dockerfile
Write-Host "🔧 Creating enhanced Dockerfile for cloud environment..." -ForegroundColor Yellow

$dockerfileContent = @'
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

# Create service account directories if they don't exist
RUN mkdir -p /app/config

# Add startup script with better error handling
RUN echo '#!/bin/sh\n\
echo "Starting SafeEscape backend..."\n\
echo "Checking environment variables:"\n\
if [ -n "$FIREBASE_CREDENTIALS" ]; then\n\
  echo "- FIREBASE_CREDENTIALS: Available"\n\
  echo $FIREBASE_CREDENTIALS > /app/config/firebase-credentials.json\n\
  export GOOGLE_APPLICATION_CREDENTIALS="/app/config/firebase-credentials.json"\n\
else\n\
  echo "⚠️ WARNING: FIREBASE_CREDENTIALS not set"\n\
fi\n\
if [ -n "$VERTEXAI_CREDENTIALS" ]; then\n\
  echo "- VERTEXAI_CREDENTIALS: Available"\n\
  echo $VERTEXAI_CREDENTIALS > /app/config/vertexai-service-Account.json\n\
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
'@

Set-Content -Path ".cloud-deploy\Dockerfile" -Value $dockerfileContent
Write-Host "✅ Enhanced Dockerfile created for cloud environment" -ForegroundColor Green

# Create enhanced health check routes
Write-Host "🔧 Creating enhanced health check endpoints..." -ForegroundColor Yellow

$voiceRoutesHealthContent = @'
// Add more detailed health check to voiceRoutes.js
router.get('/health', (req, res) => {
  try {
    const status = {
      status: 'OK',
      message: 'Voice API is operational',
      speechClientInitialized: !!voiceService.speechClient && typeof voiceService.speechClient.recognize === 'function',
      ttsClientInitialized: !!voiceService.ttsClient && typeof voiceService.ttsClient.synthesizeSpeech === 'function',
      environment: process.env.NODE_ENV,
      cloudRun: !!process.env.K_SERVICE,
      timestamp: new Date().toISOString()
    };
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Voice API health check failed',
      error: error.message
    });
  }
});
'@

Set-Content -Path ".cloud-deploy\voiceRoutes.health.js" -Value $voiceRoutesHealthContent
Write-Host "✅ Created enhanced voice health check endpoint" -ForegroundColor Green

$geminiRoutesHealthContent = @'
// Add detailed health check to geminiRoutes.js
router.get('/health', (req, res) => {
  try {
    const status = {
      status: 'OK',
      message: 'Gemini API is operational',
      apiKeyAvailable: !!process.env.GEMINI_API_KEY,
      modelInitialized: !!geminiService.model,
      activeSessions: Object.keys(geminiService.getActiveSessions() || {}).length,
      environment: process.env.NODE_ENV,
      cloudRun: !!process.env.K_SERVICE,
      timestamp: new Date().toISOString()
    };
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Gemini API health check failed',
      error: error.message
    });
  }
});
'@

Set-Content -Path ".cloud-deploy\geminiRoutes.health.js" -Value $geminiRoutesHealthContent
Write-Host "✅ Created enhanced gemini health check endpoint" -ForegroundColor Green

# Create instructions file
Write-Host "📝 Creating deployment instructions..." -ForegroundColor Yellow

$deployInstructionsContent = @'
# SafeEscape Cloud Deployment Instructions

## Required Environment Variables

Set these environment variables in Google Cloud Run:

1. `GEMINI_API_KEY` - Your Google Generative AI API key
2. `VERTEXAI_CREDENTIALS` - JSON content of your service account with Speech-to-Text/Text-to-Speech permissions
3. `FIREBASE_CREDENTIALS` - JSON content of your Firebase service account

## Deployment Steps

1. **Update service files**:
   - Copy the cloud-compatible voice service code to your main service:
   ```javascript
   // At the top of services/voice/voiceService.js
   let speechClient, ttsClient;
   
   try {
     // Use environment variables in Cloud Run, file paths in local development
     if (process.env.K_SERVICE) {
       // Cloud Run environment - use environment variables
       logger.info('Initializing voice services in Cloud Run environment');
       
       if (process.env.VERTEXAI_CREDENTIALS) {
         logger.info('Using VERTEXAI_CREDENTIALS from environment variable');
         const credentials = JSON.parse(process.env.VERTEXAI_CREDENTIALS);
         speechClient = new speech.SpeechClient({ credentials });
         ttsClient = new textToSpeech.TextToSpeechClient({ credentials });
       } else {
         logger.info('Using credentials file written by startup script');
         const keyFilePath = path.resolve(__dirname, '../../config/vertexai-service-Account.json');
         speechClient = new speech.SpeechClient({ keyFilename: keyFilePath });
         ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename: keyFilePath });
       }
     } else {
       // Local development - use file paths
       logger.info('Initializing voice services in local environment');
       
       const keyFilePath = path.resolve(__dirname, '../../config/vertexai-service-Account.json');
       speechClient = new speech.SpeechClient({ keyFilename: keyFilePath });
       ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename: keyFilePath });
     }
     
     logger.info('Voice services initialized successfully');
   } catch (error) {
     logger.error('Failed to initialize voice services:', error);
     
     // Create placeholder clients
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
   ```

2. **Update Gemini service initialization**:
   ```javascript
   // Replace the constructor in services/ai gemini/geminiService.js
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
   ```

3. **Replace Dockerfile**:
   - Copy the enhanced `Dockerfile` from this directory to replace your current Dockerfile

4. **Add health check endpoints**:
   - Add the health check code from voiceRoutes.health.js and geminiRoutes.health.js to your route files

5. **Build and deploy**:
   ```bash
   gcloud builds submit --project YOUR_PROJECT_ID --tag gcr.io/YOUR_PROJECT_ID/safescape-backend
   
   gcloud run deploy safescape-backend \
     --image gcr.io/YOUR_PROJECT_ID/safescape-backend \
     --platform managed \
     --project YOUR_PROJECT_ID \
     --region asia-south1 \
     --memory 1Gi \
     --set-env-vars "GEMINI_API_KEY=YOUR_API_KEY"
   ```

6. **Set secret environment variables**:
   Set the `VERTEXAI_CREDENTIALS` and `FIREBASE_CREDENTIALS` as secrets in Google Cloud Secret Manager, then configure your Cloud Run service to use them.

## Troubleshooting

If you see 500 Internal Server Error responses:

1. Check Cloud Run logs for error messages
2. Verify environment variables are correctly set
3. Make sure all required APIs are enabled in your Google Cloud project
4. Ensure service accounts have proper permissions
5. Try increasing memory allocation (voice processing can be memory-intensive)
'@

Set-Content -Path ".cloud-deploy\DEPLOY.md" -Value $deployInstructionsContent
Write-Host "✅ Deployment instructions created" -ForegroundColor Green

Write-Host
Write-Host "=== Cloud Deployment Preparation Complete ===" -ForegroundColor Cyan
Write-Host
Write-Host "Files are ready in the .cloud-deploy directory" -ForegroundColor Green
Write-Host "Follow the instructions in .cloud-deploy\DEPLOY.md to complete the deployment" -ForegroundColor Yellow
