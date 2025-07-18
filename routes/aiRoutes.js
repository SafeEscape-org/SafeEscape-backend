const express = require('express');
const router = express.Router();
const { imageUpload, handleUploadError, validateFileBuffer } = require('../middleware/security/fileUpload');
const { uploadLimiter } = require('../middleware/security/rateLimiter');

const evacuationOptimizer = require('../services/vertexai/evacuationOptimizer');
const emergencyChatbot = require('../services/vertexai/emergencyChatbot');
const disasterPredictionService = require('../services/vertexai/disasterPrediction');

// Emergency chatbot endpoint
router.post('/chat', async (req, res) => {
  try {
    const { query, location, userContext } = req.body;
    // console.log(req.body);
    if (!query || !location) {
      return res.status(400).json({
        success: false,
        error: 'Query and location are required'
      });
    }

    const response = await emergencyChatbot.getEmergencyResponse(
      query,
      location,
      userContext || {}
    );

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Disaster prediction endpoint
router.post('/predict', async (req, res) => {
  try {
    const { location } = req.body;

    if (!location || !location.city) {
      return res.status(400).json({
        success: false,
        error: 'Location with city is required'
      });
    }

    const prediction = await disasterPredictionService.getPredictiveAnalysis(location);
    console.log(prediction);
    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Evacuation route optimization endpoint
router.post('/evacuation', async (req, res) => {
  try {
    const { location, disasterData, userProfile } = req.body;

    if (!location || !disasterData) {
      return res.status(400).json({
        success: false,
        error: 'Location and disaster data are required'
      });
    }

    const route = await evacuationOptimizer.optimizeEvacuationRoute(
      location,
      disasterData,
      userProfile || {}
    );

    res.status(200).json({
      success: true,
      data: route
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;