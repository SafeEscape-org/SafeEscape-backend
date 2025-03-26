const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Base URL for the API
const baseUrl = process.env.API_URL || 'http://localhost:5000';

// List of endpoints to test
const endpoints = [
  { method: 'GET', path: '/health', name: 'Health Check' },
  { method: 'GET', path: '/api/diagnostic/ping', name: 'Diagnostic Ping' },
  { method: 'GET', path: '/api/emergency/reports', name: 'Emergency Reports' },
  { method: 'GET', path: '/api/alerts/active', name: 'Active Alerts' },
  { method: 'GET', path: '/api/maps/geocode?address=Mumbai', name: 'Geocode' },
  { method: 'GET', path: '/api/diagnostic/routes', name: 'Routes List' }
];

// Test all endpoints
async function testEndpoints() {
  console.log(`🧪 Testing API endpoints at ${baseUrl}`);
  console.log('='.repeat(50));

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${endpoint.name}`);
      console.log(`${endpoint.method} ${baseUrl}${endpoint.path}`);
      
      const startTime = new Date();
      const response = await axios({
        method: endpoint.method.toLowerCase(),
        url: `${baseUrl}${endpoint.path}`,
        timeout: 5000, // 5 second timeout
        validateStatus: false // Don't throw on error status codes
      });
      const duration = new Date() - startTime;

      console.log(`Status: ${response.status}`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Response: ${JSON.stringify(response.data).substring(0, 200)}${JSON.stringify(response.data).length > 200 ? '...' : ''}`);
      
      if (response.status >= 200 && response.status < 300) {
        console.log('✅ PASSED');
      } else {
        console.log('❌ FAILED');
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n='.repeat(50));
  console.log('Endpoint testing complete');
}

// Run the tests
testEndpoints();
