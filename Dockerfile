# Use Node.js 20 Alpine as the base image for a lightweight container
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (retry once if first attempt fails)
RUN npm install || npm install

# Copy application files
COPY index.js ./

# Run the application
CMD ["node", "index.js"]
