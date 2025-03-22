const evacuationOptimizer = require('../services/vetex ai/evacuationOptimizer');
const mapService = require('../services/mapServices/googleMapsClient');

const evacuationController = {
  /**
   * Smart evacuation route optimization with fallback
   * Uses Vertex AI for intelligence with map-based fallback for reliability
   */
  async getOptimizedRoute(req, res) {
    try {
      const { userLocation, disasterData, userProfile } = req.body;
      
      // Input validation
      if (!userLocation || !userLocation.lat || !userLocation.lng) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid user location required' 
        });
      }
      
      let optimizedRoute;
      let routeSource = 'ai';
      
      try {
        // Try AI-powered optimization first
        console.log('Attempting AI-powered evacuation optimization');
        optimizedRoute = await evacuationOptimizer.optimizeEvacuationRoute(
          userLocation,
          disasterData,
          userProfile || {}
        );
      } catch (aiError) {
        // If AI fails, fall back to map-based evacuation
        console.warn('AI evacuation failed, falling back to map-based routing:', aiError.message);
        routeSource = 'map';
        
        // Get safe locations using map service
        const safeLocations = await mapService.findNearbySafeLocations(userLocation, 10000);
        if (!safeLocations || safeLocations.length === 0) {
          throw new Error('No safe locations found');
        }
        
        // Get routes to the closest safe location
        const routes = await mapService.getRoutes(userLocation, safeLocations[0].location);
        
        // Format as simplified optimized route
        optimizedRoute = {
          route: routes,
          destination: safeLocations[0],
          reasoning: "Route calculated using map service (AI optimization unavailable)",
          specialInstructions: "Follow standard evacuation procedures",
          allOptions: safeLocations.slice(0, 3).map(loc => ({
            location: loc,
            distance: loc.distance
          }))
        };
      }
      
      return res.status(200).json({
        success: true,
        data: optimizedRoute,
        source: routeSource
      });
    } catch (error) {
      console.error('Evacuation optimization error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to optimize evacuation route',
        message: error.message 
      });
    }
  },
  
  /**
   * Get basic evacuation route without AI optimization
   * For users who prefer simpler, faster routes or where AI optimization isn't needed
   */
  async getBasicEvacuationRoute(req, res) {
    try {
      const { lat, lng, evacuationType } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Valid location coordinates required'
        });
      }
      
      const userLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
      
      // Filter by evacuation type if provided
      const safeLocations = await mapService.findNearbySafeLocations(
        userLocation, 
        10000, 
        evacuationType
      );
      
      if (!safeLocations || safeLocations.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No safe locations found'
        });
      }
      
      // Get routes to closest location
      const routes = await mapService.getRoutes(userLocation, safeLocations[0].location);
      
      return res.status(200).json({
        success: true,
        data: {
          route: routes,
          destination: safeLocations[0],
          alternativeDestinations: safeLocations.slice(1, 4)
        }
      });
    } catch (error) {
      console.error('Error finding evacuation route:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to find evacuation route'
      });
    }
  },
  
  /**
   * Get nearby safe locations without calculating routes
   * For displaying safe locations on a map
   */
  async getSafeLocations(req, res) {
    try {
      const { lat, lng, radius = 10000, type } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Valid location coordinates required'
        });
      }
      
      const userLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
      const safeLocations = await mapService.findNearbySafeLocations(
        userLocation, 
        parseInt(radius),
        type
      );
      
      return res.status(200).json({
        success: true,
        data: safeLocations
      });
    } catch (error) {
      console.error('Error finding safe locations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to find safe locations'
      });
    }
  }
};

module.exports = evacuationController;