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
        clientId: process.env.ENTRA_CLIENT_ID || 'f0e2a1b0-5ff6-4b69-8dc8-4d09e4905133',
        authority: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID || 'e5e66f9b-9af2-47a3-8179-53be49b04490'}`,
        clientCertificate: {
            thumbprintSha256: process.env.CERT_THUMBPRINT || 'CA7A13B70C38BA24D35A51BCEF73D9AA630FFCD2',
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