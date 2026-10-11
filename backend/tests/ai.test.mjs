import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import express from 'express';
import { createAiRouter } from '../dist/routes/ai.js';
import { createApp } from '../dist/app.js';
import { buildDeviceContext, buildHomeContext } from '../dist/services/reasoning-context.js';
import { generateHomeIQInsight } from '../dist/services/gemini-reasoning.js';
import { demoHistory } from '../dist/data/demo-history.js';
import { mockDevices, mockSensorReadings } from '../dist/data/mock-home.js';

let server, base;
let captured, historyUnavailable = false, geminiFails = false, internalFailure = false;
let failedHistoryDevice, insufficientReadings = false;
const contextData = () => insufficientReadings
  ? { devices:mockDevices, readings:[], maintenanceTasks:[] } : undefined;
let deviceCalls = 0, homeCalls = 0;
const loadHistory = async id => {
  if (historyUnavailable || id === failedHistoryDevice) throw new Error('private Snowflake connection details');
  return demoHistory.filter(r => r.deviceId === id).slice().reverse();
};
const services = {
  async buildDeviceContext(id, options) {
    deviceCalls++;
    if (internalFailure) throw new Error('secret credentials and prompt');
    return buildDeviceContext(id, { ...options, loadHistory, data:contextData() });
  },
  async buildHomeContext(options) {
    homeCalls++;
    if (internalFailure) throw new Error('secret credentials and prompt');
    return buildHomeContext({ ...options, loadHistory, data:contextData() });
  },
  async generateHomeIQInsight(context) {
    captured = context;
    return generateHomeIQInsight(context, async request => {
      if (geminiFails) throw new Error('private Gemini key and prompt');
      const { evidence } = JSON.parse(request.contents);
      const critical = evidence.find(line => line.startsWith('Current ') && line.includes('; status critical;'));
      const warning = evidence.find(line => line.startsWith('Current ') && line.includes('; status warning;'));
      const severity = critical ? 'critical' : warning ? 'warning' : 'normal';
      return { text: JSON.stringify({
        answer: 'The supplied sensor changes are risk indicators, not a guaranteed failure.',
        severity, riskLevel: critical ? 'high' : warning ? 'moderate' : 'low',
        trend: context.whatChanged.some(t => t.status !== 'insufficient_history') ? 'worsening' : 'unknown',
        recommendedTimeframe: critical ? 'Act now' : warning ? 'Check within 24 hours' : 'Monitor this week',
        recommendedActions: ['Verify flagged readings safely and seek qualified guidance.'],
        basedOn: [critical ?? warning ?? evidence[0]],
      }) };
    });
  },
};
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', createAiRouter(services));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api/ai/ask`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

async function ask(body, status = 200) {
  const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(res.status, status);
  assert.match(res.headers.get('content-type'), /^application\/json/);
  return res.json();
}
function structured(result) {
  assert.deepEqual(Object.keys(result).sort(), ['answer','severity','riskLevel','trend','recommendedTimeframe','recommendedActions','basedOn'].sort());
  assert(result.recommendedActions.length && result.basedOn.length);
}

test('valid device question is trimmed and passed to device context and reasoning', async () => {
  const result = await ask({ question: '  Why is my refrigerator getting worse?  ', deviceId: 'fridge' });
  structured(result);
  assert.equal(captured.scope, 'device');
  assert.equal(captured.deviceId, 'fridge');
  assert.equal(captured.question, 'Why is my refrigerator getting worse?');
  assert.equal(captured.whatChanged[0].current, 46);
});

test('valid home question uses home context and its current score', async () => {
  structured(await ask({ question: 'What should I fix first?' }));
  assert.equal(captured.scope, 'home');
  assert.equal(typeof captured.homeSummary.homeHealthScore, 'number');
  assert.equal(captured.devices.length, 11);
});

test('critical device response preserves high risk and immediate action', async () => {
  const reading = mockSensorReadings.find(r => r.deviceId === 'heater');
  const original = reading.status;
  reading.status = 'critical';
  try {
    const result = await ask({ question: 'What needs attention?', deviceId: 'heater' });
    assert.equal(result.severity, 'critical');
    assert.equal(result.riskLevel, 'high');
    assert.equal(result.recommendedTimeframe, 'Act now');
  } finally { reading.status = original; }
});

test('warning trend response includes historical context and warning urgency', async () => {
  const reading = mockSensorReadings.find(r => r.deviceId === 'dryer');
  const original = reading.status;
  reading.status = 'warning';
  try {
    const result = await ask({ question: 'Is vibration getting worse?', deviceId: 'dryer' });
    assert.equal(result.severity, 'warning');
    assert.equal(result.trend, 'worsening');
    assert.equal(captured.whatChanged[0].current, 5.2);
    assert.equal(captured.whatChanged[0].previous, 4.1);
  } finally { reading.status = original; }
});

test('missing and blank questions are rejected before building context', async () => {
  const before = deviceCalls + homeCalls;
  for (const body of [{}, {question:''}, {question:' \n '}, {question:null}, {question:42}, []]) {
    await ask(body,400);
  }
  assert.equal(deviceCalls + homeCalls, before);
});

test('malformed device IDs return 400 and unknown device returns 404', async () => {
  for (const deviceId of [null, '', ' ', 42, []]) await ask({ question:'Check my device', deviceId },400);
  assert.deepEqual(await ask({ question:'Check my device', deviceId:'unknown' },404), {error:'Unknown deviceId.'});
});

