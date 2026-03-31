const { Router } = require('express');
const auth = require('../middleware/auth');
const { startSimulator, stopSimulator, isRunning } = require('../services/simulator');

const router = Router();

router.use(auth);

router.post('/start', async (req, res, next) => {
  try {
    await startSimulator();
    res.json({ status: 'running' });
  } catch (err) {
    next(err);
  }
});

router.post('/stop', (req, res) => {
  stopSimulator();
  res.json({ status: 'stopped' });
});

router.get('/status', (req, res) => {
  res.json({ status: isRunning() ? 'running' : 'stopped' });
});

module.exports = router;
