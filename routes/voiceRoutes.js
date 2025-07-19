/**
 * Voice API Routes for SafeEscape application
 * Provides endpoints for voice interaction with the emergency assistant
 */

const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const debugMiddleware = require('../middleware/debugMiddleware');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth/auth');
const { validateVoiceInput } = require('../middleware/security/inputValidator');

// Apply debug middleware if needed
router.use(debugMiddleware);

// Process voice input and return text response (Speech-to-Text + AI)
router.post('/input', validateVoiceInput, voiceController.processVoiceInput);

// Process voice input and return voice response (Speech-to-Text + AI + Text-to-Speech)
router.post('/conversation', validateVoiceInput, voiceController.processVoiceConversation);

// Text to Speech conversion
router.post('/tts', voiceController.textToSpeech);

// Diagnose speech input and provide feedback
router.post('/diagnose', validateVoiceInput, voiceController.diagnoseSpeechInput);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Voice API is operational' });
});

module.exports = router;
