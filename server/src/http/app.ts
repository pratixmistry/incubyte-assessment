import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { type Express } from 'express';
import { type Clock, systemClock } from '../clock.js';
import type { Database } from '../db/database.js';
import { EmployeeService } from '../services/employeeService.js';
import { InsightsService } from '../services/insightsService.js';
import { errorHandler } from './errorHandler.js';
import { employeesRouter } from './routes/employees.js';
import { insightsRouter } from './routes/insights.js';
import { metaRouter } from './routes/meta.js';

export interface AppOptions {
  db: Database;
  clock?: Clock;
  /** Built React app to serve from the same origin (production). */
  clientDist?: string;
}

/** Composition root: wires services into routes. Tests build one per in-memory DB. */
export function createApp({ db, clock = systemClock, clientDist }: AppOptions): Express {
  const employees = new EmployeeService(db, clock);
  const insights = new InsightsService(db);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/meta', metaRouter(employees));
  app.use('/api/employees', employeesRouter(employees));
  app.use('/api/insights', insightsRouter(insights));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (clientDist && existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1h', index: false }));
    // SPA fallback: let the client-side router handle any other GET.
    app.get('/{*path}', (_req, res) => {
      res.sendFile(join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
