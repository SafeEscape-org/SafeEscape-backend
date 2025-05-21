/**
 * Voice WebSocket Service for SafeEscape
 * Handles real-time streaming voice interactions with the emergency assistant
 */

const WebSocket = require('ws');
const voiceService = require('../voice/voiceService');
const geminiService = require('../ai gemini/geminiService');
const logger = require('../../utils/logging/logger');
const { PassThrough } = require('stream');

/**
 * Initialize WebSocket server for voice streaming
 * @param {Object} server - HTTP/HTTPS server instance
 * @param {String} path - WebSocket endpoint path
 */
function initVoiceWebSocket(server, path = '/voice/stream') {
  const wss = new WebSocket.Server({ 
    server, 
    path 
  });
  
  logger.info(`Voice WebSocket server initialized on path: ${path}`);

  wss.on('connection', handleVoiceConnection);
  
  return wss;
}

/**
 * Handle individual WebSocket connections for voice streaming
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} request - HTTP request that initiated the connection
 */
function handleVoiceConnection(ws, request) {
  logger.info('New voice streaming connection established');
  
  let audioStream = new PassThrough();
  let streamingConfig = {
    languageCode: 'en-US',
    encoding: 'LINEAR16',
    sampleRateHertz: 48000, // Default to 48kHz as most browsers record at this rate
    interimResults: true,
    enableAutomaticPunctuation: true
  };
  
  let isStreaming = false;
  let hasReceivedConfig = false;
  
  ws.on('message', async (message) => {
    try {
      // Check if the message is configuration
      if (!hasReceivedConfig) {
        try {
          const config = JSON.parse(message);
          
          if (config.type === 'config') {
            streamingConfig = { ...streamingConfig, ...config.data };
            hasReceivedConfig = true;
            
            logger.info('Received streaming configuration', { streamingConfig });
            
            ws.send(JSON.stringify({ 
              type: 'config_ack', 
              message: 'Configuration received' 
            }));
            
            return;
          }
        } catch (e) {
          // Not a JSON message, assuming it's binary audio data
        }
      }
      
      // Handle audio data
      if (Buffer.isBuffer(message)) {
        if (!isStreaming) {
          isStreaming = true;
          logger.info('Starting voice streaming session');
          
          // Detect format from audio header if possible
          if (message.length > 4) {
            const magicBytes = message.toString('ascii', 0, 4);
            if (magicBytes === 'WEBM' || magicBytes.includes('webm')) {
              logger.info('Detected WebM format in audio stream');
              streamingConfig.encoding = 'WEBM_OPUS';
              streamingConfig.sampleRateHertz = 48000;
            } else if (message.length > 12 && message.slice(0, 4).toString() === 'RIFF') {
              // WAV file detection
              logger.info('Detected WAV format in audio stream');
              // Extract sample rate from WAV header (bytes 24-27)
              const sampleRate = message.readUInt32LE(24);
              streamingConfig.sampleRateHertz = sampleRate;
              logger.info(`WAV sample rate: ${sampleRate}Hz`);
            }
          }
          
          // Process the streaming audio
          handleStreamingAudio(ws, audioStream, streamingConfig);
        }
        
        // Write audio data to the stream
        audioStream.write(message);
      } else if (message.toString() === 'END_STREAM') {
        // End the audio stream when client signals completion
        logger.info('Received end stream signal');
        audioStream.end();
        isStreaming = false;
      }
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        error: 'Failed to process audio data'
      }));
    }
  });
  
  ws.on('close', () => {
    logger.info('Voice streaming connection closed');
    if (isStreaming) {
      audioStream.end();
      isStreaming = false;
    }
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    if (isStreaming) {
      audioStream.end();
      isStreaming = false;
    }
  });
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Voice streaming connection established' 
  }));
}

/**
 * Process streaming audio data
 * @param {WebSocket} ws - WebSocket connection to respond on
 * @param {Stream} audioStream - Stream of audio data
 * @param {Object} config - Configuration for speech recognition
 */
async function handleStreamingAudio(ws, audioStream, config) {
  try {
    // Start streaming recognition
    voiceService.streamingSpeechToText(audioStream, config)
      .then(async (transcription) => {
        ws.send(JSON.stringify({
          type: 'transcription',
          text: transcription
        }));
        
        // Process with Gemini AI once we have the transcription
        try {
          // Start a new chat session for this streaming request
          const { sessionId, message } = await geminiService.startChat("voice_stream");
          
          // Send the transcribed text to get a response
          const { response } = await geminiService.sendMessage(sessionId, transcription);
          
          ws.send(JSON.stringify({
            type: 'ai_response',
            text: response
          }));
          
          // Generate speech from AI response
          try {
            const audioResponse = await voiceService.textToSpeechAudio(response);
            
            // Send audio in chunks to handle potentially large responses
            const chunkSize = 16000; // Adjust based on your needs
            for (let i = 0; i < audioResponse.length; i += chunkSize) {
              const chunk = audioResponse.slice(i, i + chunkSize);
              ws.send(chunk);
            }
            
            // Signal end of audio
            ws.send(JSON.stringify({
              type: 'audio_end'
            }));
            
          } catch (ttsError) {
            logger.error('Error generating speech from AI response:', ttsError);
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Failed to generate speech from AI response'
            }));
          }
          
        } catch (aiError) {
          logger.error('Error getting AI response:', aiError);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to get AI response'
          }));
        }
      })
      .catch((error) => {
        logger.error('Error in streaming speech recognition:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Speech recognition failed'
        }));
      });
      
  } catch (error) {
    logger.error('Error setting up streaming recognition:', error);
    ws.send(JSON.stringify({
      type: 'error',
      error: 'Failed to set up streaming recognition'
    }));
  }
}

module.exports = {
  initVoiceWebSocket
};
