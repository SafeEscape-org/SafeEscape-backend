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
