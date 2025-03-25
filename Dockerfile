FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Set essential environment variables (removed PORT)
ENV NODE_ENV=production
ENV ENABLE_PUBSUB=false
ENV ENABLE_SOCKET=false

# Expose port 8080 for Cloud Run
# This is just documentation, not an actual setting
EXPOSE 8080

# Add a startup script for better diagnostics
RUN echo '#!/bin/sh\necho "Starting SafeEscape backend..."\necho "Using PORT: $PORT"\nnode server.js' > /app/start.sh \
    && chmod +x /app/start.sh

# Use the startup script
CMD ["/app/start.sh"]