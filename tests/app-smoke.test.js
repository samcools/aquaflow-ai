'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.DEMO_MODE = 'true';
process.env.DEMO_ADMIN_EMAIL = 'demo@aquaflow.local';
process.env.DEMO_ADMIN_PASSWORD = 'ChangeMe!2026';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-aquaflow';

const { app } = require('../backend/app');

let server;
let baseUrl;

test.before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

test('health endpoint starts and identifies AquaFlow', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'AquaFlow AI');
});

test('demo login returns an expiring authenticated session', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@aquaflow.local',
      password: 'ChangeMe!2026',
      role: 'Executive'
    })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.token);
  assert.equal(body.user.role, 'Executive');
  assert.ok(body.expiresIn > 0);
});

test('authenticated executive can retrieve tenant-scoped dashboard', async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@aquaflow.local', password: 'ChangeMe!2026', role: 'Executive' })
  });
  const { token } = await login.json();
  const response = await fetch(`${baseUrl}/api/dashboard`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.synthetic, true);
  assert.ok(Array.isArray(body.projects));
  assert.ok(Array.isArray(body.incidents));
  assert.ok(body.summary);
});

test('read-only user cannot create a project', async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@aquaflow.local', password: 'ChangeMe!2026', role: 'Read-Only Oversight User' })
  });
  const { token } = await login.json();
  const response = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Forbidden Project', owner: 'Read Only User' })
  });
  assert.equal(response.status, 403);
});
