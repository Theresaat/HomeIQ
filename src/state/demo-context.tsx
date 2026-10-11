import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { alertSeverityTones, deviceAlertHistory as resolvedAlertHistory, devices as initialDevices, profile as initialProfile, tasks,
  type Device, type DeviceAlertEvent, type HomeAlert, type HomeProfile } from '@/data/mock-home';
import { deriveDevices, getSensorInsight } from '@/data/sensor-devices';
import type { SensorReading } from '@/data/sensors';
import { generateSensorAlerts } from '@/data/sensor-alerts';
import { calculateHomeHealthScore } from '@/data/home-health';
import { DEVELOPMENT_SENSOR_SCENARIO, SENSOR_SIMULATION_ENABLED, SENSOR_UPDATE_INTERVAL_MS,
  applySensorScenario, simulateSensorReadings } from '@/data/sensor-simulator';
type DemoState = {
  completed: string[];
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
  const [completed, setCompleted] = useState<string[]>([]);
  const [profile, setProfile] = useState(initialProfile);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>(
    () => {
      const readings = initialDevices.flatMap(device => device.latestReadings);
      return __DEV__ && DEVELOPMENT_SENSOR_SCENARIO
        ? applySensorScenario(readings, DEVELOPMENT_SENSOR_SCENARIO, new Date().toISOString()) : readings;
    }
  );
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
  const devices = deriveDevices(initialDevices, sensorReadings);
  const insight = getSensorInsight(devices);
  const updatedAt = sensorReadings.reduce((latest, reading) =>
    Date.parse(reading.timestamp) > Date.parse(latest) ? reading.timestamp : latest, sensorReadings[0]?.timestamp ?? '');
  const deviceSummary = {
    connected: devices.length,
    healthy: devices.filter(device => device.status === 'Normal').length,
    attention: devices.filter(device => device.status !== 'Normal').length,
  };
  const alerts = generateSensorAlerts(devices);
  const homeHealthScore = calculateHomeHealthScore({
    alerts, sensorReadings, tasks, completedTaskIds: completed, asOf: new Date(),
  });
  const deviceAlertHistory: DeviceAlertEvent[] = [
    ...resolvedAlertHistory,
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
    setCompleted(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    );
  }

  return <Context.Provider value={{ completed, toggleTask, profile, saveProfile, saveHomeDetails,
    sensorReadings, setSensorReadings, devices, deviceSummary, alerts, deviceAlertHistory, homeHealthScore, insight, updatedAt }}>{children}</Context.Provider>;
}

export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error('DemoProvider missing');
  return value;
}
