/**
 * Voice Service for handling Speech-to-Text and Text-to-Speech operations
 * This service integrates with Google Cloud APIs to provide voice capabilities for SafeEscape
 */

const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const logger = require('../../utils/logging/logger');
const path = require('path');

// Create clients for Speech and Text-to-Speech
const speechClient = new speech.SpeechClient({
  keyFilename: path.resolve(__dirname, '../../config/vertexai-service-Account.json'),
});

const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: path.resolve(__dirname, '../../config/vertexai-service-Account.json'),
});

/**
 * Converts speech audio to text using Google Cloud Speech-to-Text
 * @param {Buffer|string} audioContent - Audio buffer or base64 encoded string
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Transcribed text
 */
async function speechToText(audioContent, options = {}) {
  try {
    const defaultOptions = {
      languageCode: 'en-US',
      model: 'default',
      encoding: 'LINEAR16', // Default for web audio
      sampleRateHertz: 16000,
      audioChannelCount: 1
    };

    const config = {
      ...defaultOptions,
      ...options
    };

    let audio = {};
    if (Buffer.isBuffer(audioContent)) {
      audio.content = audioContent;
    } else if (typeof audioContent === 'string') {
      // Check if it's a base64 string or a file path
      if (audioContent.startsWith('data:audio') || /^[A-Za-z0-9+/=]+$/.test(audioContent)) {
        // Base64 content, possibly from frontend
        audio.content = Buffer.from(audioContent.replace(/^data:audio\/[a-z]+;base64,/, ''), 'base64');
      } else {
        // Assume file path
        audio.content = fs.readFileSync(audioContent);
      }
    } else {
      throw new Error('Invalid audio content provided');
    }

    const request = {
      audio: audio,
      config: config,
    };

    logger.info('Sending audio to Speech-to-Text API', { 
      audioLength: audio.content.length,
      sampleRate: config.sampleRateHertz 
    });

    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join(' ');

    logger.info('Audio transcribed successfully', { length: transcription.length });
    
    return transcription;
  } catch (error) {
    logger.error('Error in speechToText:', error);
    throw error;
  }
}

/**
 * Converts text to speech audio using Google Cloud Text-to-Speech
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Configuration options
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function textToSpeechAudio(text, options = {}) {  try {
    const defaultOptions = {
      languageCode: 'en-US',
      ssmlGender: 'FEMALE', 
      voiceName: 'en-US-Neural2-F', 
      audioEncoding: 'MP3'
    };

    const config = {
      ...defaultOptions,
      ...options
    };

    const request = {
      input: { text: text },
      voice: { 
        languageCode: config.languageCode,
        ssmlGender: config.ssmlGender,
        name: config.voiceName
      },
      audioConfig: { audioEncoding: config.audioEncoding },
    };

    logger.info('Sending text to Text-to-Speech API', { 
      textLength: text.length,
      voiceConfig: `${config.voiceName} (${config.ssmlGender})` 
    });

    const [response] = await ttsClient.synthesizeSpeech(request);
    logger.info('Text synthesized successfully', { 
      audioLength: response.audioContent.length 
    });

    return response.audioContent;
  } catch (error) {
    logger.error('Error in textToSpeechAudio:', error);
    throw error;
  }
}

/**
 * Handles streaming speech recognition
 * @param {stream.Readable} audioStream - Audio stream from client
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Transcribed text
 */
async function streamingSpeechToText(audioStream, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const defaultOptions = {
        languageCode: 'en-US',
        model: 'default',
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        audioChannelCount: 1,
        enableAutomaticPunctuation: true,
      };

      const config = {
        ...defaultOptions,
        ...options
      };
      
      const recognizeStream = speechClient
        .streamingRecognize({
          config: {
            encoding: config.encoding,
            sampleRateHertz: config.sampleRateHertz,
            languageCode: config.languageCode,
            enableAutomaticPunctuation: config.enableAutomaticPunctuation,
            model: config.model,
            audioChannelCount: config.audioChannelCount,
            // For emergency situations, enable enhanced models
            useEnhanced: true,
          },
          interimResults: config.interimResults || false,
        })
        .on('error', (error) => {
          logger.error('Streaming recognition error:', error);
          reject(error);
        })
        .on('data', (data) => {
          // For final result, resolve the promise
          if (data.results[0] && data.results[0].isFinal) {
            const transcription = data.results
              .map(result => result.alternatives[0].transcript)
              .join(' ');
            
            logger.info('Final transcription received', { 
              transcription: transcription.substring(0, 100) + (transcription.length > 100 ? '...' : '')
            });
            
            recognizeStream.end();
            resolve(transcription);
          }
        })
        .on('end', () => {
          logger.info('Streaming recognition ended without final result');
          // Only resolve here if we haven't already resolved with a final result
        });

      logger.info('Starting streaming recognition');
      audioStream.pipe(recognizeStream);

      // Handle stream errors
      audioStream.on('error', (error) => {
        logger.error('Audio stream error:', error);
        recognizeStream.end();
        reject(error);
      });
    } catch (error) {
      logger.error('Error setting up streaming recognition:', error);
      reject(error);
    }
  });
}

module.exports = {
  speechToText,
  textToSpeechAudio,
  streamingSpeechToText
};
