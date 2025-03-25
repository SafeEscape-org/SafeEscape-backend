const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');

// Set the path to the Vertex AI service account key file
const vertexAIKeyPath = path.resolve(__dirname, '../../config/vertexai-service-Account.json');

// Set environment variable for Vertex AI operations
process.env.GOOGLE_APPLICATION_CREDENTIALS = vertexAIKeyPath;

// Initialize Vertex AI with the service account
const vertexAI = new VertexAI({
  project: 'safeescape',
  location: 'us-central1',
  keyFilename: vertexAIKeyPath,
});

// Create a generative model instance
const generativeModel = (modelName = 'gemini-1.5-pro') => {
  const model = vertexAI.preview.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });
  
  return model;
};

module.exports = {
  vertexAI,
  generativeModel,
  vertexAIKeyPath
};