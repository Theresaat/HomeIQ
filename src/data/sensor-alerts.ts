import type { Device, HomeAlert } from './mock-home';
import { formatSensorReading, getSensorStatus, REFRIGERATOR_TEMPERATURE_WARNING_F, sensorStatusLabels } from './sensors';

export function generateSensorAlerts(devices: Device[]): HomeAlert[] {
  return devices.flatMap(device => {
    const abnormal = device.latestReadings.filter(reading => reading.status !== 'normal');
    if (abnormal.length === 0) return [];

    let title = `${device.name}: abnormal sensor readings`;
    if (device.id === 'sink' && abnormal.some(reading =>
      ['moisture', 'water_detection', 'water_flow'].includes(reading.sensorType))) {
      title = 'Possible kitchen sink leak';
    } else if (device.id === 'fridge' && abnormal.some(reading => reading.sensorType === 'temperature')) {
      title = abnormal.some(reading => reading.sensorType === 'temperature' && typeof reading.value === 'number' && reading.value > REFRIGERATOR_TEMPERATURE_WARNING_F)
        ? 'Refrigerator high temperature' : 'Refrigerator temperature warning';
    } else if (device.id === 'dryer' && abnormal.some(reading => reading.sensorType === 'vibration')) {
      title = 'Unusual dryer vibration';
    } else if (device.id === 'heater' && abnormal.some(reading => reading.sensorType === 'pressure')) {
      title = 'Water heater pressure warning';
    } else if (device.id === 'dishwasher' && abnormal.some(reading => reading.sensorType === 'water_usage')) {
      title = 'Dishwasher water usage warning';
    }

    return [{
      id: `sensor-alert-${device.id}`,
      deviceId: device.id,
      title,
      detail: abnormal.map(reading =>
        `${reading.label}: ${formatSensorReading(reading)} (${reading.status})`
      ).join('; ') + '.',
      time: 'Current sensor snapshot',
      icon: device.icon,
      severity: sensorStatusLabels[getSensorStatus(abnormal)],
      actionTarget: 'device',
      createdAt: abnormal.reduce((earliest, reading) =>
        Date.parse(reading.timestamp) < Date.parse(earliest) ? reading.timestamp : earliest,
      abnormal[0].timestamp),
    }];
  });
}
