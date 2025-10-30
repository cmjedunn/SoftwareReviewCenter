// app/client/src/services/authService.js
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";

// Create singleton MSAL instance
let msalInstance = null;

function getMsalInstance() {
    if (!msalInstance) {
        msalInstance = new PublicClientApplication(msalConfig);
    }
    return msalInstance;
}

// Get access token
export async function getAccessToken(scopes = ["User.Read"]) {
    try {
        const instance = getMsalInstance();
        const account = instance.getActiveAccount();
        
        if (!account) {
            throw new Error('No active account found. Please sign in.');
        }

        const tokenResponse = await instance.acquireTokenSilent({
            scopes: scopes,
            account: account,
        });
        
        return tokenResponse.accessToken;
    } catch (error) {
        console.error('Token acquisition failed:', error);
        throw new Error('Failed to get access token. Please try logging in again.');
    }
}

// Authenticated fetch wrapper - just pass your normal fetch options
export async function authenticatedFetch(url, options = {}) {
    const token = await getAccessToken();
    
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers, // This allows overriding if needed
        },
    });
}