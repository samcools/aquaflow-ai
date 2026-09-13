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

async function tokenFor(role) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email:'demo@aquaflow.local', password:'ChangeMe!2026', role })
  });
  return (await response.json()).token;
}

async function reset(token) {
  await fetch(`${baseUrl}/api/demo/reset`, { method:'POST', headers:{ authorization:`Bearer ${token}` } });
}

test.before(async () => {
  await new Promise(resolve => {
    server = httpApp.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

test('read-only role cannot preview privileged asset import', async () => {
  const token = await tokenFor('Read-Only Oversight User');
  const response = await fetch(`${baseUrl}/api/imports/csv/preview?resource=assets`, {
    method:'POST', headers:{ authorization:`Bearer ${token}`, 'content-type':'text/csv' },
    body:'name,type,zone\nImported Valve,valve,Central Pressure Zone\n'
  });
  assert.equal(response.status, 403);
});

test('administrator previews valid CSV without mutating data', async () => {
  const token = await tokenFor('System Administrator');
  await reset(token);
  const response = await fetch(`${baseUrl}/api/imports/csv/preview?resource=assets`, {
    method:'POST', headers:{ authorization:`Bearer ${token}`, 'content-type':'text/csv' },
    body:'name,type,zone,unknown field\nImported Valve,valve,Central Pressure Zone,ignored\n'
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.totalRows, 1);
  assert.equal(body.validRows, 1);
  assert.equal(body.invalidRows, 0);
  assert.deepEqual(body.unknownHeaders, ['unknownField']);
  assert.equal(body.canApply, true);
});

test('administrator applies validated CSV and import appears in history', async () => {
  const token = await tokenFor('System Administrator');
  await reset(token);
  const csv = 'name,type,zone,condition,criticality\nImported Valve 77,valve,Central Pressure Zone,good,high\n';
  const apply = await fetch(`${baseUrl}/api/imports/csv/apply?resource=assets`, {
    method:'POST', headers:{ authorization:`Bearer ${token}`, 'content-type':'text/csv' }, body:csv
  });
  assert.equal(apply.status, 201);
  const applied = await apply.json();
  assert.equal(applied.imported, 1);
  assert.equal(applied.rejected, 0);
  assert.ok(applied.importId);

  const history = await fetch(`${baseUrl}/api/imports/history`, { headers:{ authorization:`Bearer ${token}` } });
  assert.equal(history.status, 200);
  const rows = await history.json();
  assert.equal(rows.some(row => row.id === applied.importId && row.resource === 'assets'), true);
  await reset(token);
});

test('atomic apply refuses file containing invalid rows', async () => {
  const token = await tokenFor('System Administrator');
  await reset(token);
  const response = await fetch(`${baseUrl}/api/imports/csv/apply?resource=meters`, {
    method:'POST', headers:{ authorization:`Bearer ${token}`, 'content-type':'text/csv' },
    body:'account reference,zone\n,Central Pressure Zone\n'
  });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.invalidRows, 1);
  await reset(token);
});
