# Voice Support Documentation for SafeEscape

This document provides an overview of the voice integration in the SafeEscape emergency application.

## Overview

The voice integration enables users to interact with the SafeEscape emergency assistant using speech rather than typing, which is essential during emergencies when users may need hands-free operation or quick access to information.

## Architecture

The voice integration has the following components:

1. **Speech-to-Text (STT)**: Converts user's spoken input to text using Google Cloud Speech-to-Text API
2. **Text-to-Speech (TTS)**: Converts the assistant's text responses to speech using Google Cloud Text-to-Speech API
3. **REST APIs**: For non-streaming voice interactions
4. **WebSocket Server**: For real-time, streaming voice interactions

## API Endpoints

### REST Endpoints

#### 1. Process Voice Input (Speech-to-Text + AI)

```
POST /api/voice/input
```

**Request Body:**
```json
{
  "audio": "base64EncodedAudioData",
  "audioConfig": {
    "languageCode": "en-US",
    "encoding": "LINEAR16",
    "sampleRateHertz": 16000
  }
}
```

**Response:**
```json
{
  "success": true,
  "transcribedText": "What should I do during a flood?",
  "aiResponse": "During a flood, move to higher ground immediately..."
}
```

#### 2. Process Voice Conversation (Speech-to-Text + AI + Text-to-Speech)

```
POST /api/voice/conversation
```

**Request Body:**
```json
{
  "audio": "base64EncodedAudioData",
  "audioConfig": {
    "languageCode": "en-US",
    "encoding": "LINEAR16",
    "sampleRateHertz": 16000
  },
  "voiceConfig": {
    "languageCode": "en-US",
    "ssmlGender": "NEUTRAL",
    "voiceName": "en-US-Neural2-F"
  }
}
```

**Response:**
- Audio file (MP3) with spoken response

#### 3. Text-to-Speech Conversion

```
POST /api/voice/tts
```

**Request Body:**
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

**Response:**
- Audio file (MP3) with spoken text

### WebSocket Endpoint

For real-time voice conversations, connect to:

```
ws://your-server/voice/stream
```

#### WebSocket Protocol

1. **Connection**: Client establishes WebSocket connection
2. **Configuration**: Client sends configuration message:
   ```json
   {
     "type": "config",
     "data": {
       "languageCode": "en-US",
       "encoding": "LINEAR16",
       "sampleRateHertz": 16000
     }
   }
   ```
3. **Audio Streaming**: Client streams audio data as binary messages
4. **End Signal**: Client sends `END_STREAM` text message when done speaking
5. **Response**: Server sends messages with these types:
   - `transcription`: Contains transcribed text
   - `ai_response`: Contains text response from Gemini
   - Binary data: Audio response to play
   - `audio_end`: Signals end of audio response

## Implementation Details

### Voice Service

The `voiceService.js` module provides the core functionality:

- `speechToText(audioContent, options)`: Converts audio to text using Google Cloud Speech-to-Text
- `textToSpeechAudio(text, options)`: Converts text to speech using Google Cloud Text-to-Speech
- `streamingSpeechToText(audioStream, options)`: Handles real-time streaming speech recognition

### Authentication

All voice API endpoints require authentication via the same authentication mechanism as other SafeEscape APIs.

### Test Client

A test client is available at `/test-voice-client.html` to try out the voice functionality.

## Best Practices

1. **Audio Format**: Preferred formats:
   - For browser recording: WEBM_OPUS (48kHz)
   - For mobile apps: FLAC or LINEAR16 (16kHz)

2. **Language Support**: Default is English (en-US), but the API supports multiple languages as provided by Google Cloud Speech APIs.

3. **Error Handling**: Implement robust error handling, especially for network issues and API failures.

4. **Accessibility**: Consider providing visual feedback for audio recording/playback for users with hearing impairments.

## Dependencies

- @google-cloud/speech: For Speech-to-Text functionality
- @google-cloud/text-to-speech: For Text-to-Speech functionality
- ws: For WebSocket streaming support
