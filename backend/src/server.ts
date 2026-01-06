import dotenv from 'dotenv';
dotenv.config(); // Load environment variables FIRST, before other imports

import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { generateResearchRouter } from './routes/generate-research';
import { generateAudioRouter } from './routes/generate-audio';
import { scriptsRouter } from './routes/scripts';

const app = express();
const PORT = process.env.PORT || 3002; // Dynamically set port from .env

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/generate-research', authMiddleware, generateResearchRouter);
app.use('/api/generate-audio', authMiddleware, generateAudioRouter);
app.use('/api/scripts', authMiddleware, scriptsRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
