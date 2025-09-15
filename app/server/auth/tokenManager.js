import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
// Removed HttpsProxyAgent import since proxy is not needed

dotenv.config();

const CACHE_FILE = path.resolve('./token-cache/token-cache.json');
const TTL_BUFFER = 60; // seconds

const client = process.env.LOGICGATE_CLIENT_KEY;
const secret = process.env.LOGICGATE_CLIENT_SECRET;
const env = process.env.LOGICGATE_ENV;

// Create agent with proxy support
const createAgent = () => {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (proxyUrl) {
    console.log('🌐 Using proxy:', proxyUrl);
    return new HttpsProxyAgent(proxyUrl, {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    });
  }

  // Fallback to regular HTTPS agent
  return new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  });
};

const agent = createAgent();

if (!client || !secret || !env) {
  throw new Error('Missing required LogicGate env vars.');
}

let currentToken = null;
let refreshTimer = null;

function isValid(token) {
  const now = Math.floor(Date.now() / 1000);
  return token?.access_token && token?.expires_at > now + TTL_BUFFER;
}

async function loadCachedToken() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveToken(tokenData) {
  const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
  const payload = {
    access_token: tokenData.access_token,
    expires_at: expiresAt,
  };

  // Ensure cache directory exists
  const cacheDir = path.dirname(CACHE_FILE);
  await fs.mkdir(cacheDir, { recursive: true });

  await fs.writeFile(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  currentToken = payload;
  return payload;
}

async function fetchNewToken() {
  // Ensure agent is initialized
  if (!agent) {
    agent = await createSecureAgent();
  }

  const basicToken = Buffer.from(`${client}:${secret}`).toString('base64');
  const url = `https://${env}.logicgate.com/api/v1/account/token`;

  try {
    console.log('🔄 Fetching new LogicGate token...');
    console.log('🌐 Target URL:', url);

    const res = await fetch(url, {
      method: 'POST',
      agent: agent,
      headers: {
        Authorization: `Basic ${basicToken}`,
        Accept: 'application/json',
        'User-Agent': 'LogicGate-Token-Manager/1.0'
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Token fetch failed: ${res.status} ${body}`);
    }

    const json = await res.json();
    console.log('✅ Successfully fetched new token');
    return await saveToken(json);

  } catch (error) {
    console.error('❌ Token fetch error:', error.message);

    // Provide specific guidance based on error type
    if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
      console.error('🔍 SSL Certificate chain issue detected:');
      console.error('   1. Download LogicGate\'s certificate chain');
      console.error('   2. Save to ./certs/ca-bundle.pem');
      console.error('   3. Or set CA_BUNDLE_PATH environment variable');
      console.error('   4. Restart the application');
    } else if (error.code === 'CERT_HAS_EXPIRED') {
      console.error('⏰ Certificate has expired - contact LogicGate support');
    } else if (error.code === 'HOSTNAME_MISMATCH') {
      console.error('🏷️  Hostname mismatch - verify the LogicGate environment URL');
    }

    throw error;
  }
}

let tokenFetchPromise = null;

export async function getLogicGateAccessToken() {
  if (isValid(currentToken)) return currentToken.access_token;

  const cached = await loadCachedToken();
  if (isValid(cached)) {
    currentToken = cached;
    return cached.access_token;
  }

  // Prevent multiple parallel fetches
  if (!tokenFetchPromise) {
    tokenFetchPromise = fetchNewToken().finally(() => {
      tokenFetchPromise = null;
    });
  }

  return (await tokenFetchPromise).access_token;
}

export async function initTokenManager() {
  try {
    await getLogicGateAccessToken(); // initialize token

    const MAX_TIMEOUT = 2 ** 31 - 1; // 2147483647 ms ≈ 24.8 days

    const now = Math.floor(Date.now() / 1000);
    let delay = Math.max(5, currentToken.expires_at - now - TTL_BUFFER) * 1000;

    if (delay > MAX_TIMEOUT) {
      console.warn(`⏰ Delay (${delay}ms) too long for setTimeout. Clamping to ${MAX_TIMEOUT}ms (≈24.8 days).`);
      delay = MAX_TIMEOUT;
    }

    console.log(`🕒 Scheduling token refresh in ${Math.round(delay / 1000 / 60)} min`);

    // Clear existing timer if it exists
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    refreshTimer = setTimeout(async () => {
      try {
        await fetchNewToken();
        await initTokenManager(); // schedule next refresh
      } catch (err) {
        console.error('❌ Failed to refresh LogicGate token:', err);

        // Retry in 5 minutes on failure
        console.log('🔄 Retrying token refresh in 5 minutes...');
        setTimeout(() => initTokenManager(), 5 * 60 * 1000);
      }
    }, delay);

  } catch (err) {
    console.error('❌ Failed to init token manager:', err);

    // Retry initialization in 1 minute on failure
    console.log('🔄 Retrying token manager initialization in 1 minute...');
    setTimeout(() => initTokenManager(), 60 * 1000);
  }
}

// Cleanup function for graceful shutdown
export function cleanupTokenManager() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}