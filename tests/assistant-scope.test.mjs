import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { askHomeIQ } from '../src/services/api.ts';
import { openDeviceAssistant, createAssistantSubmission, previewInsightEvidence } from '../src/services/assistant-scope.ts';

// Exercise actual screen event handlers with native views/navigation stubbed; no live API calls.
function harness() {
  const devices = [['fridge', 'Refrigerator'], ['dryer', 'Dryer'], ['heater', 'Water Heater']]
    .map(([id, name]) => ({ id, name, room: 'Demo room', icon: 'devices', tone: 'green', status: 'Normal',
      latestReadings: [], activity: [], healthScore: 100, connection: 'Online', powerSource: 'mains',
      lastMaintenanceDate: '2026-10-01', updatedAt: '2026-10-11T12:00:00Z',
      recommendedAction: { title: 'Review readings', detail: 'Review recent history.' } }));
  const demo = { devices, deviceAlertHistory: [], assistantScope: null,
    setAssistantScope(scope) { demo.assistantScope = scope; } };
  const navigation = [];
  const requests = [];
  let selectedDevice = 'fridge', hookIndex = 0, activeHooks, cleanup, backendFailure;
  const stores = new Map();
  const state = initial => {
    const index = hookIndex++;
    if (!(index in activeHooks)) activeHooks[index] = typeof initial === 'function' ? initial() : initial;
    const hooks = activeHooks;
    return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }];
  };
  const jsx = (type, props) => ({ type, props });
  const stubs = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    react: { useState: state, useRef: value => state({ current: value })[0], useCallback: callback => callback },
    'expo-router': {
      router: { navigate(href) { navigation.push({ href, scope: demo.assistantScope }); }, push() {} },
      useLocalSearchParams: () => ({ id: selectedDevice }),
      useFocusEffect(callback) { cleanup = callback(); },
    },
    'react-native': { StyleSheet: { create: styles => styles }, Platform: { OS: 'web' },
      KeyboardAvoidingView: 'KeyboardAvoidingView', Pressable: 'Pressable', Text: 'Text', TextInput: 'TextInput', View: 'View' },
    '@/components/homeiq/ui': Object.fromEntries(['Badge','Button','Card','Copy','IconTile','ItemRow','Metric','Screen','SectionHeading'].map(name => [name,name])),
    '@/constants/theme': { palette: { blue:'blue', white:'white', muted:'gray', ink:'black', border:'gray' } },
    '@/state/demo-context': { useDemo: () => demo },
    '@/services/assistant-scope': { openDeviceAssistant, createAssistantSubmission, previewInsightEvidence },
    '@/services/api': { askHomeIQ },
    '@/components/homeiq/preventive-insight': { PreventiveInsight: 'PreventiveInsight' },
    '@/components/homeiq/health-card': { HealthScoreRing: 'HealthScoreRing' },
    '@/components/homeiq/what-changed-card': { WhatChangedCard: 'WhatChangedCard' },
    '@/data/sensors': { formatSensorReading: () => '', sensorStatusLabels: {}, sensorStatusTones: {} },
  };
  stubs['./ui'] = stubs['@/components/homeiq/ui'];
  function load(path, exportName = 'default') {
    const exports = {};
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    });
    new Function('require', 'exports', outputText)(name => {
      assert(name in stubs, `Unexpected screen import: ${name}`);
      return stubs[name];
    }, exports);
    return exports[exportName];
  }
  const details = load('../src/app/device/[id].tsx');
  const assistant = load('../src/app/(tabs)/assistant.tsx');
  const preventiveInsight = load('../src/components/homeiq/preventive-insight.tsx', 'PreventiveInsight');
  function render(component, props) {
    if (!stores.has(component)) stores.set(component, []);
    activeHooks = stores.get(component);
    hookIndex = 0;
    return component(props);
  }
  function elements(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(elements);
    return [node, ...elements(node.props?.children), ...elements(node.props?.footer)];
  }
  function find(node, predicate) { return elements(node).find(predicate); }
  const insight = { answer:'Sensor evidence is available.', severity:'warning', riskLevel:'moderate', trend:'unknown',
    recommendedTimeframe:'Check within 24 hours', recommendedActions:['Review the readings.'], basedOn:['Sensor evidence.'] };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:3001/api/ai/ask');
    requests.push(JSON.parse(options.body));
    if (backendFailure === 'offline') throw new Error('secret API key; raw stack trace; private connection string');
    if (backendFailure === 'http') return new Response(JSON.stringify({ error:'secret provider error and prompt' }), { status:500 });
    if (backendFailure === 'malformed') return new Response('raw stack trace and secret connection string');
    if (backendFailure === 'invalid') return new Response('{}');
    return new Response(JSON.stringify(insight));
  };
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  return {
    demo, requests, navigation, elements, find,
    failBackend: mode => { backendFailure = mode; },
    renderInsight: evidence => render(preventiveInsight, { insight: { ...insight, basedOn: evidence } }),
    open(id) {
      selectedDevice = id;
      const tree = render(details);
      find(tree, node => node.type === 'Button' && node.props.label === 'Ask about this device').props.onPress();
      render(assistant);
    },
    blur() { cleanup(); },
    home() {
      find(render(assistant), node => node.type === 'Button' && node.props.label === 'Ask about the whole home').props.onPress();
    },
    async send(question) {
      find(render(assistant), node => node.type === 'TextInput').props.onChangeText(question);
      const button = find(render(assistant), node => node.type === 'Button' && node.props.label === 'Send message');
      button.props.onPress();
      button.props.onPress(); // A second press in the same turn must not submit again.
      await new Promise(resolve => setImmediate(resolve));
      return render(assistant);
    },
  };
}

