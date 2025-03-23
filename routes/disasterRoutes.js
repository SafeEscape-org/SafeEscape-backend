const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const geolib = require('geolib');

// Get active disasters for a user based on their location
router.post('/active', async (req, res) => {
  try {
    const { userId, location } = req.body;
    
    // Validate request data
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid location with latitude and longitude is required' 
      });
    }
    
    // Get active disasters from Firebase
    const disastersSnapshot = await admin.firestore()
      .collection('disasters')
      .where('active', '==', true)
      .get();
    
    if (disastersSnapshot.empty) {
      return res.json({ 
        success: true, 
        disasters: [],
        message: 'No active disasters found' 
      });
    }
    
    // Filter disasters by proximity to user
    const userLocation = {
      latitude: location.latitude,
      longitude: location.longitude
    };
    
    const MAX_DISTANCE_KM = 100; // Maximum distance in kilometers
    
    const nearbyDisasters = [];
    
    disastersSnapshot.forEach(doc => {
      const disaster = doc.data();
      disaster.id = doc.id;
      
      // Skip disasters without location data
      if (!disaster.location || !disaster.location.latitude || !disaster.location.longitude) {
        return;
      }
      
      // Calculate distance between user and disaster
      const disasterLocation = {
        latitude: disaster.location.latitude,
        longitude: disaster.location.longitude
      };
      
      const distanceInMeters = geolib.getDistance(userLocation, disasterLocation);
      const distanceInKm = distanceInMeters / 1000;
      
      // Add distance to disaster object
      disaster.distance = {
        meters: distanceInMeters,
        kilometers: distanceInKm
      };
      
      // Only include disasters within the maximum distance
      if (distanceInKm <= MAX_DISTANCE_KM) {
        nearbyDisasters.push(disaster);
      }
    });
    
    // Sort disasters by distance (closest first)
    nearbyDisasters.sort((a, b) => a.distance.meters - b.distance.meters);
    
    // Log user activity if userId is provided
    if (userId) {
      await admin.firestore().collection('userActivity').add({
        userId,
        action: 'disaster_check',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        location
      });
    }
    
    res.json({
      success: true,
      disasters: nearbyDisasters,
      count: nearbyDisasters.length
    });
    
  } catch (error) {
    console.error('Error fetching active disasters:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch active disasters',
      message: error.message 
    });
  }
});

module.exports = router;