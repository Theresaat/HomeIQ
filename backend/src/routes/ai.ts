import { Router } from 'express';
import { buildDeviceContext, buildHomeContext } from '../services/reasoning-context.ts';
import { generateHomeIQInsight } from '../services/gemini-reasoning.ts';

export function createAiRouter(services = { buildDeviceContext, buildHomeContext, generateHomeIQInsight }) {
  const router = Router();
  router.post('/ask', async (req, res) => {
    const body: unknown = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'A JSON object with a non-empty question is required.' });
      return;
    }
    const { question, deviceId } = body as Record<string, unknown>;
    if (typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ error: 'question must be a non-empty string.' });
      return;
    }
    if (deviceId !== undefined && (typeof deviceId !== 'string' || !deviceId.trim())) {
      res.status(400).json({ error: 'deviceId must be a non-empty string when provided.' });
      return;
    }
    try {
      const options = { question: question.trim() };
      const context = typeof deviceId === 'string'
        ? await services.buildDeviceContext(deviceId, options)
        : await services.buildHomeContext(options);
      if (!context) {
        res.status(404).json({ error: 'Unknown deviceId.' });
        return;
      }
      res.json(await services.generateHomeIQInsight(context));
    } catch {
      res.status(500).json({ error: 'Could not generate a HomeIQ insight.' });
    }
  });
  return router;
}
