FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Set essential environment variables
ENV NODE_ENV=production
ENV ENABLE_PUBSUB=true
ENV ENABLE_SOCKET=true
ENV K_SERVICE=safescape-backend

# Create service account directories if they don't exist
RUN mkdir -p /app/config

# Add startup script with better error handling
RUN echo '#!/bin/sh\n\
echo "Starting SafeEscape backend..."\n\
echo "Checking environment variables:"\n\
if [ -n "$FIREBASE_CREDENTIALS" ]; then\n\
  echo "- FIREBASE_CREDENTIALS: Available"\n\
  echo $FIREBASE_CREDENTIALS > /app/config/firebase-credentials.json\n\
  export GOOGLE_APPLICATION_CREDENTIALS="/app/config/firebase-credentials.json"\n\
else\n\
  echo "⚠️ WARNING: FIREBASE_CREDENTIALS not set"\n\
fi\n\
if [ -n "$VERTEXAI_CREDENTIALS" ]; then\n\
  echo "- VERTEXAI_CREDENTIALS: Available"\n\
  echo $VERTEXAI_CREDENTIALS > /app/config/vertexai-service-Account.json\n\
else\n\
  echo "⚠️ WARNING: VERTEXAI_CREDENTIALS not set"\n\
fi\n\
if [ -n "$GEMINI_API_KEY" ]; then\n\
  echo "- GEMINI_API_KEY: Available"\n\
else\n\
  echo "⚠️ WARNING: GEMINI_API_KEY not set"\n\
fi\n\
node server.js\n\
' > /app/startup.sh && chmod +x /app/startup.sh

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start the server with our wrapper script
CMD ["/app/startup.sh"]
