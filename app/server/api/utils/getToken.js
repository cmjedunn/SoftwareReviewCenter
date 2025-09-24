import { getLogicGateAccessToken } from '../../auth/tokenManager.js';

/**
 * USAGE:
 * let token = await getToken(res);
 * if (!token) return;
 * 
 * @param {} res 
 * @returns 
 */
export async function getToken(res) {
  try {
    return await getLogicGateAccessToken();
  } catch (error) {
    console.error('❌ Failed to get authentication token:', error.message);
    res.status(500).json({ error: 'Authentication failed' });
    return null;
  }
}