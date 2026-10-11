import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveWhatChanged } from '../dist/services/what-changed.js';

function reading(value, index = 0, details = {}) {
  return { id: 'fridge-reading-0', deviceId: 'fridge', sensorType: 'temperature',
    label: 'Internal temperature', value, unit: '°F', status: 'warning',
    timestamp: `2026-10-10T${String(16 - index).padStart(2, '0')}:00:00.000000000+00:00`,
    ingestedAt: '2026-10-10T16:01:00.000000000+00:00', ...details };
}

test('trend uses current/prior readings, caps the average at five, and preserves sample context', () => {
  const history = [46, 43, 38, 37, 37.5, 100].map((value, index) => reading(value, index));
  const original = structuredClone(history);
  const result = deriveWhatChanged('fridge', history);
  assert.equal(result.current, 46);
  assert.equal(result.previous, 43);
  assert.equal(result.recentAverage, 40.3);
  assert.equal(result.change, 3);
  assert.equal(result.percentageChange, 6.98);
  assert.equal(result.direction, 'increasing');
  assert.equal(result.sampleSize, 5);
  assert.equal(result.currentTimestamp, history[0].timestamp);
  assert.equal(result.previousTimestamp, history[1].timestamp);
  assert.deepEqual(result.recentReadings.map(sample => sample.value), [46, 43, 38, 37, 37.5]);
  assert.equal(result.recentReadings[0].ingestedAt, history[0].ingestedAt);
  assert.deepEqual(history, original);
});

test('categorical text, numeric strings, unrelated types and devices never enter the numeric average', () => {
  const history = [reading(46), reading('Closed', 1), reading(180, 1, { sensorType: 'power_usage', unit: 'W' }),
    reading(999, 1, { deviceId: 'heater' }), reading('104', 2), reading(43, 3)];
  const result = deriveWhatChanged('fridge', history);
  assert.equal(result.previous, 43);
  assert.equal(result.recentAverage, 44.5);
  assert.equal(result.sampleSize, 2);
});

test('insufficient numeric history succeeds with useful context', () => {
  for (const history of [[], [reading(46)], [reading('Dry'), reading('Moisture detected', 1)],
    [reading('46'), reading('43', 1)], [reading(NaN), reading(Infinity, 1)]]) {
    const result = deriveWhatChanged('fridge', history);
    assert.equal(result.status, 'insufficient_history');
    assert.equal(result.historySampleSize, history.length);
    assert.match(result.message, /two numeric readings/);
  }
});

test('a categorical latest event is not replaced with an older numeric current value', () => {
  assert.equal(deriveWhatChanged('fridge', [reading('Closed'), reading(46, 1), reading(43, 2)]).status,
    'insufficient_history');
});

test('readings with different units are not compared or averaged', () => {
  assert.equal(deriveWhatChanged('fridge', [reading(46), reading(8, 1, { unit: '°C' })]).status,
    'insufficient_history');
  const result = deriveWhatChanged('fridge', [reading(46), reading(8, 1, { unit: '°C' }), reading(43, 2)]);
  assert.equal(result.previous, 43);
  assert.equal(result.sampleSize, 2);
});

test('direction uses tolerance before rounding, and zero previous values have no percentage', () => {
  for (const [current, previous, direction] of [[46.02, 46, 'stable'], [0.005, 0, 'stable'],
    [43, 46, 'decreasing'], [46, 43, 'increasing'], [46, 46, 'stable']]) {
    assert.equal(deriveWhatChanged('fridge', [reading(current), reading(previous, 1)]).direction, direction);
  }
  const result = deriveWhatChanged('fridge', [reading(1), reading(0, 1)]);
  assert.equal(result.percentageChange, null);
  assert.equal(result.change, 1);
});

test('usefulness favors severity, then meaningful movement, then normalized change', () => {
  const power = (value, index, status = 'warning') => reading(value, index, { sensorType: 'power_usage', unit: 'W', status });
  assert.equal(deriveWhatChanged('fridge', [reading(46), power(180, 0, 'critical'), reading(43, 1),
    power(180, 1, 'critical')]).sensorType, 'power_usage');
  assert.equal(deriveWhatChanged('fridge', [reading(46), power(200, 0), reading(46, 1), power(100, 1)]).sensorType,
    'power_usage');
  assert.equal(deriveWhatChanged('fridge', [reading(46), power(1100, 0), reading(23, 1), power(1000, 1)]).sensorType,
    'temperature');
});

test('ties preserve history recency, including ingestion order at equal event timestamps', () => {
  const newest = reading(46, 0, { sensorType: 'humidity', unit: '%', ingestedAt: '2026-10-10T16:02:00+00:00' });
  const history = [newest, reading(46), reading(43, 1, { sensorType: 'humidity', unit: '%' }), reading(43, 1)];
  assert.equal(deriveWhatChanged('fridge', history).sensorType, 'humidity');
});
