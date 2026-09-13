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
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({email:'demo@aquaflow.local',password:'ChangeMe!2026',role})
  });
  assert.equal(response.status,200);
  return (await response.json()).token;
}

async function command(token, text) {
  return fetch(`${baseUrl}/api/assistant/command`, {
    method:'POST',
    headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
    body:JSON.stringify({command:text})
  });
}

test.before(async () => {
  await new Promise(resolve => {
    server=httpApp.listen(0,'127.0.0.1',()=>{
      baseUrl=`http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
  const admin=await tokenFor('System Administrator');
  await fetch(`${baseUrl}/api/demo/reset`,{method:'POST',headers:{authorization:`Bearer ${admin}`}});
});

test.after(async () => {
  if(server) await new Promise(resolve=>server.close(resolve));
});

test('Ayanda can navigate to work orders', async () => {
  const token=await tokenFor('Executive');
  const response=await command(token,'Open work orders');
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.type,'navigate');
  assert.equal(body.target,'work-orders');
});

test('authorised voice command updates project progress', async () => {
  const token=await tokenFor('System Administrator');
  const response=await command(token,'Set project proj-001 progress to 75');
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.type,'action');
  assert.equal(body.record.id,'proj-001');
  assert.equal(body.record.progress,75);
});

test('authorised voice command assigns incident team', async () => {
  const token=await tokenFor('System Administrator');
  const response=await command(token,'Assign incident inc-1042 to Network Response Team');
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.type,'action');
  assert.equal(body.record.id,'inc-1042');
  assert.equal(body.record.assignedTeam,'Network Response Team');
});

test('read-only role cannot update project through voice', async () => {
  const token=await tokenFor('Read-Only Oversight User');
  const response=await command(token,'Set project proj-001 progress to 90');
  assert.equal(response.status,403);
});

test('voice validation rejects invalid progress', async () => {
  const token=await tokenFor('System Administrator');
  const response=await command(token,'Set project proj-001 progress to 145');
  assert.equal(response.status,400);
  const body=await response.json();
  assert.match(body.error,/between 0 and 100/i);
});
