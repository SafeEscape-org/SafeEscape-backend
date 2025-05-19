# Cloud Environment Setup for SafeEscape

This document provides instructions for fixing the cloud deployment issues for the SafeEscape emergency application.

## Issues Identified

From the diagnostic tests, we've identified several issues:

1. **Missing Credentials Files**:
   - Error: `"ENOENT: no such file or directory, open '/app/config/vertexai-service-Account.json'"`
   - The cloud deployment can't access local credential files

2. **Gemini API Key Missing or Improperly Set**:
   - The Gemini chat service returns 500 errors, likely due to missing API key or incorrect initialization

3. **Voice Service Configuration Issues**:
   - Voice services can't access credential files in the cloud environment

## Deployment Instructions

### Step 1: Update Environment Variables in Cloud Run

In the Google Cloud Console, navigate to your Cloud Run service and update the environment variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
VERTEXAI_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"..."}
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"..."}
```

For both `VERTEXAI_CREDENTIALS` and `FIREBASE_CREDENTIALS`, provide the entire JSON content of your service account key files.

### Step 2: Update Services to Use Environment Variables

#### Update Voice Service

1. Create a conditional check in `services/voice/voiceService.js`:

```javascript
// Create clients for Speech and Text-to-Speech
let speechClient, ttsClient;

try {
  // Use environment variables in Cloud Run, file paths in local development
  if (process.env.K_SERVICE) {
    // Cloud Run environment - use environment variables
    logger.info('Initializing voice services in Cloud Run environment');
    
    const credentials = JSON.parse(process.env.VERTEXAI_CREDENTIALS || "{}");
    speechClient = new speech.SpeechClient({ credentials });
    ttsClient = new textToSpeech.TextToSpeechClient({ credentials });
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
  
  // Create placeholder clients that will return appropriate errors
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

#### Update Gemini Service

1. Update `services/ai gemini/geminiService.js` to better handle cloud environment:

```javascript
constructor() {
  // Check for API key with better logging
  if (!process.env.GEMINI_API_KEY) {
    logger.error('CRITICAL ERROR: GEMINI_API_KEY is not set');
    
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

### Step 3: Update Dockerfile

Modify the Dockerfile to handle credentials better:

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
```

### Step 4: Add Health Check Endpoints

Add explicit health check endpoints to both voice and Gemini routes:

#### Voice Routes:

```javascript
// Add more detailed health check
router.get('/health', (req, res) => {
  try {
    const status = {
      status: 'OK',
      message: 'Voice API is operational',
      speechClientAvailable: !!voiceService.speechClient,
      ttsClientAvailable: !!voiceService.ttsClient,
      environment: process.env.NODE_ENV,
      cloudRun: !!process.env.K_SERVICE
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
```

#### Gemini Routes:

```javascript
// Add detailed health check
router.get('/health', (req, res) => {
  try {
    const status = {
      status: 'OK',
      message: 'Gemini API is operational',
      apiKeyAvailable: !!process.env.GEMINI_API_KEY,
      modelInitialized: !!geminiService.model,
      activeSessions: Object.keys(geminiService.getActiveSessions() || {}).length,
      environment: process.env.NODE_ENV,
      cloudRun: !!process.env.K_SERVICE
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
```

## Troubleshooting

If you continue to experience issues after implementing these fixes, check Cloud Run logs for detailed error messages. Common issues include:

1. **JSON Parsing Errors**: Ensure environment variables containing JSON (like credentials) are properly escaped
2. **API Enablement**: Verify that all necessary Google Cloud APIs are enabled in your project
3. **Permissions**: Check that the service account has proper IAM permissions for Speech-to-Text, Text-to-Speech, and Gemini APIs
4. **Memory Limits**: Consider increasing memory allocation for your Cloud Run instance, as voice processing can be memory-intensive
