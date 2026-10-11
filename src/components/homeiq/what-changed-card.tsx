import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { sensorStatusTones } from '@/data/sensors';
import { getWhatChanged } from '@/services/api';
import type { ApiWhatChangedInsight } from '@/services/api-types';
import { Badge, Card, Copy, SectionHeading } from './ui';

function formatValue(value: number, unit: string, signed = false) {
  return `${signed && value > 0 ? '+' : ''}${value}${unit ? `${unit.startsWith('°') || unit === '%' ? '' : ' '}${unit}` : ''}`;
}

export function WhatChangedCard({ deviceId }: { deviceId: string }) {
  const [insight, setInsight] = useState<ApiWhatChangedInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getWhatChanged(deviceId).then(result => {
      if (active) setInsight(result);
    }).catch(() => {
      if (active) setFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [deviceId]);

  const trend = insight && insight.status !== 'insufficient_history' ? insight : null;
  return (
    <Card>
      <SectionHeading title="What Changed?" icon="devices" />
      {loading ? <Copy muted>Loading recent sensor history…</Copy>
        : failed ? <Copy muted>Recent sensor history is unavailable right now. Your device readings are still available above.</Copy>
          : !trend ? <Copy muted>Not enough history yet. A trend will appear once more numeric readings are available.</Copy>
            : <>
              <Copy style={styles.bold}>{trend.label} {trend.direction === 'stable' ? 'is stable' : `is ${trend.direction}`}.</Copy>
              <View style={styles.badge}>
                <Badge label={trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)}
                  tone={sensorStatusTones[trend.status]} />
              </View>
              <View style={styles.values}>
                {[
                  ['Current', formatValue(trend.current, trend.unit)],
                  ['Previous', formatValue(trend.previous, trend.unit)],
                  ['Recent average', formatValue(trend.recentAverage, trend.unit)],
                  ['Change', formatValue(trend.change, trend.unit, true)],
                  ...(trend.percentageChange !== null ? [['Percentage change', formatValue(trend.percentageChange, '%', true)]] : []),
                ].map(([label, value]) => (
                  <View key={label} style={styles.value}>
                    <Copy muted>{label}</Copy>
                    <Copy style={styles.bold}>{value}</Copy>
                  </View>
                ))}
              </View>
            </>}
      <Copy muted style={styles.caption}>Based on recent sensor history</Copy>
    </Card>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '600' },
  badge: { alignSelf: 'flex-start', maxWidth: '100%' },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  value: { flexGrow: 1, flexBasis: 140, gap: 4 },
  caption: { fontSize: 11, lineHeight: 17 },
});
