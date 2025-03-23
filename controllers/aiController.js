const disasterImageService = require('../services/ai/disasterImageAnalysis');
const evacuationOptimizer = require('../services/ai/evacuationOptimizer');
const emergencyChatbot = require('../services/ai/emergencyChatbot');
const disasterPredictionService = require('../services/ai/disasterPrediction');
const multer = require('multer');

// Configure multer for image uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

exports.analyzeDisasterImage = [
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }
      
      const analysis = await disasterImageService.analyzeDisasterImage(req.file.buffer);
      
      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error in disaster image analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
];

exports.getEmergencyResponse = async (req, res) => {
  try {
    const { query, location, userContext } = req.body;
    
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
    console.error('Error getting emergency response:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getDisasterPrediction = async (req, res) => {
  try {
    const { location } = req.body;
    
    if (!location || !location.city || !location.state) {
      return res.status(400).json({
        success: false,
        error: 'Location with city and state is required'
      });
    }
    
    const prediction = await disasterPredictionService.getPredictiveAnalysis(location);
    
    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Error getting disaster prediction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};