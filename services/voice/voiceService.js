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

// Determine key file path
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? process.env.GOOGLE_APPLICATION_CREDENTIALS
  : path.resolve(__dirname, '../../config/vertexai-service-Account.json');

// Create clients for Speech and Text-to-Speech
const speechClient = new speech.SpeechClient({
  keyFilename: keyFilePath,
});

const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: keyFilePath,
});

/**
 * Maximum size of audio chunk that can be sent to Speech-to-Text API (in bytes)
 * Google Cloud has a limit of ~10MB for synchronous recognition
 */
const MAX_AUDIO_CHUNK_SIZE = 9 * 1024 * 1024; // ~9MB to be safe

/**
 * Converts speech audio to text using Google Cloud Speech-to-Text
 * Handles large audio files by chunking if necessary
 * @param {Buffer|string} audioContent - Audio buffer or base64 encoded string
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Transcribed text
 */
async function speechToText(audioContent, options = {}) {
  try {
    // Check if the audio might be WEBM OPUS from browser recording
    const isWebmOpus = options.encoding === 'WEBM_OPUS' || 
                      (typeof audioContent === 'string' && audioContent.length > 100 && 
                       audioContent.substring(0, 50).includes('WEBM'));
    
    // Check if LINEAR16 with 48kHz sample rate (common for browser audio)
    const isHighSampleRate = options.sampleRateHertz === 48000;
    
    const defaultOptions = {
      languageCode: 'en-US',
      model: 'default',
      encoding: isWebmOpus ? 'WEBM_OPUS' : 'LINEAR16',
      sampleRateHertz: isWebmOpus || isHighSampleRate ? 48000 : 16000, // Use 48kHz for WEBM_OPUS or when specified
      audioChannelCount: 1
    };

    const config = {
      ...defaultOptions,
      ...options
    };

    let audioBuffer;
    if (Buffer.isBuffer(audioContent)) {
      audioBuffer = audioContent;
    } else if (typeof audioContent === 'string') {
      // Check if it's a base64 string or a file path
      if (audioContent.startsWith('data:audio') || /^[A-Za-z0-9+/=]+$/.test(audioContent)) {
        // Base64 content, possibly from frontend
        audioBuffer = Buffer.from(audioContent.replace(/^data:audio\/[a-z]+;base64,/, ''), 'base64');
      } else {
        // Assume file path
        audioBuffer = fs.readFileSync(audioContent);
      }
    } else {
      throw new Error('Invalid audio content provided');
    }

    logger.info('Processing audio for Speech-to-Text', { 
      audioSizeKB: Math.round(audioBuffer.length / 1024),
      encoding: config.encoding,
      sampleRate: config.sampleRateHertz 
    });

    // Check if audio needs to be processed in chunks
    if (audioBuffer.length > MAX_AUDIO_CHUNK_SIZE && !isWebmOpus) {
      logger.info('Audio file is large, processing in chunks', { 
        totalSizeKB: Math.round(audioBuffer.length / 1024),
        chunkSizeKB: Math.round(MAX_AUDIO_CHUNK_SIZE / 1024)
      });
      
      return await processLargeAudioFile(audioBuffer, config);
    } else {
      // Process normally for smaller files or WEBM_OPUS (which can't be easily chunked)
      const request = {
        audio: { content: audioBuffer },
        config: config,
      };

      logger.info('Sending audio to Speech-to-Text API', { 
        audioLength: audioBuffer.length,
        sampleRate: config.sampleRateHertz 
      });

      const [response] = await speechClient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');

      logger.info('Audio transcribed successfully', { length: transcription.length });
      
      return transcription;
    }
  } catch (error) {
    logger.error('Error in speechToText:', error);
    throw error;
  }
}

/**
 * Process large audio files by splitting into chunks and concatenating results
 * @param {Buffer} audioBuffer - The complete audio buffer
 * @param {Object} config - Speech recognition configuration
 * @returns {Promise<string>} - Combined transcription from all chunks
 */
async function processLargeAudioFile(audioBuffer, config) {
  try {
    // Linear16 can be chunked by time segments
    // Process audio in chunks - create chunks based on audio size
    const chunks = [];
    
    // Calculate approximate chunk size based on audio format and sample rate
    // For LINEAR16: 16-bit samples * sample rate * channels = bytes per second
    const bytesPerSecond = (config.sampleRateHertz * 2 * config.audioChannelCount);
    const maxChunkSeconds = Math.floor(MAX_AUDIO_CHUNK_SIZE / bytesPerSecond);
    const bytesPerChunk = maxChunkSeconds * bytesPerSecond;
    
    logger.info('Splitting audio into chunks', {
      totalSizeKB: Math.round(audioBuffer.length / 1024),
      chunkSizeKB: Math.round(bytesPerChunk / 1024),
      chunkDurationSec: maxChunkSeconds
    });

    // Split buffer into chunks
    for (let i = 0; i < audioBuffer.length; i += bytesPerChunk) {
      const chunkEnd = Math.min(i + bytesPerChunk, audioBuffer.length);
      chunks.push(audioBuffer.slice(i, chunkEnd));
    }
    
    logger.info(`Created ${chunks.length} audio chunks for processing`);
    
    // Process each chunk and collect results
    const chunkTranscriptions = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.info(`Processing chunk ${i+1}/${chunks.length}`, {
        chunkSizeKB: Math.round(chunk.length / 1024)
      });
      
      const request = {
        audio: { content: chunk },
        config: config
      };
      
      const [response] = await speechClient.recognize(request);
      const chunkTranscription = response.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');
      
      chunkTranscriptions.push(chunkTranscription);
      
      logger.info(`Chunk ${i+1} transcription complete`, { 
        length: chunkTranscription.length
      });
    }
    
    // Combine all transcriptions
    const fullTranscription = chunkTranscriptions.join(' ');
    
    logger.info('All chunks processed successfully', {
      totalChunks: chunks.length,
      transcriptionLength: fullTranscription.length
    });
    
    return fullTranscription;
  } catch (error) {
    logger.error('Error processing large audio file:', error);
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
    try {      // Check if the audio is likely to be WEBM_OPUS or high sample rate LINEAR16
      const isHighSampleRate = options.sampleRateHertz === 48000 || options.encoding === 'WEBM_OPUS';
      
      const defaultOptions = {
        languageCode: 'en-US',
        model: 'default',
        encoding: options.encoding || 'LINEAR16',
        sampleRateHertz: isHighSampleRate ? 48000 : 16000,
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
