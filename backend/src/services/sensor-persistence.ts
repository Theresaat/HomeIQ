import type { SensorReading } from '../types.ts';
import { connectSnowflake, disconnectSnowflake, executeSql } from './snowflake.ts';

export async function persistSensorReading(reading: SensorReading): Promise<void> {
  const connection = await connectSnowflake();
  try {
    await executeSql(connection, `
      INSERT INTO HOMEIQ.APP.SENSOR_READINGS
        (ID, DEVICE_ID, SENSOR_TYPE, LABEL, VALUE, UNIT, STATUS, TIMESTAMP)
      SELECT ?, ?, ?, ?, PARSE_JSON(?), ?, ?, TO_TIMESTAMP_TZ(?)
    `, [
      reading.id, reading.deviceId, reading.sensorType, reading.label,
      JSON.stringify(reading.value), reading.unit, reading.status, reading.timestamp,
    ]);
  } finally {
    await disconnectSnowflake(connection);
  }
}
