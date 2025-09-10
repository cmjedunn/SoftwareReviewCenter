import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Endpoint Routes
import recordRoutes from './api/records/record.routes.js';

export default function initRoutes(app) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));
    
    // API routes
    app.use('/api/records', recordRoutes);
    
    // API catch-all for undefined /api/* routes - 404 JSON response
    app.all('/api/*splat', (_req, res) => {
        res.status(404).json({ error: 'HELP !API endpoint not found' });
        console.log("request");
    });
    
    // Frontend catch-all for React Router (or other SPA routes)
    app.all('*splat', (req, res) => {
        res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
        console.log("request");
    });
}
