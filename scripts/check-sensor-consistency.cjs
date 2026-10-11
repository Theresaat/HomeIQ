// Run with node scripts/check-sensor-consistency.cjs. Uses installed TypeScript only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(name) {
  const filename = path.resolve(root, 'src/data', `${name}.ts`);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    dependency => load(dependency.replace(/^\.\//, '')), module, module.exports,
  );
  return module.exports;
}

async function check() {
  const { devices, tasks, deviceAlertHistory } = load('mock-home');
  const { deriveDevices, getSensorInsight } = load('sensor-devices');
  const { generateSensorAlerts } = load('sensor-alerts');
  const { calculateHomeHealthScore } = load('home-health');
  const { applySensorScenario, simulateSensorReadings, DEVELOPMENT_SENSOR_SCENARIO } = load('sensor-simulator');
  const { getAssistantResponse } = load('mock-assistant');
  assert.equal(DEVELOPMENT_SENSOR_SCENARIO, null);
  const readings = devices.flatMap(device => device.latestReadings);
  const deviceIds = new Set(devices.map(device => device.id));
  assert.equal(deviceIds.size, devices.length);
  assert.equal(new Set(readings.map(reading => reading.id)).size, readings.length);
  const supported = {
    sink: ['water_detection', 'moisture', 'water_flow'],
    hvac: ['temperature', 'airflow'],
    fridge: ['temperature', 'door_position', 'power_usage', 'compressor_runtime'],
    dryer: ['airflow', 'pressure', 'vibration', 'temperature', 'runtime', 'power_usage'],
    dishwasher: ['water_flow', 'cycle_state', 'water_usage', 'power_usage', 'runtime'],
    smoke: ['smoke_concentration', 'battery_level'],
    heater: ['temperature', 'tank_condition', 'pressure', 'water_usage'],
    energy: ['power_usage', 'voltage'], garage: ['door_position', 'battery_level'],
    air: ['air_quality_index', 'humidity'], bath: ['water_detection', 'battery_level'],
  };
  for (const device of devices) {
    for (const reading of device.latestReadings) {
      assert.equal(reading.deviceId, device.id);
      assert.ok(supported[device.id].includes(reading.sensorType));
      assert.ok(Number.isFinite(Date.parse(reading.timestamp)));
    }
    for (const activity of device.activity) assert.equal(activity.deviceId, device.id);
  }
  for (const item of [...tasks, ...deviceAlertHistory]) assert.ok(deviceIds.has(item.deviceId));
  assert.equal(new Set(deviceAlertHistory.map(item => item.id)).size, deviceAlertHistory.length);
  assert.ok(deviceAlertHistory.every(item => item.state === 'Resolved'));
  const historySnapshot = JSON.stringify(deviceAlertHistory);
  const timestamp = '2026-10-10T15:00:00Z';
  const normal = applySensorScenario(readings, 'All Systems Normal', timestamp);
  assert.ok(normal.every(reading => reading.status === 'normal' && reading.timestamp === timestamp));
  const scenarios = [
    ['All Systems Normal', null, null, 100],
    ['Kitchen Leak', 'sink', 'Critical', 80],
    ['Refrigerator Overheating', 'fridge', 'Critical', 80],
    ['Dryer Vibration Warning', 'dryer', 'Warning', 92],
    ['Water Heater Pressure Alert', 'heater', 'Critical', 80],
  ];
  const score = (current, alerts, extra = {}) => calculateHomeHealthScore({
    sensorReadings: current, alerts, tasks, completedTaskIds: [], asOf: new Date(timestamp), ...extra,
  });
  function verify(current, expectedDevice, severity, expectedScore) {
    assert.deepEqual(current.map(reading => reading.id), readings.map(reading => reading.id));
    const liveDevices = deriveDevices(devices, current);
    const alerts = generateSensorAlerts(liveDevices);
    assert.equal(alerts.length, expectedDevice ? 1 : 0);
    if (expectedDevice) {
      assert.equal(alerts[0].deviceId, expectedDevice);
      assert.equal(alerts[0].severity, severity);
    }
    for (const device of liveDevices) {
      assert.equal(device.status, device.id === expectedDevice ? severity : 'Normal');
      assert.equal(device.tone, device.id === expectedDevice ? severity === 'Critical' ? 'red' : 'orange' : 'green');
    }
    assert.equal(score(current, alerts), expectedScore);
    assert.equal(score(current, [...alerts, ...alerts]), expectedScore);
    return liveDevices;
  }
  for (const [scenario, expectedDevice, severity, expectedScore] of scenarios) {
    let current = applySensorScenario(readings, scenario, timestamp);
    verify(current, expectedDevice, severity, expectedScore);
    for (let tick = 1; tick <= 720; tick++) {
      current = simulateSensorReadings(current, tick, timestamp, scenario);
      verify(current, expectedDevice, severity, expectedScore);
    }
    // Every scenario transition must clear previous abnormalities.
    for (const [next, nextDevice, nextSeverity, nextScore] of scenarios) {
      const reset = applySensorScenario(current, next, timestamp);
      assert.deepEqual(reset, applySensorScenario(readings, next, timestamp));
      verify(reset, nextDevice, nextSeverity, nextScore);
    }
  }
  // Normal also resets sensors outside the four periodic simulation channels.
  assert.deepEqual(applySensorScenario(readings.map(reading => ({
    ...reading, value: 'Changed', status: 'critical',
  })), 'All Systems Normal', timestamp), normal);
  const live = deriveDevices(devices, normal);
  const insight = getSensorInsight(live);
  assert.match(insight, /All current sample sensor readings are normal/);
  const response = await getAssistantResponse({
    devices: live, insight, homeHealthScore: 100, completedTaskIds: [],
    messages: [{ id: 1, role: 'user', text: 'Is my refrigerator working normally?' }],
  });
  assert.match(response, /38 °F/);
  assert.match(response, /status normal/);
  assert.doesNotMatch(response, /46/);
  const later = simulateSensorReadings(readings, 1, '2026-10-10T15:00:10Z');
  const fridge = deriveDevices(devices, later).find(device => device.id === 'fridge');
  assert.equal(fridge.reading, '45.7 °F');
  assert.equal(fridge.updatedAt, '2026-10-10T15:00:10Z');
  assert.equal(score(normal, [], { asOf: new Date('2026-10-18T12:00:00') }), 97);
  assert.equal(score(normal, [], { asOf: new Date('2026-10-18T12:00:00'), completedTaskIds: ['filter'] }), 100);
  assert.equal(JSON.stringify(deviceAlertHistory), historySnapshot);
  console.log(`Passed: ${readings.length} unique sensors, ${devices.length} valid devices, 5 scenarios × 720 ticks, all transitions, reactive summaries/assistant/score, and resolved history.`);
}
check().catch(error => { console.error(error); process.exitCode = 1; });
