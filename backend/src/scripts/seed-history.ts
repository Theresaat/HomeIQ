import { demoHistory } from '../data/demo-history.ts';
import { connectSnowflake, disconnectSnowflake, executeSql } from '../services/snowflake.ts';

async function seedHistory() {
  const connection = await connectSnowflake();
  try {
    await executeSql(connection, `
      MERGE INTO HOMEIQ.APP.SENSOR_READINGS AS target
      USING (
        SELECT value:id::VARCHAR AS ID,
          value:deviceId::VARCHAR AS DEVICE_ID,
          value:sensorType::VARCHAR AS SENSOR_TYPE,
          value:label::VARCHAR AS LABEL,
          value:value AS VALUE,
          value:unit::VARCHAR AS UNIT,
          value:status::VARCHAR AS STATUS,
          TO_TIMESTAMP_TZ(value:timestamp::VARCHAR) AS TIMESTAMP,
          TO_TIMESTAMP_TZ(value:ingestedAt::VARCHAR) AS INGESTED_AT
        FROM TABLE(FLATTEN(INPUT => PARSE_JSON(?)))
      ) AS source
      ON target.ID = source.ID
      WHEN NOT MATCHED THEN INSERT
        (ID, DEVICE_ID, SENSOR_TYPE, LABEL, VALUE, UNIT, STATUS, TIMESTAMP, INGESTED_AT)
      VALUES (source.ID, source.DEVICE_ID, source.SENSOR_TYPE, source.LABEL, source.VALUE,
        source.UNIT, source.STATUS, source.TIMESTAMP, source.INGESTED_AT)
    `, [JSON.stringify(demoHistory)]);
    console.log(`Demo/simulated history seed completed for ${demoHistory.length} events; existing demo IDs skipped.`);
  } finally {
    await disconnectSnowflake(connection);
  }
}

seedHistory().catch(() => {
  console.error('Demo history seed failed. Check backend/.env and SENSOR_READINGS table access.');
  process.exitCode = 1;
});
