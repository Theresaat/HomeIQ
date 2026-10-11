import { Router } from 'express';
import { mockDevices, mockSensorReadings, mockMaintenanceTasks } from '../data/mock-home.ts';
import { deriveDevices, generateActiveAlerts, deriveHomeSummary } from '../services/home-state.ts';
import { acceptSensorReading } from '../services/readings.ts';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'HomeIQ API' });
});

apiRouter.get('/devices', (_req, res) => {
  res.json(deriveDevices(mockDevices, mockSensorReadings));
});

apiRouter.get('/readings', (_req, res) => {
  res.json(mockSensorReadings);
});

apiRouter.post('/readings', (req, res) => {
  const result = acceptSensorReading(req.body, mockDevices, mockSensorReadings);
  if ('error' in result) {
    res.status(400).json(result);
    return;
  }
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
