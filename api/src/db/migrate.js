async function migrate(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS robots (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'idle',
      lat DOUBLE PRECISION NOT NULL,
      lon DOUBLE PRECISION NOT NULL,
      battery INTEGER DEFAULT 100,
      updated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // v2.0: Add robot type column
  await pool.query(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'ground';
  `);

  // v2.0: Charging stations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS charging_stations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      capacity INTEGER DEFAULT 2,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // v2.0: Position history for trail visualization
  await pool.query(`
    CREATE TABLE IF NOT EXISTS robot_positions (
      id SERIAL PRIMARY KEY,
      robot_id INTEGER NOT NULL REFERENCES robots(id),
      lat DOUBLE PRECISION NOT NULL,
      lon DOUBLE PRECISION NOT NULL,
      recorded_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_robot_positions_robot_id ON robot_positions(robot_id);
    CREATE INDEX IF NOT EXISTS idx_robot_positions_recorded_at ON robot_positions(recorded_at);
  `);

  console.log('Database migration complete');
}

module.exports = migrate;
