import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from 'react-native';
import type { HomeProfile } from '@/data/mock-home';
import { palette } from '@/constants/theme';
import { Button, Card, Copy, Screen } from './ui';

export function ProfileEditor({ mode, initialProfile, onSave, onCancel }: {
  mode: 'profile' | 'home';
  initialProfile: HomeProfile;
  onSave: (draft: HomeProfile) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initialProfile);
  const fields = mode === 'profile' ? [
    { key: 'name', label: 'Name', value: draft.name },
    { key: 'role', label: 'Role / user type', value: draft.role },
  ] : [
    { key: 'name', label: 'Property name', value: draft.property.name },
    { key: 'type', label: 'Property type', value: draft.property.type },
    { key: 'address', label: 'Address', value: draft.property.address },
  ];
  const valid = fields.every(field => field.value.trim().length > 0);

  function save() {
    if (!valid) return;
    onSave({
      ...draft,
      name: draft.name.trim(), role: draft.role.trim(),
      property: {
        name: draft.property.name.trim(), type: draft.property.type.trim(), address: draft.property.address.trim(),
      },
    });
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Screen title={mode === 'profile' ? 'Edit Profile' : 'Edit Home Details'} subtitle="Update your information.">
          <Card>
            {fields.map((field, index) => (
              <View key={field.key} style={styles.field}>
                <Copy style={styles.label}>{field.label}</Copy>
                <TextInput accessibilityLabel={field.label} value={field.value} autoFocus={index === 0}
                  autoCapitalize="words" style={styles.input}
                  onChangeText={value => setDraft(current => mode === 'profile'
                    ? { ...current, [field.key]: value }
                    : { ...current, property: { ...current.property, [field.key]: value } })} />
              </View>
            ))}
            {!valid && <Copy muted>Complete every field to save your changes.</Copy>}
            <Button label="Save" disabled={!valid} onPress={save} />
            <Button label="Cancel" secondary onPress={onCancel} />
          </Card>
        </Screen>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  field: { gap: 6 },
  label: { fontWeight: '600' },
  input: {
    minHeight: 48, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: palette.border, borderRadius: 12,
    backgroundColor: palette.background, color: palette.ink, fontSize: 16,
  },
});
