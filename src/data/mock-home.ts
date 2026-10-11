import { deriveDevices } from './sensor-devices';
import { sensorStatusTones, type DeviceStatus, type SensorReading, type SensorActivity } from './sensors';
import type { IconName } from '@/components/homeiq/icon';
import type { Tone } from '@/constants/theme';
export const home = {
  address: '1234 Oak Ridge Dr.',
  owner: 'Jordan Smith',
  initials: 'JS',
};

export const profile = {
  name: home.owner,
  role: 'Homeowner',
  property: {
    name: 'Oak Ridge Home',
    type: 'Single-family home',
    address: home.address,
  },
  notificationPreferences: [
    { id: 'alerts', label: 'Device alerts', description: 'Issues detected by your connected devices', enabled: true },
    { id: 'maintenance', label: 'Maintenance reminders', description: 'Upcoming and overdue home care tasks', enabled: true },
    { id: 'insights', label: 'Home insights', description: 'Water usage and home health summaries', enabled: false },
  ],
  homeSettings: [
    { id: 'timezone', label: 'Time zone', value: 'America/New_York' },
    { id: 'temperature', label: 'Temperature units', value: 'Fahrenheit (°F)' },
    { id: 'water', label: 'Water usage units', value: 'Gallons' },
  ],
  accountSettings: [
    { id: 'email', label: 'Contact email', value: 'jordan@example.com' },
    { id: 'language', label: 'Preferred language', value: 'English' },
  ],
};

export type HomeProfile = typeof profile;

export type Device = {
  id: string;
  name: string;
  room: string;
  icon: IconName;
  tone: Tone;
  status: DeviceStatus;
  reading: string;
  battery: number;
  description: string;
  healthScore: number;
  connection: string;
  powerSource: 'battery' | 'mains';
  updatedAt: string;
  latestReadings: SensorReading[];
  activity: SensorActivity[];
  lastMaintenanceDate: string;
  recommendedAction: { title: string; detail: string };
};
export type DeviceSeed = Omit<Device, 'tone' | 'status' | 'reading' | 'description' | 'healthScore' | 'updatedAt'>;

