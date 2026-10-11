import { router } from 'expo-router';
import { useState } from 'react';
import { Card, Copy, Button, ItemRow, Screen } from '@/components/homeiq/ui';
import { alertSeverityTones } from '@/data/mock-home';
import { useDemo } from '@/state/demo-context';

export default function Alerts() {
  const { alerts, devices } = useDemo();
  const [criticalOnly, setCriticalOnly] = useState(false);
  const critical = alerts.filter(alert => alert.severity === 'Critical');
  const warnings = alerts.filter(alert => alert.severity === 'Warning');
  const normal = alerts.filter(alert => alert.severity === 'Normal');
  const shown = criticalOnly ? critical : alerts;

  return (
    <Screen title="Alerts" subtitle="A little attention today. Fewer surprises tomorrow.">
      <Card>
        <Copy style={{ fontSize: 20, fontWeight: '700' }}>{alerts.length} active alerts</Copy>
        <Copy muted>{critical.length} critical · {warnings.length} warning · {normal.length} normal</Copy>
        <Button secondary label={criticalOnly ? 'Show all alerts' : 'Show critical alerts only'}
          onPress={() => setCriticalOnly(!criticalOnly)} />
      </Card>
      {shown.map(alert => {
        const device = devices.find(device => device.id === alert.deviceId);
        const openDevice = device ? () => router.push({
          pathname: '/device/[id]', params: { id: device.id },
        }) : undefined;
        return (
          <Card key={alert.id}>
            <ItemRow title={alert.title} detail={device ? `${device.name} · ${device.room}` : 'Device unavailable'}
              icon={alert.icon} tone={alertSeverityTones[alert.severity]} badge={alert.severity}
              onPress={openDevice} />
            <Copy muted>Detected {new Date(alert.createdAt).toLocaleString()} · {alert.time}</Copy>
            <Copy>{alert.detail}</Copy>
            {device && <>
              <Copy style={{ fontWeight: '700' }}>Recommended next action</Copy>
              <Copy>{device.recommendedAction.title}</Copy>
              <Copy muted>{device.recommendedAction.detail}</Copy>
            </>}
            {alert.actionTarget === 'maintenance' ? (
              <Button secondary label="Open maintenance plan" onPress={() => router.push('/maintenance')} />
            ) : openDevice && (
              <Button secondary label="View device details" onPress={openDevice} />
            )}
          </Card>
        );
      })}
      {shown.length === 0 && <Card><Copy muted>{criticalOnly ? 'No critical alerts.' : 'No active alerts. Your home is looking good.'}</Copy></Card>}
    </Screen>
  );
}
