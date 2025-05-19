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

    // Convert speech to text - ensure audioConfig is properly passed
    const transcribedText = await voiceService.speechToText(audio, audioConfig || {
      encoding: 'LINEAR16',
      sampleRateHertz: 48000,
      languageCode: 'en-US'
    });
    
    if (!transcribedText || transcribedText.trim() === '') {
      return res.status(400).json({ error: 'Could not transcribe audio, please try again' });
    }

    logger.info('Successfully transcribed voice input', { 
      text: transcribedText.substring(0, 100) + (transcribedText.length > 100 ? '...' : '')
    });    // Process with Gemini AI - start a new chat session for this voice request
    const { sessionId, message } = await geminiService.startChat("voice_query");
    
    // Send the transcribed text to get a response
    const { response } = await geminiService.sendMessage(sessionId, transcribedText);
    
    logger.info('Received AI response for voice query', {
      responseLength: response.length
    });    // Return text response
    res.status(200).json({
      success: true,
      transcribedText,
      aiResponse: response
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

    // Convert speech to text - ensure audioConfig is properly passed
    const transcribedText = await voiceService.speechToText(audio, audioConfig || {
      encoding: 'LINEAR16',
      sampleRateHertz: 48000,
      languageCode: 'en-US'
    });
    
    if (!transcribedText || transcribedText.trim() === '') {
      return res.status(400).json({ error: 'Could not transcribe audio, please try again' });
    }

    // Process with Gemini AI - start a new chat session for each voice request
    const { sessionId, message } = await geminiService.startChat("voice_query");
    
    // Send the transcribed text to get a response
    const { response } = await geminiService.sendMessage(sessionId, transcribedText);
    
    // Convert AI text response back to speech
    const audioResponseBase64 = await voiceService.textToSpeechAudio(response, voiceConfig);
    const audioResponse = Buffer.from(audioResponseBase64, 'base64');
      
    logger.info('Successfully processed voice conversation', {
      transcribedTextLength: transcribedText.length,
      aiResponseLength: response.length,
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
    const audioResponseBase64 = await voiceService.textToSpeechAudio(text, voiceConfig);
    const audioResponse = Buffer.from(audioResponseBase64, 'base64');
    
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

/**
 * Diagnostic endpoint to check audio size and format
 * @param {Object} req - Express request object with audio data
 * @param {Object} res - Express response object
 */
async function diagnoseSpeechInput(req, res) {
  try {
    const { audio, audioConfig } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Calculate size and details
    const audioSizeKB = Math.round(audio.length * 3/4 / 1024); // Approximate base64 to binary size
    
    // Check a small sample of the data and look for format identifiers
    const audioSample = audio.substring(0, 20) + '...';
    const audioBuffer = Buffer.from(audio, 'base64');
    
    // Try to detect audio format from first few bytes
    let detectedFormat = 'unknown';
    let detectedSampleRate = 'unknown';
    
    if (audioBuffer.length > 12) {
      if (audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
        detectedFormat = 'WAV';
        // Extract sample rate from WAV header (bytes 24-27)
        detectedSampleRate = audioBuffer.readUInt32LE(24) + ' Hz';
      } else if (audioBuffer.toString('ascii', 0, 4).includes('webm') || 
                 audioBuffer.toString('ascii', 0, 4).includes('WEBM')) {
        detectedFormat = 'WEBM';
        detectedSampleRate = '48000 Hz (typical for WebM)';
      }
    }
    
    // Return diagnostic info
    res.status(200).json({
      success: true,
      diagnostics: {
        audioSizeKB,
        audioSample,
        detectedFormat,
        detectedSampleRate,
        configProvided: !!audioConfig,
        audioConfig: audioConfig || 'Not provided'
      },
      recommendations: {
        suggestedEncoding: detectedFormat === 'WEBM' ? 'WEBM_OPUS' : 'LINEAR16',
        suggestedSampleRate: detectedFormat === 'WEBM' ? 48000 : 16000
      },
      message: `Audio received (${audioSizeKB} KB). Detected format: ${detectedFormat}. If this is working but the full API isn't, the issue might be with size limits or processing.`
    });
  } catch (error) {
    logger.error('Error in audio diagnostics:', error);
    res.status(500).json({ error: 'Error diagnosing audio input', message: error.message });
  }
}

module.exports = {
  processVoiceInput,
  processVoiceConversation,
  handleStreamingVoice,
  textToSpeech,
  diagnoseSpeechInput
};
