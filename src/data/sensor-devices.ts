import type { Device, DeviceSeed } from './mock-home';
import { conditionPenalties, formatSensorReading, getSensorStatus, sensorStatusLabels, sensorStatusTones,
  type SensorReading } from './sensors';

export function deriveDevices(metadata: Omit<DeviceSeed, 'latestReadings'>[], readings: SensorReading[]): Device[] {
  return metadata.map(device => {
    const latestReadings = readings.filter(reading => reading.deviceId === device.id);
    const abnormal = latestReadings.filter(reading => reading.status !== 'normal');
    const sensorStatus = getSensorStatus(latestReadings);
    const status = sensorStatusLabels[sensorStatus];
    const primary = latestReadings[0];
    const batteryLevel = latestReadings.find(reading => reading.sensorType === 'battery_level')?.value;
    const updatedAt = latestReadings.reduce((latest, reading) =>
      Date.parse(reading.timestamp) > Date.parse(latest) ? reading.timestamp : latest,
    primary?.timestamp ?? '');
    return {
      ...device, latestReadings, status, tone: sensorStatusTones[sensorStatus], updatedAt,
      reading: primary ? formatSensorReading(primary) : 'Unavailable',
      battery: typeof batteryLevel === 'number' ? batteryLevel : device.battery,
      healthScore: 100 - conditionPenalties[status],
      description: abnormal.length
        ? abnormal.map(reading => `${reading.label}: ${formatSensorReading(reading)} (${reading.status})`).join('; ') + '.'
        : 'Current sample sensor readings are normal.',
    };
  });
}

export function getSensorInsight(devices: Device[]): string {
  const attention = devices.filter(device => device.status !== 'Normal');
  return attention.length
    ? `Current sample sensors need attention: ${attention.map(device => `${device.name} (${device.status.toLowerCase()})`).join(', ')}. Review the latest readings and recommended care.`
    : 'All current sample sensor readings are normal. Continue your scheduled home maintenance.';
}