test('Gemini failure returns structured HTTP 200 fallback preserving severity and urgency without logging errors', async t => {
  const logs=[];
  t.mock.method(console,'error',(...args)=>logs.push(args));
  t.mock.method(console,'log',(...args)=>logs.push(args));
  geminiFails = true;
  const readings = mockSensorReadings.filter(r=>r.deviceId==='heater');
  const original=readings.map(r=>r.status);
  try {
    for (const severity of ['warning','critical']) {
      readings.forEach(r=>{r.status=severity;});
      const result = await ask({ question:'What needs attention?', deviceId:'heater' });
      structured(result);
      assert.equal(result.severity,severity);
      assert.equal(result.riskLevel,severity==='critical'?'high':'moderate');
      assert.equal(result.recommendedTimeframe,severity==='critical'?'Act now':'Check within 24 hours');
      assert.equal(result.trend,'unknown');
      assert(!/private Gemini|stack|apiKey|prompt/.test(JSON.stringify(result)));
      assert(result.basedOn.some(line=>line.startsWith('Current heater/')));
    }
    assert.deepEqual(logs,[]);
  } finally {
    geminiFails = false;
    readings.forEach((r,index)=>{r.status=original[index];});
  }
});

test('Snowflake unavailable still produces usable device and home responses without logging provider details', async t => {
  const logs=[];
  t.mock.method(console,'error',(...args)=>logs.push(args));
  t.mock.method(console,'log',(...args)=>logs.push(args));
  historyUnavailable = true;
  try {
    for(const body of [{question:'Why is this changing?',deviceId:'fridge'},{question:'What should I fix first?'}]) {
      const result = await ask(body);
      structured(result);
      assert.equal(result.trend,'unknown');
      assert(captured.historyAvailability.some(item=>item.status==='unavailable'));
      assert(!JSON.stringify(result).includes('private Snowflake'));
    }
    assert.deepEqual(logs,[]);
  } finally { historyUnavailable = false; }
});

test('insufficient device and home context returns an explicit conservative HTTP 200 response', async () => {
  insufficientReadings=true;
  historyUnavailable=true;
  try {
    for (const body of [{question:'Is my home healthy?'},{question:'Is my fridge healthy?',deviceId:'fridge'}]) {
      const result=await ask(body);
      structured(result);
      assert.match(result.answer,/not enough current sensor evidence/);
      assert.equal(result.riskLevel,'moderate');
      assert.equal(result.trend,'unknown');
      assert.equal(result.recommendedTimeframe,'Check within 24 hours');
      assert(!result.answer.includes('Normal sensor evidence is present'));
    }
  } finally { insufficientReadings=false; historyUnavailable=false; }
});

test('partial home history failure keeps successful trends and all current critical evidence', async () => {
  const statuses=mockSensorReadings.map(r=>r.status);
  mockSensorReadings.forEach(r=>{r.status='normal';});
  mockSensorReadings.find(r=>r.deviceId==='heater').status='critical';
  mockSensorReadings.find(r=>r.deviceId==='fridge').status='warning';
  failedHistoryDevice='heater';
  try {
    const result=await ask({question:'What should I fix first?'});
    assert.equal(result.severity,'critical');
    assert.equal(result.recommendedTimeframe,'Act now');
    assert.equal(captured.historyAvailability.find(item=>item.deviceId==='heater').status,'unavailable');
    assert.equal(captured.whatChanged[0].deviceId,'fridge');
    assert.equal(captured.whatChanged[0].previous,43);
    assert(captured.readings.some(r=>r.deviceId==='heater' && r.status==='critical'));
    assert(!JSON.stringify(result).includes('private Snowflake'));
  } finally {
    failedHistoryDevice=undefined;
    mockSensorReadings.forEach((r,index)=>{r.status=statuses[index];});
  }
});

test('simultaneous Gemini and Snowflake failures still return current-state critical fallback', async () => {
  geminiFails=true;
  historyUnavailable=true;
  try {
    const result=await ask({question:'What should I fix first?'});
    structured(result);
    assert.equal(result.severity,'critical');
    assert.equal(result.riskLevel,'high');
    assert.equal(result.recommendedTimeframe,'Act now');
    assert.equal(result.trend,'unknown');
    assert(!/private|stack|prompt|password/.test(JSON.stringify(result)));
  } finally { geminiFails=false; historyUnavailable=false; }
});

test('unexpected internal error returns safe JSON 500', async () => {
  internalFailure = true;
  try {
    assert.deepEqual(await ask({question:'What should I fix first?'},500), {error:'Could not generate a HomeIQ insight.'});
  } finally { internalFailure = false; }
});

test('production app mounts Ask endpoint and preserves malformed JSON 400 handling', async () => {
  const names = ['GEMINI_API_KEY','SNOWFLAKE_ACCOUNT'];
  const saved = names.map(name => process.env[name]);
  names.forEach(name=>{process.env[name]='';});
  const production = createApp().listen(0,'127.0.0.1');
  await once(production,'listening');
  const url = `http://127.0.0.1:${production.address().port}/api/ai/ask`;
  try {
    const preflight = await fetch(url, { method: 'OPTIONS', headers: {
      Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type',
    } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
    assert.match(preflight.headers.get('access-control-allow-headers'), /Content-Type/);
    const response = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'What should I fix first?'})});
    assert.equal(response.status,200);
    structured(await response.json());
    for (const body of ['{bad', 'null']) {
      const malformed = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body});
      assert.equal(malformed.status,400);
      assert.deepEqual(await malformed.json(),{error:'Malformed JSON request body.'});
    }
  } finally {
    await new Promise(resolve=>production.close(resolve));
    names.forEach((name,i)=>{if(saved[i]===undefined) delete process.env[name]; else process.env[name]=saved[i];});
  }
});
