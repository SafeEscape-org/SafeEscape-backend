const { VertexAI } = require('@google-cloud/vertexai');
const openWeatherService = require('../alertServices/openWeatherService');
const usgsEarthquakeService = require('../alertServices/usgsEarthquakeService');
require('dotenv').config();

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
});

const predictionModel = vertexAI.getGenerativeModel({
  model: 'gemini-pro',
  generation_config: {
    max_output_tokens: 1024,
    temperature: 0.2,
    top_p: 0.95,
    top_k: 40
  }
});

// Mock historical data by region (in production, this would come from a database)
const historicalDisasterData = {
  'Delhi': [
    { disaster_type: "flood", occurrence: 8, avg_severity: 3.2, months: "Jul-Sep" },
    { disaster_type: "heatwave", occurrence: 15, avg_severity: 4.1, months: "Apr-Jun" },
    { disaster_type: "air_pollution", occurrence: 25, avg_severity: 4.5, months: "Oct-Feb" }
  ],
  'Mumbai': [
    { disaster_type: "flood", occurrence: 18, avg_severity: 4.3, months: "Jun-Sep" },
    { disaster_type: "cyclone", occurrence: 6, avg_severity: 3.8, months: "May-Jun, Oct-Nov" },
    { disaster_type: "landslide", occurrence: 4, avg_severity: 3.5, months: "Jul-Aug" }
  ],
  'Chennai': [
    { disaster_type: "flood", occurrence: 12, avg_severity: 4.0, months: "Oct-Dec" },
    { disaster_type: "cyclone", occurrence: 8, avg_severity: 3.9, months: "Oct-Dec" },
    { disaster_type: "drought", occurrence: 5, avg_severity: 3.2, months: "Mar-Jun" }
  ],
  'Kolkata': [
    { disaster_type: "flood", occurrence: 14, avg_severity: 3.7, months: "Jun-Sep" },
    { disaster_type: "cyclone", occurrence: 10, avg_severity: 4.2, months: "Apr-Jun, Oct-Nov" },
    { disaster_type: "heatwave", occurrence: 7, avg_severity: 3.5, months: "Apr-Jun" }
  ],
  'default': [
    { disaster_type: "flood", occurrence: 10, avg_severity: 3.5, months: "Jun-Sep" },
    { disaster_type: "earthquake", occurrence: 3, avg_severity: 2.8, months: "Any" },
    { disaster_type: "heatwave", occurrence: 8, avg_severity: 3.2, months: "Apr-Jun" }
  ]
};

const disasterPredictionService = {
  async getPredictiveAnalysis(location) {
    try {
      console.log('Generating predictive analysis for:', location);
      
      // Get historical disaster data
      const historicalData = this.getHistoricalDisasterData(location);
      
      // Get current environmental conditions
      const currentConditions = await this.getCurrentConditions(location);
      
      // Create prompt for predictive analysis
      const prompt = `
        Based on historical disaster data and current environmental conditions, 
        analyze the potential disaster risks for ${location.city || 'Unknown'}, ${location.state || 'Unknown'}, India.
        
        Historical disaster data:
        ${JSON.stringify(historicalData, null, 2)}
        
        Current conditions:
        ${JSON.stringify(currentConditions, null, 2)}
        
        Current month: ${new Date().toLocaleString('en-US', { month: 'long' })}
        
        Provide a risk assessment with the following:
        1. Top 3 potential disaster risks in the next 72 hours
        2. Risk level for each (Low, Medium, High, Extreme)
        3. Key indicators supporting this assessment
        4. Recommended precautionary measures
        
        Format your response as JSON with this structure:
        {
          "risks": [
            {
              "disasterType": "type of disaster",
              "riskLevel": "Low/Medium/High/Extreme",
              "indicators": ["indicator1", "indicator2"],
              "precautions": ["precaution1", "precaution2"]
            }
          ],
          "overallRiskLevel": "Low/Medium/High/Extreme",
          "validityPeriod": "72 hours from now"
        }
      `
    } catch (error) {
      // Default values if anything fails
    }
  },

  async getCurrentConditions(location) {
    try {
      // Get weather data with better error handling
      let weather = {};
      try {
        const weatherData = await openWeatherService.getCurrentWeather(location.city || 'Delhi');
        weather = weatherData;
      } catch (error) {
        console.log('Weather API error, using defaults');
        weather = {
          main: { temp: 25, humidity: 50 },
          wind: { speed: 10 },
          weather: [{ main: 'Clear', description: 'clear sky' }]
        };
      }
      
      // Rest of the method...
    } catch (error) {
      // Default values if anything fails
    }
  },

  getHistoricalDisasterData(location) {
    // Implementation of getHistoricalDisasterData method
  }
};

module.exports = disasterPredictionService;