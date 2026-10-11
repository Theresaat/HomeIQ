import type { ReactNode, RefObject } from 'react';
import { router } from 'expo-router';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, toneBackground, type Tone } from '@/constants/theme';
import { home } from '@/data/mock-home';
import { Icon, type IconName } from './icon';

export function Copy({ children, muted = false, style }: {
  children: ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.copy, muted && { color: palette.muted }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, tone = 'blue' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: toneBackground[tone] }]}>
      <Text style={[styles.badgeText, { color: palette[tone] }]}>{label}</Text>
    </View>
  );
}

export function Metric({ value, label, tone = 'blue', style }: {
  value: string | number;
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.metric, style]}>
      <Text style={[styles.metricValue, { color: palette[tone] }]}>{value}</Text>
      <Copy muted style={styles.metricLabel}>{label}</Copy>
    </View>
  );
}

export function IconTile({ name, tone = 'blue' }: { name: IconName; tone?: Tone }) {
  return (
    <View style={[styles.iconTile, { backgroundColor: toneBackground[tone] }]}>
      <Icon name={name} color={palette[tone]} />
    </View>
  );
}

export function Button({ label, onPress, secondary = false, disabled = false }: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && { backgroundColor: palette.blueSoft },
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      <Text style={[styles.buttonText, secondary && { color: palette.blue }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionHeading({ title, icon, count, tone = 'blue', action, onPress }: {
  title: string;
  icon?: IconName;
  count?: number;
  tone?: Tone;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.headingLeft}>
        {icon && <Icon name={icon} color={palette[tone]} />}
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && <Badge label={String(count)} tone={tone} />}
      </View>
      {action && (
        <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={styles.link}>
          <Text style={styles.linkText}>{action}</Text>
          <Icon name="chevron" size={15} />
        </Pressable>
      )}
    </View>
  );
}

export function ItemRow({ title, detail, icon, tone = 'blue', badge, onPress }: {
  title: string;
  detail?: string;
  icon: IconName;
  tone?: Tone;
  badge?: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <IconTile name={icon} tone={tone} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {detail && <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>{detail}</Copy>}
        {badge && (
          <View style={{ alignSelf: 'flex-start', marginTop: 6 }}>
            <Badge label={badge} tone={tone} />
          </View>
        )}
      </View>
      {onPress && <Icon name="chevron" color={palette.muted} size={17} />}
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.65 }]}>
      {content}
    </Pressable>
  ) : <View style={styles.row}>{content}</View>;
}

export function Screen({ children, title, subtitle, dashboard = false, back = false, footer, scrollRef }: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  dashboard?: boolean;
  back?: boolean;
  footer?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  return (
    <SafeAreaView
      edges={back ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
      style={[styles.safe, dashboard && { backgroundColor: palette.white }]}>
      <ScrollView
        ref={scrollRef}
        onContentSizeChange={scrollRef ? () => scrollRef.current?.scrollToEnd({ animated: true }) : undefined}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {dashboard ? (
          <>
            <View style={styles.brandRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open profile and shortcuts"
                onPress={() => router.push('/profile')}
                hitSlop={10}>
                <Icon name="menu" color={palette.ink} />
              </Pressable>
              <View style={styles.brand}>
                <Icon name="home" size={32} />
                <Text style={styles.brandText}>Home<Text style={{ color: palette.blue }}>IQ</Text></Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${home.owner} profile`}
                onPress={() => router.push('/profile')}
                style={styles.avatar}>
                <Text style={styles.avatarText}>{home.initials}</Text>
              </Pressable>
            </View>
            <Copy muted style={styles.tagline}>Home Intelligence That Sees Trouble Coming</Copy>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View home information"
              onPress={() => router.push('/profile')}
              style={styles.address}>
              <Icon name="location" size={19} />
              <Text style={styles.addressText}>{home.address}</Text>
              <Icon name="chevron" size={17} />
            </Pressable>
          </>
        ) : (
          <View style={styles.pageHeader}>
            {back && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
                style={styles.back}>
                <Icon name="back" />
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>{title}</Text>
              {subtitle && <Copy muted>{subtitle}</Copy>}
            </View>
            {!back && <IconTile name="home" />}
          </View>
        )}
        {children}
        <Text style={styles.demoLabel}>DEMO HOME · SAMPLE DATA</Text>
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  metric: { flex: 1, minWidth: 110, gap: 4 },
  metricValue: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  metricLabel: { fontSize: 12, lineHeight: 18 },
  safe: { flex: 1, backgroundColor: palette.background }, content: {
    padding: 18, gap: 16, width: '100%', maxWidth: 620, alignSelf: 'center', paddingBottom: 28
  },
  copy: {
    color: palette.ink, fontSize: 14, lineHeight: 21, fontWeight: '500'
  }, card: {
    backgroundColor: palette.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: palette.border, shadowColor: '#20334F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 9, elevation: 2, gap: 12
  },
  badge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12
  }, badgeText: { fontSize: 11, fontWeight: '600' }, iconTile: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center'
  },
  button: {
    backgroundColor: palette.blue, minHeight: 46, padding: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center'
  }, buttonText: {
    color: palette.white, fontWeight: '600', fontSize: 14
  },
  sectionHeading: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap'
  }, headingLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1
  }, sectionTitle: {
    fontSize: 17, fontWeight: '700', color: palette.ink, flexShrink: 1
  }, link: {
    flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: 3
  }, linkText: {
    color: palette.blue, fontSize: 12, fontWeight: '600'
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.border
  }, rowText: { flex: 1, gap: 3 }, rowTitle: {
    color: palette.ink, fontWeight: '600', fontSize: 14, lineHeight: 20
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  }, brand: {
    flexDirection: 'row', gap: 9, alignItems: 'center'
  }, brandText: {
    color: palette.ink, fontSize: 28, fontWeight: '800', letterSpacing: -1
  }, avatar: {
    backgroundColor: '#E5EBFF', borderRadius: 15, width: 42, height: 42, alignItems: 'center', justifyContent: 'center'
  }, avatarText: { color: palette.blue, fontWeight: '700' }, tagline: {
    textAlign: 'center', fontSize: 10, marginTop: -10
  }, address: {
    borderRadius: 14, backgroundColor: palette.blueSoft, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9
  }, addressText: {
    fontSize: 14, color: palette.ink, fontWeight: '600', flexShrink: 1
  },
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8
  }, pageTitle: {
    color: palette.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginBottom: 4
  }, back: {
    backgroundColor: palette.white, width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center'
  }, demoLabel: {
    textAlign: 'center', color: palette.muted, fontSize: 10, letterSpacing: 1.3, paddingTop: 8
  }
});
