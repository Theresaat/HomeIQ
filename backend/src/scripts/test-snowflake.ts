import { connectSnowflake, disconnectSnowflake, executeSql } from '../services/snowflake.ts';

async function testConnection() {
  const connection = await connectSnowflake();
  try {
    const rows = await executeSql(connection,
      'SELECT CURRENT_DATABASE(), CURRENT_SCHEMA(), CURRENT_WAREHOUSE();');
    if (!rows[0]) throw new Error('Snowflake connection test returned no rows.');
    console.log('Snowflake connection test passed.');
    console.log({
      database: rows[0]['CURRENT_DATABASE()'],
      schema: rows[0]['CURRENT_SCHEMA()'],
      warehouse: rows[0]['CURRENT_WAREHOUSE()'],
    });
  } finally {
    await disconnectSnowflake(connection);
  }
}

testConnection().catch(() => {
  console.error('Snowflake connection test failed. Check backend/.env and Snowflake account access.');
  process.exitCode = 1;
});
