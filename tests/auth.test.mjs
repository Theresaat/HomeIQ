import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function harness() {
  let hooks, index, auth;
  const stores = new Map();
  const demo = { profile: { name: 'Demo Owner', role: 'Homeowner', property: {},
    notificationPreferences: [], homeSettings: [], accountSettings: [{ id: 'email', label: 'Contact email', value: 'old@example.com' }] },
    homeHealthScore: 80,
    saveProfile(details) { demo.profile = { ...demo.profile, ...details }; } };
  const state = initial => {
    const slot = index++;
    if (!(slot in hooks)) hooks[slot] = typeof initial === 'function' ? initial() : initial;
    const store = hooks;
    return [store[slot], value => { store[slot] = typeof value === 'function' ? value(store[slot]) : value; }];
  };
  const jsx = (type, props) => ({ type, props });
  const Stack = 'Stack';
  const stubs = {
    react: { useState: state, createContext: () => ({ Provider: 'AuthProvider' }), useContext: () => auth },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { StyleSheet: { create: styles => styles }, Platform: { OS: 'web' },
      KeyboardAvoidingView: 'KeyboardAvoidingView', View: 'View', TextInput: 'TextInput', Pressable: 'Pressable', Switch: 'Switch' },
    'expo-router': { Stack: Object.assign(() => Stack, { Screen: 'StackScreen', Protected: 'Protected' }), router: { push() {} } },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    '@/components/homeiq/ui': Object.fromEntries(['Button','Card','Copy','IconTile','ItemRow','Screen','SectionHeading'].map(name => [name,name])),
    '@/components/homeiq/icon': { Icon: 'Icon' },
    '@/components/homeiq/profile-editor': { ProfileEditor: 'ProfileEditor' },
    '@/constants/theme': { palette: {} }, '@/data/mock-home': { devices: [] },
    '@/state/demo-context': { DemoProvider: 'DemoProvider', useDemo: () => demo },
  };
  function load(path) {
    const exports = {};
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    });
    new Function('require','exports',outputText)(name => {
      assert(name in stubs, `Unexpected import ${name}`);
      return stubs[name];
    },exports);
    return exports;
  }
  const authModule = load('../src/state/auth-context.tsx');
  stubs['@/state/auth-context'] = authModule;
  const welcome = load('../src/app/welcome.tsx').default;
  const profile = load('../src/app/(tabs)/profile.tsx').default;
  const protect = load('../src/app/protect.tsx').default;
  const root = load('../src/app/_layout.tsx').default;
  function render(component) {
    if (!stores.has(component)) stores.set(component, []);
    hooks = stores.get(component); index = 0;
    return component({ children: null });
  }
  function refresh() { auth = render(authModule.AuthProvider).props.value; }
  function elements(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(elements);
    return [node, ...elements(node.props?.children)];
  }
  function button(label) { return elements(render(welcome)).find(node => node.type === 'Button' && node.props.label === label); }
  function fill(label,value) { elements(render(welcome)).find(node => node.type === 'TextInput' && node.props.accessibilityLabel === label).props.onChangeText(value); }
  refresh();
  return { demo, auth: () => auth, refresh, fill, button, elements,
    welcome: () => render(welcome), profile: () => render(profile), protect: () => render(protect),
    guards() {
      const navigator = elements(render(root)).find(node => typeof node.type === 'function' && node.type.name === 'AppNavigator');
      return elements(render(navigator.type)).filter(node => node.type === 'Protected').map(node => node.props.guard);
    } };
}

test('demo sign-in validates fields, normalizes email, stores identity only, and opens protected tabs', () => {
  const app = harness();
  assert.deepEqual(app.guards(), [true,false]);
  app.button('Sign In').props.onPress();
  assert.equal(app.auth().user,null);
  assert(JSON.stringify(app.welcome()).includes('valid email address'));
  app.fill('Email','  USER@example.com  ');
  app.fill('Password','made-up-demo-password');
  app.button('Sign In').props.onPress(); app.refresh();
  assert.deepEqual(app.auth().user,{ name:'Jordan Smith',email:'user@example.com' });
  assert(!JSON.stringify(app.auth()).includes('made-up-demo-password'));
  assert.deepEqual(app.guards(),[false,true]);
  assert.equal(app.elements(app.welcome()).find(node => node.props?.accessibilityLabel === 'Password').props.value,'');
});

