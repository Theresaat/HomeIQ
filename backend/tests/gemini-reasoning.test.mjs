import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateHomeIQInsight } from '../dist/services/gemini-reasoning.js';
import { demoHistory } from '../dist/data/demo-history.js';
import { deriveWhatChanged } from '../dist/services/what-changed.js';

function context(deviceId = 'fridge') {
  const history = demoHistory.filter(r => r.deviceId === deviceId).slice().reverse();
  return { devices: [{ id: deviceId, name: deviceId }], readings: [history[0]], history,
    whatChanged: [deriveWhatChanged(deviceId, history)] };
}

function response(request, overrides = {}) {
  const { evidence } = JSON.parse(request.contents);
  return { answer: 'Supplied evidence indicates a risk worth checking; this is not a confirmed failure.',
    severity: 'warning', riskLevel: 'moderate', trend: 'worsening',
    recommendedTimeframe: 'Check within 24 hours', recommendedActions: ['Verify readings safely.'],
    basedOn: [evidence[0]], ...overrides };
}

test('normal condition returns a validated structured insight without assuming an unsupported trend', async () => {
  const input = context();
  input.readings[0] = { ...input.readings[0], value: 38, status: 'normal' };
  input.history = [];
  input.whatChanged = [];
  const result = await generateHomeIQInsight(input, async request => ({ text: JSON.stringify(response(request, {
    answer: 'The current temperature reading is normal; historical change is unknown.',
    severity: 'normal', riskLevel: 'low', trend: 'unknown', recommendedTimeframe: 'Routine maintenance',
  })) }));
  assert.equal(result.severity, 'normal');
  assert.equal(result.trend, 'unknown');
  assert.equal(result.recommendedTimeframe, 'Routine maintenance');
});

test('warning trend includes historical samples and What Changed evidence in the prompt', async () => {
  const input = context();
  const original = structuredClone(input);
  const result = await generateHomeIQInsight(input, async request => {
    const { evidence } = JSON.parse(request.contents);
    assert(evidence.some(line => line.includes('previous 43, average 41.75')));
    assert(evidence.some(line => line.startsWith('Trend sample ') && line.includes('38 °F; status normal')));
    assert.match(request.config.systemInstruction, /Increasing does not automatically mean worsening/);
    assert.match(request.config.systemInstruction, /Never invent readings/);
    assert.equal(request.config.responseMimeType, 'application/json');
    assert.equal(request.config.responseJsonSchema.additionalProperties, false);
    return { text: JSON.stringify(response(request, { basedOn: [evidence[0], evidence.find(line => line.startsWith('Trend '))] })) };
  });
  assert.equal(result.trend, 'worsening');
  assert.equal(result.basedOn.length, 2);
  assert.deepEqual(input, original);
});

test('critical condition keeps immediate urgency even when another signal is normal', async () => {
  const input = context('heater');
  input.readings.push({ ...input.readings[0], id: 'condition', sensorType: 'tank_condition', value: 'Normal', unit: '', status: 'normal' });
  const result = await generateHomeIQInsight(input, async request => {
    const { evidence } = JSON.parse(request.contents);
    assert(evidence.some(line => line.includes('heater/tank_condition')));
    return { text: JSON.stringify(response(request, { severity: 'critical', riskLevel: 'high', recommendedTimeframe: 'Act now' })) };
  });
  assert.equal(result.severity, 'critical');
  assert.equal(result.riskLevel, 'high');
  assert.equal(result.recommendedTimeframe, 'Act now');
});

test('insufficient context skips Gemini and does not claim a healthy home', async () => {
  const result = await generateHomeIQInsight({ devices: [], readings: [] }, async () => { assert.fail('Must not call Gemini'); });
  assert.match(result.answer, /not enough current sensor evidence/);
  assert.equal(result.trend, 'unknown');
  assert.equal(result.riskLevel, 'moderate');
});

