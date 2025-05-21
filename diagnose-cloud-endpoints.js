/**
 * Cloud Endpoints Diagnosis Tool
 * Tests various API endpoints for the SafeEscape backend cloud deployment
 */

const axios = require('axios');

// Configuration
const CLOUD_ENDPOINT = 'https://safescape-backend-167333024201.asia-south1.run.app';
const TEST_TIMEOUT = 15000; // 15 seconds timeout for requests

// Simple test function
async function testEndpoint(name, url, method = 'GET', data = null) {
  console.log(`\n▶️ Testing ${name} (${method} ${url})`);
  try {
    const options = {
      method: method,
      url: url,
      timeout: TEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.data = data;
    }
    
    const response = await axios(options);
    
    console.log(`✅ ${name} - Success (${response.status})`);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2).substring(0, 200) + '...');
    console.log('Response Data (sample):', 
      typeof response.data === 'object' 
        ? JSON.stringify(response.data, null, 2).substring(0, 200) + '...' 
        : String(response.data).substring(0, 200) + '...');
    
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    console.log(`❌ ${name} - Failed`);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.log(`Status: ${error.response.status}`);
      console.log('Response Headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('Response Data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.log('No response received from server');
      console.log('Request details:', error.request._currentUrl || error.request);
    } else {
      // Something happened in setting up the request
      console.log('Error:', error.message);
    }
    
    return { success: false, error };
  }
}

// Test basic health endpoints
async function testBasicEndpoints() {
  console.log('=== TESTING BASIC ENDPOINTS ===');
  await testEndpoint('Root Endpoint', `${CLOUD_ENDPOINT}/`);
  await testEndpoint('Health Check', `${CLOUD_ENDPOINT}/health`);
  await testEndpoint('API Status', `${CLOUD_ENDPOINT}/api/status`);
  await testEndpoint('Direct Test', `${CLOUD_ENDPOINT}/direct-test`);
}

// Test Gemini endpoints
async function testGeminiEndpoints() {
  console.log('\n=== TESTING GEMINI ENDPOINTS ===');
  
  // Test start chat
  const chatResult = await testEndpoint(
    'Start Gemini Chat', 
    `${CLOUD_ENDPOINT}/api/gemini/chat`, 
    'POST', 
    {}
  );
  
  // If we got a session ID, test sending a message
  if (chatResult.success && chatResult.data && chatResult.data.sessionId) {
    const sessionId = chatResult.data.sessionId;
    console.log(`\nUsing session ID: ${sessionId}`);
    
    await testEndpoint(
      'Send Message to Gemini', 
      `${CLOUD_ENDPOINT}/api/gemini/chat/${sessionId}/message`, 
      'POST', 
      { message: "What should I do in case of a fire emergency?" }
    );
    
    await testEndpoint(
      'Get Chat History', 
      `${CLOUD_ENDPOINT}/api/gemini/chat/${sessionId}/history`, 
      'GET'
    );
  }
}

// Test Voice endpoints
async function testVoiceEndpoints() {
  console.log('\n=== TESTING VOICE ENDPOINTS ===');
  
  // Test voice health endpoint
  await testEndpoint('Voice Health', `${CLOUD_ENDPOINT}/api/voice/health`, 'GET');
  
  // Test TTS with simple text
  await testEndpoint(
    'Text-to-Speech', 
    `${CLOUD_ENDPOINT}/api/voice/tts`, 
    'POST', 
    { text: "This is a test of the SafeEscape emergency voice system." }
  );
  
  // Test voice diagnostics endpoint - can work with minimal data
  await testEndpoint(
    'Voice Diagnostics', 
    `${CLOUD_ENDPOINT}/api/voice/diagnose`, 
    'POST', 
    { 
      audio: "dGVzdCBhdWRpbw==", // "test audio" in base64
      audioConfig: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US'
      }
    }
  );
}

// Test other important endpoints
async function testOtherEndpoints() {
  console.log('\n=== TESTING OTHER IMPORTANT ENDPOINTS ===');
  
  await testEndpoint('Map Service', `${CLOUD_ENDPOINT}/api/maps/health`, 'GET');
  await testEndpoint('Emergency Service', `${CLOUD_ENDPOINT}/api/emergency/health`, 'GET');
  await testEndpoint('Diagnostic Service', `${CLOUD_ENDPOINT}/api/diagnostic/health`, 'GET');
}

// Analyze results and suggest fixes
function analyzePossibleIssues() {
  console.log('\n=== ANALYSIS AND RECOMMENDATIONS ===');
  console.log('Common issues that might cause 500 Internal Server Error:');
  console.log('1. Missing environment variables in Cloud Run configuration:');
  console.log('   - Check if GEMINI_API_KEY is properly set');
  console.log('   - Check if VERTEXAI_CREDENTIALS is properly set');
  console.log('   - Check if FIREBASE_CREDENTIALS is properly set');
  
  console.log('\n2. Google Cloud Service account permissions:');
  console.log('   - Ensure the service account has proper IAM permissions');
  console.log('   - For Voice API: Speech-to-Text and Text-to-Speech API access');
  console.log('   - For Gemini: Generative AI API access');
  
  console.log('\n3. API enabling issues:');
  console.log('   - Ensure all required APIs are enabled in Google Cloud console:');
  console.log('     * Cloud Speech-to-Text API');
  console.log('     * Cloud Text-to-Speech API');
  console.log('     * Generative AI API');
  console.log('     * Cloud Run API');
  
  console.log('\n4. Route registration issues:');
  console.log('   - Check server logs in Cloud Run for route registration failures');
  console.log('   - Verify server-core.js is properly registering routes');
  
  console.log('\n5. Service initialization failures:');
  console.log('   - Check Cloud Run logs for service initialization errors');
  console.log('   - Verify that services are properly awaiting async initialization');
}

// Run all tests
async function runAllTests() {
  console.log('=== CLOUD ENDPOINT DIAGNOSIS TOOL ===');
  console.log(`Target: ${CLOUD_ENDPOINT}`);
  console.log('Time:', new Date().toISOString());
  console.log('Timeout:', `${TEST_TIMEOUT}ms`);
  console.log('------------------------------------------');
  
  try {
    await testBasicEndpoints();
    await testGeminiEndpoints();
    await testVoiceEndpoints();
    await testOtherEndpoints();
    
    analyzePossibleIssues();
    
    console.log('\n=== TESTING COMPLETE ===');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runAllTests();
