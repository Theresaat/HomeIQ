import type { SensorReading, SensorStatus } from '../data/sensors';

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
