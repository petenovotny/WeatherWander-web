# Use a lightweight Node image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app code
COPY . .

# Expose the port your app runs on (Replit usually uses 3000 or 8080)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]