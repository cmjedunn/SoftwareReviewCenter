import initRoutes from './routes.js';
import express from 'express';
import cors from "cors";
import dotenv from 'dotenv';
import { initTokenManager } from './auth/tokenManager.js';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { JobManager } from './services/jobManager.js'; // We'll create this next

dotenv.config();

initTokenManager();

// Middleware
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
initRoutes(app);

app.use((err, req, res, _next) => {
    console.error(err);
    res
        .status(err.status || 500)
        .json({ error: err.toString() });
});

// Create HTTP server
const server = createServer(app);

// Initialize Job Manager (singleton)
const jobManager = JobManager.getInstance();

// Create WebSocket server
const wss = new WebSocketServer({ 
    server,
    path: '/ws'  // WebSocket endpoint will be ws://localhost:3000/ws
});

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection');
    
    // Extract user info from connection (you can add authentication here)
    const clientId = req.headers['client-id'] || `client-${Date.now()}`;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            if (data.type === 'subscribe' && data.jobId) {
                // Subscribe client to job updates
                jobManager.subscribeToJob(data.jobId, ws);
                console.log(`📡 Client ${clientId} subscribed to job ${data.jobId}`);
                
                // Send current job status
                const status = jobManager.getJobStatus(data.jobId);
                if (status) {
                    ws.send(JSON.stringify({
                        type: 'status',
                        jobId: data.jobId,
                        ...status
                    }));
                }
            }
        } catch (error) {
            console.error('❌ WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        jobManager.removeClient(ws);
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        jobManager.removeClient(ws);
    });
});

const PORT = process.env.PORT ?? 3000;

server.listen(PORT, () => {
    console.log(`🚀 Server listening at http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server ready at ws://localhost:${PORT}/ws`);
});