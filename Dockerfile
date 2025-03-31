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
ENV FIREBASE_AUTH_EMULATOR_HOST=false

# Add startup script with better error handling
RUN echo '#!/bin/sh\n\
echo "Starting SafeEscape backend..."\n\
echo "Checking environment:"\n\
if [ -n "$FIREBASE_CREDENTIALS" ]; then echo "- FIREBASE_CREDENTIALS: Available"; else echo "⚠️ WARNING: FIREBASE_CREDENTIALS not set"; fi\n\
if [ -n "$VERTEXAI_CREDENTIALS" ]; then echo "- VERTEXAI_CREDENTIALS: Available"; else echo "⚠️ WARNING: VERTEXAI_CREDENTIALS not set"; fi\n\
node server.js\n\
' > /app/startup.sh && chmod +x /app/startup.sh

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start the server with our wrapper script
CMD ["/app/startup.sh"]