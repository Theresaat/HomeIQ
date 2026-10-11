import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette } from '@/constants/theme';
import { sensorStatusTones } from '@/data/sensors';
import type { ApiPreventiveInsight } from '@/services/api-types';
import { previewInsightEvidence } from '@/services/assistant-scope';
import { Badge, Copy } from './ui';

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function PreventiveInsight({ insight, deviceId }: { insight: ApiPreventiveInsight; deviceId?: string }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const preview = previewInsightEvidence(insight.basedOn, deviceId);
  const urgent = insight.severity === 'critical' || insight.riskLevel === 'high' || insight.recommendedTimeframe === 'Act now';
  const tone = urgent ? 'red' : sensorStatusTones[insight.severity];
  return (
    <View style={[s.content, urgent && s.urgent]}>
      <Copy style={[s.timeframe, { color: palette[tone] }]}>{insight.recommendedTimeframe}</Copy>
      <View style={s.badges}>
        <Badge label={`Severity: ${titleCase(insight.severity)}`} tone={sensorStatusTones[insight.severity]} />
        <Badge label={`Risk: ${titleCase(insight.riskLevel)}`} tone={insight.riskLevel === 'high' ? 'red' : insight.riskLevel === 'moderate' ? 'orange' : 'green'} />
      </View>
      <Copy style={s.bold}>What changed · {titleCase(insight.trend)}</Copy>
      <Copy>{insight.answer}</Copy>
      <Copy style={s.bold}>What to do next</Copy>
      {insight.recommendedActions.map((action, index) => <Copy key={index}>• {action}</Copy>)}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showEvidence }}
        onPress={() => { setShowEvidence(current => !current); setShowAllEvidence(false); }} style={s.evidenceButton}>
        <Copy muted style={s.secondary}>{showEvidence ? 'Hide evidence' : `View evidence (${insight.basedOn.length})`}</Copy>
      </Pressable>
      {showEvidence && (showAllEvidence ? insight.basedOn : preview).map((evidence, index) => (
        <Copy key={index} muted style={s.secondary}>• {evidence}</Copy>
      ))}
      {showEvidence && insight.basedOn.length > preview.length && (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAllEvidence }}
          onPress={() => setShowAllEvidence(current => !current)} style={s.evidenceButton}>
          <Copy muted style={s.secondary}>{showAllEvidence ? 'Show only key evidence' : `Show all supporting evidence (${insight.basedOn.length})`}</Copy>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  content: { gap: 10 },
  urgent: { backgroundColor: palette.redSoft, borderColor: palette.red, borderWidth: 1, borderRadius: 14, padding: 12 },
  timeframe: { fontSize: 18, fontWeight: '700', lineHeight: 25 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bold: { fontWeight: '700' },
  evidenceButton: { minHeight: 44, justifyContent: 'center', borderTopWidth: 1, borderTopColor: palette.border },
  secondary: { fontSize: 12, lineHeight: 18 },
});
