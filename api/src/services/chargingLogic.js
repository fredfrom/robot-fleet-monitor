/**
 * Charging state machine — manages robot battery lifecycle.
 *
 * Phases: patrol -> returning -> charging -> resuming -> patrol
 *         patrol -> dead (if battery=0 and no station) -> returning -> charging -> ...
 */

const { interpolateToward } = require('./movement/returnMovement');

// Cruising altitude for air robots (meters)
const CRUISING_ALT = 40;

// --- Station occupancy tracking (in-memory) ---

/**
 * Initialize station occupancy map from DB rows.
 * @param {Array<{id, name, latitude, longitude, capacity}>} stations
 * @returns {Object} { [stationId]: { id, name, latitude, longitude, capacity, robots: Set } }
 */
function initStationOccupancy(stations) {
  const occ = {};
  for (const s of stations) {
    occ[s.id] = {
      id: s.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      capacity: s.capacity,
      robots: new Set(),
    };
  }
  return occ;
}

/**
 * Find nearest station with available capacity.
 * @returns {object|null} Station occupancy entry, or null if all full.
 */
function findNearestAvailable(lat, lng, stationOccupancy) {
  let best = null;
  let bestDist = Infinity;

  for (const station of Object.values(stationOccupancy)) {
    if (station.robots.size >= station.capacity) continue;
    const dx = station.latitude - lat;
    const dy = station.longitude - lng;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = station;
    }
  }

  return best;
}

/**
 * Claim a slot at a station (call when transitioning to returning).
 */
function claimStation(stationOccupancy, stationId, robotId) {
  stationOccupancy[stationId].robots.add(robotId);
}

/**
 * Release a slot at a station (call when fully charged).
 */
function releaseStation(stationOccupancy, stationId, robotId) {
  stationOccupancy[stationId].robots.delete(robotId);
}

/**
 * Get station data for WebSocket broadcast.
 * @returns {Array<{id, name, latitude, longitude, capacity, occupied, robotIds}>}
 */
function getStationOccupancyData(stationOccupancy) {
  return Object.values(stationOccupancy).map((s) => ({
    id: s.id,
    name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    capacity: s.capacity,
    occupied: s.robots.size,
    robotIds: [...s.robots],
  }));
}

// --- Status mapping ---
const STATUS_MAP = {
  patrol: 'active',
  returning: 'returning',
  charging: 'charging',
  dead: 'dead',
  resuming: 'returning',
};

// --- Core state machine ---

/**
 * Process one tick of the charging state machine for a robot.
 *
 * @param {object} robot - DB row with id, latitude, longitude, battery, type, name
 * @param {object} state - In-memory robotStates[id] (mutable)
 * @param {object} stationOccupancy - Station occupancy map
 * @returns {{ lat: number, lng: number, heading: number|null, status: string, skipDrain: boolean }}
 */
