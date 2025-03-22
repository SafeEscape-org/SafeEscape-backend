const express = require("express");
const router = express.Router();
const geminiService = require("../services/ai gemini/geminiService");

/**
 * Initialize a new chat session
 */
router.post("/chat/start", async (req, res) => {
  try {
    const { emergencyType, location } = req.body;
    const result = await geminiService.startChat(emergencyType, location);
    
    return res.status(200).json({
      success: true,
      sessionId: result.sessionId,
      message: result.message
    });
  } catch (error) {
    console.error("Error starting chat session:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to start emergency chat session"
    });
  }
});

/**
 * Send a message to an existing chat session
 */
router.post("/chat/message", async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: "Session ID and message are required"
      });
    }

    const result = await geminiService.sendMessage(sessionId, message);
    
    return res.status(200).json({
      success: true,
      response: result.response
    });
  } catch (error) {
    console.error("Error in chat message:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process message"
    });
  }
});

/**
 * Get chat history for a session
 */
router.get("/chat/:sessionId/history", (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = geminiService.getSessionHistory(sessionId);
    
    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      error: error.message || "Chat session not found"
    });
  }
});

/**
 * End a chat session
 */
router.post("/chat/:sessionId/end", (req, res) => {
  try {
    const { sessionId } = req.params;
    geminiService.endSession(sessionId);
    
    return res.status(200).json({
      success: true,
      message: "Chat session ended"
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      error: error.message || "Chat session not found"
    });
  }
});

module.exports = router;