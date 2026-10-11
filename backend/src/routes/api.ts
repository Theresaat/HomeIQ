import { Router } from 'express';
import { mockDevices, mockSensorReadings, mockMaintenanceTasks } from '../data/mock-home.ts';
import { deriveDevices, generateActiveAlerts, deriveHomeSummary } from '../services/home-state.ts';
import { acceptSensorReading } from '../services/readings.ts';
import { persistSensorReading } from '../services/sensor-persistence.ts';
import { getSensorHistory } from '../services/sensor-history.ts';
import { deriveWhatChanged } from '../services/what-changed.ts';
import { createAiRouter } from './ai.ts';

export const apiRouter = Router();
apiRouter.use('/ai', createAiRouter());

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'HomeIQ API' });
});

apiRouter.get('/devices', (_req, res) => {
  res.json(deriveDevices(mockDevices, mockSensorReadings));
});

apiRouter.get('/readings', (_req, res) => {
  res.json(mockSensorReadings);
});

apiRouter.get('/history/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  if (!mockDevices.some(device => device.id === deviceId)) {
    res.status(404).json({ error: 'Unknown deviceId.' });
    return;
  }
  try {
    res.json(await getSensorHistory(deviceId));
  } catch {
    res.status(500).json({ error: 'Could not load sensor history.' });
  }
});

apiRouter.get('/insights/what-changed/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  if (!mockDevices.some(device => device.id === deviceId)) {
    res.status(404).json({ error: 'Unknown deviceId.' });
    return;
  }
  try {
    const history = await getSensorHistory(deviceId);
    res.json(deriveWhatChanged(deviceId, history));
  } catch {
    res.status(500).json({ error: 'Could not load what-changed insight.' });
  }
});

apiRouter.post('/readings', (req, res) => {
  const result = acceptSensorReading(req.body, mockDevices, mockSensorReadings);
  if ('error' in result) {
    res.status(400).json(result);
    return;
  }
  void persistSensorReading(result.reading).catch(() => {
    console.error('Snowflake sensor persistence failed. Accepted reading remains in memory.');
  });
  res.json({ status: 'accepted', reading: result.reading });
});

apiRouter.get('/alerts', (_req, res) => {
  res.json(generateActiveAlerts(deriveDevices(mockDevices, mockSensorReadings)));
});

apiRouter.get('/maintenance', (_req, res) => {
  res.json(mockMaintenanceTasks);
});

apiRouter.get('/home', (_req, res) => {
  const devices = deriveDevices(mockDevices, mockSensorReadings);
  const alerts = generateActiveAlerts(devices);
  res.json(deriveHomeSummary({
    devices, sensorReadings: mockSensorReadings, alerts, maintenanceTasks: mockMaintenanceTasks,
  }));
});