test('Create Account checks full name and confirmation and creates only local demo identity', () => {
  const app = harness();
  app.button('Create Account').props.onPress();
  app.fill('Email','new@example.com'); app.fill('Password','demo');
  app.button('Create Account').props.onPress();
  assert(JSON.stringify(app.welcome()).includes('full name'));
  app.fill('Full Name','  Taylor Demo  '); app.fill('Confirm Password','different');
  app.button('Create Account').props.onPress();
  assert.equal(app.auth().user,null);
  assert(JSON.stringify(app.welcome()).includes('do not match'));
  app.fill('Confirm Password','demo'); app.button('Create Account').props.onPress(); app.refresh();
  assert.deepEqual(app.auth().user,{ name:'Taylor Demo',email:'new@example.com' });
  assert.equal(app.auth().subscriptionPlan,null);
  assert(JSON.stringify(app.profile()).includes('Taylor Demo'));
  for (const label of ['Password','Confirm Password']) assert.equal(app.elements(app.welcome()).find(node => node.props?.accessibilityLabel === label).props.value,'');
});

test('Explore Demo and Profile logout preserve home data, clear the plan, and reset route access', () => {
  const app = harness();
  app.button('Explore Demo').props.onPress(); app.refresh();
  app.auth().activateProtect(); app.refresh();
  const tree = app.profile();
  assert(JSON.stringify(tree).includes('demo@homeiq.example'));
  assert(JSON.stringify(tree).includes('Current Plan: HomeIQ Protect'));
  app.elements(tree).find(node => node.type === 'Button' && node.props.label === 'Log Out').props.onPress(); app.refresh();
  assert.equal(app.auth().user,null);
  assert.deepEqual(app.guards(),[true,false]);
  assert.equal(app.auth().subscriptionPlan,null);
  assert.equal(app.demo.homeHealthScore,80);
  assert.equal(harness().auth().user,null);
});

test('changing auth modes clears passwords and validation messages', () => {
  const app = harness();
  app.fill('Password','discard-me'); app.button('Sign In').props.onPress();
  app.button('Create Account').props.onPress();
  const tree=app.welcome();
  assert(!JSON.stringify(tree).includes('discard-me'));
  assert(!JSON.stringify(tree).includes('valid email address'));
});

test('Protect activation updates Profile immediately and logout prevents another user inheriting the plan', () => {
  const app = harness();
  app.fill('Email','first@example.com'); app.fill('Password','demo');
  app.button('Sign In').props.onPress(); app.refresh();
  assert(JSON.stringify(app.profile()).includes('Current Plan: No plan selected'));
  app.elements(app.protect()).find(node => node.type === 'Button' && node.props.label === 'Get HomeIQ Protect').props.onPress(); app.refresh();
  assert(JSON.stringify(app.profile()).includes('Current Plan: HomeIQ Protect'));
  const selected=app.elements(app.protect()).find(node => node.type === 'Button');
  assert.equal(selected.props.label,'HomeIQ Protect Selected');
  assert.equal(selected.props.disabled,true);
  app.auth().signOut(); app.refresh();
  assert.equal(app.auth().user,null);
  assert.equal(app.auth().subscriptionPlan,null);
  app.auth().activateProtect(); app.refresh();
  assert.equal(app.auth().subscriptionPlan,null);
  app.fill('Email','second@example.com'); app.fill('Password','demo');
  app.button('Sign In').props.onPress(); app.refresh();
  assert.equal(app.auth().user.email,'second@example.com');
  assert.equal(app.auth().subscriptionPlan,null);
});

test('Explore Demo always resets to the fixed identity and no selected plan, including after profile edits', () => {
  const app=harness();
  for(let attempt=0;attempt<2;attempt++) {
    app.demo.saveProfile({name:'Previous user'});
    app.button('Explore Demo').props.onPress(); app.refresh();
    assert.deepEqual(app.auth().user,{name:'Jordan Smith',email:'demo@homeiq.example'});
    assert.equal(app.auth().subscriptionPlan,null);
    app.auth().activateProtect(); app.auth().updateName('Changed name'); app.refresh();
    app.auth().signOut(); app.refresh();
  }
});

test('editing the account name keeps email and selected plan intact', () => {
  const app=harness();
  app.button('Explore Demo').props.onPress(); app.refresh();
  app.auth().activateProtect(); app.auth().updateName('Updated name'); app.refresh();
  assert.equal(app.auth().user.name,'Updated name');
  assert.equal(app.auth().user.email,'demo@homeiq.example');
  assert.equal(app.auth().subscriptionPlan,'HomeIQ Protect');
  assert(JSON.stringify(app.profile()).includes('Updated name'));
});
