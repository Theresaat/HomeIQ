import { REFRIGERATOR_TEMPERATURE_WARNING_F, type SensorReading, type SensorType } from "./sensors";
import { devices } from "./mock-home";

export const SENSOR_SIMULATION_ENABLED = true;
export const SENSOR_UPDATE_INTERVAL_MS = 10_000;

type SensorScenario =
  | "All Systems Normal"
  | "Kitchen Leak"
  | "Refrigerator Overheating"
  | "Dryer Vibration Warning"
  | "Water Heater Pressure Alert";

// Set a scenario and reload the app to switch. Null preserves the original demo.
export const DEVELOPMENT_SENSOR_SCENARIO: SensorScenario | null = null;

type SensorSnapshot = Pick<SensorReading, "value" | "status">;
type ScenarioOverrides = Partial<Record<string, SensorSnapshot>>;

const normalOverrides: ScenarioOverrides = {
  "sink-reading-0": { value: "Dry", status: "normal" },
  "sink-reading-1": { value: 0, status: "normal" },
  "fridge-reading-0": { value: 38, status: "normal" },
  "fridge-reading-3": { value: 24, status: "normal" },
  "dryer-reading-0": { value: 100, status: "normal" },
  "dryer-reading-1": { value: 0.5, status: "normal" },
  "dryer-reading-4": { value: 40, status: "normal" },
};

// Reset every reading from the same seed snapshot, including non-simulated sensors.
const normalReadings: Record<string, SensorSnapshot> = Object.fromEntries(devices.flatMap(device =>
  device.latestReadings.map(reading => [reading.id, normalOverrides[reading.id] ?? {
    value: reading.value, status: "normal" as const,
  }]),
));

const scenarioReadings: Record<SensorScenario, ScenarioOverrides> = {
  "All Systems Normal": {},
  "Kitchen Leak": {
    "sink-reading-0": { value: "Moisture detected", status: "critical" },
    "sink-reading-1": { value: 18, status: "critical" },
  },
  "Refrigerator Overheating": {
    "fridge-reading-0": { value: 51, status: "critical" },
  },
  "Dryer Vibration Warning": {
    "dryer-reading-2": { value: 5.2, status: "warning" },
  },
  "Water Heater Pressure Alert": {
    "heater-reading-2": { value: 104, status: "critical" },
  },
};

function getScenarioSnapshot(readingId: string, scenario: SensorScenario): SensorSnapshot | undefined {
  return scenarioReadings[scenario][readingId] ?? normalReadings[readingId];
}

export function applySensorScenario(
  readings: SensorReading[],
  scenario: SensorScenario,
  timestamp: string,
): SensorReading[] {
  return readings.map((reading) => {
    const override = getScenarioSnapshot(reading.id, scenario);
    return override ? { ...reading, ...override, timestamp } : reading;
  });
}

// Development scenarios and illustrative limits, not hardware calibration.
const simulations = [
  {
    deviceId: "fridge",
    sensorType: "temperature",
    unit: "°F",
    baseline: 42,
    amplitude: 6,
    step: 0.3,
    min: 34,
    max: 52,
    warning: REFRIGERATOR_TEMPERATURE_WARNING_F,
    critical: 50,
  },
  {
    deviceId: "sink",
    sensorType: "water_flow",
    unit: "gal/min",
    baseline: 0.6,
    amplitude: 0.6,
    step: 0.1,
    min: 0,
    max: 4,
    warning: 2.5,
    critical: 3.5,
  },
  {
    deviceId: "dryer",
    sensorType: "vibration",
    unit: "mm/s",
    baseline: 2.8,
    amplitude: 0.3,
    step: 0.1,
    min: 0,
    max: 9,
    warning: 4.5,
    critical: 7,
  },
  {
    deviceId: "heater",
    sensorType: "pressure",
    unit: "psi",
    baseline: 55,
    amplitude: 2,
    step: 0.5,
    min: 30,
    max: 110,
    warning: 80,
    critical: 100,
  },
] satisfies {
  deviceId: string;
  sensorType: SensorType;
  unit: string;
  baseline: number;
  amplitude: number;
  step: number;
  min: number;
  max: number;
  warning: number;
  critical: number;
}[];

export function simulateSensorReadings(
  readings: SensorReading[],
  tick: number,
  timestamp: string,
  scenario: SensorScenario | null = null,
): SensorReading[] {
  return readings.map((reading) => {
    const config = simulations.find(
      (item) =>
        item.deviceId === reading.deviceId &&
        item.sensorType === reading.sensorType,
    );
    if (
      !config ||
      reading.unit !== config.unit ||
      typeof reading.value !== "number" ||
      !Number.isFinite(reading.value)
    )
      return reading;
    const scenarioValue = scenario
      ? getScenarioSnapshot(reading.id, scenario)?.value
      : undefined;
    const baseline =
      typeof scenarioValue === "number" ? scenarioValue : config.baseline;
    // Keep the chosen scenario stable across ticks, including a normal refrigerator.
    const amplitude =
      scenario && config.deviceId === "fridge" ? 1 : config.amplitude;
    const target = baseline + amplitude * Math.sin(tick / 18);
    const change = Math.max(
      -config.step,
      Math.min(config.step, target - reading.value),
    );
    const value =
      Math.round(
        Math.max(config.min, Math.min(config.max, reading.value + change)) *
          100,
      ) / 100;
    const status =
      value >= config.critical
        ? "critical"
        : value > config.warning
          ? "warning"
          : "normal";
    return { ...reading, value, timestamp, status };
  });
}
