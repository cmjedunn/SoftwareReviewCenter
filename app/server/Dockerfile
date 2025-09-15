# Dockerfile for Node server

# ---------- Build stage ----------    
# Build Node server
FROM node:22-alpine

# Working directory for server
WORKDIR /app

COPY package*.json ./

###  Installing dependencies
RUN npm install

# copy local files to app folder
COPY . .

# set runtime enviornment variables
ENV NODE_ENV=production
ENV PORT=3000

# expose port and define startup command
EXPOSE 3000
CMD ["npm", "start"]