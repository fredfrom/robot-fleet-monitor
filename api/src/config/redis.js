const Redis = require('ioredis');
const config = require('./index');

const redis = new Redis(config.redisUrl);
redis.on('error', (err) => console.error('Redis error:', err));

// Separate connection for pub/sub (Phase 2 will use this)
const redisSub = new Redis(config.redisUrl);
redisSub.on('error', (err) => console.error('Redis sub error:', err));

module.exports = { redis, redisSub };
