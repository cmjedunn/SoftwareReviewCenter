import { msalConfig } from '../authConfig.js';
import msal from '@azure/msal-node';

class MicrosoftGraphService {
    constructor() {
        this.cca = new msal.ConfidentialClientApplication(msalConfig);
    }

    async getAccessToken() {
        const clientCredentialRequest = {
            scopes: ['https://graph.microsoft.com/.default'],
        };
        
        const response = await this.cca.acquireTokenByClientCredential(clientCredentialRequest);
        return response.accessToken;
    }

    async callGraphAPI(endpoint) {
        const token = await this.getAccessToken();
        
        const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.json();
    }
}

export const graphService = new MicrosoftGraphService();