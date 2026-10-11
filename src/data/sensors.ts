export type SensorStatus = 'normal' | 'warning' | 'critical';

export const sensorStatusLabels = { normal: 'Normal', warning: 'Warning', critical: 'Critical' } as const;
export const sensorStatusTones = { normal: 'green', warning: 'orange', critical: 'red' } as const;
export const conditionPenalties = { Normal: 0, Warning: 8, Critical: 20 } as const;
export type DeviceStatus = typeof sensorStatusLabels[SensorStatus];

// Illustrative refrigerator limit, shared by simulation and alert wording.
export const REFRIGERATOR_TEMPERATURE_WARNING_F = 40;

export type SensorType =
  | 'water_flow'
  | 'moisture'
  | 'temperature'
  | 'power_usage'
  | 'compressor_runtime'
  | 'water_usage'
  | 'runtime'
  | 'vibration'
  | 'pressure'
  | 'water_detection'
  | 'airflow'
  | 'door_position'
  | 'cycle_state'
  | 'smoke_concentration'
  | 'battery_level'
  | 'tank_condition'
  | 'voltage'
  | 'air_quality_index'
  | 'humidity';

export type SensorReading = {
  id: string;
  deviceId: string;
  sensorType: SensorType;
  label: string;
  value: string | number;
  // Empty for categorical readings with no physical unit.
  unit: string;
  // ISO 8601 timestamp, including a UTC offset or Z.
  timestamp: string;
  status: SensorStatus;
};

export type SensorActivity = {
  id: string;
  deviceId: string;
  timestamp: string;
  summary: string;
  status: SensorStatus;
};

export function getSensorStatus(readings: SensorReading[]): SensorStatus {
  return readings.some(reading => reading.status === 'critical') ? 'critical' :
    readings.some(reading => reading.status === 'warning') ? 'warning' : 'normal';
}

export function formatSensorReading(reading: SensorReading): string {
  return `${reading.value}${reading.unit ? ` ${reading.unit}` : ''}`;
}
