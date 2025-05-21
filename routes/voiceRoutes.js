/**
 * Voice API Routes for SafeEscape application
 * Provides endpoints for voice interaction with the emergency assistant
 */

const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const debugMiddleware = require('../middleware/debugMiddleware');
const authMiddleware = require('../middleware/auth/auth');

// Apply debug middleware if needed
router.use(debugMiddleware);

// Process voice input and return text response (Speech-to-Text + AI)
router.post('/input', voiceController.processVoiceInput);

// Process voice input and return voice response (Speech-to-Text + AI + Text-to-Speech)
router.post('/conversation', voiceController.processVoiceConversation);

// Text to Speech conversion
router.post('/tts', voiceController.textToSpeech);

// Diagnose speech input and provide feedback
router.post('/diagnose', voiceController.diagnoseSpeechInput);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Voice API is operational' });
});

module.exports = router;
