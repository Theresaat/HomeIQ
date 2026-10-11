import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Copy, IconTile, Screen } from '@/components/homeiq/ui';
import { palette } from '@/constants/theme';
import { DEMO_ACCOUNT, useAuth } from '@/state/auth-context';

export default function Welcome() {
  const { signIn } = useAuth();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  function submit() {
    if (creating && !name.trim()) { setError('Please enter your full name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    if (!password.trim()) { setError('Please enter a demo password.'); return; }
    if (creating && password !== confirmPassword) { setError('Your passwords do not match.'); return; }
    const userName = creating ? name.trim() : DEMO_ACCOUNT.name;
    setPassword('');
    setConfirmPassword('');
    signIn({ name: userName, email });
  }

  function switchMode() {
    setCreating(current => !current);
    setPassword('');
    setConfirmPassword('');
    setError('');
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen title="HomeIQ" subtitle="Home Intelligence That Sees Trouble Coming.">
        <Card>
          <IconTile name="shield" />
          <Copy style={styles.heading}>{creating ? 'Create Account' : 'Welcome home'}</Copy>
          <Copy muted>{creating ? 'Set up your demo profile.' : 'Sign in to explore your home’s preventive insights.'}</Copy>
          {creating && <View style={styles.field}>
            <Copy>Full Name</Copy>
            <TextInput accessibilityLabel="Full Name" value={name} onChangeText={setName}
              autoCapitalize="words" autoComplete="name" style={styles.input} />
          </View>}
          <View style={styles.field}>
            <Copy>Email</Copy>
            <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={styles.input} />
          </View>
          <View style={styles.field}>
            <Copy>Password</Copy>
            <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword}
              secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" style={styles.input} />
          </View>
          {creating && <View style={styles.field}>
            <Copy>Confirm Password</Copy>
            <TextInput accessibilityLabel="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword}
              secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="off" style={styles.input} />
          </View>}
          {!!error && <Copy style={styles.error}>{error}</Copy>}
          <Button label={creating ? 'Create Account' : 'Sign In'} onPress={submit} />
          <Button label={creating ? 'Already have an account? Sign In' : 'Create Account'} secondary onPress={switchMode} />
          {!creating && <Button label="Explore Demo" secondary
            onPress={() => { setPassword(''); setConfirmPassword(''); signIn(DEMO_ACCOUNT); }} />}
          <Copy muted style={styles.caption}>Demo only. No real account is created and passwords are never saved. Use a made-up password. Sign-in resets when the app reloads.</Copy>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  heading: { fontSize: 22, lineHeight: 29, fontWeight: '700' },
  field: { gap: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: palette.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, color: palette.ink, backgroundColor: palette.white, fontSize: 16 },
  error: { color: palette.red },
  caption: { fontSize: 12, lineHeight: 18 },
});
