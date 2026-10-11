import { mockDevices } from '../data/mock-home.ts';
import { connectSnowflake, disconnectSnowflake, executeSql } from '../services/snowflake.ts';

async function seedDevices() {
  const devices = mockDevices.map(device => ({
    id: device.id,
    name: device.name,
    room: device.room,
    connection: device.connection,
    powerSource: device.powerSource,
  }));
  if (new Set(devices.map(device => device.id)).size !== devices.length) {
    throw new Error('Device seed IDs must be unique.');
  }

  const connection = await connectSnowflake();
  try {
    await executeSql(connection, `
      MERGE INTO HOMEIQ.APP.DEVICES AS target
      USING (
        SELECT value:id::VARCHAR AS ID,
          value:name::VARCHAR AS NAME,
          value:room::VARCHAR AS ROOM,
          value:connection::VARCHAR AS CONNECTION,
          value:powerSource::VARCHAR AS POWER_SOURCE
        FROM TABLE(FLATTEN(INPUT => PARSE_JSON(?)))
      ) AS source
      ON target.ID = source.ID
      WHEN MATCHED THEN UPDATE SET
        target.NAME = source.NAME,
        target.ROOM = source.ROOM,
        target.CONNECTION = source.CONNECTION,
        target.POWER_SOURCE = source.POWER_SOURCE
      WHEN NOT MATCHED THEN INSERT (ID, NAME, ROOM, CONNECTION, POWER_SOURCE)
        VALUES (source.ID, source.NAME, source.ROOM, source.CONNECTION, source.POWER_SOURCE)
    `, [JSON.stringify(devices)]);
    console.log(`Seeded ${devices.length} devices into HOMEIQ.APP.DEVICES.`);
  } finally {
    await disconnectSnowflake(connection);
  }
}

seedDevices().catch(() => {
  console.error('Device seed failed. Check backend/.env, table access, and the DEVICES table definition.');
  process.exitCode = 1;
});
