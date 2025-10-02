import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Endpoint Routes
import recordRoutes from './api/records/records.routes.js';
import workflowRoutes from './api/workflows/workflows.routes.js'
import applicationRecordRoutes from './api/records/applicationRecords/applicationRecords.routes.js'
import environmentRoutes from './api/records/environmentRecords/environmentRecords.routes.js';
import controlRoutes from './api/records/controlRecords/controlRecords.routes.js';

export default function initRoutes(app) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));

    // API routes
    app.use('/api/records', recordRoutes);
    app.use('/api/workflows', workflowRoutes);
    app.use('/api/applications', applicationRecordRoutes);application
    app.use('/api/environments', environmentRoutes);
    app.use('/api/controls', controlRoutes);
    // Health
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });

    // API catch-all for undefined /api/* routes - 404 JSON response
    app.all('/api/*splat', (_req, res) => {
        res.status(404).json({ error: 'API endpoint not found' });
    });

    // Frontend catch-all for React Router (or other SPA routes).
    app.all('*splat', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
}
