/**
 * Waypoint graph for ground robot pathing in Leipzig business park.
 * ~30 nodes placed along road corridors within geofence bounds
 * (lat 51.3782-51.3807, lng 12.4165-12.4210).
 */

// Waypoints placed at road intersections and curves
const WAYPOINTS = [
  // Northern road (west to east)
  { id: 0,  lat: 51.3803, lng: 12.4168 },
  { id: 1,  lat: 51.3804, lng: 12.4175 },
  { id: 2,  lat: 51.3805, lng: 12.4182 },
  { id: 3,  lat: 51.3804, lng: 12.4190 },
  { id: 4,  lat: 51.3803, lng: 12.4197 },
  { id: 5,  lat: 51.3804, lng: 12.4205 },

  // Central-north connector (north-south links)
  { id: 6,  lat: 51.3800, lng: 12.4175 },
  { id: 7,  lat: 51.3800, lng: 12.4190 },
  { id: 8,  lat: 51.3800, lng: 12.4205 },

  // Central road (west to east)
  { id: 9,  lat: 51.3796, lng: 12.4168 },
  { id: 10, lat: 51.3795, lng: 12.4175 },
  { id: 11, lat: 51.3796, lng: 12.4182 },
  { id: 12, lat: 51.3795, lng: 12.4188 },
  { id: 13, lat: 51.3796, lng: 12.4195 },
  { id: 14, lat: 51.3795, lng: 12.4202 },
  { id: 15, lat: 51.3796, lng: 12.4208 },

  // Central-south connector (north-south links)
  { id: 16, lat: 51.3792, lng: 12.4175 },
  { id: 17, lat: 51.3792, lng: 12.4188 },
  { id: 18, lat: 51.3792, lng: 12.4202 },

  // Southern road (west to east)
  { id: 19, lat: 51.3788, lng: 12.4168 },
  { id: 20, lat: 51.3787, lng: 12.4175 },
  { id: 21, lat: 51.3788, lng: 12.4182 },
  { id: 22, lat: 51.3787, lng: 12.4190 },
  { id: 23, lat: 51.3788, lng: 12.4197 },
  { id: 24, lat: 51.3787, lng: 12.4205 },

  // Far south connector
  { id: 25, lat: 51.3784, lng: 12.4175 },
  { id: 26, lat: 51.3784, lng: 12.4190 },
  { id: 27, lat: 51.3784, lng: 12.4205 },
];

// Bidirectional adjacency list — EDGES[id] = [neighborIds]
const EDGES = {
  // Northern road
  0:  [1, 9],
  1:  [0, 2, 6],
  2:  [1, 3, 11],
  3:  [2, 4, 7],
  4:  [3, 5, 13],
  5:  [4, 8],

  // Central-north connectors
  6:  [1, 10],
  7:  [3, 12],
  8:  [5, 15],

  // Central road
  9:  [0, 10, 19],
  10: [9, 11, 6, 16],
  11: [10, 12, 2],
  12: [11, 13, 7, 17],
  13: [12, 14, 4],
  14: [13, 15, 18],
  15: [14, 8],

  // Central-south connectors
  16: [10, 20],
  17: [12, 22],
  18: [14, 24],

  // Southern road
  19: [9, 20],
  20: [19, 21, 16, 25],
  21: [20, 22],
  22: [21, 23, 17, 26],
  23: [22, 24],
  24: [23, 18, 27],

  // Far south
  25: [20, 26],
  26: [25, 22, 27],
  27: [26, 24],
};

/**
 * A* pathfinding on the waypoint graph.
 * Uses Euclidean distance heuristic (sufficient for ~300m area).
 * Returns ordered array of waypoint IDs from start to goal, or null if no path.
 */
function astar(startId, goalId) {
  const goal = WAYPOINTS[goalId];
  if (!goal) return null;
  const start = WAYPOINTS[startId];
  if (!start) return null;

  function heuristic(id) {
    const wp = WAYPOINTS[id];
    const dlat = wp.lat - goal.lat;
    const dlng = wp.lng - goal.lng;
    return Math.sqrt(dlat * dlat + dlng * dlng);
  }

  function dist(a, b) {
    const wa = WAYPOINTS[a];
    const wb = WAYPOINTS[b];
    const dlat = wa.lat - wb.lat;
    const dlng = wa.lng - wb.lng;
    return Math.sqrt(dlat * dlat + dlng * dlng);
  }

  const openSet = new Set([startId]);
  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  for (let i = 0; i < WAYPOINTS.length; i++) {
    gScore[i] = Infinity;
    fScore[i] = Infinity;
  }
  gScore[startId] = 0;
  fScore[startId] = heuristic(startId);

  while (openSet.size > 0) {
    // Pick node in openSet with lowest fScore
    let current = null;
    let bestF = Infinity;
    for (const id of openSet) {
      if (fScore[id] < bestF) {
        bestF = fScore[id];
        current = id;
      }
    }

    if (current === goalId) {
      // Reconstruct path
      const path = [current];
      let node = current;
      while (cameFrom[node] !== undefined) {
        node = cameFrom[node];
        path.unshift(node);
      }
      return path;
    }

    openSet.delete(current);
    const neighbors = EDGES[current] || [];

    for (const neighbor of neighbors) {
      const tentativeG = gScore[current] + dist(current, neighbor);
      if (tentativeG < gScore[neighbor]) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + heuristic(neighbor);
        openSet.add(neighbor);
      }
    }
  }

  return null; // No path found
}

/**
 * Fixed patrol routes for ground robots.
 * Each route is a closed loop of waypoint IDs (8-12 waypoints).
 * Routes use different parts of the park to avoid robot stacking.
 */
const GROUND_ROUTES = {
  'Ground-Alpha': [10, 6, 1, 2, 11, 12, 7, 3, 4, 13, 12, 11, 10],
  'Ground-Beta':  [22, 17, 12, 13, 14, 18, 24, 23, 22, 21, 20, 16, 10, 11, 12, 17, 22],
  'Ground-Gamma': [20, 25, 26, 27, 24, 23, 22, 21, 20, 19, 9, 10, 16, 20],
  'Ground-Delta': [13, 4, 5, 8, 15, 14, 18, 24, 27, 26, 22, 17, 12, 13],
  'Ground-Epsilon': [11, 2, 3, 7, 12, 17, 22, 26, 25, 20, 16, 10, 11],
};

module.exports = { WAYPOINTS, EDGES, astar, GROUND_ROUTES };
