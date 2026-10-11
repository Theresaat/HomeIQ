import { mockDevices, mockSensorReadings, mockMaintenanceTasks } from '../data/mock-home.ts';
import type { Device, DeviceReasoningContext, HomeReasoningContext, MaintenanceTask,
  SensorReading, SensorHistoryReading, HomeIQReasoningContext } from '../types.ts';
import { deriveDevices, deriveHomeSummary, generateActiveAlerts, isOverdueMaintenanceTask } from './home-state.ts';
import { getSensorHistory } from './sensor-history.ts';
import { deriveWhatChanged } from './what-changed.ts';

export type ContextBuilderOptions = {
  question?: string;
  asOf?: Date;
  data?: {
    devices: Omit<Device, 'status' | 'latestReadings'>[];
    readings: SensorReading[];
    maintenanceTasks: MaintenanceTask[];
  };
  loadHistory?: (deviceId: string) => Promise<SensorHistoryReading[]>;
};

const severity = { normal: 0, warning: 1, critical: 2 };

function snapshot(options: ContextBuilderOptions) {
  // Capture shared current state before awaiting history so a build stays internally consistent.
  const data = structuredClone(options.data ?? {
    devices: mockDevices, readings: mockSensorReadings, maintenanceTasks: mockMaintenanceTasks,
  });
  const devices = deriveDevices(data.devices, data.readings)
    .sort((a, b) => severity[b.status] - severity[a.status]);
  const alerts = generateActiveAlerts(devices);
  const asOf = options.asOf ?? new Date();
  const homeSummary = deriveHomeSummary({ devices, sensorReadings: data.readings,
    alerts, maintenanceTasks: data.maintenanceTasks, asOf });
  return { devices, alerts, readings: data.readings, maintenanceTasks: data.maintenanceTasks, homeSummary, asOf };
}

function details(device: Device): Omit<Device, 'latestReadings'> {
  const { latestReadings: _readings, ...metadata } = device;
  return metadata;
}

async function historyContext(deviceId: string, options: ContextBuilderOptions) {
  try {
    const history = (await (options.loadHistory ?? getSensorHistory)(deviceId))
      .filter(reading => reading.deviceId === deviceId).slice(0, 20);
    return { history, insight: deriveWhatChanged(deviceId, history),
      availability: { deviceId, status: history.length ? 'available' as const : 'empty' as const } };
  } catch {
    return { history: [], insight: null, availability: { deviceId, status: 'unavailable' as const } };
  }
}

export async function buildDeviceContext(
  deviceId: string, options: ContextBuilderOptions = {},
): Promise<DeviceReasoningContext | null> {
  const state = snapshot(options);
  const device = state.devices.find(item => item.id === deviceId);
  if (!device) return null;
  const recent = await historyContext(deviceId, options);
  return {
    scope: 'device', deviceId, question: options.question, devices: [details(device)],
    readings: device.latestReadings, currentReadingCount: device.latestReadings.length,
    alerts: state.alerts.filter(alert => alert.deviceId === deviceId),
    maintenanceTasks: state.maintenanceTasks.filter(task => task.deviceId === deviceId),
    history: recent.history, whatChanged: recent.insight ? [recent.insight] : [],
    historyAvailability: [recent.availability], homeSummary: state.homeSummary,
  };
}

export async function buildHomeContext(options: ContextBuilderOptions = {}): Promise<HomeReasoningContext> {
  const state = snapshot(options);
  const attention = state.devices.filter(device => device.status !== 'normal');
  // Bound Snowflake lookups and model context; keep all current statuses and alerts visible.
  const selected = attention.slice(0, 3);
  const recent = await Promise.all(selected.map(device => historyContext(device.id, options)));
  const availability: NonNullable<HomeIQReasoningContext['historyAvailability']> = [
    ...recent.map(item => item.availability),
    ...attention.slice(3).map(device => ({ deviceId: device.id, status: 'not_requested' as const })),
  ];
  return {
    scope: 'home', question: options.question, devices: state.devices.map(details),
    readings: attention.flatMap(device => device.latestReadings), currentReadingCount: state.readings.length,
    alerts: state.alerts,
    maintenanceTasks: state.maintenanceTasks.filter(task => !task.completed
      && (task.priority === 'high' || isOverdueMaintenanceTask(task, state.asOf)))
      .sort((a, b) => Number(isOverdueMaintenanceTask(b, state.asOf)) - Number(isOverdueMaintenanceTask(a, state.asOf))
        || Number(b.priority === 'high') - Number(a.priority === 'high')),
    whatChanged: recent.flatMap(item => item.insight ? [item.insight] : []),
    historyAvailability: availability, homeSummary: state.homeSummary,
  };
}
