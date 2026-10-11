import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Icon } from '@/components/homeiq/icon';
import { ProfileEditor } from '@/components/homeiq/profile-editor';
import { Button, Card, Copy, IconTile, ItemRow, Screen, SectionHeading } from '@/components/homeiq/ui';
import { palette } from '@/constants/theme';
import { devices } from '@/data/mock-home';
import { useDemo } from '@/state/demo-context';
import { useAuth } from '@/state/auth-context';

export default function Profile() {
  const { user, signOut, subscriptionPlan, updateName } = useAuth();
  const { profile, saveProfile, saveHomeDetails, homeHealthScore } = useDemo();
  const [editing, setEditing] = useState<'profile' | 'home' | null>(null);
  const [notifications, setNotifications] = useState(profile.notificationPreferences);

  return (
    <>
      <Screen title="Profile" subtitle="A smarter home starts with you.">
        <Card>
          <View style={styles.profileRow}>
            <IconTile name="profile" />
            <View style={styles.profileInfo}>
              <Copy style={styles.userName}>{user?.name ?? profile.name}</Copy>
              <Copy muted>{profile.role}</Copy>
              <Copy muted>{user?.email}</Copy>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit Profile"
              onPress={() => setEditing('profile')}
              style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
              <Icon name="edit" size={17} />
            </Pressable>
          </View>
        </Card>
        <Card style={styles.compactCard}>
          <View style={styles.homeHeading}>
            <View style={styles.homeTitle}><SectionHeading title="My home" icon="home" /></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit Home Details"
              onPress={() => setEditing('home')}
              style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
              <Icon name="edit" size={17} />
            </Pressable>
          </View>
          <View style={styles.propertyInfo}>
            <Copy style={styles.propertyName}>{profile.property.name}</Copy>
            <Copy muted>{profile.property.type}</Copy>
            <View style={styles.addressRow}>
              <Icon name="location" size={15} color={palette.muted} />
              <Copy muted style={styles.address}>{profile.property.address}</Copy>
            </View>
          </View>
          <View style={styles.homeActions}>
            <View style={styles.deviceSummary}>
              <Copy style={styles.settingLabel}>{devices.length} connected devices</Copy>
              <Copy muted style={styles.caption}>Home health {homeHealthScore}/100</Copy>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/devices')}
              style={({ pressed }) => [styles.manageDevices, pressed && styles.pressed]}>
              <Copy style={styles.actionLabel}>Manage Devices</Copy>
              <Icon name="chevron" size={14} />
            </Pressable>
          </View>
        </Card>
        <Card style={styles.compactCard}>
          <SectionHeading title="HomeIQ shortcuts" />
          <ItemRow title="Maintenance plan" detail="Keep your home running smoothly"
            icon="maintenance" onPress={() => router.push('/maintenance')} />
          <ItemRow title="AI Assistant" detail="Get help understanding your home"
            icon="assistant" onPress={() => router.push('/assistant')} />
          <ItemRow title="Active alerts" detail="See what needs your attention"
            icon="alerts" onPress={() => router.push('/alerts')} />
        </Card>
        <Card style={styles.compactCard}>
          <SectionHeading title="Notification Preferences" icon="alerts" />
          {notifications.map(preference => (
            <View key={preference.id} style={styles.preferenceRow}>
              <View style={styles.profileInfo}>
                <Copy style={styles.settingLabel}>{preference.label}</Copy>
                <Copy muted style={styles.caption}>{preference.description}</Copy>
              </View>
              <Switch accessibilityLabel={preference.label} value={preference.enabled}
                onValueChange={enabled => setNotifications(current => current.map(item =>
                  item.id === preference.id ? { ...item, enabled } : item
                ))}
                trackColor={{ true: palette.blue, false: palette.border }} />
            </View>
          ))}
          <Copy muted style={styles.caption}>Demo preferences only. No push notifications are sent. Changes are not saved permanently.</Copy>
        </Card>
        <Card style={styles.compactCard}>
          <SectionHeading title="Home Settings" icon="home" />
          {profile.homeSettings.map(setting => (
            <ItemRow key={setting.id} title={setting.label} detail={setting.value} icon="home" />
          ))}
        </Card>
        <Card style={styles.compactCard}>
          <SectionHeading title="Account Settings" icon="profile" />
          <ItemRow title="Subscription" detail={`Current Plan: ${subscriptionPlan ?? 'No plan selected'}`}
            icon="shield" onPress={() => router.push('/protect')} />
          {profile.accountSettings.map(setting => (
            <ItemRow key={setting.id} title={setting.label} detail={setting.id === 'email' ? user?.email ?? setting.value : setting.value} icon="profile" />
          ))}
          <Copy muted style={styles.caption}>Sample account details · Read-only in this demo</Copy>
          <Button label="Log Out" secondary onPress={signOut} />
        </Card>
        <Card style={styles.compactCard}>
          <Copy style={{ fontWeight: '700' }}>HomeIQ</Copy>
          <Copy muted>Home Intelligence That Sees Trouble Coming</Copy>
          <Copy muted style={styles.caption}>Version 1.0 · Mobile UI prototype</Copy>
        </Card>
      </Screen>
      {editing && <ProfileEditor mode={editing} initialProfile={{ ...profile, name: user?.name ?? profile.name }}
        onCancel={() => setEditing(null)}
        onSave={draft => {
          if (editing === 'profile') {
            saveProfile({ name: draft.name, role: draft.role });
            updateName(draft.name);
          }
          else saveHomeDetails(draft.property);
          setEditing(null);
        }} />}
    </>
  );
}

const styles = StyleSheet.create({
  compactCard: { gap: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  homeHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  homeTitle: { flexShrink: 1 },
  editButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: palette.blueSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  propertyInfo: { gap: 4 },
  propertyName: { fontSize: 17, lineHeight: 23, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  address: { flex: 1 },
  homeActions: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 12, marginTop: 4,
  },
  deviceSummary: { flexGrow: 1, gap: 2 },
  manageDevices: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: palette.blueSoft,
  },
  actionLabel: { color: palette.blue, fontSize: 13, fontWeight: '600' },
  preferenceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: palette.border,
  },
  settingLabel: { fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.65 },
});
