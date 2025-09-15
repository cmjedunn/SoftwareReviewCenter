# Dockerfile for React client

# ---------- Build stage ----------    
# Build react client
FROM node:22-alpine AS builder

# Working directory for client
WORKDIR /app    

COPY package*.json ./

###  Installing dependencies
RUN npm install

# copy local files to app folder
COPY . .

# build client
RUN npm run build


# ---------- Runtime stage ----------
# start static serve
FROM nginx:1.26-alpine AS runtime

# remove default html
RUN rm -rf /usr/share/nginx/html/*

# copy dist contents from builder to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# custom reverse-proxy rules
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]