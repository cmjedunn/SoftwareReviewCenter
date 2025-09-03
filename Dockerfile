FROM node:18-alpine
WORKDIR /app/server

# Install Server dependencies.
COPY app/server/package*.json ./
RUN npm ci --production

# Coppy Server code.
COPY app/server/ ./

# Coppy in front end build.
COPY --from=frontend-builder /app/client/dist ./public/

# Expose and run.
EXPOSE 3000
CMD ["node", "index.js"]