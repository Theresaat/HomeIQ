export type ServerConfig = {
  port: number;
};

export const sensorStatuses = ['normal', 'warning', 'critical'] as const;
export type SensorStatus = typeof sensorStatuses[number];

export const sensorTypes = [
  'water_flow', 'moisture', 'temperature', 'power_usage', 'compressor_runtime',
  'water_usage', 'runtime', 'vibration', 'pressure', 'water_detection', 'airflow',
  'door_position', 'cycle_state', 'smoke_concentration', 'battery_level',
  'tank_condition', 'voltage', 'air_quality_index', 'humidity',
] as const;
export type SensorType = typeof sensorTypes[number];

export type SensorReading = {
  id: string;
  deviceId: string;
  sensorType: SensorType;
  label: string;
  value: string | number;
  unit: string;
  timestamp: string;
  status: SensorStatus;
};

export type Device = {
  id: string;
  name: string;
  room: string;
  connection: 'online' | 'offline';
  powerSource: 'battery' | 'mains';
  battery: number;
  lastMaintenanceDate: string;
  status: SensorStatus;
  latestReadings: SensorReading[];
};

export type Alert = {
  id: string;
  deviceId: string;
  title: string;
  detail: string;
  severity: Exclude<SensorStatus, 'normal'>;
  status: 'active' | 'resolved';
  createdAt: string;
};

export type MaintenanceTask = {
  id: string;
  deviceId: string;
  title: string;
  detail: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
};

export type HomeSummary = {
  normalDeviceCount: number;
  warningDeviceCount: number;
  criticalDeviceCount: number;
  activeAlertCount: number;
  warningAlertCount: number;
  criticalAlertCount: number;
  connectedDevices: number;
  healthyDevices: number;
  attentionDevices: number;
  activeAlerts: number;
  upcomingMaintenanceTasks: number;
  overdueMaintenanceTasks: number;
  homeHealthScore: number;
  asOf: string;
};