const deviceSeeds: DeviceSeed[] = [
  {
    id: 'sink', name: 'Kitchen leak sensor', room: 'Kitchen · Under sink', icon: 'water', battery: 86,
    connection: 'Online',
    powerSource: "battery",
    latestReadings: [
      { id: "sink-reading-0", deviceId: 'sink', sensorType: 'water_detection', label: "Water detection", value: "Moisture detected", unit: '', timestamp: '2026-10-10T14:05:00Z', status: 'critical' },
      { id: "sink-reading-1", deviceId: 'sink', sensorType: 'moisture', label: "Surface moisture level", value: 18, unit: "%", timestamp: '2026-10-10T14:05:00Z', status: 'critical' },
      { id: 'sink-reading-2', deviceId: 'sink', sensorType: 'water_flow', label: 'Water flow', value: 0, unit: 'gal/min', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "sink-activity-0", deviceId: 'sink', timestamp: "2026-10-10T12:05:00Z", summary: "Surface moisture at 0%; water flow at 0 gal/min", status: 'normal' },
      { id: "sink-activity-1", deviceId: 'sink', timestamp: "2026-10-10T13:05:00Z", summary: "Surface moisture rose to 6% while the faucet was off", status: 'warning' },
      { id: "sink-activity-2", deviceId: 'sink', timestamp: "2026-10-10T14:05:00Z", summary: "Surface moisture reached 18% beneath the sink; water flow remains 0 gal/min", status: 'critical' },
    ],
    lastMaintenanceDate: "2026-09-26",
    recommendedAction: { title: "Inspect the sink connections", detail: "Check the cabinet and supply hoses for pooled water. Arrange a plumbing inspection if the leak continues." }
  },
  {
    id: 'hvac', name: 'HVAC system', room: 'Utility room', icon: 'air', battery: 100,
    connection: 'Online',
    powerSource: "mains",
    latestReadings: [
      { id: "hvac-reading-0", deviceId: 'hvac', sensorType: 'temperature', label: "Indoor temperature", value: 72, unit: "\u00b0F", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: "hvac-reading-1", deviceId: 'hvac', sensorType: 'airflow', label: "Airflow", value: 420, unit: "CFM", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "hvac-activity-0", deviceId: 'hvac', timestamp: "2026-10-10T12:05:00Z", summary: "Temperature steady at 71\u00b0F", status: 'normal' },
      { id: "hvac-activity-1", deviceId: 'hvac', timestamp: "2026-10-10T13:05:00Z", summary: "Cooling cycle completed at 72\u00b0F", status: 'normal' },
      { id: "hvac-activity-2", deviceId: 'hvac', timestamp: "2026-10-10T14:05:00Z", summary: "Airflow steady at 420 CFM", status: 'normal' },
    ],
    lastMaintenanceDate: "2026-07-17",
    recommendedAction: { title: "Replace the HVAC filter", detail: "Your next filter replacement is due in 7 days. Use the correct filter size and follow the system instructions." }
  },
  {
    id: 'fridge', name: 'Refrigerator', room: 'Kitchen', icon: 'temperature', battery: 100,
    connection: 'Online',
    powerSource: "mains",
    latestReadings: [
      { id: "fridge-reading-0", deviceId: 'fridge', sensorType: 'temperature', label: "Internal temperature", value: 46, unit: "\u00b0F", timestamp: '2026-10-10T14:05:00Z', status: 'warning' },
      { id: "fridge-reading-1", deviceId: 'fridge', sensorType: 'door_position', label: "Door position", value: "Closed", unit: '', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: 'fridge-reading-2', deviceId: 'fridge', sensorType: 'power_usage', label: 'Power draw', value: 180, unit: 'W', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: 'fridge-reading-3', deviceId: 'fridge', sensorType: 'compressor_runtime', label: 'Compressor runtime (past hour)', value: 52, unit: 'min', timestamp: '2026-10-10T14:05:00Z', status: 'warning' },
    ],
    activity: [
      { id: "fridge-activity-0", deviceId: 'fridge', timestamp: "2026-10-10T12:05:00Z", summary: "Temperature at 38°F; compressor ran for 24 minutes in the past hour", status: 'normal' },
      { id: "fridge-activity-1", deviceId: 'fridge', timestamp: "2026-10-10T13:05:00Z", summary: "Temperature rose to 42°F; compressor runtime increased to 40 minutes in the past hour", status: 'warning' },
      { id: "fridge-activity-2", deviceId: 'fridge', timestamp: "2026-10-10T14:05:00Z", summary: "Temperature at 46°F; power draw at 180 W; compressor ran for 52 minutes in the past hour", status: 'warning' },
    ],
    lastMaintenanceDate: "2026-08-12",
    recommendedAction: { title: "Check the door seal", detail: "Confirm the door closes fully and review the temperature setting. Monitor the next readings against the 34\u201340\u00b0F target range." }
  },
  {
    id: 'dryer', name: 'Dryer vent', room: 'Laundry room', icon: 'air', battery: 100,
    connection: 'Online',
    powerSource: "mains",
    latestReadings: [
      { id: "dryer-reading-0", deviceId: 'dryer', sensorType: 'airflow', label: "Airflow", value: 68, unit: "% of baseline", timestamp: '2026-10-10T14:05:00Z', status: 'warning' },
      { id: "dryer-reading-1", deviceId: 'dryer', sensorType: 'pressure', label: "Vent pressure", value: 1.2, unit: "inH\u2082O", timestamp: '2026-10-10T14:05:00Z', status: 'warning' },
      { id: 'dryer-reading-2', deviceId: 'dryer', sensorType: 'vibration', label: 'Drum vibration (RMS)', value: 2.8, unit: 'mm/s', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: 'dryer-reading-3', deviceId: 'dryer', sensorType: 'temperature', label: 'Exhaust temperature', value: 145, unit: '°F', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: 'dryer-reading-4', deviceId: 'dryer', sensorType: 'runtime', label: 'Current cycle runtime', value: 72, unit: 'min', timestamp: '2026-10-10T14:05:00Z', status: 'warning' },
      { id: 'dryer-reading-5', deviceId: 'dryer', sensorType: 'power_usage', label: 'Power draw', value: 4800, unit: 'W', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "dryer-activity-0", deviceId: 'dryer', timestamp: "2026-10-10T12:53:00Z", summary: "Drying cycle started; drum vibration at 2.1 mm/s RMS", status: 'warning' },
      { id: "dryer-activity-1", deviceId: 'dryer', timestamp: "2026-10-10T13:53:00Z", summary: "Cycle running for 60 minutes; airflow declined to 71% of baseline", status: 'warning' },
      { id: "dryer-activity-2", deviceId: 'dryer', timestamp: "2026-10-10T14:05:00Z", summary: "Cycle reached 72 minutes; exhaust at 145°F, vibration at 2.8 mm/s RMS, power draw at 4800 W, airflow at 68%", status: 'warning' },
    ],
    lastMaintenanceDate: "2025-12-10",
    recommendedAction: { title: "Schedule a dryer vent cleaning", detail: "The vent was last cleaned 10 months ago. Inspect the vent path and clear lint from the filter after each load." }
  },
  {
    id: 'dishwasher', name: 'Dishwasher', room: 'Kitchen', icon: 'water', battery: 100,
    connection: 'Online',
    powerSource: "mains",
    latestReadings: [
      { id: "dishwasher-reading-0", deviceId: 'dishwasher', sensorType: 'water_flow', label: "Water flow", value: 1.8, unit: "gal/min", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: "dishwasher-reading-1", deviceId: 'dishwasher', sensorType: 'cycle_state', label: "Cycle state", value: "Standby", unit: '', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: 'dishwasher-reading-2', deviceId: 'dishwasher', sensorType: 'water_usage', label: 'Water usage (last cycle)', value: 3.5, unit: 'gal', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: 'dishwasher-reading-3', deviceId: 'dishwasher', sensorType: 'power_usage', label: 'Standby power draw', value: 4, unit: 'W', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: 'dishwasher-reading-4', deviceId: 'dishwasher', sensorType: 'runtime', label: 'Last cycle runtime', value: 120, unit: 'min', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "dishwasher-activity-0", deviceId: 'dishwasher', timestamp: "2026-10-10T12:05:00Z", summary: "Wash cycle started normally", status: 'normal' },
      { id: "dishwasher-activity-1", deviceId: 'dishwasher', timestamp: "2026-10-10T13:05:00Z", summary: "Water flow steady at 1.8 gal/min", status: 'normal' },
      { id: "dishwasher-activity-2", deviceId: 'dishwasher', timestamp: "2026-10-10T14:05:00Z", summary: "120-minute wash cycle completed using 3.5 gal; standby power draw returned to 4 W", status: 'normal' },
    ],
    lastMaintenanceDate: "2026-08-20",
    recommendedAction: { title: "Inspect the supply hose", detail: "Inspect the hose for wear or loose connections in 14 days. Watch for any moisture beneath the appliance." }
  },
  {
    id: 'smoke', name: 'Smoke detector', room: 'Upstairs hallway', icon: 'shield', battery: 94,
    connection: 'Online',
    powerSource: "battery",
    latestReadings: [
      { id: "smoke-reading-0", deviceId: 'smoke', sensorType: 'smoke_concentration', label: "Smoke concentration", value: 0, unit: "ppm", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: "smoke-reading-1", deviceId: 'smoke', sensorType: 'battery_level', label: "Battery level", value: 94, unit: "%", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "smoke-activity-0", deviceId: 'smoke', timestamp: "2026-10-10T12:05:00Z", summary: "Smoke concentration at 0 ppm", status: 'normal' },
      { id: "smoke-activity-1", deviceId: 'smoke', timestamp: "2026-10-10T13:05:00Z", summary: "Routine sensor check passed", status: 'normal' },
      { id: "smoke-activity-2", deviceId: 'smoke', timestamp: "2026-10-10T14:05:00Z", summary: "No smoke detected", status: 'normal' },
    ],
    lastMaintenanceDate: "2026-10-01",
    recommendedAction: { title: "Keep the monthly test on your calendar", detail: "Follow the detector instructions for a monthly test and check the battery during routine home maintenance." }
  },
  {
    id: 'heater', name: 'Water heater', room: 'Utility room', icon: 'temperature', battery: 100,
    connection: 'Online',
    powerSource: "mains",
    latestReadings: [
      { id: "heater-reading-0", deviceId: 'heater', sensorType: 'temperature', label: "Water temperature", value: 120, unit: "\u00b0F", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: "heater-reading-1", deviceId: 'heater', sensorType: 'tank_condition', label: "Tank condition", value: "Normal", unit: '', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: 'heater-reading-2', deviceId: 'heater', sensorType: 'pressure', label: 'Water pressure', value: 55, unit: 'psi', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: 'heater-reading-3', deviceId: 'heater', sensorType: 'water_usage', label: 'Hot water usage (today)', value: 42, unit: 'gal', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "heater-activity-0", deviceId: 'heater', timestamp: "2026-10-10T12:05:00Z", summary: "Water temperature steady at 119\u00b0F", status: 'normal' },
      { id: "heater-activity-1", deviceId: 'heater', timestamp: "2026-10-10T13:05:00Z", summary: "Heating cycle completed", status: 'normal' },
      { id: "heater-activity-2", deviceId: 'heater', timestamp: "2026-10-10T14:05:00Z", summary: "Water temperature at 120°F; pressure at 55 psi; hot water usage today at 42 gal", status: 'normal' },
    ],
    lastMaintenanceDate: "2026-06-15",
    recommendedAction: { title: "Plan the next tank inspection", detail: "Review the service schedule and inspect visible connections for signs of moisture or corrosion." }
  },
  {
    id: 'energy', name: 'Energy monitor', room: 'Electrical panel', icon: 'energy', battery: 100,
    connection: 'Online',
    powerSource: "mains",
    latestReadings: [
      { id: "energy-reading-0", deviceId: 'energy', sensorType: 'power_usage', label: "Current usage", value: 1.8, unit: "kW", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: "energy-reading-1", deviceId: 'energy', sensorType: 'voltage', label: "Supply voltage", value: 120, unit: "V", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "energy-activity-0", deviceId: 'energy', timestamp: "2026-10-10T12:05:00Z", summary: "Home demand at 1.6 kW", status: 'normal' },
      { id: "energy-activity-1", deviceId: 'energy', timestamp: "2026-10-10T13:05:00Z", summary: "Home demand peaked at 2.2 kW", status: 'normal' },
      { id: "energy-activity-2", deviceId: 'energy', timestamp: "2026-10-10T14:05:00Z", summary: "Home demand returned to 1.8 kW", status: 'normal' },
    ],
    lastMaintenanceDate: "2026-08-30",
    recommendedAction: { title: "Continue monitoring daily usage", detail: "Compare daily readings with your normal household routine and look for unexpected changes." }
  },
  {
    id: 'garage', name: 'Garage door', room: 'Garage', icon: 'home', battery: 78,
    connection: 'Online',
    powerSource: "battery",
    latestReadings: [
      { id: "garage-reading-0", deviceId: 'garage', sensorType: 'door_position', label: "Door position", value: "Closed", unit: '', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: "garage-reading-1", deviceId: 'garage', sensorType: 'battery_level', label: "Battery level", value: 78, unit: "%", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "garage-activity-0", deviceId: 'garage', timestamp: "2026-10-10T12:05:00Z", summary: "Garage door opened", status: 'normal' },
      { id: "garage-activity-1", deviceId: 'garage', timestamp: "2026-10-10T13:05:00Z", summary: "Garage door closed", status: 'normal' },
      { id: "garage-activity-2", deviceId: 'garage', timestamp: "2026-10-10T14:05:00Z", summary: "Door remains closed", status: 'normal' },
    ],
    lastMaintenanceDate: "2026-09-18",
    recommendedAction: { title: "Check the door safety sensors", detail: "Include the door safety sensors and alignment in your next scheduled garage inspection." }
  },
  {
    id: 'air', name: 'Air quality monitor', room: 'Living room', icon: 'air', battery: 91,
    connection: 'Online',
    powerSource: "battery",
    latestReadings: [
      { id: "air-reading-0", deviceId: 'air', sensorType: 'air_quality_index', label: "Air quality index", value: 22, unit: "AQI", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: "air-reading-1", deviceId: 'air', sensorType: 'humidity', label: "Humidity", value: 44, unit: "%", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "air-activity-0", deviceId: 'air', timestamp: "2026-10-10T12:05:00Z", summary: "Air quality index at 24", status: 'normal' },
      { id: "air-activity-1", deviceId: 'air', timestamp: "2026-10-10T13:05:00Z", summary: "Air quality index improved to 23", status: 'normal' },
      { id: "air-activity-2", deviceId: 'air', timestamp: "2026-10-10T14:05:00Z", summary: "Air quality index at 22", status: 'normal' },
    ],
    lastMaintenanceDate: "2026-09-22",
    recommendedAction: { title: "Keep the sensor vents clear", detail: "Check that the monitor is unobstructed and include a gentle surface cleaning in your home care routine." }
  },
  {
    id: 'bath', name: 'Bathroom leak sensor', room: 'Main bathroom', icon: 'water', battery: 89,
    connection: 'Online',
    powerSource: "battery",
    latestReadings: [
      { id: "bath-reading-0", deviceId: 'bath', sensorType: 'water_detection', label: "Water detection", value: "Dry", unit: '', timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
      { id: "bath-reading-1", deviceId: 'bath', sensorType: 'battery_level', label: "Battery level", value: 89, unit: "%", timestamp: '2026-10-10T14:05:00Z', status: 'normal' },
    ],
    activity: [
      { id: "bath-activity-0", deviceId: 'bath', timestamp: "2026-10-10T12:05:00Z", summary: "Bathroom floor dry", status: 'normal' },
      { id: "bath-activity-1", deviceId: 'bath', timestamp: "2026-10-10T13:05:00Z", summary: "Routine sensor check passed", status: 'normal' },
      { id: "bath-activity-2", deviceId: 'bath', timestamp: "2026-10-10T14:05:00Z", summary: "No moisture detected", status: 'normal' },
    ],
    lastMaintenanceDate: "2026-09-28",
    recommendedAction: { title: "Test the bathroom leak sensor", detail: "Follow the manufacturer test procedure during your next monthly sensor check." }
  },
];
// The only seed sensor dataset; live state starts from these readings.
export const devices = deriveDevices(deviceSeeds, deviceSeeds.flatMap(device => device.latestReadings));

export const alertSeverityTones = {
  Normal: sensorStatusTones.normal,
  Warning: sensorStatusTones.warning,
  Critical: sensorStatusTones.critical,
} satisfies Record<string, Tone>;

export type HomeAlert = {
  id: string;
  deviceId: string;
  title: string;
  detail: string;
  time: string;
  icon: IconName;
  severity: keyof typeof alertSeverityTones;
  actionTarget: 'device' | 'maintenance';
  createdAt: string;
};

export type MaintenanceTask = {
  id: string;
  title: string;
  detail: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  icon: IconName;
  deviceId: string;
};

export const tasks: MaintenanceTask[] = [
  {
    id: 'filter', title: 'Replace HVAC filter', detail: 'Improve air quality and system efficiency.', dueDate: '2026-10-17', priority: 'Medium', icon: 'air' as const, deviceId: 'hvac'
  },
  {
    id: 'hose', title: 'Inspect dishwasher hose', detail: 'Check for wear or potential leaks.', dueDate: '2026-10-24', priority: 'Medium', icon: 'water' as const, deviceId: 'dishwasher'
  },
  {
    id: 'sensor', title: 'Test leak sensor', detail: 'Ensure sensors are working properly.', dueDate: '2026-11-09', priority: 'Low', icon: 'shield' as const, deviceId: 'sink'
  },
];
export const waterUsage = {
  today: 186,
  unit: 'gal',
  dailyGoal: 220,
  changePercent: -8,
  comparison: 'vs. yesterday',
  status: 'Within usual range',
  tone: 'green' as const,
  week: [
    { day: 'Mon', gallons: 205 },
    { day: 'Tue', gallons: 192 },
    { day: 'Wed', gallons: 218 },
    { day: 'Thu', gallons: 198 },
    { day: 'Fri', gallons: 211 },
    { day: 'Sat', gallons: 202 },
    { day: 'Today', gallons: 186 },
  ],
};

export const partners = [
  { id: 'plumbing', title: 'Plumbing', detail: 'Leak repairs, pipes, and water systems', icon: 'water' },
  { id: 'electrical', title: 'Electrical', detail: 'Wiring, panels, and home power', icon: 'energy' },
  { id: 'appliance', title: 'Appliance Repair', detail: 'Care for your everyday appliances', icon: 'maintenance' },
] satisfies { id: string; title: string; detail: string; icon: IconName }[];

export type DeviceAlertEvent = Pick<HomeAlert, 'id' | 'deviceId' | 'title' | 'detail' | 'createdAt'> & {
  tone: Tone;
  state: 'Active' | 'Resolved';
};

export const deviceAlertHistory: DeviceAlertEvent[] = [
  {
    id: 'sink-test', deviceId: 'sink', title: 'Sensor test completed',
    detail: 'The sensor returned to a dry reading after a scheduled test.',
    tone: 'green', createdAt: '2026-09-26T15:00:00Z', state: 'Resolved',
  },
  {
    id: 'fridge-door', deviceId: 'fridge', title: 'Door left open',
    detail: 'The door was closed and temperature returned to the usual range.',
    tone: 'green', createdAt: '2026-08-12T18:20:00Z', state: 'Resolved',
  },
  {
    id: 'hvac-filter', deviceId: 'hvac', title: 'Filter replacement completed',
    detail: 'The previous filter reminder was cleared after routine maintenance.',
    tone: 'green', createdAt: '2026-07-17T16:00:00Z', state: 'Resolved',
  },
];