function processChargingState(robot, state, stationOccupancy) {
  // Lazy-init charging fields
  if (!state.chargingPhase) state.chargingPhase = 'patrol';
  if (!state.hasOwnProperty('targetStationId')) state.targetStationId = null;
  if (!state.hasOwnProperty('savedPatrolState')) state.savedPatrolState = null;
  if (!state.hasOwnProperty('returnProgress')) state.returnProgress = 0;
  if (!state.hasOwnProperty('returnFrom')) state.returnFrom = null;
  if (!state.hasOwnProperty('resumeProgress')) state.resumeProgress = 0;
  if (!state.hasOwnProperty('resumeFrom')) state.resumeFrom = null;
  if (!state.hasOwnProperty('lastPatrolPos')) state.lastPatrolPos = null;

  const phase = state.chargingPhase;

  // --- PATROL ---
  if (phase === 'patrol') {
    // Check if battery is low
    if (robot.battery <= 20) {
      const station = findNearestAvailable(robot.lat, robot.lon, stationOccupancy);
      if (station) {
        // Save patrol state for later resume
        const keysToSave = {};
        for (const [k, v] of Object.entries(state)) {
          if (!['chargingPhase', 'targetStationId', 'savedPatrolState',
                 'returnProgress', 'returnFrom', 'resumeProgress',
                 'resumeFrom', 'lastPatrolPos'].includes(k)) {
            keysToSave[k] = v;
          }
        }
        state.savedPatrolState = JSON.parse(JSON.stringify(keysToSave));
        state.returnFrom = { lat: robot.lat, lng: robot.lon };
        state.lastPatrolPos = { lat: robot.lat, lng: robot.lon };
        state.targetStationId = station.id;
        state.returnProgress = 0;
        claimStation(stationOccupancy, station.id, robot.id);
        state.chargingPhase = 'returning';

        // Return current position for this tick (transition tick)
        return {
          lat: robot.lat,
          lng: robot.lon,
          heading: null,
          status: STATUS_MAP.returning,
          skipDrain: false,
          altitude: robot.type === 'air' ? CRUISING_ALT : 0,
        };
      } else if (robot.battery === 0) {
        // No station available and battery dead
        state.chargingPhase = 'dead';
        return {
          lat: robot.lat,
          lng: robot.lon,
          heading: null,
          status: STATUS_MAP.dead,
          skipDrain: true,
          altitude: 0,
        };
      }
    }

    // Still patrolling — caller handles normal movement
    return {
      lat: robot.lat,
      lng: robot.lon,
      heading: null,
      status: STATUS_MAP.patrol,
      skipDrain: false,
      altitude: robot.type === 'air' ? CRUISING_ALT + (Math.random() - 0.5) * 6 : 0,
    };
  }

  // --- RETURNING ---
  if (phase === 'returning') {
    const station = stationOccupancy[state.targetStationId];
    state.returnProgress += 0.1;

    if (state.returnProgress >= 1.0) {
      // Arrived at station
      state.chargingPhase = 'charging';
      return {
        lat: station.latitude,
        lng: station.longitude,
        heading: null,
        status: STATUS_MAP.charging,
        skipDrain: true,
        altitude: 0,
      };
    }

    const pos = interpolateToward(
      state.returnFrom.lat, state.returnFrom.lng,
      station.latitude, station.longitude,
      state.returnProgress
    );

    const heading = Math.atan2(
      station.longitude - state.returnFrom.lng,
      station.latitude - state.returnFrom.lat
    );

    // Skip drain for all returning robots — they've committed to charging
    return {
      lat: pos.lat,
      lng: pos.lng,
      heading,
      status: STATUS_MAP.returning,
      skipDrain: true,
      altitude: robot.type === 'air' ? CRUISING_ALT * (1 - state.returnProgress) : 0,
    };
  }

  // --- CHARGING ---
  if (phase === 'charging') {
    const station = stationOccupancy[state.targetStationId];
    robot.battery = Math.min(100, robot.battery + 5);

    if (robot.battery >= 100) {
      // Fully charged — release station and resume
      releaseStation(stationOccupancy, state.targetStationId, robot.id);
      state.resumeFrom = { lat: station.latitude, lng: station.longitude };
      state.resumeProgress = 0;
      state.chargingPhase = 'resuming';
      return {
        lat: station.latitude,
        lng: station.longitude,
        heading: null,
        status: STATUS_MAP.resuming,
        skipDrain: false,
        altitude: 0,
      };
    }

    return {
      lat: station.latitude,
      lng: station.longitude,
      heading: null,
      status: STATUS_MAP.charging,
      skipDrain: true,
      altitude: 0,
    };
  }

  // --- DEAD ---
  if (phase === 'dead') {
    const station = findNearestAvailable(robot.lat, robot.lon, stationOccupancy);
    if (station) {
      state.returnFrom = { lat: robot.lat, lng: robot.lon };
      state.returnProgress = 0;
      state.targetStationId = station.id;
      claimStation(stationOccupancy, station.id, robot.id);
      state.chargingPhase = 'returning';
      return {
        lat: robot.lat,
        lng: robot.lon,
        heading: null,
        status: STATUS_MAP.returning,
        skipDrain: true,
        altitude: 0,
      };
    }

    return {
      lat: robot.lat,
      lng: robot.lon,
      heading: null,
      status: STATUS_MAP.dead,
      skipDrain: true,
      altitude: 0,
    };
  }

  // --- RESUMING ---
  if (phase === 'resuming') {
    state.resumeProgress += 0.1;

    if (state.resumeProgress >= 1.0) {
      // Arrived back at patrol position — restore state
      if (state.savedPatrolState) {
        const saved = state.savedPatrolState;
        for (const [k, v] of Object.entries(saved)) {
          state[k] = v;
        }
      }
      state.chargingPhase = 'patrol';
      state.savedPatrolState = null;
      state.targetStationId = null;
      state.returnFrom = null;
      state.resumeFrom = null;
      state.lastPatrolPos = null;

      return {
        lat: robot.lat,
        lng: robot.lon,
        heading: null,
        status: STATUS_MAP.patrol,
        skipDrain: false,
        altitude: robot.type === 'air' ? CRUISING_ALT : 0,
      };
    }

    const target = state.lastPatrolPos || { lat: robot.lat, lng: robot.lon };
    const pos = interpolateToward(
      state.resumeFrom.lat, state.resumeFrom.lng,
      target.lat, target.lng,
      state.resumeProgress
    );

    const heading = Math.atan2(
      target.lng - state.resumeFrom.lng,
      target.lat - state.resumeFrom.lat
    );

    return {
      lat: pos.lat,
      lng: pos.lng,
      heading,
      status: STATUS_MAP.resuming,
      skipDrain: false,
      altitude: robot.type === 'air' ? CRUISING_ALT * state.resumeProgress : 0,
    };
  }

  // Fallback (should never reach)
  return {
    lat: robot.lat,
    lng: robot.lon,
    heading: null,
    status: 'active',
    skipDrain: false,
    altitude: 0,
  };
}

module.exports = {
  initStationOccupancy,
  findNearestAvailable,
  claimStation,
  releaseStation,
  getStationOccupancyData,
  processChargingState,
};
