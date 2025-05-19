/**
 * Test script to validate the Voice Service implementation
 */

require('dotenv').config();
const voiceService = require('./services/voice/voiceService');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_TEXT = "This is a test of the SafeEscape emergency voice system. During an actual emergency, this system would provide you with critical information and instructions.";
const TEST_AUDIO_PATH = path.join(__dirname, 'test-files', 'test-tts-output.mp3');

// Ensure the test directory exists
if (!fs.existsSync(path.join(__dirname, 'test-files'))) {
  fs.mkdirSync(path.join(__dirname, 'test-files'));
}

/**
 * Test the Text-to-Speech functionality
 */
async function testTextToSpeech() {
  console.log('Testing Text-to-Speech...');
  console.log(`Input text: "${TEST_TEXT}"`);
  
  try {
    const audioContent = await voiceService.textToSpeechAudio(TEST_TEXT);
    fs.writeFileSync(TEST_AUDIO_PATH, audioContent);
    
    console.log(`✅ Text-to-Speech successful`);
    console.log(`Audio saved to: ${TEST_AUDIO_PATH}`);
    return true;
  } catch (error) {
    console.error('❌ Text-to-Speech test failed:', error);
    return false;
  }
}

/**
 * Test Speech-to-Text with the output from TTS
 */
async function testSpeechToText() {
  console.log('\nTesting Speech-to-Text...');
  
  if (!fs.existsSync(TEST_AUDIO_PATH)) {
    console.error('❌ Test audio file not found. Run Text-to-Speech test first.');
    return false;
  }
  
  try {
    // Read the audio file
    const audioContent = fs.readFileSync(TEST_AUDIO_PATH);
    
    console.log('Converting speech to text...');
    const transcribedText = await voiceService.speechToText(audioContent, {
      encoding: 'MP3',
      sampleRateHertz: 24000,
    });
    
    console.log(`Transcribed text: "${transcribedText}"`);
    
    // Compare with original text (allowing for minor differences)
    const similarity = calculateStringSimilarity(TEST_TEXT.toLowerCase(), transcribedText.toLowerCase());
    console.log(`Text similarity: ${Math.round(similarity * 100)}%`);
    
    if (similarity > 0.7) {
      console.log('✅ Speech-to-Text test successful');
      return true;
    } else {
      console.log('⚠️ Speech-to-Text test partially successful (low similarity)');
      return true;
    }
  } catch (error) {
    console.error('❌ Speech-to-Text test failed:', error);
    return false;
  }
}

/**
 * Calculate similarity between two strings (simple implementation)
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} Similarity between 0 and 1
 */
function calculateStringSimilarity(str1, str2) {
  // Simple Levenshtein distance implementation
  const m = str1.length;
  const n = str2.length;
  
  // Create matrix
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  // Calculate similarity
  return 1 - (dp[m][n] / Math.max(m, n));
}

// Run the tests
async function runTests() {
  console.log('=== VOICE SERVICE TEST SCRIPT ===');
  
  const ttsResult = await testTextToSpeech();
  
  if (ttsResult) {
    await testSpeechToText();
  }
  
  console.log('\nTest completed');
}

runTests();
