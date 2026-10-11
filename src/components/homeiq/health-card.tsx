import { StyleSheet, Text, View } from 'react-native';
import { palette, toneBackground } from '@/constants/theme';
import { tasks } from '@/data/mock-home';
import { useDemo } from '@/state/demo-context';
import { Card, Copy, IconTile, SectionHeading } from './ui';

const RING_SIZE = 112;
const HALF_SIZE = RING_SIZE / 2;

export function HealthScoreRing({ score, accessibilityLabel = 'Health score' }: {
  score: number;
  accessibilityLabel?: string;
}) {
  const value = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
  const label = value >= 85 ? 'Excellent' : value >= 70 ? 'Good' : value >= 50 ? 'Needs Attention' : 'Poor';
  const tone = value >= 85 ? 'green' : value >= 50 ? 'orange' : 'red';
  const color = palette[tone];
  const angle = value / 100 * 360;
  // Each clipped half reveals up to 180 degrees, clockwise from twelve o'clock.
  const halves = [
    { clipLeft: HALF_SIZE, fillLeft: 0, rotation: Math.min(180, angle) },
    { clipLeft: 0, fillLeft: HALF_SIZE, rotation: Math.max(0, angle - 180) },
  ];
  return (
    <View
      style={[styles.scoreCircle, { backgroundColor: toneBackground[tone] }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      accessibilityLabel={`${accessibilityLabel} ${value} out of 100, ${label}`}>
      <View style={[styles.ring, { borderColor: palette.border }]} />
      {halves.filter(half => half.rotation > 0).map(half => (
        <View key={half.clipLeft} style={[styles.halfClip, { left: half.clipLeft }]}>
          <View style={[styles.rotatingHalf, {
            left: -half.clipLeft,
            transform: [{ rotate: `${half.rotation}deg` }],
          }]}>
            <View style={[styles.halfClip, { left: half.fillLeft }]}>
              <View style={[styles.ring, { left: -half.fillLeft, borderColor: color }]} />
            </View>
          </View>
        </View>
      ))}
      <Text style={[styles.score, { color }]}>{value}</Text>
      <Text style={[styles.rating, { color }]}>{label}</Text>
    </View>
  );
}

export function HealthScoreCard({ score }: { score: number }) {
  const { completed, deviceSummary, alerts, updatedAt } = useDemo();
  const stats = [
    { label: 'Systems healthy', value: deviceSummary.healthy,
      tone: 'green' as const, icon: 'check' as const },
    { label: 'Upcoming maintenance', value: tasks.filter(task => !completed.includes(task.id)).length,
      tone: 'blue' as const, icon: 'maintenance' as const },
    { label: 'Needs attention', value: alerts.filter(alert => alert.severity === 'Warning').length,
      tone: 'orange' as const, icon: 'warning' as const },
    { label: 'Urgent issues', value: alerts.filter(alert => alert.severity === 'Critical').length,
      tone: 'red' as const, icon: 'alerts' as const },
  ];

  return (
    <Card>
      <SectionHeading title="Home Health Score" icon="home" />
      <Copy muted style={styles.updated}>Updated {updatedAt ? new Date(updatedAt).toLocaleString() : 'Unavailable'} · Demo snapshot</Copy>
      <View style={styles.body}>
        <HealthScoreRing score={score} accessibilityLabel="Home health" />
        <View style={styles.stats}>
          {stats.map(stat => (
            <View key={stat.label} style={styles.stat}>
              <IconTile name={stat.icon} tone={stat.tone} />
              <View style={styles.statText}>
                <Text style={styles.value}>{stat.value}</Text>
                <Copy muted style={styles.label}>{stat.label}</Copy>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  updated: { fontSize: 11 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  scoreCircle: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: HALF_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: HALF_SIZE,
    borderWidth: 7,
  },
  halfClip: {
    position: 'absolute',
    top: 0,
    width: HALF_SIZE,
    height: RING_SIZE,
    overflow: 'hidden',
  },
  rotatingHalf: { position: 'absolute', top: 0, width: RING_SIZE, height: RING_SIZE },
  score: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  rating: { fontSize: 12, fontWeight: '600', textAlign: 'center', maxWidth: RING_SIZE - 28 },
  stats: { flex: 1, minWidth: 120, gap: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { flex: 1 },
  value: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  label: { fontSize: 11, lineHeight: 15 },
});
