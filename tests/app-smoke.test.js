'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.DEMO_MODE = 'true';
process.env.DEMO_ADMIN_EMAIL = 'demo@aquaflow.local';
process.env.DEMO_ADMIN_PASSWORD = 'ChangeMe!2026';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-aquaflow';

const { httpApp } = require('../backend/http');

let server;
let baseUrl;

async function login(role = 'Executive') {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@aquaflow.local', password: 'ChangeMe!2026', role })
  });
}

test.before(async () => {
  await new Promise(resolve => {
    server = httpApp.listen(0, '127.0.0.1', () => {
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

test('demo login returns token and HttpOnly same-site session cookie', async () => {
  const response = await login('Executive');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.token);
  assert.equal(body.user.role, 'Executive');
  assert.ok(body.expiresIn > 0);
  const cookie = response.headers.get('set-cookie') || '';
  assert.match(cookie, /aquaflow_session=/);
  assert.match(cookie.toLowerCase(), /httponly/);
  assert.match(cookie.toLowerCase(), /samesite=strict/);
});

test('authenticated executive can retrieve tenant-scoped dashboard', async () => {
  const loginResponse = await login('Executive');
  const { token } = await loginResponse.json();
  const response = await fetch(`${baseUrl}/api/dashboard`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.synthetic, true);
  assert.ok(Array.isArray(body.projects));
  assert.ok(Array.isArray(body.incidents));
  assert.ok(body.summary);
});

test('session cookie authenticates browser-style report download', async () => {
  const loginResponse = await login('Executive');
  const cookie = (loginResponse.headers.get('set-cookie') || '').split(';')[0];
  const response = await fetch(`${baseUrl}/api/reports/projects.csv`, { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/csv/);
  const body = await response.text();
  assert.match(body, /Central Pressure Zone Leak Reduction/);
});

test('read-only user cannot create a project', async () => {
  const loginResponse = await login('Read-Only Oversight User');
  const { token } = await loginResponse.json();
  const response = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Forbidden Project', owner: 'Read Only User' })
  });
  assert.equal(response.status, 403);
});
