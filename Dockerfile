FROM node:18-alpine

# Install required packages
RUN apk add --no-cache \
    g++ \
    make \
    python3 \
    openjdk17

# Set up working directory
WORKDIR /app

# Install npm dependencies
COPY package.json package-lock.json* ./
RUN npm install express body-parser cors

# Create directory for code execution with proper permissions
RUN mkdir -p /tmp/code_execution && chmod 777 /tmp/code_execution

# Copy server code
COPY src/server.js ./src/

# Expose port
EXPOSE 5000

# Command to run the server
CMD ["node", "src/server.js"]