import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Copy, ItemRow, Screen } from '@/components/homeiq/ui';
import { palette } from '@/constants/theme';
import { useDemo } from '@/state/demo-context';

export default function Devices() {
  const { devices } = useDemo();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const filtered = devices.filter(device =>
    `${device.name} ${device.room}`.toLowerCase().includes(query.toLowerCase()) &&
    (filter === 'All' || (filter === 'Healthy' ? device.tone === 'green' : device.tone !== 'green'))
  );

  return (
    <Screen title="Devices" subtitle={`${devices.length} systems connected to your demo home`}>
      <TextInput accessibilityLabel="Search devices" placeholder="Search devices or rooms"
        placeholderTextColor={palette.muted} value={query} onChangeText={setQuery} style={s.input} />
      <View style={s.filters}>
        {['All', 'Healthy', 'Attention'].map(item => (
          <Pressable key={item} accessibilityRole="button"
            accessibilityState={{ selected: item === filter }} onPress={() => setFilter(item)}
            style={[s.chip, item === filter && { backgroundColor: palette.blue }]}>
            <Text style={{ color: item === filter ? palette.white : palette.muted, fontWeight: '600' }}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <Card>
        {filtered.map(device => (
          <ItemRow key={device.id} title={device.name} detail={`${device.room} · ${device.reading}`}
            icon={device.icon} tone={device.tone} badge={device.status}
            onPress={() => router.push({ pathname: '/device/[id]', params: { id: device.id } })} />
        ))}
        {filtered.length === 0 && <Copy muted>No devices found. Try another name or room.</Copy>}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  input: {
    borderRadius: 15, backgroundColor: palette.white, padding: 15, borderWidth: 1, borderColor: palette.border, color: palette.ink, fontSize: 14
  }, filters: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap'
  }, chip: {
    paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, backgroundColor: palette.blueSoft
  }
});