test('malformed JSON, wrong field types, invalid enums, empty lists, and invented evidence fall back safely', async () => {
  for (const output of [undefined, '{bad', 'null', '[]', '{}',
    { severity: 'emergency' }, { recommendedActions: 'repair' }, { basedOn: ['Invented compressor failure'] },
    { recommendedActions: [] }, { riskLevel: 'certain' }, { answer: ' ' }]) {
    const result = await generateHomeIQInsight(context(), async request => ({
      text: typeof output === 'object' && output !== null && !Array.isArray(output)
        ? JSON.stringify(response(request, output)) : output,
    }));
    assert.equal(result.severity, 'warning');
    assert.equal(result.trend, 'unknown');
    assert.equal(result.recommendedTimeframe, 'Check within 24 hours');
    assert(!result.basedOn.includes('Invented compressor failure'));
  }
});

test('downgraded critical output and critical output citing only normal evidence are rejected', async () => {
  const input = context('heater');
  input.readings.push({ ...input.readings[0], id: 'normal', value: 55, status: 'normal' });
  for (const downgrade of [true, false]) {
    const result = await generateHomeIQInsight(input, async request => {
      const { evidence } = JSON.parse(request.contents);
      return { text: JSON.stringify(response(request, downgrade ? {} : {
        severity: 'critical', riskLevel: 'high', recommendedTimeframe: 'Act now', basedOn: [evidence[1]],
      })) };
    });
    assert.equal(result.severity, 'critical');
    assert.equal(result.recommendedTimeframe, 'Act now');
    assert.equal(result.trend, 'unknown');
  }
});

test('request failure is silent and returns grounded fallback', async () => {
  const result = await generateHomeIQInsight(context('heater'), async () => { throw new Error('secret credential'); });
  assert.equal(result.severity, 'critical');
  assert(!JSON.stringify(result).includes('secret credential'));
  assert(result.basedOn.some(line => line.includes('104 psi')));
});

test('unsupported risk trend is rejected when only current readings are supplied', async () => {
  const input = context();
  input.history = [];
  input.whatChanged = [];
  const result = await generateHomeIQInsight(input, async request => ({ text: JSON.stringify(response(request)) }));
  assert.equal(result.trend, 'unknown');
});

test('resolved alerts do not raise urgency and unknown-device evidence is excluded', async () => {
  const input = context();
  input.readings[0] = { ...input.readings[0], status: 'normal' };
  input.alerts = [{ id: 'resolved', deviceId: 'fridge', status: 'resolved', severity: 'critical' }];
  input.history = [];
  input.whatChanged = [];
  input.readings.push({ ...input.readings[0], deviceId: 'unknown', status: 'critical' });
  const result = await generateHomeIQInsight(input, async request => {
    assert(!request.contents.includes('unknown'));
    assert(!request.contents.includes('Active alert'));
    return { text: 'malformed' };
  });
  assert.equal(result.severity, 'normal');
});

test('historical events with the same reading ID still support a trend', async () => {
  const input = context();
  input.whatChanged = [];
  input.history = input.history.map(reading => ({ ...reading, id: 'repeated-id' }));
  const result = await generateHomeIQInsight(input, async request => ({ text: JSON.stringify(response(request)) }));
  assert.equal(result.trend, 'worsening');
});

test('unsupported trend after total history outage is rejected while critical urgency remains intact', async () => {
  const input=context('heater');
  input.history=[];
  input.whatChanged=[];
  input.historyAvailability=[{deviceId:'heater',status:'unavailable'}];
  const result=await generateHomeIQInsight(input,async request=>({text:JSON.stringify(response(request,{
    severity:'critical',riskLevel:'high',recommendedTimeframe:'Act now',trend:'worsening',
  }))}));
  assert.equal(result.trend,'unknown');
  assert.equal(result.severity,'critical');
  assert.equal(result.recommendedTimeframe,'Act now');
});
