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

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]