import type { SensorHistoryReading } from '../types.ts';
import { connectSnowflake, disconnectSnowflake, executeSql } from './snowflake.ts';

export async function getSensorHistory(deviceId: string): Promise<SensorHistoryReading[]> {
  const connection = await connectSnowflake();
  try {
    return await executeSql<SensorHistoryReading>(connection, `
      SELECT ID AS "id", DEVICE_ID AS "deviceId", SENSOR_TYPE AS "sensorType",
        LABEL AS "label", VALUE AS "value", UNIT AS "unit", STATUS AS "status",
        TO_CHAR(TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS.FF9TZH:TZM') AS "timestamp",
        TO_CHAR(INGESTED_AT, 'YYYY-MM-DD"T"HH24:MI:SS.FF9TZH:TZM') AS "ingestedAt"
      FROM HOMEIQ.APP.SENSOR_READINGS
      WHERE DEVICE_ID = ?
      ORDER BY TIMESTAMP DESC, INGESTED_AT DESC
      LIMIT 20
    `, [deviceId]);
  } finally {
    await disconnectSnowflake(connection);
  }
}