for (const [id, name] of [['fridge','Refrigerator'], ['dryer','Dryer'], ['heater','Water Heater']]) {
  test(`${name} details navigation sends ${id} and labels both conversation messages correctly`, async () => {
    const app = harness();
    app.open(id);
    assert.deepEqual(app.navigation[0], { href:'/(tabs)/assistant', scope:{deviceId:id,deviceName:name} });
    const tree = await app.send('  What changed?  ');
    assert.deepEqual(app.requests, [{question:'What changed?',deviceId:id}]);
    const labels = app.elements(tree).filter(node => node.type === 'Copy' && node.props.children === name);
    assert.equal(labels.length, 2);
  });
}

test('whole-home mode omits deviceId and labels the conversation Whole home', async () => {
  const app = harness();
  const tree = await app.send('What should I fix first?');
  assert.deepEqual(app.requests, [{question:'What should I fix first?'}]);
  assert.equal(app.elements(tree).filter(node => node.type === 'Copy' && node.props.children === 'Whole home').length,2);
});

test('whole-home button clears a device selection before the next request', async () => {
  const app = harness();
  app.open('fridge');
  app.home();
  assert.equal(app.demo.assistantScope,null);
  await app.send('Is anything getting worse?');
  assert.deepEqual(app.requests,[{question:'Is anything getting worse?'}]);
});

test('leaving AI clears stale device scope and a new device navigation replaces it', async () => {
  const app = harness();
  app.open('fridge');
  app.blur();
  assert.equal(app.demo.assistantScope,null);
  await app.send('What needs attention?');
  app.open('dryer');
  await app.send('Check the dryer');
  app.blur();
  app.open('heater');
  await app.send('Check the heater');
  assert.deepEqual(app.requests.map(r=>r.deviceId),[undefined,'dryer','heater']);
});

test('evidence preview limits records, prioritizes urgent/relevant evidence, and leaves all evidence intact', () => {
  const evidence = ['Home summary as of now: score 64.', 'Current leak/moisture: status critical;',
    'Trend fridge/temperature: increasing.', 'Current fridge/temperature: status warning;',
    ...Array.from({length:23},(_,i)=>`Supporting evidence ${i}`)];
  const original = [...evidence];
  const devicePreview = previewInsightEvidence(evidence,'fridge');
  assert.equal(devicePreview.length,3);
  assert(devicePreview[0].includes('fridge/'));
  assert.equal(previewInsightEvidence(evidence)[0],evidence[1]);
  assert.deepEqual(evidence,original);
});

test('evidence starts collapsed, expands to three key records, and offers all supporting records explicitly', () => {
  const app = harness();
  const records = Array.from({ length:27 }, (_,i)=>`Supporting evidence ${i}`);
  const visible = tree => app.elements(tree).filter(node => node.type === 'Copy'
    && Array.isArray(node.props.children) && records.includes(node.props.children[1])).length;
  let tree = app.renderInsight(records);
  assert.equal(visible(tree),0);
  const toggle = text => app.find(tree,node=>node.type==='Pressable' && typeof node.props.children?.props?.children === 'string'
    && node.props.children.props.children.startsWith(text)).props.onPress();
  toggle('View evidence');
  tree = app.renderInsight(records);
  assert.equal(visible(tree),3);
  toggle('Show all supporting evidence');
  tree = app.renderInsight(records);
  assert.equal(visible(tree),27);
  toggle('Hide evidence');
  tree = app.renderInsight(records);
  assert.equal(visible(tree),0);
  toggle('View evidence');
  tree = app.renderInsight(records);
  assert.equal(visible(tree),3);
});

for (const failure of ['offline','http','malformed','invalid']) {
  test(`frontend ${failure} API failure preserves conversation, hides internal details, and allows another submission`, async t => {
    const errors = [];
    t.mock.method(console,'error',(...args)=>errors.push(args));
    const app = harness();
    app.open('fridge');
    await app.send('First question');
    app.failBackend(failure);
    let tree = await app.send('Second question');
    const output = JSON.stringify(tree);
    assert(output.includes('First question'));
    assert(output.includes('Second question'));
    assert(output.includes('HomeIQ couldn’t load an insight right now'));
    assert(!/secret|stack trace|connection string|provider error/.test(output));
    assert.equal(app.find(tree,node=>node.type==='Button' && node.props.label==='Send message').props.disabled,true);
    assert(!app.elements(tree).some(node=>node.type==='Copy' && node.props.children==='HomeIQ is reviewing sensor evidence…'));
    assert(app.find(tree,node=>node.type==='Button' && node.props.label==='Ask about the whole home'));
    app.home();
    app.failBackend(undefined);
    tree = await app.send('Third question');
    assert.equal(app.requests.length,3);
    assert.deepEqual(app.requests[2],{question:'Third question'});
    assert(JSON.stringify(tree).includes('Third question'));
    assert.deepEqual(errors,[]);
  });
}
