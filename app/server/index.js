import initRoutes from './routes.js';
import express from 'express';
import cors from "cors";
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { initTokenManager } from './auth/tokenManager.js';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { JobManager } from './services/jobManager.js';
import { authenticateToken, authenticateWebSocketToken, healthCheck } from './middleware/authMiddleware.js';

dotenv.config();

initTokenManager();

const app = express();

app.set('trust proxy', 1);

// Rate limiting middleware (apply before auth)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiting for auth-related endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit auth attempts
    message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
});

// Basic middleware
app.use(cors({
    origin: ['https://jed-srcenter-a1-0-0.ashyplant-cf496021.centralus.azurecontainerapps.io', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Health check (no auth required)
app.use(healthCheck);

// Apply authentication middleware to all API routes except health check
app.use('/api', authenticateToken);

// Initialize routes (these will now be protected)
initRoutes(app);

// Global error handler
app.use((err, req, res, _next) => {
    console.error('🚨 Global error handler:', err);

    // Don't expose internal error details in production
    const isDev = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        error: isDev ? err.toString() : 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
        ...(isDev && { stack: err.stack })
    });
});

// Create HTTP server
const server = createServer(app);

// Initialize Job Manager (singleton)
const jobManager = JobManager.getInstance();

// Create WebSocket server
const wss = new WebSocketServer({
    server,
    path: '/ws'
});

const authenticateWebSocket = async (ws, req) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        const token = url.searchParams.get('token');

        // Use the same Microsoft validation as HTTP endpoints
        const authResult = await authenticateWebSocketToken(token);

        return { token, userId: authResult.userId };

    } catch (error) {
        console.error('❌ WebSocket authentication failed:', error.message);
        ws.close(1008, 'Authentication failed');
        return null;
    }
};

// Handle WebSocket connections with authentication
wss.on('connection', async (ws, req) => {
    console.log('🔌 New WebSocket connection attempt');

    // Authenticate WebSocket connection
    const authResult = await authenticateWebSocket(ws, req);
    if (!authResult) {
        return; // Connection already closed
    }

    console.log('✅ WebSocket authenticated for user:', authResult.userId);

    const clientId = req.headers['client-id'] || `client-${Date.now()}`;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            // Handle ping/pong for keepalive
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
                console.log(`🏓 Ping/pong with client ${clientId}`);
                return;
            }

            if (data.type === 'subscribe' && data.jobId) {
                // Subscribe client to job updates
                jobManager.subscribeToJob(data.jobId, ws);
                console.log(`📡 Client ${clientId} subscribed to job ${data.jobId}`);

                // Send current job status immediately
                const status = jobManager.getJobStatus(data.jobId);
                if (status) {
                    ws.send(JSON.stringify({
                        type: 'jobUpdate',
                        jobId: data.jobId,
                        status: status.status,
                        progress: status.progress,
                        position: status.position,
                        message: status.message,
                        result: status.status === 'completed' ? status.result : null,
                        error: status.status === 'error' ? status.error : null
                    }));
                }
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        console.log(`🔌 Client ${clientId} disconnected`);
        jobManager.removeClient(ws);
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🔒 Authentication middleware enabled for /api routes`);
    console.log(`⚡ Rate limiting enabled: 100 req/15min general, 10 req/15min auth`);
});