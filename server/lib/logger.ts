import pino from 'pino';

/**
 * pino logger (CONTEXT.md D-26): JSON in production, pretty in development.
 * Redacts the PAT and Authorization header from every log entry (D-23 — one-way
 * security invariant; PAT must never appear in logs).
 */
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'jiraPat',
      '*.jiraPat',
      '**.jiraPat',
      'req.headers.authorization',
      'headers.authorization',
    ],
    censor: '[REDACTED]',
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }),
});
