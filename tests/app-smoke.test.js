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

test('root page uses the first AquaFlow design rather than Project Guardian overrides', async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /styles\.css/);
  assert.match(body, /original-dashboard\.js/);
  assert.match(body, /first-aquaflow-design\.js/);
  assert.doesNotMatch(body, /original-dashboard\.css/);
  assert.doesNotMatch(body, /original-layout\.js/);
  assert.match(body, /AquaFlow AI/);
});

test('AquaFlow logo, transparent Pyrneo assets and unified voice controller are served', async () => {
  const [logoResponse, pyrneoResponse, voiceResponse, designResponse] = await Promise.all([
    fetch(`${baseUrl}/aquaflow-logo.svg`),
    fetch(`${baseUrl}/pyrneo-logo.svg`),
    fetch(`${baseUrl}/original-dashboard.js`),
    fetch(`${baseUrl}/first-aquaflow-design.js`)
  ]);
  assert.equal(logoResponse.status, 200);
  assert.equal(pyrneoResponse.status, 200);
  assert.equal(voiceResponse.status, 200);
  assert.equal(designResponse.status, 200);
  assert.match(await logoResponse.text(), /AquaFlow/);
  assert.match(await pyrneoResponse.text(), /Pyrneo/);
  const voiceBody = await voiceResponse.text();
  assert.match(voiceBody, /Hey, Ayanda/);
  assert.match(voiceBody, /ayanda-bot-icon/);
  assert.match(voiceBody, /speechSynthesis\.cancel/);
  const designBody = await designResponse.text();
  assert.match(designBody, /Go to AquaFlow home/);
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

test('authenticated executive can retrieve a full synthetic AquaFlow portfolio', async () => {
  const loginResponse = await login('Executive');
  const { token } = await loginResponse.json();
  const response = await fetch(`${baseUrl}/api/dashboard`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.synthetic, true);
  assert.ok(Array.isArray(body.projects));
  assert.ok(body.projects.length >= 10);
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