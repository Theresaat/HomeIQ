import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDeviceContext, buildHomeContext } from '../dist/services/reasoning-context.js';
import { mockDevices, mockSensorReadings, mockMaintenanceTasks } from '../dist/data/mock-home.js';
import { demoHistory } from '../dist/data/demo-history.js';
import { deriveDevices, deriveHomeSummary, generateActiveAlerts } from '../dist/services/home-state.js';
import { generateHomeIQInsight } from '../dist/services/gemini-reasoning.js';

const asOf = new Date('2026-10-11T12:00:00Z');
function data() {
  return structuredClone({ devices: mockDevices, readings: mockSensorReadings, maintenanceTasks: mockMaintenanceTasks });
}
function options(source = data()) {
  return { data: source, asOf, loadHistory: async id => demoHistory.filter(r => r.deviceId === id).slice().reverse() };
}
function setStatus(source, deviceId, status) {
  const reading = source.readings.find(r => r.deviceId === deviceId);
  reading.status = status;
}

test('device context contains exact current details, filtered evidence, and whole-home derived score', async () => {
  const source = data();
  const original = structuredClone(source);
  const result = await buildDeviceContext('fridge', { ...options(source), question: 'What changed?' });
  const devices = deriveDevices(source.devices, source.readings);
  const device = devices.find(d => d.id === 'fridge');
  const { latestReadings, ...details } = device;
  assert.equal(result.scope, 'device');
  assert.equal(result.deviceId, 'fridge');
  assert.deepEqual(result.devices, [details]);
  assert.deepEqual(result.readings, latestReadings);
  assert.deepEqual(result.maintenanceTasks, source.maintenanceTasks.filter(t => t.deviceId === 'fridge'));
  assert(result.alerts.every(a => a.deviceId === 'fridge' && a.status === 'active'));
  assert.deepEqual(result.homeSummary, deriveHomeSummary({ devices, sensorReadings: source.readings,
    alerts: generateActiveAlerts(devices), maintenanceTasks: source.maintenanceTasks, asOf }));
  assert.deepEqual(source, original);
});

test('warning device reuses historical trend calculation and preserves actual Snowflake values', async () => {
  const source = data();
  setStatus(source, 'fridge', 'warning');
  const result = await buildDeviceContext('fridge', options(source));
  assert.equal(result.devices[0].status, 'warning');
  assert.equal(result.whatChanged[0].current, 46);
  assert.equal(result.whatChanged[0].previous, 43);
  assert.equal(result.whatChanged[0].recentAverage, 41.75);
  assert.deepEqual(result.history, demoHistory.filter(r => r.deviceId === 'fridge').slice().reverse());
  assert.deepEqual(result.historyAvailability, [{ deviceId: 'fridge', status: 'available' }]);
});

test('critical device carries critical current evidence and generated alert', async () => {
  const source = data();
  setStatus(source, 'heater', 'critical');
  const result = await buildDeviceContext('heater', options(source));
  assert.equal(result.devices[0].status, 'critical');
  assert.equal(result.alerts[0].severity, 'critical');
  assert.equal(result.whatChanged[0].current, 104);
  assert.equal(result.whatChanged[0].status, 'critical');
});

test('home context prioritizes critical devices, bounds history work, and selects overdue/important tasks', async () => {
  const source = data();
  source.readings.forEach(r => { r.status = 'normal'; });
  setStatus(source, 'fridge', 'warning');
  setStatus(source, 'dryer', 'warning');
  setStatus(source, 'heater', 'critical');
  const fourth = source.devices.find(d => !['fridge', 'dryer', 'heater'].includes(d.id)).id;
  setStatus(source, fourth, 'warning');
  source.maintenanceTasks = [
    { id: 'overdue', deviceId: fourth, title: 'Inspect', detail: 'Existing task', dueDate: '2026-10-01', priority: 'low', completed: false },
    { id: 'important', deviceId: 'fridge', title: 'Inspect', detail: 'Existing task', dueDate: '2026-12-01', priority: 'high', completed: false },
    { id: 'routine', deviceId: 'dryer', title: 'Inspect', detail: 'Existing task', dueDate: '2026-12-01', priority: 'low', completed: false },
    { id: 'completed', deviceId: 'heater', title: 'Inspect', detail: 'Existing task', dueDate: '2026-10-01', priority: 'high', completed: true },
  ];
  const calls = [];
  const result = await buildHomeContext({ ...options(source), loadHistory: async id => {
    calls.push(id); return demoHistory.filter(r => r.deviceId === id).slice().reverse();
  } });
  assert.equal(result.scope, 'home');
  assert.equal(result.devices.length, source.devices.length);
  assert.equal(result.devices[0].id, 'heater');
  assert.equal(calls.length, 3);
  assert.equal(calls[0], 'heater');
  assert.equal(result.alerts.length, 4);
  assert.deepEqual(result.maintenanceTasks.map(t => t.id), ['overdue', 'important']);
  assert(result.historyAvailability.some(item => item.status === 'not_requested'));
  assert.equal(result.history, undefined);
  assert(result.readings.every(r => result.devices.find(d => d.id === r.deviceId).status !== 'normal'));
});

