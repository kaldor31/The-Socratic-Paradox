import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

function createTransport() {
  if (!isDev) return undefined;
  try {
    require.resolve('pino-pretty');
    return { target: 'pino-pretty', options: { colorize: true } };
  } catch {
    return undefined;
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: createTransport(),
});
