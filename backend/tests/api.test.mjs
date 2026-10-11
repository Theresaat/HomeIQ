import assert from 'node:assert/strict';
import { once } from 'node:events';
import { before, after, test, mock } from 'node:test';
import snowflake from 'snowflake-sdk';
import { createApp } from '../dist/app.js';
import { mockSensorReadings } from '../dist/data/mock-home.js';

let server;
let baseUrl;
const persistenceCalls = [];
const historyCalls = [];
let historyRows = [];
let historyError;
let connectionError;
let connectionAttempts = 0;
let insertError;
let deferInsert = false;
let completeInsert;
let connectionsClosed = 0;
const snowflakeEnvironment = ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PASSWORD'];
const originalEnvironment = new Map(snowflakeEnvironment.map(name => [name, process.env[name]]));
before(async () => {
  snowflakeEnvironment.forEach(name => { process.env[name] = 'test-only'; });
  mock.method(snowflake, 'createConnection', () => {
    connectionAttempts++;
    const connection = {
      connect(callback) { callback(connectionError, connection); },
      execute(options) {
        if (options.sqlText.includes('FROM HOMEIQ.APP.SENSOR_READINGS')) {
          historyCalls.push(options);
          options.complete(historyError, {}, historyRows);
          return;
        }
        persistenceCalls.push(options);
        if (deferInsert) completeInsert = () => options.complete(insertError, {}, []);
        else options.complete(insertError, {}, []);
      },
      destroy(callback) { connectionsClosed++; callback(undefined, connection); },
    };
    return connection;
  });
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server?.listening) await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
  mock.restoreAll();
  for (const [name, value] of originalEnvironment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
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
  const beforeWrites = persistenceCalls.length;
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
    assert.equal(persistenceCalls.length, beforeWrites + 2);
    assert.ok(persistenceCalls.slice(beforeWrites).every(call => call.binds[0] === payload.id));
  } finally {
    mockSensorReadings.splice(0, mockSensorReadings.length, ...snapshot);
  }
});

test('invalid payloads return JSON 400 without changing shared readings', async () => {
  const snapshot = JSON.stringify(mockSensorReadings);
  const beforeWrites = persistenceCalls.length;
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
  assert.equal(persistenceCalls.length, beforeWrites);
});

test('accepted numeric and categorical events bind values and preserve incoming timestamps', async () => {
  const snapshot = mockSensorReadings.map(reading => ({ ...reading }));
  const beforeWrites = persistenceCalls.length;
  try {
    const reading = snapshot.find(reading => reading.id === 'heater-reading-2');
    for (const value of [0, 95.5, 'Normal', '104', 'Dry; quoted "text"']) {
      const payload = { ...reading, value, timestamp: '2026-10-10T10:30:00.123456789-04:00' };
      const response = await postReading(payload);
      assert.equal(response.status, 200);
      const write = persistenceCalls.at(-1);
      assert.match(write.sqlText, /INSERT INTO HOMEIQ\.APP\.SENSOR_READINGS/);
      assert.equal((write.sqlText.match(/\?/g) ?? []).length, 8);
      assert.match(write.sqlText, /PARSE_JSON\(\?\)/);
      assert.match(write.sqlText, /TO_TIMESTAMP_TZ\(\?\)/);
      assert.deepEqual(write.binds, [payload.id, payload.deviceId, payload.sensorType, payload.label,
        JSON.stringify(value), payload.unit, payload.status, payload.timestamp]);
    }
    assert.equal(persistenceCalls.length, beforeWrites + 5);
  } finally {
    mockSensorReadings.splice(0, mockSensorReadings.length, ...snapshot);
  }
});

test('a pending or failed Snowflake insert does not delay acceptance or lose in-memory state', async () => {
  const snapshot = mockSensorReadings.map(reading => ({ ...reading }));
  const closedBefore = connectionsClosed;
  const logged = mock.method(console, 'error', () => {});
  deferInsert = true;
  insertError = new Error('Sensitive connection details must not be logged');
  try {
    const payload = { ...snapshot.find(reading => reading.id === 'heater-reading-2'), value: 104, status: 'critical' };
    const response = await postReading(payload);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'accepted', reading: payload });
    assert.deepEqual((await get('readings')).find(reading => reading.id === payload.id), payload);
    assert.equal(connectionsClosed, closedBefore);
    completeInsert();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(connectionsClosed, closedBefore + 1);
    assert.deepEqual(logged.mock.calls.map(call => call.arguments), [
      ['Snowflake sensor persistence failed. Accepted reading remains in memory.'],
    ]);
    assert.equal((await get('devices')).find(device => device.id === 'heater').status, 'critical');
    assert.equal((await get('health')).status, 'ok');
  } finally {
    deferInsert = false;
    insertError = undefined;
    completeInsert = undefined;
    logged.mock.restore();
    mockSensorReadings.splice(0, mockSensorReadings.length, ...snapshot);
  }
});

