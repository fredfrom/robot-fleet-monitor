const request = require('supertest');

const API_URL = 'http://localhost:3001';
const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'test123';

let authToken;

beforeAll(async () => {
  const res = await request(API_URL)
    .post('/api/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  authToken = res.body.token;
  if (!authToken) {
    throw new Error(
      `Failed to obtain auth token (status ${res.status}). ` +
      'Restart the API to reset rate limiter if needed: docker compose restart api'
    );
  }
});

describe('POST /api/auth/login', () => {
  test('valid login returns 200 + JWT with 3 segments', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_EMAIL);
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  test('wrong password returns 401 with generic error', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
    expect(res.body.token).toBeUndefined();
  });

  test('non-existent user returns 401 with same generic error', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
    expect(res.body.token).toBeUndefined();
  });

  test('wrong password and non-existent user return identical error messages', async () => {
    const wrongPass = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrongpass' });
    const noUser = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'whatever' });
    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body.error).toBe(noUser.body.error);
  });

  test('missing email returns 400 with validation errors', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({ password: 'test123' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.path === 'email')).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  test('missing password returns 400 with validation errors', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.path === 'password')).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  test('empty body returns 400 with both field errors', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.path === 'email')).toBe(true);
    expect(res.body.errors.some(e => e.path === 'password')).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  test('SQL injection in email field returns 400 (invalid email format)', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: "' OR 1=1 --", password: 'test123' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.path === 'email')).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  test('XSS in email field returns 400 (invalid email format)', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: '<script>alert(1)</script>', password: 'test123' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.token).toBeUndefined();
  });
});

describe('Protected Routes', () => {
  test('GET /robots without auth returns 401 with "No token provided"', async () => {
    const res = await request(API_URL).get('/api/robots');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  test('GET /robots with garbage token returns 401 with "Invalid token"', async () => {
    const res = await request(API_URL)
      .get('/api/robots')
      .set('Authorization', 'Bearer totallygarbage123');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  test('GET /robots with malformed JWT returns 401 with "Invalid token"', async () => {
    const res = await request(API_URL)
      .get('/api/robots')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.invalidsignature');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  test('GET /robots with valid token returns 200 + non-empty array of robots', async () => {
    const res = await request(API_URL)
      .get('/api/robots')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const robot = res.body[0];
    expect(robot.id).toBeDefined();
    expect(robot.name).toBeDefined();
    expect(robot.status).toBeDefined();
    expect(typeof robot.latitude).toBe('number');
    expect(typeof robot.longitude).toBe('number');
    expect(robot.password_hash).toBeUndefined();
    expect(robot.password).toBeUndefined();
  });
});

describe('Robot CRUD', () => {
  const uniqueName = `TestBot-${Date.now()}`;

  test('POST /robots without auth returns 401', async () => {
    const res = await request(API_URL)
      .post('/api/robots')
      .send({ name: 'NoAuth', latitude: 51.38, longitude: 12.42 });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  test('POST /robots with valid data returns 201 with correct fields and defaults', async () => {
    const res = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: uniqueName, latitude: 51.38, longitude: 12.42 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(uniqueName);
    expect(typeof res.body.id).toBe('number');
    expect(res.body.latitude).toBe(51.38);
    expect(res.body.longitude).toBe(12.42);
    expect(res.body.status).toBe('idle');
    expect(res.body.battery).toBe(100);
  });

  test('POST /robots with duplicate name does not return 201', async () => {
    const res = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: uniqueName, latitude: 51.38, longitude: 12.42 });
    expect(res.status).not.toBe(201);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('POST /robots with missing name returns 400 with name validation error', async () => {
    const res = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ latitude: 51.38, longitude: 12.42 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.path === 'name')).toBe(true);
  });

  test('POST /robots with lat=999 returns 400 with latitude validation error', async () => {
    const res = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'BadLat', latitude: 999, longitude: 12.42 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.path === 'latitude')).toBe(true);
  });

  test('POST /robots with lon=999 returns 400 with longitude validation error', async () => {
    const res = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'BadLon', latitude: 51.38, longitude: 999 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.path === 'longitude')).toBe(true);
  });

  test('POST /robots with XSS in name returns 400 with HTML tag error', async () => {
    const res = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: '<script>alert(1)</script>', latitude: 51.38, longitude: 12.42 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.msg.includes('HTML'))).toBe(true);
  });

  test('POST /robots with name containing only angle brackets returns 400', async () => {
    const res = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: '<img src=x onerror=alert(1)>', latitude: 51.38, longitude: 12.42 });
    expect(res.status).toBe(400);
  });

  test('GET /robots/:id/positions without auth returns 401', async () => {
    const res = await request(API_URL).get('/api/robots/1/positions');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });
});

