const { Router } = require('express');
const auth = require('../middleware/auth');
const { pool } = require('../db/pool');

const router = Router();

// All station routes require authentication
router.use(auth);

// GET / — list all charging stations
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, latitude, longitude, capacity FROM charging_stations ORDER BY id'
  );
  res.json(rows);
});

module.exports = router;
