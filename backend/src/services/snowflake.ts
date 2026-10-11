import snowflake, { type Binds, type Connection } from 'snowflake-sdk';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Missing required backend environment variable: ${name}.`);
  return name === 'SNOWFLAKE_PASSWORD' ? value : value.trim();
}

export async function connectSnowflake(): Promise<Connection> {
  const options = {
    account: requiredEnvironment('SNOWFLAKE_ACCOUNT'),
    username: requiredEnvironment('SNOWFLAKE_USER'),
    password: requiredEnvironment('SNOWFLAKE_PASSWORD'),
    warehouse: process.env.SNOWFLAKE_WAREHOUSE?.trim() || 'HOMEIQ_WH',
    database: process.env.SNOWFLAKE_DATABASE?.trim() || 'HOMEIQ',
    schema: process.env.SNOWFLAKE_SCHEMA?.trim() || 'APP',
    role: process.env.SNOWFLAKE_ROLE?.trim() || undefined,
  };
  snowflake.configure({ logLevel: 'ERROR' });
  const connection = snowflake.createConnection(options);
  return new Promise((resolve, reject) => {
    connection.connect((error, connected) => {
      if (error) reject(error);
      else resolve(connected);
    });
  });
}

export function executeSql<Row extends object = Record<string, unknown>>(
  connection: Connection,
  sqlText: string,
  binds: Binds = [],
): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete(error, _statement, rows) {
        if (error) reject(error);
        else resolve((rows ?? []) as Row[]);
      },
    });
  });
}

export function disconnectSnowflake(connection: Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.destroy(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}
