import assert from 'node:assert/strict';
import test from 'node:test';
import { mockDevices, mockSensorReadings, mockMaintenanceTasks } from '../dist/data/mock-home.js';
import { deriveDevices, deriveDeviceStatus, generateActiveAlerts, calculateHomeHealthScore,
  deriveHomeSummary } from '../dist/services/home-state.js';
import { acceptSensorReading } from '../dist/services/readings.js';

const asOf = new Date('2026-10-10T12:00:00');
const devices = deriveDevices(mockDevices, mockSensorReadings);
const alerts = generateActiveAlerts(devices);
const score = (overrides = {}) => calculateHomeHealthScore({
  sensorReadings: mockSensorReadings, alerts, maintenanceTasks: mockMaintenanceTasks, asOf, ...overrides,
});

test('mock IDs are unique and all device references are valid', () => {
  const ids = new Set(mockDevices.map(device => device.id));
  assert.equal(ids.size, 11);
  for (const items of [mockDevices, mockSensorReadings, mockMaintenanceTasks, alerts]) {
    assert.equal(new Set(items.map(item => item.id)).size, items.length);
  }
  assert.equal(mockSensorReadings.length, 34);
  for (const item of [...mockSensorReadings, ...mockMaintenanceTasks, ...alerts]) {
    assert.ok(ids.has(item.deviceId));
  }
  for (const reading of mockSensorReadings) assert.ok(Number.isFinite(Date.parse(reading.timestamp)));
});

test('mock snapshot derives device status and one active alert per abnormal device', () => {
  assert.deepEqual(devices.map(device => [device.id, device.status]), [
    ['sink', 'critical'], ['hvac', 'normal'], ['fridge', 'warning'], ['dryer', 'warning'],
    ['dishwasher', 'normal'], ['smoke', 'normal'], ['heater', 'normal'], ['energy', 'normal'],
    ['garage', 'normal'], ['air', 'normal'], ['bath', 'normal'],
  ]);
  assert.deepEqual(alerts.map(alert => [alert.deviceId, alert.severity, alert.status]), [
    ['sink', 'critical', 'active'], ['fridge', 'warning', 'active'], ['dryer', 'warning', 'active'],
  ]);
  assert.equal(score(), 64);
  assert.equal(score({ alerts: [...alerts, ...alerts], sensorReadings: [...mockSensorReadings, ...mockSensorReadings] }), 64);
});

test('critical wins over warnings on the same device, regardless of input order', () => {
  const readings = [
    { ...mockSensorReadings[0], status: 'warning' },
    { ...mockSensorReadings[1], status: 'critical' },
  ];
  assert.equal(deriveDeviceStatus(readings), 'critical');
  assert.equal(deriveDeviceStatus([...readings].reverse()), 'critical');
  assert.equal(score({ sensorReadings: readings, alerts: [], maintenanceTasks: [] }), 80);
});

test('fresh normal readings clear statuses and alerts without mutating fixtures', () => {
  const snapshot = JSON.stringify(mockSensorReadings);
  const normal = mockSensorReadings.map(reading => ({ ...reading, status: 'normal' }));
  const normalDevices = deriveDevices(mockDevices, normal);
  assert.ok(normalDevices.every(device => device.status === 'normal'));
  assert.deepEqual(generateActiveAlerts(normalDevices), []);
  assert.equal(score({ sensorReadings: normal, alerts: [] }), 100);
  assert.equal(JSON.stringify(mockSensorReadings), snapshot);
});

test('only overdue incomplete tasks incur maintenance penalties; due today is not overdue', () => {
  const task = mockMaintenanceTasks[0];
  const maintenanceTasks = [
    { ...task, id: 'overdue', dueDate: '2026-10-09' },
    { ...task, id: 'today', dueDate: '2026-10-10' },
    { ...task, id: 'future', dueDate: '2026-10-11' },
    { ...task, id: 'completed', dueDate: '2026-10-01', completed: true },
  ];
  assert.equal(score({ maintenanceTasks }), 61);
  assert.equal(score({ maintenanceTasks: maintenanceTasks.map(item => ({ ...item, completed: true })) }), 64);
});

test('resolved alerts do not penalize the score and scores stay between zero and 100', () => {
  assert.equal(score({ sensorReadings: [], alerts: alerts.map(alert => ({ ...alert, status: 'resolved' })), maintenanceTasks: [] }), 100);
  const criticalReadings = mockDevices.map(device => ({ ...mockSensorReadings[0], deviceId: device.id }));
  assert.equal(score({ sensorReadings: criticalReadings, alerts: [], maintenanceTasks: [] }), 0);
});

test('home summary agrees with current device, alert, and maintenance state', () => {
  const summary = deriveHomeSummary({
    devices, sensorReadings: mockSensorReadings, alerts, maintenanceTasks: mockMaintenanceTasks, asOf,
  });
  assert.deepEqual(summary, {
    normalDeviceCount: 8, warningDeviceCount: 2, criticalDeviceCount: 1,
    activeAlertCount: 3, warningAlertCount: 2, criticalAlertCount: 1,
    connectedDevices: 11, healthyDevices: 8, attentionDevices: 3, activeAlerts: 3,
    upcomingMaintenanceTasks: 3, overdueMaintenanceTasks: 0, homeHealthScore: 64,
    asOf: asOf.toISOString(),
  });
});

test('reading writes use the supplied data source without modifying mock fixtures', () => {
  const snapshot = JSON.stringify(mockSensorReadings);
  const readings = mockSensorReadings.map(reading => ({ ...reading }));
  const payload = { ...readings[0], value: 'Dry', status: 'normal' };
  assert.deepEqual(acceptSensorReading(payload, mockDevices, readings), { reading: payload });
  assert.deepEqual(readings[0], payload);
  assert.equal(JSON.stringify(mockSensorReadings), snapshot);
  assert.ok('error' in acceptSensorReading(payload, [], readings));
});
