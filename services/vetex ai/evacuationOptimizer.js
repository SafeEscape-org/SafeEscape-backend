const { VertexAI } = require('@google-cloud/vertexai');
const mapService = require('../mapServices/googleMapsClient');
require('dotenv').config();

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
});

const textModel = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-pro',  // Upgraded from gemini-pro to gemini-1.5-pro
  generation_config: {
    max_output_tokens: 1024,
    temperature: 0.2,     // Keep low temperature for consistency
    top_p: 0.95,
    top_k: 40
  }
});

const evacuationOptimizer = {
  async optimizeEvacuationRoute(userLocation, disasterData, userProfile) {
    try {
      console.log('Finding safe locations near:', userLocation);
      // Get basic routes from Google Maps
      const safeLocations = await mapService.findNearbySafeLocations(userLocation, 10000);
      
      if (!safeLocations || safeLocations.length === 0) {
        throw new Error('No safe locations found');
      }
      
      console.log(`Found ${safeLocations.length} safe locations`);
      
      // Get routes to top 3 safe locations
      const topLocations = safeLocations.slice(0, 3);
      console.log('Getting directions to top locations');
      
      const routes = await Promise.all(
        topLocations.map(location => 
          mapService.getDirections(
            `${userLocation.lat},${userLocation.lng}`,
            `${location.geometry.location.lat},${location.geometry.location.lng}`
          )
        )
      );
      
      // Prepare data for Vertex AI analysis
      const routesData = routes.map((route, index) => {
        if (!route || !route[0] || !route[0].legs || !route[0].legs[0]) {
          return {
            destination: topLocations[index].name,
            distance: 'Unknown',
            duration: 'Unknown',
            steps: 0,
            trafficLevel: 'Unknown'
          };
        }
        
        return {
          destination: topLocations[index].name,
          destinationType: topLocations[index].types.join(', '),
          distance: route[0].legs[0].distance.text,
          duration: route[0].legs[0].duration.text,
          steps: route[0].legs[0].steps.length,
          trafficLevel: route[0].legs[0].duration_in_traffic?.text || 'Unknown'
        };
      });
      
      console.log('Analyzing routes with Vertex AI');
      
      // Create context for AI decision
      const prompt = `
        I need to evacuate a person from a disaster area. Here are the details:
        
        Person details:
        - Mobility status: ${userProfile.mobilityImpaired ? 'Mobility impaired' : 'Fully mobile'}
        - Has vehicle: ${userProfile.hasVehicle ? 'Yes' : 'No'}
        - With children: ${userProfile.hasChildren ? 'Yes' : 'No'}
        - Medical needs: ${userProfile.medicalNeeds || 'None'}
        
        Disaster details:
        - Type: ${disasterData.type}
        - Severity: ${disasterData.severity}/5
        - Current status: ${disasterData.status}
        
        Available evacuation routes:
        ${JSON.stringify(routesData, null, 2)}
        
        Based on this information, which route is safest and most appropriate? 
        Provide your recommendation and reasoning in JSON format with these fields:
        1. recommendedRouteIndex (0, 1, or 2)
        2. reasoning
        3. specialInstructions
      `;
      
      const result = await textModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const responseText = result.response.candidates[0].content.parts[0].text;
      console.log('Received AI recommendation');
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/{[\s\S]*?}/);
                        
      let recommendation;
      try {
        recommendation = jsonMatch ? 
          JSON.parse(jsonMatch[1] || jsonMatch[0]) : 
          { recommendedRouteIndex: 0, reasoning: "Default selection", specialInstructions: "" };
      } catch (e) {
        console.error("Error parsing AI response:", e);
        recommendation = { recommendedRouteIndex: 0, reasoning: "Default selection", specialInstructions: "" };
      }
      
      // Return the optimized route with AI reasoning
      const selectedIndex = recommendation.recommendedRouteIndex || 0;
      return {
        route: routes[selectedIndex],
        destination: topLocations[selectedIndex],
        reasoning: recommendation.reasoning,
        specialInstructions: recommendation.specialInstructions,
        allOptions: routesData
      };
    } catch (error) {
      console.error('Error optimizing evacuation route:', error);
      throw error;
    }
  }
};

module.exports = evacuationOptimizer;