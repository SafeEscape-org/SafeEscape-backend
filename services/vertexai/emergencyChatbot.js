const { VertexAI } = require('@google-cloud/vertexai');
const noaaWeatherService = require('../alertServices/noaaWeatherService');
const usgsEarthquakeService = require('../alertServices/usgsEarthquakeService');
const openFemaService = require('../alertServices/openFemaService');
const openWeatherService = require('../alertServices/openWeatherService');
require('dotenv').config();

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
});

const chatModel = vertexAI.getGenerativeModel({
  model: 'gemini-pro',
  generation_config: {
    max_output_tokens: 2048,
    temperature: 0.3,
    top_p: 0.9,
    top_k: 40
  }
});

// Cache for alert data to reduce API calls
const alertCache = {
  weatherAlerts: null,
  earthquakes: null,
  disasters: null,
  currentWeather: null,
  lastUpdated: null,
  
  // Cache expiration in milliseconds (5 minutes)
  CACHE_EXPIRATION: 5 * 60 * 1000,
  
  isExpired() {
    return !this.lastUpdated || (Date.now() - this.lastUpdated > this.CACHE_EXPIRATION);
  },
  
  update(data) {
    Object.assign(this, data);
    this.lastUpdated = Date.now();
  }
};

const emergencyChatbot = {
  async getEmergencyResponse(userQuery, userLocation, userContext = {}) {
    try {
      console.log('Processing emergency query:', userQuery);
      
      // Gather contextual information about alerts and conditions
      let alertData;
      
      if (alertCache.isExpired()) {
        console.log('Fetching fresh alert data');
        
        // Fetch alert data in parallel
        const [weatherAlerts, earthquakes, disasters, currentWeather] = await Promise.all([
          this.safeApiCall(() => noaaWeatherService.getWeatherAlerts(userLocation), []),
          this.safeApiCall(() => usgsEarthquakeService.getRecentEarthquakes(userLocation), []),
          this.safeApiCall(() => openFemaService.getDisasterDeclarations(), []),
          this.safeApiCall(() => openWeatherService.getCurrentWeather(userLocation.city || 'Default City'), {})
        ]);
        
        alertData = { weatherAlerts, earthquakes, disasters, currentWeather };
        alertCache.update(alertData);
      } else {
        console.log('Using cached alert data');
        alertData = {
          weatherAlerts: alertCache.weatherAlerts,
          earthquakes: alertCache.earthquakes,
          disasters: alertCache.disasters,
          currentWeather: alertCache.currentWeather
        };
      }
      
      // Create system prompt with emergency context
      const systemPrompt = `
        You are an emergency response assistant for SafeEscape, an emergency management app in India.
        Your goal is to provide clear, actionable advice during emergencies.
        
        Current conditions for the user:
        - Location: ${userLocation.city || 'Unknown'}, ${userLocation.state || 'Unknown'}, India
        - Weather: ${JSON.stringify(alertData.currentWeather)}
        - Active Weather Alerts: ${this.summarizeAlerts(alertData.weatherAlerts)}
        - Recent Earthquakes: ${this.summarizeEarthquakes(alertData.earthquakes)}
        - Disaster Declarations: ${this.summarizeDisasters(alertData.disasters)}
        
        User profile:
        - Medical conditions: ${userContext.medicalConditions || 'None specified'}
        - Mobility status: ${userContext.mobilityStatus || 'Normal'}
        - Family members: ${userContext.familyMembers || 'Unknown'}
        
        Provide concise, step-by-step instructions. Prioritize:
        1. Immediate safety actions
        2. Clear evacuation guidance if needed
        3. First aid instructions if relevant
        4. How to contact emergency services
        
        If you don't know something, say so clearly rather than making up information.
        For medical emergencies, always advise contacting emergency services (112 in India).
        
        USER QUERY: ${userQuery}
      `;
      
      console.log('Sending query to Vertex AI');
      
      // Get response from Vertex AI
      const result = await chatModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
      });
      
      const responseText = result.response.candidates[0].content.parts[0].text;
      console.log('Received AI response');
      
      return {
        response: responseText,
        contextualAlerts: {
          weather: alertData.weatherAlerts,
          earthquakes: alertData.earthquakes,
          disasters: alertData.disasters
        }
      };
    } catch (error) {
      console.error('Error getting emergency response:', error);
      
      // Provide fallback response
      return {
        response: this.getFallbackResponse(userQuery),
        error: error.message,
        contextualAlerts: {}
      };
    }
  },
  
  // Helper method to safely call APIs and handle errors
  async safeApiCall(apiCall, defaultValue) {
    try {
      return await apiCall();
    } catch (error) {
      console.error('API call failed:', error);
      return defaultValue;
    }
  },
  
  // Helper methods to summarize alert data for the prompt
  summarizeAlerts(alerts) {
    if (!alerts || alerts.length === 0) return 'No active alerts';
    
    return alerts.slice(0, 3).map(alert => 
      `${alert.event || 'Alert'}: ${alert.headline || 'No details'}`
    ).join('; ');
  },
  
  summarizeEarthquakes(earthquakes) {
    if (!earthquakes || earthquakes.length === 0) return 'No recent earthquakes';
    
    return earthquakes.slice(0, 3).map(quake => 
      `Magnitude ${quake.magnitude} at ${quake.location || 'Unknown location'}`
    ).join('; ');
  },
  
  summarizeDisasters(disasters) {
    if (!disasters || !Array.isArray(disasters) || disasters.length === 0) {
      return 'No active disaster declarations';
    }
    
    return disasters.slice(0, 3).map(disaster => 
      `${disaster.type || 'Disaster'} in ${disaster.area || 'Unknown area'}`
    ).join('; ');
  },
  
  // Fallback responses for when the AI service fails
  getFallbackResponse(query) {
    const query_lower = query.toLowerCase();
    
    if (query_lower.includes('earthquake')) {
      return "During an earthquake: DROP to the ground, COVER under sturdy furniture, HOLD ON until shaking stops. Stay away from windows and exterior walls. If outdoors, move to an open area away from buildings. After shaking stops, check for injuries and evacuate if necessary. Be prepared for aftershocks. For emergency assistance, call 112.";
    }
    
    if (query_lower.includes('flood')) {
      return "For flooding: Move to higher ground immediately. Avoid walking or driving through flood waters. 6 inches of water can knock you down, and 12 inches can float a vehicle. If trapped in a building, go to the highest level (but not a closed attic). Only get on the roof if necessary. Signal for help. Call 112 for emergency assistance.";
    }
    
    if (query_lower.includes('fire')) {
      return "For fires: If you see smoke or flames, evacuate immediately. Crawl low under smoke. Feel doors before opening - if hot, find another exit. If clothes catch fire: Stop, Drop, and Roll. Meet at your designated meeting spot. Never go back inside a burning building. Call 112 for emergency assistance.";
    }
    
    if (query_lower.includes('medical') || query_lower.includes('injury') || query_lower.includes('hurt')) {
      return "For medical emergencies: Call 112 immediately. Keep the person still if you suspect head, neck or spine injuries. For severe bleeding, apply direct pressure with a clean cloth. If the person is unconscious but breathing, place them in the recovery position (on their side). If not breathing, begin CPR if trained.";
    }
    
    return "I'm having trouble connecting to our emergency response system. Please call 112 for immediate emergency assistance. For disaster information, you can also check local news or the National Disaster Management Authority website at ndma.gov.in.";
  }
};

module.exports = emergencyChatbot;