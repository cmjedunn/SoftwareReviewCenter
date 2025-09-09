import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Endpoint Rountes
import usersRoutes from './api/users/users.routes.js';

export default function initRoutes(app) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/api/users', usersRoutes);

    app.use('/api', (_req, res) => {
        res.status(404).json({ error: 'Not found' });
    });

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
}