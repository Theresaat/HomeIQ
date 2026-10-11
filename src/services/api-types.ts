import type { SensorReading, SensorStatus, SensorType } from '../data/sensors';

export type ApiAskRequest = { question: string; deviceId?: string };

export type ApiPreventiveInsight = {
  answer: string;
  severity: SensorStatus;
  riskLevel: 'low' | 'moderate' | 'high';
  trend: 'improving' | 'stable' | 'worsening' | 'unknown';
  recommendedTimeframe: 'Act now' | 'Check within 24 hours' | 'Monitor this week' | 'Routine maintenance';
  recommendedActions: string[];
  basedOn: string[];
};

export type ApiSensorTrend = {
  deviceId: string;
  sensorType: SensorType;
  label: string;
  unit: string;
  status: SensorStatus;
  current: number;
  previous: number;
  recentAverage: number;
  change: number;
  percentageChange: number | null;
  direction: 'increasing' | 'decreasing' | 'stable';
  sampleSize: number;
  currentTimestamp: string;
  previousTimestamp: string;
  recentReadings: {
    value: number;
    status: SensorStatus;
    timestamp: string;
    ingestedAt: string | null;
  }[];
};

export type ApiWhatChangedInsight = ApiSensorTrend | {
  deviceId: string;
  status: 'insufficient_history';
  message: string;
  numericReadingCount: number;
  historySampleSize: number;
};

export type ApiHealth = {
  status: 'ok';
  service: string;
};

export type ApiDevice = {
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

export type ApiAlert = {
  id: string;
  deviceId: string;
  title: string;
  detail: string;
  severity: Exclude<SensorStatus, 'normal'>;
  status: 'active' | 'resolved';
  createdAt: string;
};

export type ApiMaintenanceTask = {
  id: string;
  deviceId: string;
  title: string;
  detail: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
};

export type ApiHomeSummary = {
  homeHealthScore: number;
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
  asOf: string;
};
