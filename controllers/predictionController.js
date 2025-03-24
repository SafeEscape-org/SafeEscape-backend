const disasterPredictionService = require('../services/vetex ai/disasterPrediction');

/**
 * Get disaster risk assessment for a location
 */
exports.getPrediction = async (req, res) => {
  try {
    const { city, state, lat, lng } = req.query;
    
    if (!city && !(lat && lng)) {
      return res.status(400).json({
        success: false,
        error: 'City name or coordinates (lat/lng) are required'
      });
    }
    
    const location = {
      city: city || 'Unknown',
      state: state || '',
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null
    };
    
    console.log('Getting prediction for location:', location);
    
    const prediction = await disasterPredictionService.getPredictiveAnalysis(location);
    
    // Get current weather conditions for additional context
    const currentConditions = await disasterPredictionService.getCurrentConditions(location);
    
    // Get historical data for context
    const historicalData = await disasterPredictionService.getHistoricalDisasterData(location);
    
    return res.status(200).json({
      success: true,
      data: {
        prediction,
        currentConditions,
        historicalData
      }
    });
  } catch (error) {
    console.error('Error generating prediction:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate disaster prediction',
      message: error.message
    });
  }
};

/**
 * Analyze satellite image for disaster indicators
 */
exports.analyzeSatelliteImage = async (req, res) => {
  try {
    const { imageUrl, city, state } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required'
      });
    }
    
    const location = {
      city: city || 'Unknown',
      state: state || ''
    };
    
    console.log('Analyzing satellite image for location:', location);
    
    const analysis = await disasterPredictionService.analyzeSatelliteImage(
      imageUrl,
      location
    );
    
    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing satellite image:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze satellite image',
      message: error.message
    });
  }
};

/**
 * Get current weather and environmental conditions
 */
exports.getCurrentConditions = async (req, res) => {
  try {
    const { city, state, lat, lng } = req.query;
    
    if (!city && !(lat && lng)) {
      return res.status(400).json({
        success: false,
        error: 'City name or coordinates (lat/lng) are required'
      });
    }
    
    const location = {
      city: city || 'Unknown',
      state: state || '',
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null
    };
    
    const conditions = await disasterPredictionService.getCurrentConditions(location);
    
    return res.status(200).json({
      success: true,
      data: conditions
    });
  } catch (error) {
    console.error('Error fetching current conditions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch current conditions',
      message: error.message
    });
  }
};

/**
 * Get historical disaster data for a location
 */
exports.getHistoricalData = async (req, res) => {
  try {
    const { city, state } = req.query;
    
    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'City name is required'
      });
    }
    
    const location = {
      city,
      state: state || ''
    };
    
    const historicalData = await disasterPredictionService.getHistoricalDisasterData(location);
    
    return res.status(200).json({
      success: true,
      data: historicalData
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch historical disaster data',
      message: error.message
    });
  }
};

/**
 * Get a comprehensive risk report for a location
 * Combines prediction, current conditions, and historical data
 */
exports.getComprehensiveRiskReport = async (req, res) => {
  try {
    const { city, state, lat, lng } = req.query;
    
    if (!city && !(lat && lng)) {
      return res.status(400).json({
        success: false,
        error: 'City name or coordinates (lat/lng) are required'
      });
    }
    
    const location = {
      city: city || 'Unknown',
      state: state || '',
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null
    };
    
    // Execute all requests in parallel for performance
    const [prediction, currentConditions, historicalData] = await Promise.all([
      disasterPredictionService.getPredictiveAnalysis(location),
      disasterPredictionService.getCurrentConditions(location),
      disasterPredictionService.getHistoricalDisasterData(location)
    ]);
    
    // Generate summary insights
    const summary = {
      locationName: `${location.city}, ${location.state}`,
      timestamp: new Date().toISOString(),
      overallRiskLevel: prediction.overallRiskLevel,
      highestRisks: prediction.risks
        .filter(risk => ['high', 'extreme'].includes(risk.riskLevel.toLowerCase()))
        .map(risk => risk.disasterType),
      currentWeatherImpact: currentConditions.weatherRiskAssessment || 'Unknown',
      historicalVulnerability: historicalData.highRiskDisasters || []
    };
    
    return res.status(200).json({
      success: true,
      data: {
        summary,
        prediction,
        currentConditions,
        historicalData
      }
    });
  } catch (error) {
    console.error('Error generating comprehensive risk report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate comprehensive risk report',
      message: error.message
    });
  }
};