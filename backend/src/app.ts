import express, { type ErrorRequestHandler } from 'express';
import { apiRouter } from './routes/api.ts';

export function createApp() {
  const app = express();
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json());
  app.use('/api', apiRouter);
  const handleMalformedJson: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
      res.status(400).json({ error: 'Malformed JSON request body.' });
      return;
    }
    next(error);
  };
  app.use(handleMalformedJson);
  return app;
}
