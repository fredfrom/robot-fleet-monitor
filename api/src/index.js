const http = require('http');
const app = require('./app');
const config = require('./config');
const { pool } = require('./db/pool');
const migrate = require('./db/migrate');
const seed = require('./db/seed');
const { setupWebSocket } = require('./websocket/server');
const { startSimulator } = require('./services/simulator');

const server = http.createServer(app);

async function start() {
  await migrate(pool);
  await seed(pool);
  server.listen(config.port, () => {
    console.log(`API listening on port ${config.port}`);
  });
  setupWebSocket(server);
  await startSimulator();
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
