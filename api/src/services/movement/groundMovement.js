/**
 * Ground robot movement — waypoint-based interpolation along patrol routes.
 * Ground robots move slowly and deliberately along road-aware paths.
 */

const { WAYPOINTS, GROUND_ROUTES } = require('./waypointGraph');

// Ground step size: ~8 ticks per segment (16s at 2s tick interval)
const STEP_SIZE = 0.125;

/**
 * Initialize ground robot movement state.
 * @param {string} robotName - Robot name (e.g. 'Ground-Alpha')
 * @returns {{ routeWaypoints: number[], waypointIndex: number, progress: number, prevLat: number|null, prevLng: number|null }}
 */
function initGroundState(robotName) {
  const routeWaypoints = GROUND_ROUTES[robotName];
  if (!routeWaypoints) {
    throw new Error(`No ground route for robot: ${robotName}`);
  }
  return {
    routeWaypoints,
    waypointIndex: 0,
    progress: 0,
    prevLat: null,
    prevLng: null,
  };
}

/**
 * Advance a ground robot one step along its patrol route.
 * Linear interpolation between consecutive waypoints.
 * @param {number} robotId
 * @param {object} state - Mutable state object from initGroundState
 * @returns {{ lat: number, lng: number, heading: number }}
 */
function advanceGroundRobot(robotId, state) {
  state.progress += STEP_SIZE;

  if (state.progress >= 1.0) {
    state.progress -= 1.0;
    state.waypointIndex = (state.waypointIndex + 1) % state.routeWaypoints.length;
  }

  const fromWpId = state.routeWaypoints[state.waypointIndex];
  const toIdx = (state.waypointIndex + 1) % state.routeWaypoints.length;
  const toWpId = state.routeWaypoints[toIdx];

  const from = WAYPOINTS[fromWpId];
  const to = WAYPOINTS[toWpId];

  const lat = from.lat + (to.lat - from.lat) * state.progress;
  const lng = from.lng + (to.lng - from.lng) * state.progress;

  // Compute heading from previous position or toward next waypoint
  let heading;
  if (state.prevLat !== null && state.prevLng !== null) {
    heading = Math.atan2(lng - state.prevLng, lat - state.prevLat);
  } else {
    heading = Math.atan2(to.lng - from.lng, to.lat - from.lat);
  }

  state.prevLat = lat;
  state.prevLng = lng;

  return { lat, lng, heading };
}

module.exports = { initGroundState, advanceGroundRobot };
