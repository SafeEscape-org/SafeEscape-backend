/**
 * Test script to verify voice functionality on the cloud endpoint
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CLOUD_ENDPOINT = 'https://safescape-backend-167333024201.asia-south1.run.app';
const TEST_AUDIO_PATH = path.join(__dirname, 'test-files', 'api-test.mp3');
const TEST_TEXT = "This is a test for the SafeEscape voice API on cloud deployment";

// Ensure we have the test audio file
function checkTestFile() {
  if (!fs.existsSync(TEST_AUDIO_PATH)) {
    console.error(`Test audio file not found at: ${TEST_AUDIO_PATH}`);
    console.error('Please ensure you have an audio file for testing');
    process.exit(1);
  }

  console.log(`Using test audio file: ${TEST_AUDIO_PATH}`);
}

// Test the health endpoint of the voice API
async function testVoiceHealth() {
  console.log('\n=== Testing Voice API Health ===');
  try {
    const response = await axios.get(`${CLOUD_ENDPOINT}/api/voice/health`);
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('✅ Voice API Health check successful');
    return true;
  } catch (error) {
    console.error('❌ Voice API Health check failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Test the Text-to-Speech functionality
async function testTextToSpeech() {
  console.log('\n=== Testing Text-to-Speech API ===');
  try {
    const response = await axios.post(
      `${CLOUD_ENDPOINT}/api/voice/tts`,
      { text: TEST_TEXT },
      { responseType: 'arraybuffer' }
    );

    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content length:', response.data.length);
    
    // Save the audio response
    const outputPath = path.join(__dirname, 'test-files', 'cloud-tts-output.mp3');
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    console.log(`Audio saved to: ${outputPath}`);
    
    console.log('✅ Text-to-Speech API test successful');
    return true;
  } catch (error) {
    console.error('❌ Text-to-Speech API test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data.toString());
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Test the Speech-to-Text + AI functionality
async function testVoiceInput() {
  console.log('\n=== Testing Voice Input API ===');
  try {
    // Read and encode the audio file
    const audioBuffer = fs.readFileSync(TEST_AUDIO_PATH);
    const base64Audio = audioBuffer.toString('base64');
    
    const response = await axios.post(`${CLOUD_ENDPOINT}/api/voice/input`, {
      audio: base64Audio,
      audioConfig: {
        encoding: 'MP3',
        sampleRateHertz: 24000,
        languageCode: 'en-US'
      }
    });

    console.log('Status:', response.status);
    console.log('Transcribed text:', response.data.transcribedText);
    console.log('AI response:', response.data.aiResponse);
    
    console.log('✅ Voice Input API test successful');
    return true;
  } catch (error) {
    console.error('❌ Voice Input API test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Test the diagnostics endpoint
async function testDiagnostics() {
  console.log('\n=== Testing Voice Diagnostics API ===');
  try {
    // Read and encode the audio file
    const audioBuffer = fs.readFileSync(TEST_AUDIO_PATH);
    const base64Audio = audioBuffer.toString('base64');
    
    const response = await axios.post(`${CLOUD_ENDPOINT}/api/voice/diagnose`, {
      audio: base64Audio,
      audioConfig: {
        encoding: 'MP3',
        sampleRateHertz: 24000,
        languageCode: 'en-US'
      }
    });

    console.log('Status:', response.status);
    console.log('Diagnostics:', response.data.diagnostics);
    
    console.log('✅ Voice Diagnostics API test successful');
    return true;
  } catch (error) {
    console.error('❌ Voice Diagnostics API test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== CLOUD VOICE API TEST SCRIPT ===');
  console.log(`Testing endpoint: ${CLOUD_ENDPOINT}`);
  
  checkTestFile();
  
  const healthResult = await testVoiceHealth();
  if (!healthResult) {
    console.error('Health check failed. Voice API might not be accessible.');
    return;
  }
  
  await testTextToSpeech();
  await testVoiceInput();
  await testDiagnostics();
  
  console.log('\nAll tests completed!');
}

runTests();
