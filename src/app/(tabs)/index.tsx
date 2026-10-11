import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { alertSeverityTones, partners, waterUsage } from '@/data/mock-home';
import { palette } from '@/constants/theme';
import { useDemo } from '@/state/demo-context';
import { HealthScoreCard } from '@/components/homeiq/health-card';
import { Badge, Button, Card, Copy, ItemRow, Metric, Screen, SectionHeading } from '@/components/homeiq/ui';

export default function Dashboard() {
  const { tasks, completed, deviceSummary, alerts, homeHealthScore, insight } = useDemo();
  const upcoming = tasks.filter(task => !completed.includes(task.id));
  const waterChartMax = Math.max(waterUsage.dailyGoal, ...waterUsage.week.map(day => day.gallons));

  return (
    <Screen dashboard>
      <HealthScoreCard score={homeHealthScore} />

      <Card>
        <SectionHeading title="Active Alerts" icon="alerts" tone={alerts.some(alert => alert.severity === 'Critical') ? 'red' : alerts.length ? 'orange' : 'green'} count={alerts.length}
          action="View all" onPress={() => router.push('/alerts')} />
        {alerts.map(alert => (
          <ItemRow key={alert.id} title={alert.title} detail={alert.detail}
            icon={alert.icon} tone={alertSeverityTones[alert.severity]} badge={alert.severity}
            onPress={() => router.push({ pathname: '/device/[id]', params: { id: alert.deviceId } })} />
        ))}
        {alerts.length === 0 && <Copy muted>No active alerts. Your home is looking good.</Copy>}
      </Card>

      <Card>
        <SectionHeading title="Connected Devices" icon="devices"
          action="View all" onPress={() => router.push('/devices')} />
        <View style={styles.metrics}>
          <Metric value={deviceSummary.connected} label="Connected systems" />
          <Metric value={deviceSummary.healthy} label="Running smoothly" tone="green" />
        </View>
        <Copy muted>{deviceSummary.attention} systems to keep an eye on. View devices for readings and details.</Copy>
      </Card>

      <Card>
        <SectionHeading title="Water Usage" icon="water" />
        <View style={styles.metrics}>
          <Metric value={`${waterUsage.today} ${waterUsage.unit}`} label="Used today" />
          <Metric value={`${waterUsage.changePercent > 0 ? '+' : ''}${waterUsage.changePercent}%`}
            label={waterUsage.comparison} tone={waterUsage.tone} />
        </View>
        <View style={styles.chart}>
          {waterUsage.week.map((day, index) => (
            <View key={day.day} style={styles.chartColumn}
              accessible accessibilityLabel={`${day.day}: ${day.gallons} ${waterUsage.unit}`}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, {
                  height: `${waterChartMax > 0 ? day.gallons / waterChartMax * 100 : 0}%`,
                  backgroundColor: index === waterUsage.week.length - 1 ? palette.blue : palette.blueSoft,
                }]} />
              </View>
              <Copy muted style={styles.day}>{day.day}</Copy>
            </View>
          ))}
        </View>
        <View style={styles.waterFooter}>
          <Badge label={waterUsage.status} tone={waterUsage.tone} />
          <Copy muted style={styles.caption}>Daily goal: {waterUsage.dailyGoal} {waterUsage.unit}</Copy>
        </View>
      </Card>

      <Card>
        <SectionHeading title="Upcoming Maintenance" icon="calendar" count={upcoming.length}
          action="View all" onPress={() => router.push('/maintenance')} />
        {upcoming.map(task => (
          <ItemRow key={task.id} title={task.title} detail={task.detail}
            icon={task.icon} badge={`Due ${new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} onPress={() => router.push('/maintenance')} />
        ))}
        {upcoming.length === 0 && <Copy muted>All caught up. Your maintenance checklist is complete.</Copy>}
      </Card>

      <Card style={styles.insightCard}>
        <SectionHeading title="AI Insight" icon="assistant" />
        <Copy>{insight}</Copy>
        <Button label="Ask HomeIQ Assistant" secondary onPress={() => router.push('/assistant')} />
      </Card>

      <Card>
        <SectionHeading title="Trusted Partners" icon="profile" />
        <Copy muted>Home care specialists, organized around what you need.</Copy>
        {partners.map(partner => (
          <ItemRow key={partner.id} title={partner.title} detail={partner.detail} icon={partner.icon} />
        ))}
        <Copy muted style={styles.caption}>Sample categories · No services are connected.</Copy>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', paddingVertical: 4 },
  chart: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  chartColumn: { flex: 1, gap: 8, alignItems: 'center' },
  barTrack: { width: '100%', height: 76, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  day: { fontSize: 9, lineHeight: 14 },
  waterFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  caption: { fontSize: 11, lineHeight: 17 },
  insightCard: { borderColor: '#DFE7FF' },
});
