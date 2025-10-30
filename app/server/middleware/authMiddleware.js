import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Create JWKS client to fetch public keys from Microsoft
const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID || 'common'}/discovery/v2.0/keys`,
    requestHeaders: {}, // Optional
    timeout: 30000, // Defaults to 30s
    cache: true, // Cache keys by default
    cacheMaxEntries: 5, // Default value
    cacheMaxAge: 10 * 60 * 1000, // 10 minutes
});

// Function to get the signing key
function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            return callback(err);
        }
        const signingKey = key.getPublicKey ? key.getPublicKey() : key.publicKey;
        callback(null, signingKey);
    });
}

// Main authentication middleware
export const authenticateToken = async (req, res, next) => {
    console.log('🔐 Authentication middleware triggered');
    
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({ 
                error: 'Access token required',
                code: 'TOKEN_MISSING' 
            });
        }

        // Verify the token
        jwt.verify(token, getKey, {
            audience: process.env.ENTRA_CLIENT_ID,
            issuer: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID || 'common'}/v2.0`,
            algorithms: ['RS256']
        }, (err, decoded) => {
            if (err) {
                console.log('❌ Token verification failed:', err.message);
                return res.status(403).json({ 
                    error: 'Invalid or expired token',
                    code: 'TOKEN_INVALID',
                    details: err.message
                });
            }

            // Token is valid, extract user information
            const userInfo = {
                id: decoded.sub || decoded.oid,
                email: decoded.preferred_username || decoded.upn || decoded.email,
                name: decoded.name,
                roles: decoded.roles || [],
                appRoles: decoded.app_roles || [],
                tenantId: decoded.tid,
                clientId: decoded.aud
            };

            console.log('✅ Token validated for user:', userInfo.email);
            
            // Add user info to request object
            req.user = userInfo;
            req.token = token;
            
            // Add user email to headers for downstream processing
            req.headers['x-user-email'] = userInfo.email;
            
            next();
        });

    } catch (error) {
        console.error('🚨 Authentication error:', error);
        return res.status(500).json({ 
            error: 'Authentication service error',
            code: 'AUTH_SERVICE_ERROR' 
        });
    }
};

// Optional: Role-based access control middleware
export const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED' 
            });
        }

        const userRoles = [...(req.user.roles || []), ...(req.user.appRoles || [])];
        const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
            console.log(`❌ User ${req.user.email} lacks required roles:`, requiredRoles);
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: requiredRoles,
                userRoles: userRoles
            });
        }

        console.log(`✅ User ${req.user.email} has required role`);
        next();
    };
};

// Optional: Scope-based access control middleware
export const requireScope = (requiredScopes) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED' 
            });
        }

        // Scopes are typically in the 'scp' claim
        const tokenScopes = req.user.scp ? req.user.scp.split(' ') : [];
        const hasRequiredScope = requiredScopes.some(scope => tokenScopes.includes(scope));

        if (!hasRequiredScope) {
            console.log(`❌ User ${req.user.email} lacks required scopes:`, requiredScopes);
            return res.status(403).json({ 
                error: 'Insufficient scopes',
                code: 'INSUFFICIENT_SCOPES',
                required: requiredScopes,
                userScopes: tokenScopes
            });
        }

        console.log(`✅ User ${req.user.email} has required scope`);
        next();
    };
};

// Health check endpoint that doesn't require auth
export const healthCheck = (req, res, next) => {
    if (req.path === '/api/health' || req.path === '/health') {
        return res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            service: 'Security Review Center API'
        });
    }
    next();
};