# Use Node.js 20 Alpine as the base image for a lightweight container
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY index.js ./

# Run the application
CMD ["node", "index.js"]
