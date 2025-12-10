import { useMsal } from '@azure/msal-react';
import { useCallback } from 'react';

export function useAuthenticatedFetch() {
    const { instance } = useMsal();

    return useCallback(async (url, options = {}) => {
        try {
            const account = instance.getActiveAccount();
            if (!account) {
                throw new Error('No active account found');
            }

            // Get token (using User.Read scope since API scope might not be configured)
            const tokenResponse = await instance.acquireTokenSilent({
                scopes: ["User.Read"],
                account: account,
            });

            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenResponse.accessToken}`,
                    ...options.headers,
                },
            });

            // Handle 401 with retry
            if (response.status === 401) {
                console.warn('🚨 Token expired, retrying...');
                await instance.clearCache();

                const freshToken = await instance.acquireTokenSilent({
                    scopes: ["User.Read"],
                    account: account,
                });

                return fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${freshToken.accessToken}`,
                        ...options.headers,
                    },
                });
            }

            return response;
        } catch (error) {
            console.error('Authenticated fetch failed:', error);
            throw error;
        }
    }, [instance]);
}