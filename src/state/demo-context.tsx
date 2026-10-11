import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { alertSeverityTones, deviceAlertHistory as resolvedAlertHistory, devices as initialDevices, profile as initialProfile, tasks,
  type Device, type DeviceAlertEvent, type HomeAlert, type HomeProfile, type MaintenanceTask } from '@/data/mock-home';
import { deriveDevices, getSensorInsight } from '@/data/sensor-devices';
import { conditionPenalties, sensorStatusLabels, sensorStatusTones, type SensorReading } from '@/data/sensors';
import { generateSensorAlerts } from '@/data/sensor-alerts';
import { calculateHomeHealthScore } from '@/data/home-health';
import { DEVELOPMENT_SENSOR_SCENARIO, SENSOR_SIMULATION_ENABLED, SENSOR_UPDATE_INTERVAL_MS,
  applySensorScenario, simulateSensorReadings } from '@/data/sensor-simulator';
import { getDevices, getReadings, getAlerts, getMaintenance, getHomeSummary } from '@/services/api';
import type { ApiDevice, ApiAlert, ApiMaintenanceTask, ApiHomeSummary } from '@/services/api-types';
import type { AssistantScope } from '@/services/assistant-scope';

type BackendData = {
  devices: ApiDevice[];
  readings: SensorReading[];
  alerts: ApiAlert[];
  maintenance: ApiMaintenanceTask[];
  homeSummary: ApiHomeSummary;
};

type DemoState = {
  assistantScope: AssistantScope;
  setAssistantScope: (scope: AssistantScope) => void;
  backendData: BackendData | null;
  loading: boolean;
  error: string | null;
  completed: string[];
  tasks: MaintenanceTask[];
  toggleTask: (id: string) => void;
  profile: HomeProfile;
  saveProfile: (details: Pick<HomeProfile, 'name' | 'role'>) => void;
  saveHomeDetails: (details: HomeProfile['property']) => void;
  sensorReadings: SensorReading[];
  setSensorReadings: (readings: SensorReading[]) => void;
  devices: Device[];
  alerts: HomeAlert[];
  homeHealthScore: number;
  insight: string;
  updatedAt: string;
  deviceAlertHistory: DeviceAlertEvent[];
  deviceSummary: { connected: number; healthy: number; attention: number };
};

