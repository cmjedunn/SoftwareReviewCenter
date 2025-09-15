//const DB_URL = process.env.DB_URL ?? 'mongodb+srv://username:password123%40@cluster0.sovcujs.mongodb.net/cookbook_dev?retryWrites=true&w=majority';
const PORT = process.env.PORT ?? 3000;

import initRoutes from './routes.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from "cors";
import dotenv from 'dotenv';
import { initTokenManager } from './auth/tokenManager.js';

dotenv.config();

initTokenManager();

//Middleware
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


app.listen(PORT, () =>
    console.log(`API listening at http://localhost:${PORT}`)
);
// mongoose.connect(DB_URL)
//     .then(() => {
//         console.log('MongoDB connected');

//     })
//     .catch(err => {
//         console.error('DB connection failed:', err);
//         process.exit(1);
//     });