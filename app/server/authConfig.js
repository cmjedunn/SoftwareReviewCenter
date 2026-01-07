// Following Microsoft's official documentation:
// https://learn.microsoft.com/en-us/entra/identity-platform/how-to-web-app-node-use-certificate

// Step 1: Extract private key from your PFX file
// Run this command in your terminal first:
// openssl pkcs12 -in ./certs/docker/security-review-center.pfx -nocerts -out ./certs/docker/security-review-center.key -passin pass:SecureJEDunnSRC2024!

// Step 2: Update your authConfig.js to use certificate authentication
// app/server/authConfig.js

import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Read the private key from the extracted file
const privateKeySource = fs.readFileSync('./certs/docker/security-review-center.key', 'utf8');

// Clean the private key (remove Windows line endings)
const privateKey = privateKeySource.replace(/\r/g, '').replace(/\n/g, '');

export const msalConfig = {
    auth: {
        clientId: process.env.ENTRA_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}`,
        clientCertificate: {
            thumbprintSha256: process.env.CERT_THUMBPRINT,
            privateKey: privateKey,
        },
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: 'Info',
        },
    },
};

export const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/redirect';
export const POST_LOGOUT_REDIRECT_URI = process.env.POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000';
export const GRAPH_ME_ENDPOINT = 'https://graph.microsoft.com/v1.0/me';