import { config } from './config.js';
import { openDatabase } from './db/database.js';
import { createApp } from './http/app.js';
import { generateEmployees } from './seed/generator.js';
import { countEmployees, seedDatabase } from './seed/seeder.js';

const db = openDatabase(config.dbPath);

if (config.seedOnEmpty && countEmployees(db) === 0) {
  seedDatabase(db, generateEmployees({ count: 10_000 }));
  console.log('Empty database: seeded 10,000 employees');
}

const app = createApp({ db, clientDist: config.clientDist });
const server = app.listen(config.port, () => {
  console.log(`Salary Management API listening on http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
