const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const robotService = require('../services/robotService');
const { redis } = require('../config/redis');

const router = Router();

// All robot routes require authentication
router.use(auth);

// GET / — list all robots (cached)
router.get('/', async (req, res) => {
  const robots = await robotService.getAllRobots();
  res.json(robots);
});

// POST / — create a new robot
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Name required, max 100 chars')
      .matches(/^[^<>]*$/).withMessage('Name must not contain HTML tags')
      .customSanitizer(value => value.replace(/<[^>]*>/g, '')),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const robot = await robotService.createRobot(
      req.body.name,
      parseFloat(req.body.latitude),
      parseFloat(req.body.longitude)
    );
    res.status(201).json(robot);
  }
);

// POST /:id/move — move a robot by random offset
router.post(
  '/:id/move',
  [param('id').isInt().withMessage('Valid robot ID required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const robot = await robotService.moveRobot(parseInt(req.params.id));
      await redis.publish('robot:positions', JSON.stringify({
        type: 'position_update',
        data: [robot],
      }));
      res.json(robot);
    } catch (err) {
      if (err.status === 404) {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }
  }
);

// GET /:id/positions — historical position trail
router.get(
  '/:id/positions',
  [param('id').isInt().withMessage('Valid robot ID required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const robotId = parseInt(req.params.id);
    const minutes = parseInt(req.query.minutes) || 0; // 0 = all

    const { pool } = require('../db/pool');
    let query = 'SELECT lat, lon, recorded_at FROM robot_positions WHERE robot_id = $1';
    const params = [robotId];

    if (minutes > 0) {
      query += ` AND recorded_at >= NOW() - INTERVAL '${minutes} minutes'`;
    }

    query += ' ORDER BY recorded_at ASC LIMIT 5000';

    const { rows } = await pool.query(query, params);
    res.json(rows.map(r => ({
      latitude: r.lat,
      longitude: r.lon,
      recordedAt: r.recorded_at,
    })));
  }
);

module.exports = router;
