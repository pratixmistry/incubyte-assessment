import { resolve } from 'node:path';

export const config = {
  port: Number(process.env.PORT ?? 3001),
  dbPath: process.env.DB_PATH ?? resolve(process.cwd(), 'data', 'salary.db'),
  /** Seed 10k employees on boot when the database is empty (handy on ephemeral hosts). */
  seedOnEmpty: process.env.SEED_ON_EMPTY !== 'false',
  /** Directory of the built React app to serve; unset in development (Vite serves it). */
  clientDist: process.env.CLIENT_DIST,
};
