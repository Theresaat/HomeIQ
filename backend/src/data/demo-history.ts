import type { SensorHistoryReading, SensorReading, SensorStatus } from '../types.ts';

const timestamps = [
  '2026-10-10T17:00:00Z', '2026-10-10T18:00:00Z',
  '2026-10-10T19:00:00Z', '2026-10-10T20:00:00Z',
];

const sensors: (Pick<SensorReading, 'deviceId' | 'sensorType' | 'label' | 'unit'> & {
  samples: [number, SensorStatus][];
})[] = [
  {
    deviceId: 'fridge', sensorType: 'temperature', label: 'Internal temperature', unit: '°F',
    samples: [[38, 'normal'], [40, 'normal'], [43, 'warning'], [46, 'warning']],
  },
  {
    deviceId: 'dryer', sensorType: 'vibration', label: 'Drum vibration (RMS)', unit: 'mm/s',
    samples: [[2.8, 'normal'], [3.2, 'normal'], [4.1, 'normal'], [5.2, 'warning']],
  },
  {
    deviceId: 'heater', sensorType: 'pressure', label: 'Water pressure', unit: 'psi',
    samples: [[55, 'normal'], [62, 'normal'], [78, 'normal'], [104, 'critical']],
  },
];

// Simulated hackathon history, separate from accepted live POST events and current mock state.
export const demoHistory: SensorHistoryReading[] = sensors.flatMap(({ samples, ...sensor }) =>
  samples.map(([value, status], index) => ({
    ...sensor, id: `demo-history-${sensor.deviceId}-${sensor.sensorType}-${index + 1}`,
    value, status, timestamp: timestamps[index],
    ingestedAt: new Date(Date.parse(timestamps[index]) + 60_000).toISOString(),
  }))
);
