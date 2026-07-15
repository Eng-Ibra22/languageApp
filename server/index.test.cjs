const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const dbPath = path.join(os.tmpdir(), `lingua-test-${process.pid}.db`);
process.env.DATABASE_PATH = dbPath;
process.env.JWT_SECRET = 'test-secret';
const { app, db } = require('./index.cjs');
let server;
let baseUrl;

test.before(async () => { server = app.listen(0); await new Promise((resolve) => server.once('listening', resolve)); baseUrl = `http://127.0.0.1:${server.address().port}`; });
test.after(() => { db.close(); server.close(); for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) fs.rmSync(file, { force: true }); });

async function api(pathname, options = {}) { const response = await fetch(`${baseUrl}${pathname}`, options); return { response, body: response.status === 204 ? null : await response.json() }; }

test('registration, protected lessons, progress, and password reset are available', async () => {
  const email = `learner-${Date.now()}@example.com`;
  const registration = await api('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'secure-password-123', full_name: 'Learner' }) });
  assert.equal(registration.response.status, 201);
  const headers = { Authorization: `Bearer ${registration.body.access_token}`, 'Content-Type': 'application/json' };
  const lessons = await api('/api/lessons', { headers });
  assert.equal(lessons.response.status, 200); assert.ok(lessons.body.length >= 8);
  const completed = await api(`/api/progress/${lessons.body[0].id}`, { method: 'PUT', headers, body: JSON.stringify({ score: 100 }) });
  assert.equal(completed.body.xp_earned, lessons.body[0].xp_reward);
  const progress = await api('/api/progress', { headers });
  assert.equal(progress.body.length, 1);
  const reset = await api('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
  assert.equal(reset.response.status, 200);
});
