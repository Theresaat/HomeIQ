import assert from 'node:assert/strict';
import { test } from 'node:test';
import { demoHistory } from '../dist/data/demo-history.js';
import { mockDevices, mockSensorReadings } from '../dist/data/mock-home.js';
import { deriveWhatChanged } from '../dist/services/what-changed.js';

test('demo history has 12 unique demo IDs, valid sensor references, and chronological fixed timestamps', () => {
  assert.equal(demoHistory.length, 12);
  assert.equal(new Set(demoHistory.map(reading => reading.id)).size, 12);
  for (const reading of demoHistory) {
    assert.ok(reading.id.startsWith('demo-history-'));
    assert.ok(mockDevices.some(device => device.id === reading.deviceId));
    assert.ok(mockSensorReadings.some(sensor => sensor.deviceId === reading.deviceId
      && sensor.sensorType === reading.sensorType && sensor.unit === reading.unit));
    assert.ok(Number.isFinite(reading.value));
    assert.equal(Date.parse(reading.ingestedAt) - Date.parse(reading.timestamp), 60_000);
  }
  for (const deviceId of ['fridge', 'dryer', 'heater']) {
    const readings = demoHistory.filter(reading => reading.deviceId === deviceId);
    assert.deepEqual(readings.map(reading => reading.timestamp), [
      '2026-10-10T17:00:00Z', '2026-10-10T18:00:00Z', '2026-10-10T19:00:00Z', '2026-10-10T20:00:00Z',
    ]);
  }
});

test('demo samples produce the requested increasing trends with correct current and previous values', () => {
  for (const [deviceId, sensorType, values, status] of [
    ['fridge', 'temperature', [38, 40, 43, 46], 'warning'],
    ['dryer', 'vibration', [2.8, 3.2, 4.1, 5.2], 'warning'],
    ['heater', 'pressure', [55, 62, 78, 104], 'critical'],
  ]) {
    const history = demoHistory.filter(reading => reading.deviceId === deviceId);
    assert.deepEqual(history.map(reading => reading.value), values);
    const insight = deriveWhatChanged(deviceId, [...history].reverse());
    assert.equal(insight.sensorType, sensorType);
    assert.equal(insight.current, values[3]);
    assert.equal(insight.previous, values[2]);
    assert.equal(insight.status, status);
    assert.equal(insight.sampleSize, 4);
    assert.equal(insight.direction, 'increasing');
  }
});
