const { pool } = require('../db/pool');
const { getCachedRobots, invalidateRobotsCache } = require('./cacheService');

async function getAllRobots() {
  return getCachedRobots(async () => {
    const { rows } = await pool.query(
      'SELECT id, name, status, lat AS latitude, lon AS longitude, battery, type, updated_at, created_at FROM robots ORDER BY id'
    );
    return rows;
  });
}

async function createRobot(name, latitude, longitude) {
  const { rows } = await pool.query(
    'INSERT INTO robots (name, lat, lon) VALUES ($1, $2, $3) RETURNING id, name, status, lat AS latitude, lon AS longitude, battery, updated_at, created_at',
    [name, latitude, longitude]
  );
  await invalidateRobotsCache();
  return rows[0];
}

async function moveRobot(id) {
  const latOffset = (Math.random() - 0.5) * 0.001;
  const lngOffset = (Math.random() - 0.5) * 0.001;

  const { rows } = await pool.query(
    'UPDATE robots SET lat = lat + $1, lon = lon + $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, status, lat AS latitude, lon AS longitude, battery, updated_at, created_at',
    [latOffset, lngOffset, id]
  );

  if (rows.length === 0) {
    const err = new Error('Robot not found');
    err.status = 404;
    throw err;
  }

  await invalidateRobotsCache();
  return rows[0];
}

module.exports = { getAllRobots, createRobot, moveRobot };
