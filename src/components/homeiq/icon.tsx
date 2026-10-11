import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import { palette } from '@/constants/theme';
const symbols = {
  home: { ios: 'house', android: 'home', web: 'home' },
  devices: { ios: 'sensor', android: 'sensors', web: 'sensors' },
  alerts: { ios: 'bell', android: 'notifications', web: 'notifications' },
  profile: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  water: { ios: 'drop', android: 'water_drop', web: 'water_drop' },
  temperature: { ios: 'thermometer.medium', android: 'device_thermostat', web: 'device_thermostat' },
  maintenance: { ios: 'wrench.and.screwdriver', android: 'build', web: 'build' },
  air: { ios: 'wind', android: 'air', web: 'air' },
  assistant: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  menu: { ios: 'line.3.horizontal', android: 'menu', web: 'menu' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  shield: { ios: 'shield', android: 'shield', web: 'shield' },
  energy: { ios: 'bolt', android: 'bolt', web: 'bolt' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
} as const;
export type IconName = keyof typeof symbols;
export function Icon({ name, color = palette.blue, size = 24 }: {
  name: IconName;
  color?: ColorValue;
  size?: number;
}) {
  return <SymbolView name={symbols[name]} tintColor={color} size={size} style={{ width: size, height: size }}/>;
}
