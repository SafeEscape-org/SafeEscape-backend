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
    },

    // Find evacuation routes based on user location and disaster type
    async findEvacuationRoutes(location, disasterType = 'general', userPreferences = {}) {
        console.log(`Finding AI-optimized evacuation routes for ${disasterType} disaster`);
        
        try {
            // Get basic evacuation route
            const basicEvacuation = await this.calculateEvacuationRoute(location, disasterType);
            
            // Enhance with additional information
            return {
                origin: location,
                disasterType,
                mainRoute: {
                    destination: basicEvacuation.destination,
                    route: basicEvacuation.route,
                    safetyTips: this.getSafetyTips(disasterType),
                    evacuationInstructions: this.getEvacuationInstructions(disasterType, basicEvacuation.destination)
                },
                alternativeRoutes: basicEvacuation.alternativeRoutes.map(route => ({
                    destination: route.destination,
                    route: route,
                    reason: "Alternative evacuation option"
                }))
            };
        } catch (error) {
            console.error('Error finding AI evacuation routes:', error);
            throw error;
        }
    },

    // Helper method to calculate safety score for a route
    calculateSafetyScore(route, disasterType) {
        let score = 100; // Start with a perfect score
        
        // Adjust based on route distance (longer routes are riskier)
        const distanceKm = route.distance.value / 1000;
        score -= Math.min(30, distanceKm * 2); // Lose up to 30 points for distance
        
        // Adjust based on route duration
        const durationMinutes = route.duration.value / 60;
        score -= Math.min(20, durationMinutes); // Lose up to 20 points for time
        
        // Adjust based on route complexity (number of steps/turns)
        score -= Math.min(15, route.steps.length); // Lose up to 15 points for complexity
        
        // Adjust based on warnings
        if (route.warnings && route.warnings.length > 0) {
            score -= 10 * route.warnings.length;
        }
        
        // Disaster-specific adjustments
        if (disasterType === 'flood' && route.steps.some(step => 
            step.html_instructions.toLowerCase().includes('tunnel') || 
            step.html_instructions.toLowerCase().includes('underpass'))) {
            score -= 40; // Heavy penalty for routes with tunnels during floods
        }
        
        if (disasterType === 'earthquake' && route.steps.some(step => 
            step.html_instructions.toLowerCase().includes('bridge'))) {
            score -= 30; // Penalty for routes with bridges during earthquakes
        }
        
        return Math.max(0, Math.min(100, score)); // Keep score between 0-100
    },

    // Helper method to generate evacuation notes
    getEvacuationNotes(destinationType, disasterType) {
        const notes = [];
        
        // General notes
        notes.push("Move quickly but safely. Don't rush to the point of injury.");
        notes.push("Help others only if you can do so safely.");
        notes.push("Follow instructions from emergency personnel if present.");
        
        // Location-specific notes
        if (destinationType === 'hospital') {
            notes.push("This hospital may be treating disaster victims. Expect crowded conditions.");
            notes.push("Medical assistance will be prioritized based on injury severity.");
        } else if (destinationType === 'school') {
            notes.push("Schools are designated emergency shelters with basic facilities.");
            notes.push("Report to administrative staff upon arrival for registration.");
        } else if (destinationType === 'stadium') {
            notes.push("Large capacity shelter with open space for many evacuees.");
            notes.push("Follow posted signs to designated assembly areas.");
        }
        
        // Disaster-specific notes
        if (disasterType === 'flood') {
            notes.push("Avoid walking through moving water - even 6 inches can knock you down.");
            notes.push("Be aware of areas where floodwaters have receded - roads may be weakened.");
        } else if (disasterType === 'fire') {
            notes.push("Stay low to avoid smoke inhalation if present.");
            notes.push("Cover your nose and mouth with a wet cloth if possible.");
        } else if (disasterType === 'earthquake') {
            notes.push("Watch for fallen power lines, gas leaks, and aftershocks.");
            notes.push("Stay away from damaged buildings and structures.");
        }
        
        return notes;
    },

    // Find safe zones considering disaster type
    async findSafeZones(location, disasterType) {
        console.log(`Finding safe zones near ${location.lat},${location.lng} for disaster type: ${disasterType}`);
        
        try {
            // Determine appropriate place types based on disaster
            const safeTypes = this.getSafeZoneTypes(disasterType);
            
            // Calculate appropriate search radius
            const radius = this.getSearchRadius(disasterType);
            
            // Find nearby places using the existing method
            const allLocations = await this.findNearbySafeLocations(location, radius);
            
            // Filter and prioritize based on disaster type
            const filteredLocations = this.filterLocationsByDisasterType(allLocations, disasterType);
            
            return filteredLocations;
        } catch (error) {
            console.error(`Error finding safe zones for ${disasterType}:`, error);
            return [];
        }
    },

    // Helper to get appropriate safe zone types by disaster
    getSafeZoneTypes(disasterType) {
        switch(disasterType.toLowerCase()) {
            case 'flood':
                return ['school', 'stadium', 'government_office', 'university']; // Elevated buildings
            case 'fire':
                return ['hospital', 'police', 'fire_station', 'school']; // Equipped for emergencies
            case 'earthquake':
                return ['park', 'stadium', 'school', 'open_area']; // Open spaces
            case 'tornado':
            case 'hurricane':
                return ['community_center', 'school', 'stadium']; // Strong structures
            case 'tsunami':
                return ['school', 'stadium', 'government_office']; // Elevated buildings
            default:
                return ['hospital', 'police', 'fire_station', 'school']; // Default safe places
        }
    },

    // Helper to determine search radius based on disaster type
    getSearchRadius(disasterType) {
        switch(disasterType.toLowerCase()) {
            case 'flood':
                return 15000; // 15km - floods may require longer evacuation
            case 'fire':
                return 8000;  // 8km
            case 'tornado':
            case 'hurricane':
                return 20000; // 20km - these disasters affect wide areas
            default:
                return 10000; // 10km default
        }
    },

    // Filter and prioritize locations by disaster type
    filterLocationsByDisasterType(locations, disasterType) {
        return locations.filter(location => {
            // Filter out inappropriate locations based on disaster
            if (disasterType === 'flood' && ['subway_station', 'basement'].includes(location.type)) {
                return false;
            }
            if (disasterType === 'fire' && ['gas_station', 'chemical_plant'].includes(location.type)) {
                return false;
            }
            return true;
        }).sort((a, b) => {
            // Prioritize certain types based on disaster
            const scoreA = this.getLocationSafetyScore(a, disasterType);
            const scoreB = this.getLocationSafetyScore(b, disasterType);
            
            if (scoreA !== scoreB) {
                return scoreB - scoreA; // Higher score first
            }
            return a.distance - b.distance; // Then by distance
        });
    },

    // Calculate safety score for a location based on disaster type
    getLocationSafetyScore(location, disasterType) {
        let score = 3; // Base score
        
        switch(disasterType.toLowerCase()) {
            case 'flood':
                if (location.type === 'school') score += 2;
                if (location.type === 'stadium') score += 2;
                break;
            case 'fire':
                if (location.type === 'fire_station') score += 3;
                if (location.type === 'hospital') score += 2;
                break;
            case 'earthquake':
                if (location.type === 'park') score += 3;
                if (location.type === 'stadium') score += 2;
                break;
        }
        
        return score;
    },

    // Calculate evacuation routes based on user location and disaster type
    async calculateEvacuationRoute(userLocation, disasterType) {
        try {
            // Find safe zones considering the disaster type
            const safeZones = await this.findSafeZones(userLocation, disasterType);
            
            if (safeZones.length === 0) {
                throw new Error('No safe zones found');
            }
            
            // Get top 3 closest safe zones
            const closestSafeZones = safeZones.slice(0, 3);
            
            // Calculate routes to each safe zone
            const routePromises = closestSafeZones.map(zone => 
                this.getDirections(
                    userLocation, 
                    { lat: zone.location.lat, lng: zone.location.lng },
                    disasterType === 'flood' ? 'walking' : 'driving' // Use walking for floods
                )
            );
            
            // Wait for all route calculations
            const routes = await Promise.all(routePromises);
            
            // Select the optimal route
            const optimalRoute = this.selectOptimalRoute(routes, closestSafeZones, disasterType);
            
            return {
                route: optimalRoute.route,
                destination: optimalRoute.destination,
                alternativeRoutes: routes.filter(r => r !== optimalRoute.route)
            };
        } catch (error) {
            console.error('Error calculating evacuation route:', error);
            throw error;
        }
    },

    // Select the optimal route from multiple options
    selectOptimalRoute(routes, safeZones, disasterType) {
        // Combine routes with their destinations
        const routesWithDestinations = routes.map((route, index) => ({
            route: route[0], // Take first route option from each destination
            destination: safeZones[index]
        }));
        
        // Score each route based on multiple factors
        const scoredRoutes = routesWithDestinations.map(item => {
            const { route, destination } = item;
            
            if (!route || !route.legs || !route.legs[0]) {
                return { ...item, score: 0 };
            }
            
            const duration = route.legs[0].duration.value; // in seconds
            const distance = route.legs[0].distance.value; // in meters
            
            // Base score calculation
            let score = 100;
            
            // Penalize long duration (up to -40 points)
            score -= Math.min(40, duration / 60); // -1 point per minute
            
            // Penalize long distance (up to -30 points)
            score -= Math.min(30, distance / 1000); // -1 point per km
            
            // Adjust based on destination type and disaster
            switch(disasterType.toLowerCase()) {
                case 'flood':
                    if (destination.type === 'stadium') score += 15;
                    if (destination.type === 'school') score += 10;
                    break;
                case 'fire':
                    if (destination.type === 'fire_station') score += 20;
                    if (destination.type === 'hospital') score += 15;
                    break;
                case 'earthquake':
                    if (destination.type === 'park') score += 15;
                    if (destination.type === 'stadium') score += 10;
                    break;
            }
            
            return { ...item, score };
        }).filter(item => item.score > 0); // Filter out invalid routes
        
        // Sort by score (highest first)
        scoredRoutes.sort((a, b) => b.score - a.score);
        
        // Return the best route or throw if none available
        if (scoredRoutes.length === 0) {
            throw new Error('No viable evacuation routes found');
        }
        
        return scoredRoutes[0];
    },

    // Get safety tips based on disaster type
    getSafetyTips(disasterType) {
        const commonTips = [
            "Stay calm and move quickly but safely",
            "Help others only if you can do so safely",
            "Follow instructions from emergency personnel"
        ];
        
        let disasterSpecificTips = [];
        
        switch(disasterType.toLowerCase()) {
            case 'flood':
                disasterSpecificTips = [
                    "Avoid walking through moving water",
                    "Don't drive through flooded areas",
                    "Move to higher ground immediately"
                ];
                break;
            case 'fire':
                disasterSpecificTips = [
                    "Stay low to avoid smoke inhalation",
                    "Cover mouth with wet cloth if possible",
                    "Test doors for heat before opening"
                ];
                break;
            case 'earthquake':
                disasterSpecificTips = [
                    "Drop, cover, and hold on until shaking stops",
                    "Stay away from windows and exterior walls",
                    "Watch for fallen power lines and gas leaks"
                ];
                break;
        }
        
        return [...commonTips, ...disasterSpecificTips];
    },

    // Get evacuation instructions based on destination
    getEvacuationInstructions(disasterType, destination) {
        const instructions = [
            `Proceed to ${destination.name} at ${destination.address}`,
            "Check in with emergency services upon arrival",
            "Bring essential medications and documents if possible"
        ];
        
        if (destination.type === 'hospital') {
            instructions.push("Medical triage will be performed on arrival");
        } else if (destination.type === 'school' || destination.type === 'stadium') {
            instructions.push("Temporary shelter facilities will be available");
        }
        
        return instructions;
    },
};

module.exports = mapService;