import type { Alert, Device, HomeSummary, MaintenanceTask, SensorReading, SensorStatus } from '../types.ts';

const severityPenalties: Record<SensorStatus, number> = { normal: 0, warning: 8, critical: 20 };

export function deriveDeviceStatus(readings: SensorReading[]): SensorStatus {
  return readings.some(reading => reading.status === 'critical') ? 'critical' :
    readings.some(reading => reading.status === 'warning') ? 'warning' : 'normal';
}

export function deriveDevices(
  metadata: Omit<Device, 'status' | 'latestReadings'>[],
  sensorReadings: SensorReading[],
): Device[] {
  return metadata.map(device => {
    const latestReadings = sensorReadings.filter(reading => reading.deviceId === device.id);
    const batteryLevel = latestReadings.find(reading => reading.sensorType === 'battery_level')?.value;
    return {
      ...device,
      battery: typeof batteryLevel === 'number' ? batteryLevel : device.battery,
      latestReadings,
      status: deriveDeviceStatus(latestReadings),
    };
  });
}

export function generateActiveAlerts(devices: Device[]): Alert[] {
  return devices.flatMap(device => {
    const abnormal = device.latestReadings.filter(reading => reading.status !== 'normal');
    const severity = deriveDeviceStatus(abnormal);
    if (severity === 'normal') return [];

    return [{
      id: `sensor-alert-${device.id}`,
      deviceId: device.id,
      title: `${device.name}: abnormal sensor readings`,
      detail: abnormal.map(reading =>
        `${reading.label}: ${reading.value}${reading.unit ? ` ${reading.unit}` : ''} (${reading.status})`,
      ).join('; ') + '.',
      severity,
      status: 'active',
      createdAt: abnormal.reduce((earliest, reading) =>
        Date.parse(reading.timestamp) < Date.parse(earliest) ? reading.timestamp : earliest,
      abnormal[0].timestamp),
    }];
  });
}

export function isOverdueMaintenanceTask(task: MaintenanceTask, asOf: Date): boolean {
  // Local calendar days match the existing frontend maintenance behavior.
  const today = new Date(asOf);
  today.setHours(0, 0, 0, 0);
  return !task.completed && new Date(`${task.dueDate}T00:00:00`) < today;
}

function countOverdueTasks(tasks: MaintenanceTask[], asOf: Date): number {
  return tasks.filter(task => isOverdueMaintenanceTask(task, asOf)).length;
}

export function calculateHomeHealthScore({ sensorReadings, alerts, maintenanceTasks, asOf = new Date() }: {
  sensorReadings: SensorReading[];
  alerts: Alert[];
  maintenanceTasks: MaintenanceTask[];
  asOf?: Date;
}): number {
  // A device's readings and alert represent the same issue: keep only its worst penalty.
  const devicePenalties = new Map<string, number>();
  for (const reading of sensorReadings) {
    devicePenalties.set(reading.deviceId, Math.max(
      devicePenalties.get(reading.deviceId) ?? 0, severityPenalties[reading.status],
    ));
  }
  for (const alert of alerts) {
    if (alert.status !== 'active') continue;
    devicePenalties.set(alert.deviceId, Math.max(
      devicePenalties.get(alert.deviceId) ?? 0, severityPenalties[alert.severity],
    ));
  }
  const conditionPenalty = [...devicePenalties.values()].reduce((sum, penalty) => sum + penalty, 0);
  return Math.max(0, Math.min(100,
    100 - conditionPenalty - countOverdueTasks(maintenanceTasks, asOf) * 3,
  ));
}

export function deriveHomeSummary({ devices, sensorReadings, alerts, maintenanceTasks, asOf = new Date() }: {
  devices: Device[];
  sensorReadings: SensorReading[];
  alerts: Alert[];
  maintenanceTasks: MaintenanceTask[];
  asOf?: Date;
}): HomeSummary {
  const overdueMaintenanceTasks = countOverdueTasks(maintenanceTasks, asOf);
  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const normalDeviceCount = devices.filter(device => device.status === 'normal').length;
  return {
    normalDeviceCount,
    warningDeviceCount: devices.filter(device => device.status === 'warning').length,
    criticalDeviceCount: devices.filter(device => device.status === 'critical').length,
    activeAlertCount: activeAlerts.length,
    warningAlertCount: activeAlerts.filter(alert => alert.severity === 'warning').length,
    criticalAlertCount: activeAlerts.filter(alert => alert.severity === 'critical').length,
    connectedDevices: devices.filter(device => device.connection === 'online').length,
    healthyDevices: normalDeviceCount,
    attentionDevices: devices.filter(device => device.status !== 'normal').length,
    activeAlerts: activeAlerts.length,
    upcomingMaintenanceTasks: maintenanceTasks.filter(task => !task.completed).length - overdueMaintenanceTasks,
    overdueMaintenanceTasks,
    homeHealthScore: calculateHomeHealthScore({ sensorReadings, alerts, maintenanceTasks, asOf }),
    asOf: asOf.toISOString(),
  };
}
