import { Tabs } from 'expo-router';
import { Icon } from '@/components/homeiq/icon';
import { palette } from '@/constants/theme';
import { useDemo } from '@/state/demo-context';

export default function AppTabs() {
  const { alerts } = useDemo();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: palette.blue,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: { backgroundColor: palette.white, borderTopColor: palette.border },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      tabBarLabelPosition: 'below-icon',
      tabBarHideOnKeyboard: true,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home',
        tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
      <Tabs.Screen name="devices" options={{ title: 'Devices',
        tabBarIcon: ({ color }) => <Icon name="devices" color={color} /> }} />
      <Tabs.Screen name="assistant" options={{ title: 'AI',
        tabBarIcon: ({ color }) => <Icon name="assistant" color={color} /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts',
        tabBarIcon: ({ color }) => <Icon name="alerts" color={color} />,
        tabBarBadge: alerts.length || undefined,
        tabBarBadgeStyle: { backgroundColor: palette.red, fontSize: 10 },
      }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile',
        tabBarIcon: ({ color }) => <Icon name="profile" color={color} /> }} />
    </Tabs>
  );
}
