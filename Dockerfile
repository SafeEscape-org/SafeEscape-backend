FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Expose port for Cloud Run
ENV PORT=5000
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]