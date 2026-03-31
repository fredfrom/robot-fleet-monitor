const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { redisSub } = require('../config/redis');

const HEARTBEAT_INTERVAL = 30000;

function onSocketError(err) {
  console.error('WS socket error:', err);
}

/**
 * Attach an authenticated WebSocket server to the given HTTP server.
 * Subscribes to Redis 'robot:positions' channel and broadcasts to all
 * connected clients. Stale connections are pruned via heartbeat.
 *
 * @param {import('http').Server} server
 * @returns {import('ws').WebSocketServer}
 */
function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  // --- Upgrade handler: authenticate via JWT in query param ---
  server.on('upgrade', (request, socket, head) => {
    socket.on('error', onSocketError);

    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      const user = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
      socket.removeListener('error', onSocketError);
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, user);
      });
    } catch (err) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  // --- Connection handler ---
  wss.on('connection', (ws, req, user) => {
    ws.user = user;
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', console.error);

    console.log(`WebSocket connected: ${user.email} (${wss.clients.size} total)`);

    ws.on('close', () => {
      console.log(`WebSocket disconnected: ${user.email} (${wss.clients.size} total)`);
    });
  });

  // --- Redis subscription and broadcast ---
  redisSub.subscribe('robot:positions');

  redisSub.on('message', (channel, message) => {
    if (channel !== 'robot:positions') return;

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // --- Heartbeat: detect and terminate stale connections ---
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

module.exports = { setupWebSocket };
