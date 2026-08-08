import 'fastify';
import type { Config } from '../../shared/schemas/config.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}
