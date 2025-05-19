# SafeEscape Voice API Documentation

This document provides instructions for frontend developers on how to integrate with the SafeEscape Voice API features using the Postman collection.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [API Endpoints](#api-endpoints)
4. [Request Body Formats](#request-body-formats)
5. [Response Formats](#response-formats)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

The SafeEscape Voice API enables voice interaction with the emergency assistant, allowing for hands-free operation during emergencies. The API supports:

- Converting speech to text
- AI processing of user queries
- Converting text responses back to speech
- Full conversational voice interactions

## Getting Started

### Importing the Postman Collection

1. Open Postman
2. Click on "Import" button in the top left corner
3. Select the `SafeEscape-Voice-API.postman_collection.json` file
4. The collection will be added to your Postman workspace

### Setting Environment Variables

The collection uses two environment variables:
- `base_url`: The base URL of the SafeEscape API server (e.g., `http://localhost:3000` for local development)
- `access_token`: Your authentication token for accessing the API

To set these variables:
1. Click on "Environments" in the sidebar
2. Create a new environment (e.g., "SafeEscape Development")
3. Add the variables `base_url` and `access_token` with appropriate values
4. Select this environment from the environment dropdown in the top right corner

## API Endpoints

### 1. Voice Input (Speech-to-Text + AI)

**Endpoint:** `POST /api/voice/input`

Converts speech to text and gets an AI response in text format.

**Use cases:**
- Voice search functionality
- Voice commands that require text responses
- Accessibility features for users who can speak but prefer to read responses

### 2. Voice Conversation (Speech-to-Text + AI + Text-to-Speech)

**Endpoint:** `POST /api/voice/conversation`

Full voice conversation pipeline that returns an audio response.

**Use cases:**
- Hands-free voice assistant interactions
- In-car emergency assistance
- Accessibility features for visually impaired users

### 3. Text-to-Speech Conversion

**Endpoint:** `POST /api/voice/tts`

Converts text to speech without AI processing.

**Use cases:**
- Reading notifications aloud
- Converting emergency instructions to audio
- Accessibility features

### 4. Speech Input Diagnostics

**Endpoint:** `POST /api/voice/diagnose`

Analyzes audio input and provides diagnostic information.

**Use cases:**
- Troubleshooting audio recording issues
- Determining optimal audio configuration
- Debugging voice recognition problems

### 5. Voice API Health Check

**Endpoint:** `GET /api/voice/health`

Simple health check to verify if the Voice API is operational.

**Use cases:**
- Monitoring API availability
- Connection testing

## Request Body Formats

### Audio Data Format

For endpoints that accept audio input:

```json
{
  "audio": "BASE64_ENCODED_AUDIO_DATA",
  "audioConfig": {
    "languageCode": "en-US",
    "encoding": "LINEAR16|WEBM_OPUS",
    "sampleRateHertz": 48000
  }
}
```

Where:
- `audio`: Base64-encoded audio data
- `audioConfig`: Configuration for speech recognition
  - `languageCode`: Language code (e.g., "en-US")
  - `encoding`: Audio encoding format
    - `LINEAR16`: Raw PCM audio
    - `WEBM_OPUS`: WebM container with Opus codec (most browser recordings)
  - `sampleRateHertz`: Sample rate in Hz (48000 recommended for browser recordings)

### Text-to-Speech Format

For text-to-speech requests:

```json
{
  "text": "Text to convert to speech",
  "voiceConfig": {
    "languageCode": "en-US",
    "ssmlGender": "NEUTRAL",
    "voiceName": "en-US-Neural2-F"
  }
}
```

Where:
- `text`: The text to convert to speech
- `voiceConfig`: Configuration for text-to-speech
  - `languageCode`: Language code (e.g., "en-US")
  - `ssmlGender`: Voice gender ("NEUTRAL", "MALE", or "FEMALE")
  - `voiceName`: Specific voice name (e.g., "en-US-Neural2-F")

## Response Formats

### Voice Input Response

```json
{
  "success": true,
  "transcribedText": "What should I do during a flood?",
  "aiResponse": "During a flood, move to higher ground immediately..."
}
```

### Voice Conversation Response
Binary audio data (MP3 format) containing the spoken AI response.

### Text-to-Speech Response
Binary audio data (MP3 format) containing the spoken text.v

### Diagnostic Response

```json
{
  "success": true,
  "diagnostics": {
    "audioSizeKB": 45,
    "audioSample": "UklGRi8AAQBXQVZFZm10...",
    "detectedFormat": "WAV",
    "detectedSampleRate": "48000 Hz",
    "configProvided": true,
    "audioConfig": {
      "languageCode": "en-US",
      "encoding": "LINEAR16",
      "sampleRateHertz": 48000
    }
  },
  "recommendations": {
    "suggestedEncoding": "LINEAR16",
    "suggestedSampleRate": 16000
  },
  "message": "Audio received (45 KB). Detected format: WAV."
}
```

## Best Practices

### Audio Recording in Web Browsers

```javascript
// Example code for recording audio in a browser
async function recordAudio() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks = [];

  mediaRecorder.addEventListener("dataavailable", (event) => {
    audioChunks.push(event.data);
  });

  mediaRecorder.addEventListener("stop", async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const base64data = await blobToBase64(audioBlob);
    
    // Send to API
    fetch('https://your-api-url/api/voice/input', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: JSON.stringify({
        audio: base64data.split(',')[1], // Remove data URL prefix
        audioConfig: {
          languageCode: "en-US",
          encoding: "WEBM_OPUS",
          sampleRateHertz: 48000
        }
      })
    });
  });

  // Start recording
  mediaRecorder.start();
  
  // Stop after 5 seconds
  setTimeout(() => mediaRecorder.stop(), 5000);
}

// Helper function to convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### Audio Format Recommendations

1. **For Web Browsers**: Use `WEBM_OPUS` at 48kHz sample rate
2. **For Android**: Use `WEBM_OPUS` at 48kHz sample rate
3. **For iOS**: Use `LINEAR16` at 48kHz sample rate
4. **For Custom Apps**: Use `FLAC` or `LINEAR16` at 16kHz or 48kHz

### Error Handling

Always implement proper error handling for:
- Network issues
- API failures
- Audio recording permissions
- Inaudible or unclear speech

Example error handling:

```javascript
fetch('https://your-api-url/api/voice/input', {
  method: 'POST',
  // ... headers and body ...
})
.then(response => {
  if (!response.ok) {
    return response.json().then(err => { throw err; });
  }
  return response.json();
})
.then(data => {
  // Handle successful response
  console.log("Transcribed Text:", data.transcribedText);
  console.log("AI Response:", data.aiResponse);
})
.catch(error => {
  // Handle error
  if (error.error === 'Could not transcribe audio, please try again') {
    // Handle transcription error
    showUserMessage("I couldn't understand that. Please try speaking more clearly.");
  } else {
    // Handle general API error
    showUserMessage("Something went wrong. Please try again later.");
    console.error("API Error:", error);
  }
});
```

## Troubleshooting

### Common Issues

1. **Audio Not Transcribing**
   - Check microphone permissions
   - Use the `/diagnose` endpoint to verify audio format
   - Try different audio encoding (LINEAR16 or WEBM_OPUS)
   - Ensure clear audio without background noise

2. **API Returns Errors**
   - Verify authentication token is valid
   - Check that audio is properly base64 encoded
   - Ensure audio is not too large (keep recordings under 15 seconds)
   - Try the health check endpoint to verify API availability

3. **Audio Response Quality Issues**
   - Try different voice names in the `voiceConfig`
   - Experiment with different `ssmlGender` values
   - Use the `diagnose` endpoint to verify your setup

### Debugging Tools

1. **Browser Audio Recording Check**:
   ```javascript
   // Log audio details before sending to API
   console.log("Audio size (bytes):", base64data.length * 0.75);
   console.log("Audio format:", audioBlob.type);
   ```

2. **Response Inspection**:
   Use the browser's Network tab in Developer Tools to inspect API responses.

3. **Diagnostics Endpoint**:
   Use the `/diagnose` endpoint to get detailed information about your audio input.

For persistent issues, contact the SafeEscape API support team with your diagnostic information.
