require('dotenv').config();
const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
});

// Test all services
async function runTests() {
  console.log('🧪 TESTING VERTEX AI SERVICES FOR SAFEESCAPE 🧪');
  console.log('===========================================');
  console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
  console.log('Location:', process.env.VERTEX_AI_LOCATION || 'us-central1');
  console.log('===========================================\n');

  try {
    // Test 1: Basic Text Generation (Gemini Pro)
    /*await testTextGeneration();*/
    
    // Test 3: Emergency Chatbot
    /*await testEmergencyChatbot();*/
    
    // Test 4: Disaster Prediction
    await testDisasterPrediction();
    
    // Test 5: Evacuation Optimizer
    await testEvacuationOptimizer();
    
    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
  }
}

// Test 1: Basic Text Generation
/* async function testTextGeneration() {
  console.log('📝 Test 1: Basic Text Generation');
  
  try {
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-pro',
    });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'What should I do during a flood emergency?' }] }],
    });
    
    console.log('Response:', result.response.candidates[0].content.parts[0].text.substring(0, 150) + '...');
    console.log('✅ Basic Text Generation Test Passed\n');
  } catch (error) {
    console.error('❌ Basic Text Generation Test Failed:', error);
    throw error;
  }
} */


// Test 3: Emergency Chatbo
/*async function testEmergencyChatbot() {
  console.log('🤖 Test 3: Emergency Chatbot');
  
  try {
    const emergencyChatbot = require('./services/vetex ai/emergencyChatbot');
    
    const response = await emergencyChatbot.getEmergencyResponse(
      'What should I do if I\'m trapped in a building during an earthquake?',
      { city: 'Delhi', state: 'Delhi' },
      { mobilityStatus: 'Normal' }
    );
    
    console.log('Response:', response.response.substring(0, 150) + '...');
    console.log('✅ Emergency Chatbot Test Passed\n');
  } catch (error) {
    console.error('❌ Emergency Chatbot Test Failed:', error);
    throw error;
  }
}*/

// Test 4: Disaster Prediction - Check the correct method name
async function testDisasterPrediction() {
  console.log('🔮 Test 4: Disaster Prediction');
  
  try {
    const disasterPrediction = require('./services/vetex ai/disasterPrediction');
    console.log('Available methods:', Object.keys(disasterPrediction));
    
    // Use the correct method name - it might be getPredictiveAnalysis or another name
    const prediction = await disasterPrediction.getPredictiveAnalysis({
      city: 'Mumbai',
      state: 'Maharashtra'
    });
    
    console.log('Prediction:', JSON.stringify(prediction, null, 2));
    console.log('✅ Disaster Prediction Test Passed\n');
  } catch (error) {
    console.error('❌ Disaster Prediction Test Failed:', error);
    throw error;
  }
}

// Test 5: Evacuation Optimizer
async function testEvacuationOptimizer() {
  console.log('🚗 Test 5: Evacuation Optimizer');
  
  try {
    const evacuationOptimizer = require('./services/vetex ai/evacuationOptimizer');
    
    // Mock data for testing
    const userLocation = { lat: 19.0760, lng: 72.8777 }; // Mumbai
    const disasterData = {
      type: 'flood',
      severity: 4,
      status: 'ongoing'
    };
    const userProfile = {
      mobilityImpaired: false,
      hasVehicle: true,
      hasChildren: true,
      medicalNeeds: 'None'
    };
    
    console.log('This test requires Google Maps API to be working.');
    console.log('Testing evacuation route optimization...');
    
    const route = await evacuationOptimizer.optimizeEvacuationRoute(
      userLocation,
      disasterData,
      userProfile
    );
    
    console.log('Route found to:', route.destination.name);
    console.log('Reasoning:', route.reasoning);
    console.log('✅ Evacuation Optimizer Test Passed\n');
  } catch (error) {
    console.error('❌ Evacuation Optimizer Test Failed:', error);
    console.log('Note: This test requires Google Maps API to be working correctly.');
  }
}

// Run all tests
runTests(); 