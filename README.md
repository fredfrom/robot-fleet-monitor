# Robot Fleet Monitor

Real-time robot fleet monitoring dashboard. Live robot positions on an interactive map with WebSocket updates, JWT authentication, and an industrial command center UI.

## Getting Started

**Prerequisites:** Docker and Docker Compose

1. Clone the repository
2. Start backend services:
   ```
   docker compose up
   ```
3. In a new terminal, start the frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser

Default login: `admin@test.com` / `test123`

## Architecture

Node.js/Express REST API backed by PostgreSQL for persistence and Redis for caching and pub/sub. A server-side simulator generates robot patrol positions every 2 seconds, publishing to Redis. An authenticated WebSocket server (ws) broadcasts position updates to connected clients. The React frontend renders an OpenLayers map with live robot markers, fleet statistics, trail history, and alert notifications.

- **Backend:** Node.js 22, Express 5, PostgreSQL 17, Redis 7, ws
- **Frontend:** React 19, Vite, OpenLayers 10
- **Infrastructure:** Docker Compose

## Features

- JWT authentication
- Real-time WebSocket position updates
- OpenLayers map with animated markers
- Robot trail history
- Geofenced patrol zone overlay
- Fleet statistics dashboard
- Alert toasts (low battery, offline, recovery)
- Bidirectional click-to-highlight (map and list)
- Simulation start/stop controls

## Screenshots

### Dashboard

![Dashboard with map and robot markers](docs/screenshots/dashboard.png)

### Robot Detail Panel

![Robot detail panel with battery and telemetry](docs/screenshots/detail-panel.png)

## Project Structure

```
api/
  src/
    config/       # Database and Redis configuration
    db/           # Schema and seed scripts
    middleware/   # Auth, error handling, rate limiting
    routes/       # Express route handlers
    services/     # Business logic (simulation, robots)
    websocket/    # WebSocket server and broadcast
frontend/
  src/
    api/          # HTTP client utilities
    components/   # React UI components
    context/      # Auth and app state providers
    hooks/        # Custom React hooks
    styles/       # CSS with custom properties
docker-compose.yml
```
