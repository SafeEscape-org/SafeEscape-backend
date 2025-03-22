const { Client } = require('@googlemaps/google-maps-services-js');
const axios = require('axios'); 
const config = require('../../config/apiConfig');

// Add this at the top to verify API key is loaded
console.log('Google Maps API Key available:', !!config.google.mapsApiKey);

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lat2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const mapService = {
    // Get directions between two points
    async getDirections(origin, destination, mode = 'driving') {
        try {
            // Format coordinates if they're provided as strings
            const formatLocation = (location) => {
                if (typeof location === 'string') {
                    // Check if it's coordinates (contains comma)
                    if (location.includes(',')) {
                        const [lat, lng] = location.split(',').map(Number);
                        return { lat, lng };
                    }
                    // If it's a place name, return as is
                    return location;
                }
                return location;
            };

            const formattedOrigin = formatLocation(origin);
            const formattedDestination = formatLocation(destination);

            console.log('Getting directions:', {
                origin: formattedOrigin,
                destination: formattedDestination,
                mode
            });

            const response = await googleMapsClient.directions({
                params: {
                    origin: formattedOrigin,
                    destination: formattedDestination,
                    mode: mode,
                    alternatives: true,
                    avoid: ['tolls', 'highways'],
                    key: config.google.mapsApiKey,
                    language: 'en',
                    region: 'in' // Add region parameter for India
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Directions API error: ${response.data.status}`);
            }

            return response.data.routes;
        } catch (error) {
            console.error('Error getting directions:', error);
            throw error;
        }
    },

    // Get distance matrix for multiple origins/destinations
    async getDistanceMatrix(origins, destinations) {
        try {
            const response = await googleMapsClient.distancematrix({
                params: {
                    origins: origins,
                    destinations: destinations,
                    mode: 'driving',
                    key: config.google.mapsApiKey
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Distance Matrix API error: ${response.data.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error getting distance matrix:', error);
            throw error;
        }
    },

    // Geocode an address to coordinates
    async geocodeAddress(address) {
        try {
            const response = await googleMapsClient.geocode({
                params: {
                    address: address,
                    key: config.google.mapsApiKey
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Geocoding API error: ${response.data.status}`);
            }

            return response.data.results[0].geometry.location;
        } catch (error) {
            console.error('Error geocoding address:', error);
            throw error;
        }
    },

    // Find nearby safe locations
    async findNearbySafeLocations(userLocation, radius = 5000, type = null) {
        console.log('Finding safe locations near:', userLocation);
        
        try {
            // Define safe place types
            const safeTypes = type ? [type] : [
                'hospital', 'police', 'fire_station', 'school', 'stadium', 
                'community_center', 'government_office', 'university'
            ];
            
            // Search for each type in parallel
            const searchPromises = safeTypes.map(async (placeType) => {
                console.log(`Searching for ${placeType} places...`);
                
                const params = {
                    location: `${userLocation.lat},${userLocation.lng}`,
                    radius: Math.min(50000, Math.max(1000, radius)), // Between 1km and 50km
                    type: placeType,
                    key: config.google.mapsApiKey // Use the key from config, not process.env
                };
                
                // Log request params (without API key for security)
                console.log('Request params:', { ...params, key: '[REDACTED]' });
                
                const response = await axios.get(
                    'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
                    { params }
                );
                
                console.log(`Found ${response.data.results.length} ${placeType} places`);
                
                return response.data.results.map(place => ({
                    name: place.name,
                    location: {
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng
                    },
                    address: place.vicinity,
                    placeId: place.place_id,
                    type: placeType,
                    distance: calculateDistance(
                        userLocation.lat, 
                        userLocation.lng, 
                        place.geometry.location.lat, 
                        place.geometry.location.lng
                    )
                }));
            });
            
            // Wait for all searches to complete
            const resultsArrays = await Promise.all(searchPromises);
            
            // Flatten array and sort by distance
            const allLocations = resultsArrays
                .flat()
                .sort((a, b) => a.distance - b.distance);
            
            console.log(`Total safe locations found: ${allLocations.length}`);
            
            return allLocations;
        } catch (error) {
            console.error('Error finding safe locations:', error);
            // Return empty array instead of throwing to avoid hard failures
            return [];
        }
    }
};

module.exports = mapService;