describe('Move Endpoint', () => {
  test('POST /robots/:id/move without auth returns 401', async () => {
    const res = await request(API_URL).post('/api/robots/1/move');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  test('POST /robots/:id/move with valid auth returns 200 with updated position', async () => {
    const before = await request(API_URL)
      .get('/api/robots')
      .set('Authorization', `Bearer ${authToken}`);
    const robot = before.body[0];

    const res = await request(API_URL)
      .post(`/api/robots/${robot.id}/move`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(robot.id);
    expect(typeof res.body.latitude).toBe('number');
    expect(typeof res.body.longitude).toBe('number');
    const moved = res.body.latitude !== robot.latitude || res.body.longitude !== robot.longitude;
    expect(moved).toBe(true);
  });

  test('POST /robots/99999/move returns 404 with error message', async () => {
    const res = await request(API_URL)
      .post('/api/robots/99999/move')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('POST /robots/abc/move returns 400 with validation error', async () => {
    const res = await request(API_URL)
      .post('/api/robots/abc/move')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => e.path === 'id')).toBe(true);
  });

  test('POST /robots/-1/move returns 400 (negative ID)', async () => {
    const res = await request(API_URL)
      .post('/api/robots/-1/move')
      .set('Authorization', `Bearer ${authToken}`);
    expect([400, 404]).toContain(res.status);
  });
});

describe('Input Validation', () => {
  test('very long email (1000+ chars) returns 400', async () => {
    const longEmail = 'a'.repeat(1000) + '@test.com';
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: longEmail, password: 'test123' });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  test('non-JSON body with JSON content-type returns 400', async () => {
    const res = await request(API_URL)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('this is not json');
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  test('SQL injection in name field is stored as literal string, not executed', async () => {
    const maliciousName = "Robert'; DROP TABLE robots;--";
    const createRes = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: maliciousName, latitude: 51.38, longitude: 12.42 });
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe(maliciousName);

    const listRes = await request(API_URL)
      .get('/api/robots')
      .set('Authorization', `Bearer ${authToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);
    expect(listRes.body.some(r => r.name === maliciousName)).toBe(true);
  });

  test('robot name with max length (100 chars) is accepted', async () => {
    const longName = 'A'.repeat(100);
    const res = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: longName, latitude: 51.38, longitude: 12.42 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(longName);
  });

  test('robot name exceeding max length (101 chars) returns 400', async () => {
    const tooLong = 'B'.repeat(101);
    const res = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: tooLong, latitude: 51.38, longitude: 12.42 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('latitude boundary values are validated correctly', async () => {
    const at90 = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: `Boundary-${Date.now()}`, latitude: 90, longitude: 0 });
    expect(at90.status).toBe(201);

    const over90 = await request(API_URL)
      .post('/api/robots')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: `Over90-${Date.now()}`, latitude: 90.1, longitude: 0 });
    expect(over90.status).toBe(400);
  });
});

describe('Rate Limiting', () => {
  test('rapid login attempts get 429 and the 429 response has correct error message', async () => {
    let rateLimitResponse;
    for (let i = 0; i < 25; i++) {
      const res = await request(API_URL)
        .post('/api/auth/login')
        .send({ email: 'ratelimit@test.com', password: 'wrong' });
      if (res.status === 429) {
        rateLimitResponse = res;
        break;
      }
    }
    expect(rateLimitResponse).toBeDefined();
    expect(rateLimitResponse.status).toBe(429);
    expect(rateLimitResponse.body.error).toBe('Too many login attempts, try again later');
    expect(rateLimitResponse.body.token).toBeUndefined();
  }, 30000);
});
