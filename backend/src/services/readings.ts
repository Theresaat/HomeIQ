import { sensorTypes, sensorStatuses, type Device, type SensorReading } from '../types.ts';

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function acceptSensorReading(
  payload: unknown,
  devices: Pick<Device, 'id'>[],
  sensorReadings: SensorReading[],
): { reading: SensorReading } | { error: string } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'Request body must be a sensor reading JSON object.' };
  }
  const { id, deviceId, sensorType, label, value, unit, timestamp, status } = payload as Record<string, unknown>;
  if (!nonEmptyString(id) || !nonEmptyString(deviceId) || !nonEmptyString(label)) {
    return { error: 'id, deviceId, and label are required non-empty strings.' };
  }
  if (!devices.some(device => device.id === deviceId)) {
    return { error: `Unknown deviceId: ${deviceId}.` };
  }
  const validatedSensorType = sensorTypes.find(type => type === sensorType);
  if (!validatedSensorType) {
    return { error: `sensorType must be one of: ${sensorTypes.join(', ')}.` };
  }
  const validatedStatus = sensorStatuses.find(item => item === status);
  if (!validatedStatus) {
    return { error: 'status must be normal, warning, or critical.' };
  }
  if (!(typeof value === 'number' && Number.isFinite(value)) && !nonEmptyString(value)) {
    return { error: 'value must be a finite number or a non-empty string.' };
  }
  if (typeof unit !== 'string') {
    return { error: 'unit is required and must be a string; use an empty string for categorical readings.' };
  }
  if (typeof timestamp !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) ||
      !Number.isFinite(Date.parse(timestamp)) ||
      new Date(`${timestamp.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== timestamp.slice(0, 10)) {
    return { error: 'timestamp must be a valid ISO 8601 timestamp with a timezone.' };
  }

  const index = sensorReadings.findIndex(reading => reading.id === id);
  if (index !== -1 && (sensorReadings[index].deviceId !== deviceId || sensorReadings[index].sensorType !== validatedSensorType)) {
    return { error: 'An existing reading ID cannot be reassigned to another device or sensor type.' };
  }
  const reading: SensorReading = {
    id, deviceId, sensorType: validatedSensorType, label, value,
    unit, timestamp, status: validatedStatus,
  };
  if (index === -1) sensorReadings.push(reading);
  else sensorReadings[index] = reading;
  return { reading };
}
