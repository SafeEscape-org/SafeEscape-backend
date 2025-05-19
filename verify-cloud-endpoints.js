/**
 * SafeEscape Cloud Deployment Verification Tool
 * Tests the key endpoints of the SafeEscape backend in Cloud Run
 */

const axios = require('axios');
const chalk = require('chalk'); // For colorized output

// Configuration
const CLOUD_ENDPOINT = process.argv[2] || 'https://safescape-backend-167333024201.asia-south1.run.app';
const TEST_TIMEOUT = 15000; // 15 seconds timeout for requests

console.log(chalk.bgBlue.white.bold('\n SafeEscape Cloud Deployment Verification Tool \n'));
console.log(chalk.cyan(`Target: ${CLOUD_ENDPOINT}`));
console.log(chalk.cyan(`Time: ${new Date().toISOString()}`));
console.log(chalk.cyan('-'.repeat(60)));

/**
 * Test an endpoint and print the result with colorized output
 */
async function testEndpoint(name, url, method = 'GET', data = null) {
  process.stdout.write(`Testing ${chalk.yellow(name)} (${method} ${url.replace(CLOUD_ENDPOINT, '')})... `);
  
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
    
    const startTime = Date.now();
    const response = await axios(options);
    const duration = Date.now() - startTime;
    
    console.log(chalk.green(`✓ [${response.status}] ${duration}ms`));
    
    return { 
      success: true, 
      data: response.data, 
      status: response.status,
      duration
    };
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      console.log(chalk.red(`✗ [${error.response.status}]`));
      console.log(chalk.gray(`  Response: ${JSON.stringify(error.response.data)}`));
    } else if (error.request) {
      // The request was made but no response was received
      console.log(chalk.red('✗ [No response]'));
      console.log(chalk.gray('  Request timeout or connection error'));
    } else {
      // Something happened in setting up the request
      console.log(chalk.red(`✗ [Error]`));
      console.log(chalk.gray(`  ${error.message}`));
    }
    
    return { success: false, error };
  }
}

/**
 * Test basic health endpoints
 */
async function testBasicEndpoints() {
  console.log(chalk.bgCyan.black('\n Basic Endpoints \n'));
  
  await testEndpoint('Root Endpoint', `${CLOUD_ENDPOINT}/`);
  await testEndpoint('Health Check', `${CLOUD_ENDPOINT}/health`);
  await testEndpoint('API Status', `${CLOUD_ENDPOINT}/api/status`);
}

/**
 * Test voice endpoints
 */
async function testVoiceEndpoints() {
  console.log(chalk.bgCyan.black('\n Voice API Endpoints \n'));
  
  await testEndpoint('Voice Health Check', `${CLOUD_ENDPOINT}/api/voice/health`);
  
  // Test minimal TTS
  await testEndpoint(
    'Text-to-Speech', 
    `${CLOUD_ENDPOINT}/api/voice/tts`, 
    'POST', 
    { text: "Testing voice service." }
  );
  
  // Test voice diagnostics
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

/**
 * Test Gemini API endpoints
 */
async function testGeminiEndpoints() {
  console.log(chalk.bgCyan.black('\n Gemini API Endpoints \n'));
  
  await testEndpoint('Gemini Health Check', `${CLOUD_ENDPOINT}/api/gemini/health`);
  
  // Test chat endpoint - start session
  const chatResult = await testEndpoint(
    'Start Chat Session', 
    `${CLOUD_ENDPOINT}/api/gemini/chat`, 
    'POST', 
    {}
  );
  
  // If we got a session ID, test the message endpoint
  if (chatResult.success && chatResult.data && chatResult.data.sessionId) {
    const sessionId = chatResult.data.sessionId;
    
    await testEndpoint(
      'Send Message', 
      `${CLOUD_ENDPOINT}/api/gemini/chat/${sessionId}/message`, 
      'POST', 
      { message: "What should I do in case of an earthquake?" }
    );
  }
}

/**
 * Run all tests and print summary
 */
async function runTests() {
  try {
    const startTime = Date.now();
    
    await testBasicEndpoints();
    await testVoiceEndpoints();
    await testGeminiEndpoints();
    
    const totalDuration = Date.now() - startTime;
    
    console.log(chalk.bgCyan.black('\n Test Summary \n'));
    console.log(`Total test duration: ${chalk.yellow(totalDuration + 'ms')}`);
    console.log(chalk.cyan('-'.repeat(60)));
    
    console.log(chalk.bgGreen.black('\n Cloud Deployment Verification Complete \n'));
  } catch (error) {
    console.error(chalk.red('Error running tests:'), error);
  }
}

// Run the tests
runTests();
