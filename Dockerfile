# # # # # # # # # # # # # #
# Stage 1: Build Frontend #
# # # # # # # # # # # # # #
FROM node:20 AS frontend-build

# Copy trusted certs so it works
COPY ./trusted_certs.crt /usr/local/share/ca-certificates/trusted_certs.crt
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Install ca-certificates (Debian version)
RUN apt-get update && apt-get install -y ca-certificates

# Update certs packages
RUN update-ca-certificates

# Downgrade npm to a stable version
RUN npm install -g npm@8

# Accept build arguments for frontend environment variables
ARG VITE_BACKEND_URL=""
ARG VITE_ENTRA_CLIENT_ID="f0e2a1b0-5ff6-4b69-8dc8-4d09e4905133"
ARG VITE_ENTRA_AUTHORITY="e5e66f9b-9af2-47a3-8179-53be49b04490"
ARG VITE_ENTRA_LOGOUT_REDIRECT_URI="/"

# Set environment variables for Vite build
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_ENTRA_CLIENT_ID=$VITE_ENTRA_CLIENT_ID
ENV VITE_ENTRA_AUTHORITY=$VITE_ENTRA_AUTHORITY
ENV VITE_ENTRA_LOGOUT_REDIRECT_URI=$VITE_ENTRA_LOGOUT_REDIRECT_URI

WORKDIR /app/client

# Copy only package files first to leverage Docker caching
COPY app/client/package*.json ./

# Install dependencies
RUN rm -rf node_modules package-lock.json && npm install --package-lock-only && npm ci

# Copy the rest of the frontend source code
COPY app/client/ ./

# Ensure the target directory exists
RUN mkdir -p /app/server/public

# Build the frontend with the environment variables
RUN npm run build




# # # # # # # # # # # # # #
# Stage 2: Build Backend  #
# # # # # # # # # # # # # #
FROM node:20 AS backend-build

# Copy trusted certs so it works
COPY ./trusted_certs.crt /usr/local/share/ca-certificates/trusted_certs.crt
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Install ca-certificates (Debian version)
RUN apt-get update && apt-get install -y ca-certificates

# Update certs packages
RUN update-ca-certificates

WORKDIR /app/server

# Copy backend package and install modules
COPY app/server/package*.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY app/server/ ./

# Copy the built frontend from the first stage
COPY --from=frontend-build /app/server/public ./public

# Create certificate directory and set permissions
RUN mkdir -p /app/certs && chmod 700 /app/certs

# Expose and run
EXPOSE 3000
CMD ["node", "index.js"]
