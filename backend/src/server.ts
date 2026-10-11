import { createApp } from './app.ts';
import type { ServerConfig } from './types.ts';

const config: ServerConfig = {
  port: Number(process.env.PORT ?? 3001),
};

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const app = createApp();
const server = app.listen(config.port);
server.on('listening', () => {
  console.log(`HomeIQ backend listening on port ${config.port}`);
});

server.on('error', error => {
  console.error('HomeIQ backend failed to start:', error.message);
  process.exitCode = 1;
});
