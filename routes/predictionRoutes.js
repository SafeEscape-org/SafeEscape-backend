const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

// Get disaster prediction for a location
router.get('/risk-assessment', predictionController.getPrediction);

// Analyze satellite image for disaster indicators
router.post('/analyze-image', predictionController.analyzeSatelliteImage);

// Get current weather and environmental conditions
router.get('/current-conditions', predictionController.getCurrentConditions);

// Get historical disaster data for a location
router.get('/historical-data', predictionController.getHistoricalData);

// Get comprehensive risk report (combines multiple data sources)
router.get('/comprehensive-report', predictionController.getComprehensiveRiskReport);

module.exports = router;