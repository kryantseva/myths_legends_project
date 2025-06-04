# Use an official Node.js runtime as a parent image
FROM node:latest

# Set the working directory in the container to /app
WORKDIR /myths_legends_project

# Copy package.json and package-lock.json to the working directory
# to leverage Docker cache
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port that the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "start"]