const express = require('express');
const router = express.Router();
const geminiService = require('../services/ai gemini/geminiService');

// Start a new chat session
router.post('/chat', async (req, res) => {
  try {
    const { emergencyType, location } = req.body;
    const result = await geminiService.startChat(emergencyType || 'general', location || 'unknown');
    res.json(result);
  } catch (error) {
    console.error('Error starting chat:', error);
    res.status(500).json({ error: 'Failed to start chat session' });
  }
});

// Send a message to an existing chat
router.post('/chat/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const result = await geminiService.sendMessage(sessionId, message);
    res.json(result);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// Get chat history
router.get('/chat/:sessionId/history', (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = geminiService.getSessionHistory(sessionId);
    res.json({ history });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: error.message || 'Failed to get chat history' });
  }
});

// End a chat session
router.delete('/chat/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = geminiService.endSession(sessionId);
    res.json({ success: result });
  } catch (error) {
    console.error('Error ending chat session:', error);
    res.status(500).json({ error: error.message || 'Failed to end chat session' });
  }
});

module.exports = router;