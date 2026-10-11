import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HealthScoreRing } from '@/components/homeiq/health-card';
import { WhatChangedCard } from '@/components/homeiq/what-changed-card';
import { Badge, Button, Card, Copy, IconTile, ItemRow, Metric, Screen, SectionHeading } from '@/components/homeiq/ui';
import { palette } from '@/constants/theme';
import { useDemo } from '@/state/demo-context';
import { openDeviceAssistant } from '@/services/assistant-scope';
import { formatSensorReading, sensorStatusLabels, sensorStatusTones } from '@/data/sensors';

function formatDate(value: string, includeTime = false) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } as const : { timeZone: 'UTC' }),
  });
}

export default function DeviceDetails() {
  const [readingsWidth, setReadingsWidth] = useState(0);
  const { devices, deviceAlertHistory, setAssistantScope } = useDemo();
  const { id } = useLocalSearchParams<{ id: string }>();
  const device = devices.find(item => item.id === id);

  if (!device) {
    return (
      <Screen title="Device not found" back>
        <Card>
          <Copy>This device is not part of the demo home.</Copy>
          <Button label="View devices" onPress={() => router.push('/devices')} />
        </Card>
      </Screen>
    );
  }

  const activity = [...device.activity].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const alertHistory = deviceAlertHistory.filter(alert => alert.deviceId === device.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <Screen title="Device Details" subtitle={device.room} back>
      <Card>
        <View style={styles.heading}>
          <IconTile name={device.icon} tone={device.tone} />
          <View style={styles.flex}>
            <Text style={styles.name}>{device.name}</Text>
            <Copy muted>{device.connection} · Sample device</Copy>
          </View>
        </View>
        <View style={styles.badge}><Badge label={device.status} tone={device.tone} /></View>
        <View style={styles.health}>
          <HealthScoreRing score={device.healthScore} accessibilityLabel={`${device.name} health`} />
          <View style={styles.healthSummary}>
            <Copy style={styles.bold}>Device health</Copy>
            <Copy muted>{device.description}</Copy>
          </View>
        </View>
      </Card>

      <Card>
        <SectionHeading title="Latest Sensor Readings" icon="devices" />
        <View style={styles.readings}
          onLayout={({ nativeEvent }) => setReadingsWidth(nativeEvent.layout.width)}>
          {device.latestReadings.map(reading => (
            <View key={reading.id} style={[styles.readingTile,
              { width: readingsWidth >= 372 ? (readingsWidth - 12) / 2 : '100%' }]}>
              <Metric value={formatSensorReading(reading)}
                label={reading.label} tone={sensorStatusTones[reading.status]} style={styles.readingMetric} />
              <View style={styles.badge}>
                <Badge label={sensorStatusLabels[reading.status]}
                  tone={sensorStatusTones[reading.status]} />
              </View>
              <Copy muted style={styles.caption}>{formatDate(reading.timestamp, true)}</Copy>
            </View>
          ))}
        </View>
        {device.latestReadings.length === 0 && <Copy muted>No sensor readings available yet.</Copy>}
      </Card>

      <WhatChangedCard key={device.id} deviceId={device.id} />

      <Card>
        <SectionHeading title="Recent Sensor Activity" icon="devices" />
        {activity.map(event => (
          <ItemRow key={event.id} title={event.summary} detail={formatDate(event.timestamp, true)}
            icon={device.icon} tone={sensorStatusTones[event.status]} />
        ))}
        {activity.length === 0 && <Copy muted>No recent sensor activity.</Copy>}
      </Card>

      <Card>
        <SectionHeading title="Maintenance" icon="maintenance" />
        <View style={styles.info}>
          <Copy muted>Last maintenance</Copy>
          <Copy style={styles.bold}>{formatDate(device.lastMaintenanceDate)}</Copy>
        </View>
        <Button label="View maintenance plan" secondary onPress={() => router.push('/maintenance')} />
      </Card>

      <Card>
        <SectionHeading title="Recommended Next Action" icon="assistant" />
        <Copy style={styles.bold}>{device.recommendedAction.title}</Copy>
        <Copy muted>{device.recommendedAction.detail}</Copy>
        <Button label="Ask about this device" secondary
          onPress={() => openDeviceAssistant(device, setAssistantScope, router.navigate)} />
      </Card>

      <Card>
        <SectionHeading title="Alert History" icon="alerts" count={alertHistory.length} />
        {alertHistory.map(alert => (
          <ItemRow key={alert.id} title={alert.title}
            detail={`${alert.detail} ${formatDate(alert.createdAt, true)}`}
            icon="alerts" tone={alert.tone} badge={alert.state} />
        ))}
        {alertHistory.length === 0 && <Copy muted>No alerts recorded for this device.</Copy>}
      </Card>

      <Card>
        <SectionHeading title="Device Information" icon="shield" />
        <View style={styles.info}><Copy muted>Connection</Copy><Copy>{device.connection}</Copy></View>
        <View style={styles.info}>
          <Copy muted>Power</Copy>
          <Copy>{device.powerSource === 'mains' ? 'Plugged in' : `${device.battery}% battery`}</Copy>
        </View>
        <View style={styles.info}>
          <Copy muted>Last updated</Copy><Copy>{formatDate(device.updatedAt, true)}</Copy>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: palette.ink, fontSize: 19, fontWeight: '700' },
  bold: { fontWeight: '600' },
  badge: { alignSelf: 'flex-start', maxWidth: '100%' },
  health: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  healthSummary: { flex: 1, minWidth: 120, gap: 6 },
  readings: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  readingTile: { flexShrink: 0, minWidth: 0, gap: 10, padding: 12, borderRadius: 14, backgroundColor: palette.background },
  readingMetric: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0 },
  caption: { fontSize: 11, lineHeight: 17 },
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
});