const Context = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [assistantScope, setAssistantScope] = useState<AssistantScope>(null);
  const [backendData, setBackendData] = useState<BackendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionOverrides, setCompletionOverrides] = useState<string[]>([]);
  const [profile, setProfile] = useState(initialProfile);
  const [localReadings, setSensorReadings] = useState<SensorReading[]>(
    () => {
      const readings = initialDevices.flatMap(device => device.latestReadings);
      return __DEV__ && DEVELOPMENT_SENSOR_SCENARIO
        ? applySensorScenario(readings, DEVELOPMENT_SENSOR_SCENARIO, new Date().toISOString()) : readings;
    }
  );
  useEffect(() => {
    let active = true;
    Promise.all([getDevices(), getReadings(), getAlerts(), getMaintenance(), getHomeSummary()])
      .then(([devices, readings, alerts, maintenance, homeSummary]) => {
        if (active) setBackendData({ devices, readings, alerts, maintenance, homeSummary });
      })
      .catch((error: unknown) => {
        if (active) setError(error instanceof Error ? error.message : 'Could not load HomeIQ backend data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!__DEV__ || !SENSOR_SIMULATION_ENABLED) return;
    let tick = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    function stop() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    }
    function start() {
      if (timer !== undefined) return;
      timer = setInterval(() => {
        const nextTick = ++tick;
        const timestamp = new Date().toISOString();
        setSensorReadings(current => simulateSensorReadings(current, nextTick, timestamp, DEVELOPMENT_SENSOR_SCENARIO));
      }, SENSOR_UPDATE_INTERVAL_MS);
    }
    if (AppState.currentState === 'active' || AppState.currentState === null) start();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') start();
      else stop();
    });
    return () => { stop(); subscription.remove(); };
  }, []);
  const sensorReadings = backendData?.readings ?? localReadings;
  const devices = backendData
    ? deriveDevices(backendData.devices.map(device => {
      const demo = initialDevices.find(item => item.id === device.id);
      return {
        ...device,
        connection: device.connection === 'online' ? 'Online' : 'Offline',
        icon: demo?.icon ?? 'devices',
        activity: demo?.activity ?? [],
        recommendedAction: demo?.recommendedAction ?? {
          title: device.status === 'normal' ? 'Continue scheduled maintenance' : 'Review current sensor readings',
          detail: 'Review the latest readings and maintenance plan for this device.',
        },
      };
    }), sensorReadings).map((device, index) => {
      const status = backendData.devices[index].status;
      return { ...device, status: sensorStatusLabels[status], tone: sensorStatusTones[status],
        healthScore: 100 - conditionPenalties[sensorStatusLabels[status]] };
    })
    : deriveDevices(initialDevices, sensorReadings);
  const maintenance: MaintenanceTask[] = backendData
    ? backendData.maintenance.map(task => ({
      ...task,
      priority: task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low',
      icon: tasks.find(item => item.id === task.id)?.icon
        ?? devices.find(device => device.id === task.deviceId)?.icon ?? 'maintenance',
    })) : tasks;
  const completed = backendData
    ? backendData.maintenance.filter(task => task.completed !== completionOverrides.includes(task.id)).map(task => task.id)
    : completionOverrides;
  const insight = getSensorInsight(devices);
  const updatedAt = backendData?.homeSummary.asOf ?? sensorReadings.reduce((latest, reading) =>
    Date.parse(reading.timestamp) > Date.parse(latest) ? reading.timestamp : latest, sensorReadings[0]?.timestamp ?? '');
  const deviceSummary = backendData ? {
    connected: backendData.homeSummary.connectedDevices,
    healthy: backendData.homeSummary.normalDeviceCount,
    attention: backendData.homeSummary.warningDeviceCount + backendData.homeSummary.criticalDeviceCount,
  } : {
    connected: devices.length,
    healthy: devices.filter(device => device.status === 'Normal').length,
    attention: devices.filter(device => device.status !== 'Normal').length,
  };
  const alerts: HomeAlert[] = backendData
    ? backendData.alerts.filter(alert => alert.status === 'active').map(alert => ({
      ...alert, severity: sensorStatusLabels[alert.severity],
      icon: devices.find(device => device.id === alert.deviceId)?.icon ?? 'alerts',
      time: 'Current sensor snapshot', actionTarget: 'device',
    })) : generateSensorAlerts(devices);
  const homeHealthScore = backendData?.homeSummary.homeHealthScore ?? calculateHomeHealthScore({
    alerts, sensorReadings, tasks, completedTaskIds: completed, asOf: new Date(),
  });
  const deviceAlertHistory: DeviceAlertEvent[] = [
    ...resolvedAlertHistory.filter(alert => devices.some(device => device.id === alert.deviceId)),
    ...alerts.map(alert => ({
      id: alert.id, deviceId: alert.deviceId, title: alert.title, detail: alert.detail,
      createdAt: alert.createdAt, tone: alertSeverityTones[alert.severity], state: 'Active' as const,
    })),
  ];

  function saveProfile(details: Pick<HomeProfile, 'name' | 'role'>) {
    setProfile(current => ({ ...current, ...details }));
  }

  function saveHomeDetails(details: HomeProfile['property']) {
    setProfile(current => ({ ...current, property: { ...details } }));
  }

  function toggleTask(id: string) {
    setCompletionOverrides(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    );
  }

  return <Context.Provider value={{ assistantScope, setAssistantScope, backendData, loading, error, completed, tasks: maintenance, toggleTask, profile, saveProfile, saveHomeDetails,
    sensorReadings, setSensorReadings, devices, deviceSummary, alerts, deviceAlertHistory, homeHealthScore, insight, updatedAt }}>{children}</Context.Provider>;
}

export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error('DemoProvider missing');
  return value;
}
