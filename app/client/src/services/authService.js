// app/client/src/services/authService.js
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";

// Create singleton MSAL instance
let msalInstance = null;
let isInitialized = false;
let initializationPromise = null;

function getMsalInstance() {
    if (!msalInstance) {
        msalInstance = new PublicClientApplication(msalConfig);
    }
    return msalInstance;
}

// Initialize MSAL instance - call this before any token operations
async function initializeMsal() {
    if (isInitialized) {
        return msalInstance;
    }

    // If initialization is already in progress, return the same promise
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            const instance = getMsalInstance();
            await instance.initialize();
            isInitialized = true;
            console.log('MSAL initialized successfully');
            return instance;
        } catch (error) {
            console.error('MSAL initialization failed:', error);
            initializationPromise = null; // Reset so we can retry
            throw new Error(`MSAL initialization failed: ${error.message}`);
        }
    })();

    return initializationPromise;
}

// Ensure MSAL is initialized before proceeding
async function ensureInitialized() {
    if (!isInitialized) {
        await initializeMsal();
    }
    return getMsalInstance();
}

// Get access token with proper initialization
export async function getAccessToken(scopes = ["User.Read"]) {
    try {
        const instance = await ensureInitialized();
        const account = instance.getActiveAccount();
        
        if (!account) {
            throw new Error('No active account found. Please sign in.');
        }

        // Log what we're requesting
        console.log('🎯 Requesting token with scopes:', scopes);
        console.log('🎯 For account:', account.username);

        const tokenResponse = await instance.acquireTokenSilent({
            scopes: scopes,
            account: account,
        });
        
        // Log what we got back
        console.log('✅ Received token for audience:', 
            JSON.parse(atob(tokenResponse.accessToken.split('.')[1])).aud
        );
        
        return tokenResponse.accessToken;
    } catch (error) {
        console.error('Token acquisition failed:', error);
        throw new Error('Failed to get access token. Please try logging in again.');
    }
}

// Authenticated fetch wrapper with proper error handling and retry logic
export async function authenticatedFetch(url, options = {}) {
    try {
        const token = await getAccessToken();
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        // If we get a 401, the token might be expired - try once more
        if (response.status === 401) {
            console.log('Received 401, attempting to refresh token...');
            
            // Clear any cached tokens and try again
            const instance = await ensureInitialized();
            const account = instance.getActiveAccount();
            
            if (account) {
                // Try to get a fresh token
                try {
                    const freshToken = await getAccessToken();
                    
                    // Retry the request with the fresh token
                    const retryResponse = await fetch(url, {
                        ...options,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${freshToken}`,
                            ...options.headers,
                        },
                    });
                    
                    return retryResponse;
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    // Fall through to return the original 401 response
                }
            }
        }

        return response;
    } catch (error) {
        console.error('Authenticated fetch failed:', error);
        throw error;
    }
}

// Utility function to check if user is signed in
export async function isUserSignedIn() {
    try {
        const instance = await ensureInitialized();
        const account = instance.getActiveAccount();
        return !!account;
    } catch (error) {
        console.error('Error checking sign-in status:', error);
        return false;
    }
}

// Utility function to sign out
export async function signOut() {
    try {
        const instance = await ensureInitialized();
        await instance.logoutRedirect();
    } catch (error) {
        console.error('Sign out failed:', error);
        throw error;
    }
}

// Export the initialization function so it can be called from your app
export { initializeMsal };

// Auto-initialize when the module is imported (optional)
// Uncomment the line below if you want automatic initialization
// initializeMsal().catch(console.error);