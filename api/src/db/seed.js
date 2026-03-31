const bcrypt = require('bcryptjs');

async function seed(pool) {
  const hash = await bcrypt.hash('test123', 10);

  await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
    ['admin@test.com', hash]
  );

  // Clear old robots and insert 8 typed robots (5 ground + 3 air)
  await pool.query('TRUNCATE robots RESTART IDENTITY CASCADE');

  const robots = [
    { name: 'Ground-Alpha',   type: 'ground', lat: 51.3795, lng: 12.4180, battery: 95 },
    { name: 'Ground-Beta',    type: 'ground', lat: 51.3790, lng: 12.4190, battery: 82 },
    { name: 'Ground-Gamma',   type: 'ground', lat: 51.3788, lng: 12.4175, battery: 68 },
    { name: 'Ground-Delta',   type: 'ground', lat: 51.3798, lng: 12.4195, battery: 91 },
    { name: 'Ground-Epsilon', type: 'ground', lat: 51.3793, lng: 12.4188, battery: 77 },
    { name: 'Air-Eagle',      type: 'air',    lat: 51.3797, lng: 12.4183, battery: 88 },
    { name: 'Air-Hawk',       type: 'air',    lat: 51.3792, lng: 12.4192, battery: 74 },
    { name: 'Air-Falcon',     type: 'air',    lat: 51.3800, lng: 12.4188, battery: 60 },
  ];

  for (const robot of robots) {
    await pool.query(
      'INSERT INTO robots (name, type, lat, lon, battery) VALUES ($1, $2, $3, $4, $5)',
      [robot.name, robot.type, robot.lat, robot.lng, robot.battery]
    );
  }

  console.log('Seed data loaded (8 robots: 5 ground + 3 air)');

  // Charging stations
  await pool.query('DELETE FROM charging_stations');
  const stations = [
    { name: 'Station-NW',     lat: 51.3803, lng: 12.4170, capacity: 2 },
    { name: 'Station-Center', lat: 51.3793, lng: 12.4188, capacity: 2 },
    { name: 'Station-SE',     lat: 51.3785, lng: 12.4205, capacity: 2 },
  ];
  for (const s of stations) {
    await pool.query(
      'INSERT INTO charging_stations (name, latitude, longitude, capacity) VALUES ($1, $2, $3, $4)',
      [s.name, s.lat, s.lng, s.capacity]
    );
  }
  console.log('Seed data loaded (3 charging stations)');
}

module.exports = seed;