test('Snowflake failure preserves device current state without exposing the error', async () => {
  const result = await buildDeviceContext('heater', { ...options(), loadHistory: async () => { throw new Error('password secret'); } });
  assert(result.readings.length > 0);
  assert.equal(typeof result.homeSummary.homeHealthScore, 'number');
  assert.deepEqual(result.history, []);
  assert.deepEqual(result.whatChanged, []);
  assert.deepEqual(result.historyAvailability, [{ deviceId: 'heater', status: 'unavailable' }]);
  assert(!JSON.stringify(result).includes('password secret'));
});

test('one history failure does not discard successful home history or current evidence', async () => {
  const source = data();
  source.readings.forEach(r => { r.status = 'normal'; });
  setStatus(source, 'heater', 'critical');
  setStatus(source, 'fridge', 'warning');
  const result = await buildHomeContext({ ...options(source), loadHistory: async id => {
    if (id === 'heater') throw new Error('private connection details');
    return demoHistory.filter(r => r.deviceId === id).slice().reverse();
  } });
  assert.equal(result.devices[0].status, 'critical');
  assert.equal(result.alerts.length, 2);
  assert.equal(result.whatChanged.length, 1);
  assert.equal(result.whatChanged[0].deviceId, 'fridge');
  assert.equal(result.historyAvailability.find(item => item.deviceId === 'heater').status, 'unavailable');
  assert(!JSON.stringify(result).includes('private connection details'));
});

test('empty history is distinct from failure and unknown devices skip Snowflake', async () => {
  let calls = 0;
  const opts = { ...options(), loadHistory: async () => { calls++; return []; } };
  assert.equal(await buildDeviceContext('unknown', opts), null);
  assert.equal(calls, 0);
  const result = await buildDeviceContext('fridge', opts);
  assert.equal(result.historyAvailability[0].status, 'empty');
  assert.equal(result.whatChanged[0].status, 'insufficient_history');
});

test('reasoning receives assembled device metadata, scope, score, and history availability', async () => {
  const input = await buildDeviceContext('heater', options());
  await generateHomeIQInsight(input, async request => {
    const payload = JSON.parse(request.contents);
    assert.equal(payload.scope, 'device');
    assert.equal(payload.deviceId, 'heater');
    assert.equal(payload.devices[0].room, input.devices[0].room);
    assert(payload.evidence.some(line => line.includes(`health score ${input.homeSummary.homeHealthScore}`)));
    assert(payload.evidence.includes('History heater: available.'));
    return { text: '{}' };
  });
});

test('normal home still passes status and score context to reasoning without unnecessary history queries', async () => {
  const source = data();
  source.readings.forEach(r => { r.status = 'normal'; });
  const input = await buildHomeContext({ ...options(source), loadHistory: async () => { assert.fail('No abnormal devices'); } });
  let called = false;
  await generateHomeIQInsight(input, async request => {
    called = true;
    assert(JSON.parse(request.contents).evidence.some(line => line.startsWith('Home summary ')));
    return { text: '{}' };
  });
  assert(called);
});

test('snapshot stays internally consistent while shared current readings change during history fetch', async () => {
  const source = data();
  setStatus(source, 'fridge', 'warning');
  const result = await buildDeviceContext('fridge', { ...options(source), loadHistory: async () => {
    source.readings.find(r => r.deviceId === 'fridge').status = 'critical';
    return [];
  } });
  assert.equal(result.devices[0].status, 'warning');
  assert.equal(result.alerts[0].severity, 'warning');
});

test('no current readings does not turn derived normal metadata into a claim of sufficient sensor evidence', async () => {
  const source=data();
  source.readings=[];
  source.maintenanceTasks=[];
  for (const input of [await buildDeviceContext('fridge',options(source)),await buildHomeContext(options(source))]) {
    assert.equal(input.currentReadingCount,0);
    const result=await generateHomeIQInsight(input,async()=>{assert.fail('Insufficient current evidence must skip Gemini');});
    assert.match(result.answer,/not enough current sensor evidence/);
    assert.equal(result.trend,'unknown');
    assert.equal(result.riskLevel,'moderate');
    assert(!result.answer.includes('Normal sensor evidence is present'));
  }
});
