FROM node:20

COPY ./trusted_certs.crt /usr/local/share/ca-certificates/trusted_certs.crt
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

RUN apt-get update && apt-get install -y ca-certificates

RUN update-ca-certificates

WORKDIR /app/server

COPY app/server/package*.json ./
RUN npm install --omit=dev

COPY app/server/ ./

RUN [ -d "./public" ] || (echo "Missing frontend build. Run 'npm run build' in app/client first." && exit 1)

EXPOSE 3000
CMD ["node", "index.js"]
