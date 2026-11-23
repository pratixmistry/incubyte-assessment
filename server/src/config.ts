import { resolve } from 'node:path';

export const config = {
  port: Number(process.env.PORT ?? 3001),
  dbPath: process.env.DB_PATH ?? resolve(process.cwd(), 'data', 'salary.db'),
  /** Seed 10k employees on boot when the database is empty (handy on ephemeral hosts). */
  seedOnEmpty: process.env.SEED_ON_EMPTY !== 'false',
  /** Built React app served from the same origin when present (production); Vite serves it in development. */
  clientDist: process.env.CLIENT_DIST ?? resolve(process.cwd(), '..', 'client', 'dist'),
};
