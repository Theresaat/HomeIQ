import assert from 'node:assert/strict';
import { once } from 'node:events';
import { before, after, test } from 'node:test';
import { createApp } from '../dist/app.js';
import { mockSensorReadings } from '../dist/data/mock-home.js';

let server;
let baseUrl;
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server?.listening) await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

async function get(endpoint) {
  const response = await fetch(`${baseUrl}/${endpoint}`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  return response.json();
}

test('all six GET endpoints return consistent JSON from current backend state', async () => {
  assert.deepEqual(await get('health'), { status: 'ok', service: 'HomeIQ API' });
  const devices = await get('devices');
  const readings = await get('readings');
  const alerts = await get('alerts');
  const maintenance = await get('maintenance');
  const home = await get('home');

  assert.equal(devices.length, 11);
  assert.equal(readings.length, 34);
  assert.equal(alerts.length, 3);
  assert.equal(maintenance.length, 3);
  assert.equal(home.normalDeviceCount, 8);
  assert.equal(home.warningDeviceCount, 2);
  assert.equal(home.criticalDeviceCount, 1);
  assert.equal(home.activeAlertCount, 3);
  assert.equal(home.warningAlertCount, 2);
  assert.equal(home.criticalAlertCount, 1);

  for (const device of devices) {
    assert.deepEqual(device.latestReadings, readings.filter(reading => reading.deviceId === device.id));
  }
  for (const alert of alerts) {
    assert.equal(alert.status, 'active');
    assert.equal(alert.severity, devices.find(device => device.id === alert.deviceId).status);
  }
  const today = new Date(home.asOf);
  today.setHours(0, 0, 0, 0);
  const overdue = maintenance.filter(task => !task.completed && new Date(`${task.dueDate}T00:00:00`) < today).length;
  assert.equal(home.homeHealthScore, 64 - overdue * 3);
});

test('devices, readings, alerts, and home are recalculated after sensor state changes', async () => {
  const originalStatuses = mockSensorReadings.map(reading => reading.status);
  try {
    mockSensorReadings.forEach(reading => { reading.status = 'normal'; });
    assert.ok((await get('devices')).every(device => device.status === 'normal'));
    assert.ok((await get('readings')).every(reading => reading.status === 'normal'));
    assert.deepEqual(await get('alerts'), []);
    const home = await get('home');
    assert.equal(home.normalDeviceCount, 11);
    assert.equal(home.warningDeviceCount, 0);
    assert.equal(home.criticalDeviceCount, 0);
    assert.equal(home.activeAlertCount, 0);
    assert.equal(home.warningAlertCount, 0);
    assert.equal(home.criticalAlertCount, 0);
    assert.equal(home.homeHealthScore, 100 - home.overdueMaintenanceTasks * 3);
  } finally {
    mockSensorReadings.forEach((reading, index) => { reading.status = originalStatuses[index]; });
  }
});

async function postReading(payload) {
  return fetch(`${baseUrl}/readings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}

test('POST updates an existing ID without duplication and derived GET responses react', async () => {
  const snapshot = mockSensorReadings.map(reading => ({ ...reading }));
  try {
    const beforeHome = await get('home');
    const pressure = snapshot.find(reading => reading.id === 'heater-reading-2');
    const payload = { ...pressure, value: 104, status: 'critical', timestamp: '2026-10-10T16:00:00Z' };
    const response = await postReading(payload);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'accepted', reading: payload });
    const readings = await get('readings');
    assert.equal(readings.length, snapshot.length);
    assert.deepEqual(readings.find(reading => reading.id === payload.id), payload);
    assert.equal((await get('devices')).find(device => device.id === 'heater').status, 'critical');
    assert.equal((await get('alerts')).find(alert => alert.deviceId === 'heater').severity, 'critical');
    assert.equal((await get('home')).homeHealthScore, beforeHome.homeHealthScore - 20);

    const reset = await postReading({ ...payload, value: 55, status: 'normal' });
    assert.equal(reset.status, 200);
    assert.equal((await get('devices')).find(device => device.id === 'heater').status, 'normal');
    assert.ok(!(await get('alerts')).some(alert => alert.deviceId === 'heater'));
    assert.equal((await get('home')).homeHealthScore, beforeHome.homeHealthScore);
  } finally {
    mockSensorReadings.splice(0, mockSensorReadings.length, ...snapshot);
  }
});

test('POST adds a new reading once, then upserts that ID in the same shared state', async () => {
  const snapshot = mockSensorReadings.map(reading => ({ ...reading }));
  try {
    const payload = {
      ...snapshot.find(reading => reading.deviceId === 'hvac'),
      id: 'hvac-reading-new', value: 80, status: 'warning',
    };
    assert.equal((await postReading(payload)).status, 200);
    assert.equal((await postReading({ ...payload, value: 90, status: 'critical' })).status, 200);
    const readings = await get('readings');
    assert.equal(readings.length, snapshot.length + 1);
    assert.equal(readings.filter(reading => reading.id === payload.id).length, 1);
    assert.equal((await get('devices')).find(device => device.id === 'hvac').status, 'critical');
    assert.equal((await get('alerts')).filter(alert => alert.deviceId === 'hvac').length, 1);
  } finally {
    mockSensorReadings.splice(0, mockSensorReadings.length, ...snapshot);
  }
});

test('invalid payloads return JSON 400 without changing shared readings', async () => {
  const snapshot = JSON.stringify(mockSensorReadings);
  const valid = { ...mockSensorReadings[0] };
  const missingFields = Object.keys(valid).map(field => {
    const payload = { ...valid };
    delete payload[field];
    return payload;
  });
  for (const payload of [
    null, [], 'text', {}, ...missingFields,
    { ...valid, id: '  ' }, { ...valid, label: 123 }, { ...valid, value: null },
    { ...valid, value: {} }, { ...valid, value: '  ' }, { ...valid, unit: 2 },
    { ...valid, timestamp: 'yesterday' }, { ...valid, timestamp: '2026-02-30T12:00:00Z' },
    { ...valid, timestamp: '2026-10-10T12:00:00' },
    { ...valid, sensorType: 'made_up' }, { ...valid, status: 'offline' },
    { ...valid, deviceId: 'heater' }, { ...valid, sensorType: 'temperature' },
  ]) {
    const response = await postReading(payload);
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  const unknown = await postReading({ ...valid, deviceId: 'unknown-device' });
  assert.equal(unknown.status, 400);
  assert.match((await unknown.json()).error, /Unknown deviceId: unknown-device/);
  const malformed = await fetch(`${baseUrl}/readings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'Malformed JSON request body.' });
  assert.equal(JSON.stringify(mockSensorReadings), snapshot);
});
