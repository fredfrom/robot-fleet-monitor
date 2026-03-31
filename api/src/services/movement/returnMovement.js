/**
 * Return/resume movement — linear interpolation toward a target position.
 * Used when robots navigate to charging stations or return to patrol.
 */

/**
 * Linearly interpolate between two positions.
 * @param {number} fromLat
 * @param {number} fromLng
 * @param {number} toLat
 * @param {number} toLng
 * @param {number} progress - 0 to 1
 * @returns {{ lat: number, lng: number }}
 */
function interpolateToward(fromLat, fromLng, toLat, toLng, progress) {
  const t = Math.min(progress, 1);
  return {
    lat: fromLat + (toLat - fromLat) * t,
    lng: fromLng + (toLng - fromLng) * t,
  };
}

module.exports = { interpolateToward };
