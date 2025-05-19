/**
 * Voice Controller for handling voice interaction endpoints
 * This controller manages the API routes for voice input and output
 */

const voiceService = require('../services/voice/voiceService');
const geminiService = require('../services/ai gemini/geminiService');
const logger = require('../utils/logging/logger');

/**
 * Process audio input and return a text response from the AI assistant
 * @param {Object} req - Express request object with audio data
 * @param {Object} res - Express response object
 */
async function processVoiceInput(req, res) {
  try {
    const { audio, audioConfig } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    logger.info('Received voice input request', {
      contentType: req.headers['content-type'],
      audioConfig: audioConfig
    });

    // Convert speech to text
    const transcribedText = await voiceService.speechToText(audio, audioConfig);
    
    if (!transcribedText || transcribedText.trim() === '') {
      return res.status(400).json({ error: 'Could not transcribe audio, please try again' });
    }

    logger.info('Successfully transcribed voice input', { 
      text: transcribedText.substring(0, 100) + (transcribedText.length > 100 ? '...' : '')
    });

    // Process with Gemini AI
    const aiResponse = await geminiService.get_emergency_advice(transcribedText);
    
    logger.info('Received AI response for voice query', {
      responseLength: aiResponse.length
    });

    // Return text response
    res.status(200).json({
      success: true,
      transcribedText,
      aiResponse
    });
  } catch (error) {
    logger.error('Error processing voice input:', error);
    res.status(500).json({ error: 'Error processing voice input', message: error.message });
  }
}

/**
 * Process audio input and return audio response from the AI assistant
 * @param {Object} req - Express request object with audio data
 * @param {Object} res - Express response object
 */
async function processVoiceConversation(req, res) {
  try {
    const { audio, audioConfig, voiceConfig } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    logger.info('Received voice conversation request');

    // Convert speech to text
    const transcribedText = await voiceService.speechToText(audio, audioConfig);
    
    if (!transcribedText || transcribedText.trim() === '') {
      return res.status(400).json({ error: 'Could not transcribe audio, please try again' });
    }

    // Process with Gemini AI
    const aiResponse = await geminiService.get_emergency_advice(transcribedText);
    
    // Convert AI text response back to speech
    const audioResponse = await voiceService.textToSpeechAudio(aiResponse, voiceConfig);
    
    logger.info('Successfully processed voice conversation', {
      transcribedTextLength: transcribedText.length,
      aiResponseLength: aiResponse.length,
      audioResponseLength: audioResponse.length
    });

    // Return audio response
    res.set('Content-Type', 'audio/mp3');
    res.send(audioResponse);
  } catch (error) {
    logger.error('Error processing voice conversation:', error);
    res.status(500).json({ error: 'Error processing voice conversation', message: error.message });
  }
}

/**
 * Stream voice input and get streaming AI response
 * @param {Object} req - Express request object with WebSocket connection
 * @param {Object} res - Express response object
 */
async function handleStreamingVoice(req, res) {
  try {
    // This endpoint should be called as a WebSocket connection
    // The actual implementation will be in a separate WebSocket handler
    res.status(400).json({ 
      error: 'Streaming voice should use the WebSocket endpoint',
      message: 'Please connect to the WebSocket endpoint for streaming voice capabilities'
    });
  } catch (error) {
    logger.error('Error with streaming voice request:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}

/**
 * Convert text to speech without AI processing
 * @param {Object} req - Express request object with text data
 * @param {Object} res - Express response object
 */
async function textToSpeech(req, res) {
  try {
    const { text, voiceConfig } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    logger.info('Received text-to-speech request', {
      textLength: text.length
    });

    // Convert text to speech
    const audioResponse = await voiceService.textToSpeechAudio(text, voiceConfig);
    
    logger.info('Successfully converted text to speech', {
      audioLength: audioResponse.length
    });

    // Return audio response
    res.set('Content-Type', 'audio/mp3');
    res.send(audioResponse);
  } catch (error) {
    logger.error('Error converting text to speech:', error);
    res.status(500).json({ error: 'Error converting text to speech', message: error.message });
  }
}

module.exports = {
  processVoiceInput,
  processVoiceConversation,
  handleStreamingVoice,
  textToSpeech
};
