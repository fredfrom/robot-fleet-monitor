const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const robotRoutes = require('./routes/robots');
const simulationRoutes = require('./routes/simulation');
const stationRoutes = require('./routes/stations');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/robots', robotRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/stations', stationRoutes);

app.use(errorHandler);

module.exports = app;
