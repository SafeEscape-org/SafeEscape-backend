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
