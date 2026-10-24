import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { initializeDatabase, closeDatabase } from './db';
import todosRouter from './routes/todos';

const app: Express = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3001;

// Middleware
// Local-only unauthenticated demo; a production service needs auth and explicit origin policy.
app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }));
app.use(express.json());

// Initialize database on startup
try {
  initializeDatabase();
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Routes
app.use('/api', todosRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Start server
const server = app.listen(Number(PORT), "127.0.0.1", () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  closeDatabase();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
