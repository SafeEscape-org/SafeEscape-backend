// Import the Vertex AI client
const { VertexAI } = require('@google-cloud/vertexai');
const openWeatherService = require('../alertServices/openWeatherService');
const usgsEarthquakeService = require('../alertServices/usgsEarthquakeService');
const path = require('path');
require('dotenv').config();

// Set the path to the Vertex AI service account key file
const vertexAIKeyPath = path.resolve(__dirname, '../../config/vertexai-service-Account.json');

// Set environment variable for Vertex AI operations
process.env.GOOGLE_APPLICATION_CREDENTIALS = vertexAIKeyPath;

// Initialize Vertex AI with explicit credentials
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID || 'safeescape',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
  keyFilename: vertexAIKeyPath,
});

// Initialize different models for different disaster prediction tasks
let geminiPro;
let imageAnalysisModel;

try {
  geminiPro = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generation_config: {
      max_output_tokens: 1024,
      temperature: 0.2,
      top_p: 0.95,
      top_k: 40
    }
  });

  imageAnalysisModel = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-pro-vision',
    generation_config: {
      max_output_tokens: 1024,
      temperature: 0.1,
      top_p: 0.95,
      top_k: 40
    }
  });
  
  console.log('Successfully initialized Vertex AI models');
} catch (error) {
  console.error('Error initializing Vertex AI models:', error.message);
}

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
      
      // Check if we have access to the Gemini model
      if (!geminiPro) {
        console.log('Gemini model not available, using fallback');
        return this.getDefaultRiskAssessment(location);
      }
      
      // Get historical disaster data
      const historicalData = this.getHistoricalDisasterData(location);
      
      // Get current environmental conditions
      const currentConditions = await this.getCurrentConditions(location);
      
      // Create prompt for predictive analysis
      const prompt = `
        Based on historical disaster data and current environmental conditions, 
        analyze the potential disaster risks for ${location.city || 'Unknown'}, ${location.state || 'Unknown'}, ${location.country || 'India'}.
        
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
      `;
      
      try {
        // Generate prediction using Gemini 1.5 Pro
        const result = await geminiPro.generateContent(prompt);
        
        // Fix: Access the text content correctly based on the API response structure
        let responseText;
        if (result.response && typeof result.response.text === 'function') {
          responseText = result.response.text();
        } else if (result.response && result.response.candidates && result.response.candidates[0]) {
          // Alternative structure
          responseText = result.response.candidates[0].content.parts[0].text;
        } else if (result.candidates && result.candidates[0]) {
          // Another possible structure
          responseText = result.candidates[0].content.parts[0].text;
        } else {
          console.log('Unexpected response structure:', JSON.stringify(result, null, 2));
          throw new Error('Unable to extract text from AI response');
        }
        
        try {
          // Clean the response text to handle markdown code blocks
          let cleanedText = responseText;
          
          // Check if the response contains markdown code blocks
          const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            cleanedText = jsonBlockMatch[1].trim();
          }
          
          // Parse the JSON response
          return JSON.parse(cleanedText);
        } catch (parseError) {
          console.error('Error parsing model response:', parseError);
          // Fall back to text extraction if JSON parsing fails
          return this.extractStructuredData(responseText);
        }
      } catch (aiError) {
        console.error('AI model error:', aiError.message);
        // Check if it's a permission error
        if (aiError.message.includes('PERMISSION_DENIED') || 
            aiError.message.includes('Permission') || 
            aiError.code === 403) {
          console.log('Permission denied for AI model, using fallback data');
        }
        return this.getDefaultRiskAssessment(location);
      }
    } catch (error) {
      console.error('Prediction error:', error);
      // Return default risk assessment
      return this.getDefaultRiskAssessment(location);
    }
  },

  async analyzeSatelliteImage(imageUrl, location) {
    try {
      // This method would analyze satellite images for disaster prediction
      const prompt = `
        Analyze this satellite image of ${location.city || 'Unknown'}, ${location.state || 'Unknown'}.
        Identify any visible signs of:
        1. Flooding or water accumulation
        2. Fire or smoke
        3. Storm damage
        4. Landslides or soil erosion
        5. Other potential hazards

        Format your response as JSON with this structure:
        {
          "detectedHazards": [
            {
              "hazardType": "type of hazard",
              "confidence": "Low/Medium/High",
              "location": "description of location in image",
              "recommendations": ["recommendation1", "recommendation2"]
            }
          ],
          "overallAssessment": "description of the overall situation"
        }
      `;

      const imageContent = {
        inlineData: {
          data: Buffer.from(imageUrl).toString('base64'),
          mimeType: 'image/jpeg',
        },
      };

      const result = await imageAnalysisModel.generateContent([prompt, imageContent]);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Image analysis error:', error);
      return {
        detectedHazards: [],
        overallAssessment: "Unable to analyze image due to technical issues."
      };
    }
  },

  extractStructuredData(text) {
    // Fallback method to extract structured data from text if JSON parsing fails
    // Implementation would depend on the expected format
    // This is a simple placeholder
    return {
      risks: [
        {
          disasterType: "Unknown",
          riskLevel: "Medium",
          indicators: ["AI response formatting error"],
          precautions: ["Monitor official emergency channels"]
        }
      ],
      overallRiskLevel: "Medium",
      validityPeriod: "72 hours from now"
    };
  },

  getDefaultRiskAssessment(location) {
    // Provide default risk assessment based on location and season
    const currentMonth = new Date().getMonth();
    const city = location.city || 'Unknown';
    let defaultAssessment = {
      risks: [],
      overallRiskLevel: "Low",
      validityPeriod: "72 hours from now"
    };

    // Basic seasonal risks for India
    if (currentMonth >= 5 && currentMonth <= 8) { // June-September: Monsoon
      defaultAssessment.risks.push({
        disasterType: "Flood",
        riskLevel: "Medium",
        indicators: ["Monsoon season", "Historical flood patterns"],
        precautions: ["Avoid low-lying areas", "Keep emergency supplies ready"]
      });
    } else if (currentMonth >= 2 && currentMonth <= 4) { // March-May: Summer
      defaultAssessment.risks.push({
        disasterType: "Heatwave",
        riskLevel: "Medium",
        indicators: ["Summer season", "Historical temperature patterns"],
        precautions: ["Stay hydrated", "Avoid outdoor activities during peak heat"]
      });
    }

    // Add a generic risk
    defaultAssessment.risks.push({
      disasterType: "General Emergency",
      riskLevel: "Low",
      indicators: ["Standard preparedness"],
      precautions: ["Stay informed via local news", "Keep emergency contacts handy"]
    });

    return defaultAssessment;
  },

  getHistoricalDisasterData(location) {
    const city = location.city || '';
    // Check if we have historical data for this city
    if (historicalDisasterData[city]) {
      return historicalDisasterData[city];
    }
    
    // Return default data if no city-specific data exists
    return historicalDisasterData['default'];
  },

  // Complete the getCurrentConditions method
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
      
      // Return the conditions
      return {
        weather: {
          temperature: weather.main?.temp || 25,
          humidity: weather.main?.humidity || 50,
          windSpeed: weather.wind?.speed || 10,
          conditions: weather.weather?.[0]?.main || 'Clear'
        },
        // Add more environmental data as needed
        season: this.getCurrentSeason(),
        recentEvents: []
      };
    } catch (error) {
      console.error('Error getting current conditions:', error);
      // Default values if anything fails
      return {
        weather: {
          temperature: 25,
          humidity: 50,
          windSpeed: 10,
          conditions: 'Clear'
        },
        season: this.getCurrentSeason(),
        recentEvents: []
      };
    }
  },
  
  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Summer';
    if (month >= 5 && month <= 8) return 'Monsoon';
    if (month >= 9 && month <= 10) return 'Autumn';
    return 'Winter';
  }
};

module.exports = disasterPredictionService;