test('history returns camelCase events and queries the selected device with ordering and a 20-row limit', async () => {
  const closedBefore = connectionsClosed;
  const timestamp = '2026-10-10T10:30:00.123456789-04:00';
  const event = { id: 'heater-reading-2', deviceId: 'heater', sensorType: 'pressure',
    label: 'Water pressure', value: 95.5, unit: 'psi', status: 'warning', timestamp,
    ingestedAt: '2026-10-10T14:35:00.000000000+00:00' };
  historyRows = [event, { ...event, value: 0, ingestedAt: '2026-10-10T14:34:00.000000000+00:00' },
    { ...event, id: 'heater-reading-1', sensorType: 'tank_condition', value: 'Normal', unit: '', ingestedAt: null }];
  try {
    assert.deepEqual(await get('history/heater'), historyRows);
    assert.equal(connectionsClosed, closedBefore + 1);
    const query = historyCalls.at(-1);
    assert.deepEqual(query.binds, ['heater']);
    assert.equal((query.sqlText.match(/\?/g) ?? []).length, 1);
    assert.match(query.sqlText, /WHERE DEVICE_ID = \?/);
    assert.match(query.sqlText, /ORDER BY TIMESTAMP DESC, INGESTED_AT DESC\s+LIMIT 20/);
    for (const field of Object.keys(event)) assert.ok(query.sqlText.includes(`AS "${field}"`));
    assert.match(query.sqlText, /FF9TZH:TZM/);
  } finally {
    historyRows = [];
  }
});

test('a known device with no persisted history returns an empty JSON array', async () => {
  assert.deepEqual(await get('history/hvac'), []);
});

test('unknown history device IDs return 404 before connecting to Snowflake', async () => {
  const attemptsBefore = connectionAttempts;
  for (const id of ['unknown-device', "heater' OR 1=1 --"]) {
    const response = await fetch(`${baseUrl}/history/${encodeURIComponent(id)}`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Unknown deviceId.' });
  }
  assert.equal(connectionAttempts, attemptsBefore);
});

test('history connection and query failures return a safe JSON 500 and leave the API available', async () => {
  const closedBefore = connectionsClosed;
  try {
    for (const failure of ['connection', 'query']) {
      const error = new Error('Sensitive credentials and internal details must not be exposed');
      connectionError = failure === 'connection' ? error : undefined;
      historyError = failure === 'query' ? error : undefined;
      const response = await fetch(`${baseUrl}/history/heater`);
      assert.equal(response.status, 500);
      assert.match(response.headers.get('content-type'), /^application\/json/);
      assert.deepEqual(await response.json(), { error: 'Could not load sensor history.' });
      assert.equal((await get('health')).status, 'ok');
    }
    assert.equal(connectionsClosed, closedBefore + 1);
  } finally {
    connectionError = undefined;
    historyError = undefined;
  }
});

test('what-changed reuses one parameterized history query and returns a numeric insight', async () => {
  const beforeQueries = historyCalls.length;
  const event = { id: 'fridge-reading-0', deviceId: 'fridge', sensorType: 'temperature',
    label: 'Internal temperature', unit: '°F', status: 'warning', ingestedAt: null };
  historyRows = [{ ...event, value: 46, timestamp: '2026-10-10T16:00:00+00:00' },
    { ...event, value: 43, timestamp: '2026-10-10T15:00:00+00:00' }];
  try {
    const result = await get('insights/what-changed/fridge');
    assert.equal(result.deviceId, 'fridge');
    assert.equal(result.sensorType, 'temperature');
    assert.equal(result.current, 46);
    assert.equal(result.previous, 43);
    assert.equal(result.percentageChange, 6.98);
    assert.equal(historyCalls.length, beforeQueries + 1);
    assert.deepEqual(historyCalls.at(-1).binds, ['fridge']);
  } finally {
    historyRows = [];
  }
});

test('what-changed with insufficient history returns HTTP 200 and an explanation', async () => {
  const result = await get('insights/what-changed/fridge');
  assert.equal(result.status, 'insufficient_history');
  assert.equal(result.numericReadingCount, 0);
  assert.equal(result.historySampleSize, 0);
  assert.match(result.message, /two numeric readings/);
});

test('unknown what-changed devices return 404 without connecting', async () => {
  const beforeAttempts = connectionAttempts;
  const response = await fetch(`${baseUrl}/insights/what-changed/unknown-device`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Unknown deviceId.' });
  assert.equal(connectionAttempts, beforeAttempts);
});

test('what-changed returns safe HTTP 500 on connection or query failure', async () => {
  try {
    for (const failure of ['connection', 'query']) {
      const error = new Error('Sensitive credentials must not be exposed');
      connectionError = failure === 'connection' ? error : undefined;
      historyError = failure === 'query' ? error : undefined;
      const response = await fetch(`${baseUrl}/insights/what-changed/fridge`);
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: 'Could not load what-changed insight.' });
    }
  } finally {
    connectionError = undefined;
    historyError = undefined;
  }
});
