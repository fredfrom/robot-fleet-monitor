const { redis } = require('../config/redis');

const ROBOTS_CACHE_KEY = 'robots:all';
const CACHE_TTL = 10; // seconds

async function getCachedRobots(fetchFromDb) {
  const cached = await redis.get(ROBOTS_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const robots = await fetchFromDb();
  await redis.set(ROBOTS_CACHE_KEY, JSON.stringify(robots), 'EX', CACHE_TTL);
  return robots;
}

async function invalidateRobotsCache() {
  await redis.del(ROBOTS_CACHE_KEY);
}

module.exports = { getCachedRobots, invalidateRobotsCache, ROBOTS_CACHE_KEY };
