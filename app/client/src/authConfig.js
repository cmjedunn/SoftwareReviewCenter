/* eslint-disable no-unused-vars */

const client = import.meta.env.VITE_ENTRA_CLIENT_ID;
const tenant = import.meta.env.VITE_ENTRA_AUTHORITY;

export const msalConfig = {
  auth: {
    clientId: client, // <-- This must be set
    authority: `https://login.microsoftonline.com/${tenant}`,
    redirectUri: 'http://localhost:3000',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};