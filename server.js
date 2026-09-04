import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import authRoutes from './routes/auth.js';
import athleteRoutes from './routes/athletes.js';
import coachRoutes from './routes/coach.js';
import messageRoutes from './routes/messages.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: '✅ Server running!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/athlete', athleteRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/messages', messageRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME}`);
});
