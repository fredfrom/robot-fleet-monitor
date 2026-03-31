const { pool } = require('../db/pool');
const { redis } = require('../config/redis');
const { invalidateRobotsCache } = require('./cacheService');
const { advanceGroundRobot, initGroundState } = require('./movement/groundMovement');
const { advanceAirRobot, initAirState } = require('./movement/airMovement');
const { processChargingState, initStationOccupancy, getStationOccupancyData } = require('./chargingLogic');

// Position update interval: 2 seconds
const TICK_INTERVAL = 2000;

// In-memory state — NOT persisted to database
// { [robotId]: { ...movementState, chargingPhase, ... } }
let robotStates = {};

// Station occupancy — in-memory, initialized at startup
let stationOccupancy = {};
let stations = [];

let intervalHandle = null;

/**
 * Single simulation tick — advances all robots through movement and charging,
 * drains battery, updates DB, publishes to Redis.
 */
async function tick() {
  try {
    const { rows: robots } = await pool.query(
      'SELECT id, name, status, battery, type, lat, lon FROM robots ORDER BY id'
    );

    const updates = [];

    // Process robots sequentially to prevent same-tick station over-claiming
    for (const robot of robots) {
      if (!robotStates[robot.id]) {
        const movementState = robot.type === 'air'
          ? initAirState(robot.name)
          : initGroundState(robot.name);
        robotStates[robot.id] = { ...movementState, chargingPhase: 'patrol' };
      }

      const state = robotStates[robot.id];

      // Initialize chargingPhase if missing (for robots initialized before charging system)
      if (!state.chargingPhase) state.chargingPhase = 'patrol';

      // Process charging state machine first
      const chargingResult = processChargingState(robot, state, stationOccupancy);

      let lat, lng, heading;

      if (state.chargingPhase === 'patrol') {
        // Normal movement — only when patrolling
        const pos = robot.type === 'air'
          ? advanceAirRobot(robot.id, state)
          : advanceGroundRobot(robot.id, state);

        if (!pos) continue;
        lat = pos.lat;
        lng = pos.lng;
        heading = pos.heading;
      } else {
        // Charging system controls position
        lat = chargingResult.lat;
        lng = chargingResult.lng;
        heading = chargingResult.heading;
      }

      // Preserve last known heading when charging logic returns null
      // (e.g. stationary at charger, dead, transition ticks)
      if (heading == null) {
        heading = state.lastHeading ?? 0;
      }
      state.lastHeading = heading;

      // Battery drain (skip for charging/dead/recovering states)
      if (!chargingResult.skipDrain) {
        const drainRate = robot.type === 'air' ? 2 : 1;
        robot.battery = Math.max(0, robot.battery - drainRate);
      }

      // Compute speed from position delta (km/h approximation)
      const prevLat = robot.lat;
      const prevLng = robot.lon;
      const dLat = lat - prevLat;
      const dLng = lng - prevLng;
      const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
      const speedKmh = (distKm / TICK_INTERVAL) * 3600000;

      // Apply to robot object for WS broadcast
      robot.lat = lat;
      robot.lon = lng;
      robot.heading = heading;
      robot.speed = Math.round(speedKmh * 10) / 10;
      robot.status = chargingResult.status;
      robot.altitude = chargingResult.altitude ?? 0;
      robot.timestamp = new Date().toISOString();

      // DB update now includes status (fixes stale REST reads)
      updates.push(
        pool.query(
          'UPDATE robots SET lat=$1, lon=$2, battery=$3, status=$4, updated_at=NOW() WHERE id=$5',
          [lat, lng, robot.battery, chargingResult.status, robot.id]
        )
      );
    }

    await Promise.all(updates);

    // Record position history
    const positionValues = robots.map((r, i) => `($${i*3+1}, $${i*3+2}, $${i*3+3})`).join(', ');
    const positionParams = robots.flatMap(r => [r.id, r.lat, r.lon]);
    if (positionParams.length > 0) {
      await pool.query(
        `INSERT INTO robot_positions (robot_id, lat, lon) VALUES ${positionValues}`,
        positionParams
      );
    }

    const message = {
      type: 'position_update',
      data: robots.map((r) => ({
        id: r.id,
        name: r.name,
        latitude: r.lat,
        longitude: r.lon,
        status: r.status,
        battery: r.battery,
        robotType: r.type,
        heading: r.heading,
        speed: r.speed,
        altitude: r.altitude ?? 0,
        timestamp: r.timestamp,
      })),
      stations: getStationOccupancyData(stationOccupancy),
    };

    await redis.publish('robot:positions', JSON.stringify(message));
    await invalidateRobotsCache();
  } catch (err) {
    console.error('Simulator tick error:', err);
    // Do NOT rethrow — keep the interval running
  }
}

/**
 * Start the patrol simulator.
 * Queries robots and stations from DB to initialize state, then ticks every 2 seconds.
 */
async function startSimulator() {
  if (intervalHandle !== null) return;

  const { rows: robots } = await pool.query(
    'SELECT id, name, type FROM robots ORDER BY id'
  );

  // Load charging stations
  const { rows: stationRows } = await pool.query(
    'SELECT id, name, latitude, longitude, capacity FROM charging_stations ORDER BY id'
  );
  stations = stationRows;
  stationOccupancy = initStationOccupancy(stationRows);

  robotStates = {};
  for (const robot of robots) {
    const movementState = robot.type === 'air'
      ? initAirState(robot.name)
      : initGroundState(robot.name);
    robotStates[robot.id] = { ...movementState, chargingPhase: 'patrol' };
  }

  intervalHandle = setInterval(tick, TICK_INTERVAL);
  console.log('Simulator started');
}

/**
 * Stop the patrol simulator.
 */
function stopSimulator() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  robotStates = {};
  stationOccupancy = {};
  stations = [];
  console.log('Simulator stopped');
}

function isRunning() {
  return intervalHandle !== null;
}

module.exports = { startSimulator, stopSimulator, isRunning };
