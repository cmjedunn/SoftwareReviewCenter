import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";

// Create singleton MSAL instance for loaders (outside React context)
let loaderMsalInstance = null;

async function getLoaderMsalInstance() {
    if (!loaderMsalInstance) {
        loaderMsalInstance = new PublicClientApplication(msalConfig);
        await loaderMsalInstance.initialize();
    }
    return loaderMsalInstance;
}

export function createAuthenticatedLoader(loaderFn) {
    return async (args) => {
        try {
            const instance = await getLoaderMsalInstance();
            const account = instance.getActiveAccount();
            
            if (!account) {
                throw new Response("Authentication required", { status: 401 });
            }

            const tokenResponse = await instance.acquireTokenSilent({
                scopes: ["User.Read"],
                account: account,
            });

            // Create authenticated fetch function for the loader
            const authenticatedFetch = async (url, options = {}) => {
                return fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${tokenResponse.accessToken}`,
                        ...options.headers,
                    },
                });
            };

            return loaderFn({ ...args, authenticatedFetch });
        } catch (error) {
            console.error('Loader authentication failed:', error);
            throw new Response("Authentication failed", { status: 401 });
        }
    };
}

