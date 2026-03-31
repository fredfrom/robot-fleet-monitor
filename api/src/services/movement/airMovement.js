/**
 * Air robot movement — parametric pattern generators.
 * Air robots move 3x faster than ground robots and execute search patterns.
 */

/**
 * Grid search pattern — back-and-forth horizontal sweeps advancing vertically.
 */
function gridStep(state) {
  const stepSize = 0.0004; // ~40m per tick, roughly 3x ground speed

  // Smooth turning at sweep edges — small arc instead of sharp reversal
  if (state.turning) {
    state.turnProgress += 0.25;
    if (state.turnProgress >= 1.0) {
      state.turning = false;
      state.turnProgress = 0;
    }
    // Arc during turn
    const angle = Math.PI * state.turnProgress * state.direction;
    const turnRadius = state.spacing / 2;
    return {
      lat: state.center.lat + state.y + turnRadius * (1 - Math.cos(angle)),
      lng: state.center.lng + state.x + turnRadius * Math.sin(angle) * -state.direction,
    };
  }

  state.x += stepSize * state.direction;

  const halfWidth = 0.0015; // ~150m each side of center
  if (Math.abs(state.x) > halfWidth) {
    state.x = halfWidth * state.direction;
    state.direction *= -1;
    state.y += state.spacing;
    if (state.y > state.halfHeight) {
      state.y = -state.halfHeight;
    }
    // Start smooth turn
    state.turning = true;
    state.turnProgress = 0;
  }

  return {
    lat: state.center.lat + state.y,
    lng: state.center.lng + state.x,
  };
}

/**
 * Expanding spiral pattern — spirals outward then resets to center.
 */
function spiralStep(state) {
  state.angle += state.angularStep;
  state.radius += state.expansionRate;

  if (state.radius > state.maxRadius) {
    state.radius = state.minRadius;
    state.angle = 0;
  }

  return {
    lat: state.center.lat + state.radius * Math.cos(state.angle),
    lng: state.center.lng + state.radius * Math.sin(state.angle),
  };
}

/**
 * Perimeter sweep — walks edges of a rectangle matching geofence bounds.
 */
function perimeterStep(state) {
  state.progress += state.stepSize;

  if (state.progress >= 1.0) {
    state.progress = 0;
    state.edgeIndex = (state.edgeIndex + 1) % state.corners.length;
  }

  const from = state.corners[state.edgeIndex];
  const to = state.corners[(state.edgeIndex + 1) % state.corners.length];

  return {
    lat: from.lat + (to.lat - from.lat) * state.progress,
    lng: from.lng + (to.lng - from.lng) * state.progress,
  };
}

const AIR_PATTERNS = {
  grid: gridStep,
  spiral: spiralStep,
  perimeter: perimeterStep,
};

// Pattern assignment by robot name
const PATTERN_MAP = {
  'Air-Eagle':  'grid',
  'Air-Hawk':   'spiral',
  'Air-Falcon': 'perimeter',
};

/**
 * Initialize air robot movement state.
 * @param {string} robotName
 * @returns {object} Pattern-specific state with center point
 */
function initAirState(robotName) {
  const pattern = PATTERN_MAP[robotName];
  if (!pattern) {
    throw new Error(`No air pattern for robot: ${robotName}`);
  }

  // Default center positions per robot (from seed data)
  const centers = {
    'Air-Eagle':  { lat: 51.3797, lng: 12.4183 },
    'Air-Hawk':   { lat: 51.3792, lng: 12.4192 },
    'Air-Falcon': { lat: 51.3800, lng: 12.4188 },
  };

  const center = centers[robotName];

  const baseState = {
    pattern,
    center,
    prevLat: null,
    prevLng: null,
  };

  if (pattern === 'grid') {
    return {
      ...baseState,
      x: 0,
      y: -0.001, // start at bottom of grid
      direction: 1,
      spacing: 0.0003, // ~30m between sweeps
      halfHeight: 0.001, // ~100m each side
      turning: false,
      turnProgress: 0,
    };
  }

  if (pattern === 'spiral') {
    return {
      ...baseState,
      angle: 0,
      radius: 0.0001,
      angularStep: 0.3,
      expansionRate: 0.00003,
      minRadius: 0.0001,
      maxRadius: 0.001,
    };
  }

  if (pattern === 'perimeter') {
    return {
      ...baseState,
      edgeIndex: 0,
      progress: 0,
      stepSize: 0.04, // ~25 ticks per edge, 3x faster than ground
      corners: [
        { lat: 51.3785, lng: 12.4170 },
        { lat: 51.3803, lng: 12.4170 },
        { lat: 51.3803, lng: 12.4205 },
        { lat: 51.3785, lng: 12.4205 },
      ],
    };
  }

  return baseState;
}

/**
 * Advance an air robot one step in its pattern.
 * @param {number} robotId
 * @param {object} state - Mutable state from initAirState
 * @returns {{ lat: number, lng: number, heading: number }}
 */
function advanceAirRobot(robotId, state) {
  const patternFn = AIR_PATTERNS[state.pattern];
  if (!patternFn) {
    throw new Error(`Unknown air pattern: ${state.pattern}`);
  }

  const pos = patternFn(state);

  // Compute heading from previous position
  let heading;
  if (state.prevLat !== null && state.prevLng !== null) {
    heading = Math.atan2(pos.lng - state.prevLng, pos.lat - state.prevLat);
  } else {
    heading = 0; // Default heading on first tick
  }

  state.prevLat = pos.lat;
  state.prevLng = pos.lng;

  return { lat: pos.lat, lng: pos.lng, heading };
}

module.exports = { initAirState, advanceAirRobot, AIR_PATTERNS };
