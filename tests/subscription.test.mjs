import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Run the real provider and screen handlers with platform views and sensor services stubbed.
function harness() {
  let activeHooks, hookIndex = 0, shared, auth;
  const stores = new Map();
  const navigation = [];
  const initialProfile = { name: 'Demo Owner', role: 'Homeowner',
    property: { name: 'My home', type: 'House', address: 'Demo address' },
    notificationPreferences: [], homeSettings: [{ id: 'home', label: 'Home setting', value: 'Enabled' }],
    accountSettings: [{ id: 'account', label: 'Account setting', value: 'Demo' }] };
  const useState = initial => {
    const index = hookIndex++;
    if (!(index in activeHooks)) activeHooks[index] = typeof initial === 'function' ? initial() : initial;
    const store = activeHooks;
    return [store[index], value => { store[index] = typeof value === 'function' ? value(store[index]) : value; }];
  };
  const jsx = (type, props) => ({ type, props });
  const stubs = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    react: { useState, useEffect() {}, createContext: () => ({ Provider: 'Provider' }), useContext: () => shared },
    'react-native': { StyleSheet: { create: value => value }, AppState: {}, Pressable: 'Pressable', View: 'View', Switch: 'Switch' },
    'expo-router': { router: { push: path => navigation.push(path) } },
    '@/components/homeiq/ui': Object.fromEntries(['Badge', 'Button', 'Card', 'Copy', 'IconTile', 'ItemRow', 'Screen', 'SectionHeading'].map(name => [name, name])),
    '@/components/homeiq/icon': { Icon: 'Icon' },
    '@/components/homeiq/profile-editor': { ProfileEditor: 'ProfileEditor' },
    '@/constants/theme': { palette: { blue: '#2563EB', blueSoft: '#EFF6FF' } },
    '@/data/mock-home': { devices: [], tasks: [], deviceAlertHistory: [], profile: initialProfile, alertSeverityTones: {} },
    '@/data/sensor-devices': { deriveDevices: () => [], getSensorInsight: () => '' },
    '@/data/sensors': { conditionPenalties: {}, sensorStatusLabels: {}, sensorStatusTones: {} },
    '@/data/sensor-alerts': { generateSensorAlerts: () => [] },
    '@/data/home-health': { calculateHomeHealthScore: () => 100 },
    '@/data/sensor-simulator': { DEVELOPMENT_SENSOR_SCENARIO: null },
    '@/services/api': {},
  };
  function load(path, exportName = 'default') {
    const exports = {};
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    });
    new Function('require', 'exports', '__DEV__', outputText)(name => {
      assert(name in stubs, `Unexpected import: ${name}`);
      return stubs[name];
    }, exports, false);
    return exports[exportName];
  }
  const provider = load('../src/state/demo-context.tsx', 'DemoProvider');
  const authProvider = load('../src/state/auth-context.tsx', 'AuthProvider');
  stubs['@/state/auth-context'] = { useAuth: () => auth };
  stubs['@/state/demo-context'] = { useDemo: load('../src/state/demo-context.tsx', 'useDemo') };
  const profile = load('../src/app/(tabs)/profile.tsx');
  const protect = load('../src/app/protect.tsx');
  function render(component) {
    if (!stores.has(component)) stores.set(component, []);
    activeHooks = stores.get(component);
    hookIndex = 0;
    return component({ children: null });
  }
  function refresh() { shared = render(provider).props.value; auth = render(authProvider).props.value; }
  function elements(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(elements);
    return [node, ...elements(node.props?.children)];
  }
  refresh();
  auth.signIn({ name: initialProfile.name, email: 'demo@example.com' });
  refresh();
  return { navigation, elements, initialProfile, state: () => ({ ...shared, ...auth }), refresh,
    profile: () => render(profile), protect: () => render(protect) };
}

test('Profile Subscription navigates to Protect without removing existing settings', () => {
  const app = harness();
  const rows = app.elements(app.profile()).filter(node => node.type === 'ItemRow');
  const subscription = rows.find(node => node.props.title === 'Subscription');
  assert.equal(subscription.props.detail, 'Current Plan: No plan selected');
  subscription.props.onPress();
  assert.deepEqual(app.navigation, ['/protect']);
  assert(rows.some(node => node.props.title === 'Account setting'));
  assert(rows.some(node => node.props.title === 'Home setting'));
});

test('Protect displays all requested prices and inclusions with a back-enabled screen', () => {
  const app = harness();
  const tree = app.protect();
  assert.equal(tree.props.back, true);
  const serialized = JSON.stringify(tree);
  for (const text of ['$249', '$19', '/month', '$477', '$249 Starter Kit + $228 annual subscription',
    'HomeIQ Sensor Hub', 'Starter Sensor Package', 'Installation Guide', 'App Setup', '24/7 Monitoring',
    'Smart Alerts', 'Home Health Score', 'Maintenance Reminders', 'Historical Trends', 'Ask HomeIQ',
    'Preventive Recommendations', 'Energy Intelligence']) assert(serialized.includes(text), text);
});

test('CTA updates shared demo plan, survives navigation, and leaves profile and sensor state unchanged', () => {
  const app = harness();
  const before = app.state();
  const button = app.elements(app.protect()).find(node => node.type === 'Button');
  assert.equal(button.props.disabled, false);
  button.props.onPress();
  app.refresh();
  assert.equal(app.state().subscriptionPlan, 'HomeIQ Protect');
  assert.deepEqual(app.state().profile, before.profile);
  assert.deepEqual(app.state().sensorReadings, before.sensorReadings);
  assert.equal(app.state().homeHealthScore, before.homeHealthScore);
  const row = app.elements(app.profile()).find(node => node.type === 'ItemRow' && node.props.title === 'Subscription');
  assert.equal(row.props.detail, 'Current Plan: HomeIQ Protect');
  assert.equal(app.elements(app.protect()).find(node => node.type === 'Button').props.disabled, true);
  assert(JSON.stringify(app.protect()).includes('No payment was processed'));
  assert.equal(harness().state().subscriptionPlan, null);
});
