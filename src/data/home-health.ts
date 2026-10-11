import type { HomeAlert, MaintenanceTask } from './mock-home';
import { conditionPenalties, sensorStatusLabels, type SensorReading } from './sensors';

export function calculateHomeHealthScore({ alerts, sensorReadings, tasks, completedTaskIds, asOf }: {
  alerts: HomeAlert[];
  sensorReadings: SensorReading[];
  tasks: MaintenanceTask[];
  completedTaskIds: string[];
  asOf: Date;
}): number {
  // One penalty per device: use the worst alert or reading, never their sum.
  const devicePenalties = new Map<string, number>();
  for (const alert of alerts) {
    const penalty = conditionPenalties[alert.severity];
    devicePenalties.set(alert.deviceId, Math.max(devicePenalties.get(alert.deviceId) ?? 0, penalty));
  }
  for (const reading of sensorReadings) {
    const penalty = conditionPenalties[sensorStatusLabels[reading.status]];
    devicePenalties.set(reading.deviceId, Math.max(devicePenalties.get(reading.deviceId) ?? 0, penalty));
  }
  // Due dates use local calendar days, matching the Maintenance screen.
  const today = new Date(asOf);
  today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter(task => !completedTaskIds.includes(task.id) &&
    new Date(`${task.dueDate}T00:00:00`) < today).length;
  const conditionPenalty = [...devicePenalties.values()].reduce((sum, penalty) => sum + penalty, 0);
  return Math.max(0, Math.min(100, 100 - conditionPenalty - overdue * 3));
}
