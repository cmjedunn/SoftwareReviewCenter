import pkg from 'validate-azure-ad-token';
import jwt from 'jsonwebtoken';
const validate = pkg.default;

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('🚫 No bearer token provided');
        return res.status(401).json({ error: 'No bearer token provided' });
    }

    const token = authHeader.substring(7);

    try {
        // Use Microsoft's official validation library
        const decodedToken = await validate(token, {
            tenantId: process.env.ENTRA_TENANT_ID,
            audience: '00000003-0000-0000-c000-000000000000', // Microsoft Graph
            applicationId: process.env.ENTRA_CLIENT_ID,
            scopes: ['User.Read'] // Match your frontend scopes
        });

        console.log('✅ Token validated by Microsoft official library');

        // Extract payload from the validated token structure
        const payload = decodedToken.payload;

        console.log('👤 User:', payload.unique_name || payload.upn);
        console.log('🏢 Tenant:', payload.tid);
        console.log('📧 Email:', payload.unique_name);
        console.log('🏷️ Name:', payload.name);

        const user = {
            id: payload.sub || payload.oid,
            email: payload.unique_name || payload.upn || payload.email,
            name: payload.name,
            tenantId: payload.tid,
            scopes: payload.scp ? payload.scp.split(' ') : []
        };

        req.user = user;
        req.token = token;
        req.headers['x-user-email'] = user.email;

        next();

    } catch (error) {
        console.error('❌ Token validation error:', error.message);
        return res.status(401).json({
            error: 'Token validation failed',
            details: error.message
        });
    }
};

// WebSocket token authentication with flexible audience handling
export const authenticateWebSocketToken = async (token) => {
    if (!token) {
        throw new Error('No token provided');
    }

    const decoded = jwt.decode(token);

    try {
        // Try with the full Microsoft Graph URI (what your token actually has)
        const decodedToken = await validate(token, {
            tenantId: process.env.ENTRA_TENANT_ID || 'e5e66f9b-9af2-47a3-8179-53be49b04490',
            audience: 'https://graph.microsoft.com', // Use the full URI
            applicationId: process.env.ENTRA_CLIENT_ID || 'f0e2a1b0-5ff6-4b69-8dc8-4d09e4905133',
            scopes: ['User.Read']
        });

        console.log('✅ WebSocket token validated with Graph URI audience');
        
        const payload = decodedToken.payload;
        const userId = payload.unique_name || payload.upn || payload.email;
        
        if (!userId) {
            throw new Error('No user identifier found in token');
        }

        console.log('✅ WebSocket authenticated for user:', userId);
        return { userId, payload };
        
    } catch (error) {
        console.error('❌ WebSocket token validation failed:', error.message);
        throw error;
    }
};

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