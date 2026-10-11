import { StyleSheet } from 'react-native';
import { Badge, Button, Card, Copy, ItemRow, Screen, SectionHeading } from '@/components/homeiq/ui';
import { palette } from '@/constants/theme';
import { useAuth } from '@/state/auth-context';

const starterIncludes = ['HomeIQ Sensor Hub', 'Starter Sensor Package', 'Installation Guide', 'App Setup'];
const protectIncludes = ['24/7 Monitoring', 'Smart Alerts', 'Home Health Score', 'Maintenance Reminders',
  'Historical Trends', 'Ask HomeIQ', 'Preventive Recommendations', 'Energy Intelligence'];

export default function Protect() {
  const { subscriptionPlan, activateProtect } = useAuth();
  const selected = subscriptionPlan === 'HomeIQ Protect';

  return (
    <Screen title="HomeIQ Protect" subtitle="Preventive intelligence for your home." back>
      <Card>
        <SectionHeading title="HomeIQ Starter Kit" icon="devices" />
        <Copy style={styles.price}>$249 <Copy muted>one-time</Copy></Copy>
        <Copy style={styles.label}>Includes</Copy>
        {starterIncludes.map(title => <ItemRow key={title} title={title} icon="check" />)}
      </Card>
      <Card style={styles.protect}>
        <SectionHeading title="HomeIQ Protect" icon="shield" />
        <Copy style={styles.price}>$19<Copy muted>/month</Copy></Copy>
        <Copy style={styles.label}>Includes</Copy>
        {protectIncludes.map(title => <ItemRow key={title} title={title} icon="check" />)}
      </Card>
      <Card>
        <SectionHeading title="First Year" icon="calendar" />
        <Copy style={styles.price}>$477</Copy>
        <Copy muted>$249 Starter Kit + $228 annual subscription</Copy>
      </Card>
      <Badge label={`Current Plan: ${subscriptionPlan ?? 'No plan selected'}`} tone="blue" />
      <Button label={selected ? 'HomeIQ Protect Selected' : 'Get HomeIQ Protect'} onPress={activateProtect} disabled={selected} />
      <Copy muted style={styles.caption}>{selected
        ? 'HomeIQ Protect is selected for this demo. No payment was processed.'
        : 'Demo selection only. No payment will be processed.'} Your selection resets on logout or app reload.</Copy>
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: { color: palette.blue, fontSize: 30, lineHeight: 38, fontWeight: '800' },
  label: { fontWeight: '700' },
  protect: { borderColor: palette.blue, backgroundColor: palette.blueSoft },
  caption: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
