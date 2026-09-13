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
  return fetch(`${baseUrl}/api/auth/login`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:'demo@aquaflow.local',password:'ChangeMe!2026',role}) });
}

test.before(async () => { await new Promise(resolve => { server = httpApp.listen(0,'127.0.0.1',()=>{baseUrl=`http://127.0.0.1:${server.address().port}`;resolve();}); }); });
test.after(async () => { if(server) await new Promise(resolve=>server.close(resolve)); });

test('health endpoint starts and identifies AquaFlow', async () => {
  const response=await fetch(`${baseUrl}/api/health`);assert.equal(response.status,200);const body=await response.json();assert.equal(body.status,'ok');assert.equal(body.service,'AquaFlow AI');
});

test('root page keeps first AquaFlow design and injects neural voice/product polish', async () => {
  const response=await fetch(`${baseUrl}/`);assert.equal(response.status,200);const body=await response.text();
  assert.match(body,/styles\.css/);assert.match(body,/product-polish\.css/);assert.match(body,/pyrneo-brand\.css/);assert.match(body,/openai-voice\.js/);assert.match(body,/original-dashboard\.js/);assert.match(body,/first-aquaflow-design\.js/);assert.doesNotMatch(body,/original-dashboard\.css/);assert.doesNotMatch(body,/original-layout\.js/);assert.match(body,/AquaFlow AI/);
});

test('supplied Pyrneo wordmark and transparent brand treatment are served', async () => {
  const [pyrneoResponse,brandResponse,designResponse]=await Promise.all([fetch(`${baseUrl}/pyrneo-logo.webp`),fetch(`${baseUrl}/pyrneo-brand.css`),fetch(`${baseUrl}/first-aquaflow-design.js`)]);
  assert.equal(pyrneoResponse.status,200);assert.equal(brandResponse.status,200);assert.equal(designResponse.status,200);
  const brandBody=await brandResponse.text();assert.match(brandBody,/\.login-logo/);assert.match(brandBody,/\.sidebar-logo/);assert.match(brandBody,/background:transparent/);
  const designBody=await designResponse.text();assert.match(designBody,/pyrneo-logo\.webp/);assert.match(designBody,/makeBlackBackgroundTransparent/);assert.match(designBody,/Go to AquaFlow home/);assert.doesNotMatch(designBody,/aquaflow-logo\.svg/);
});

test('Ayanda has one wake controller and one neural output path', async () => {
  const [voiceResponse,neuralResponse,polishResponse]=await Promise.all([fetch(`${baseUrl}/original-dashboard.js`),fetch(`${baseUrl}/openai-voice.js`),fetch(`${baseUrl}/product-polish.css`)]);
  assert.equal(voiceResponse.status,200);assert.equal(neuralResponse.status,200);assert.equal(polishResponse.status,200);
  const voiceBody=await voiceResponse.text();
  assert.match(voiceBody,/Hey\/Hi Ayanda/);assert.match(voiceBody,/ayanda-bot-icon/);assert.match(voiceBody,/enableWakeWord/);assert.match(voiceBody,/wireAuthenticationAutostart/);assert.match(voiceBody,/window\.AyandaVoice/);assert.doesNotMatch(voiceBody,/SpeechSynthesisUtterance/);assert.doesNotMatch(voiceBody,/speechSynthesis\.speak/);
  const neuralBody=await neuralResponse.text();
  assert.match(neuralBody,/AI & Voice Settings/);assert.match(neuralBody,/assistant\/speech/);assert.match(neuralBody,/Human-like neural voices only/);assert.match(neuralBody,/\['marin'/);assert.doesNotMatch(neuralBody,/browser fallback active/i);assert.doesNotMatch(neuralBody,/nativeSpeak/);
  const polishBody=await polishResponse.text();assert.match(polishBody,/recovery-pulse-panel/);assert.match(polishBody,/chip\.critical/);assert.match(polishBody,/chip\.high/);assert.match(polishBody,/chip\.medium/);assert.match(polishBody,/chip\.low/);
});

test('demo login returns token and HttpOnly same-site session cookie', async () => {
  const response=await login('Executive');assert.equal(response.status,200);const body=await response.json();assert.ok(body.token);assert.equal(body.user.role,'Executive');assert.ok(body.expiresIn>0);const cookie=response.headers.get('set-cookie')||'';assert.match(cookie,/aquaflow_session=/);assert.match(cookie.toLowerCase(),/httponly/);assert.match(cookie.toLowerCase(),/samesite=strict/);
});

test('authenticated executive can retrieve a full synthetic AquaFlow portfolio', async () => {
  const loginResponse=await login('Executive');const {token}=await loginResponse.json();const response=await fetch(`${baseUrl}/api/dashboard`,{headers:{authorization:`Bearer ${token}`}});assert.equal(response.status,200);const body=await response.json();assert.equal(body.synthetic,true);assert.ok(Array.isArray(body.projects));assert.ok(body.projects.length>=10);assert.ok(Array.isArray(body.incidents));assert.ok(body.summary);
});

test('session cookie authenticates browser-style report download', async () => {
  const loginResponse=await login('Executive');const cookie=(loginResponse.headers.get('set-cookie')||'').split(';')[0];const response=await fetch(`${baseUrl}/api/reports/projects.csv`,{headers:{cookie}});assert.equal(response.status,200);assert.match(response.headers.get('content-type')||'',/text\/csv/);const body=await response.text();assert.match(body,/Central Pressure Zone Leak Reduction/);
});

test('read-only user cannot create a project', async () => {
  const loginResponse=await login('Read-Only Oversight User');const {token}=await loginResponse.json();const response=await fetch(`${baseUrl}/api/projects`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({name:'Forbidden Project',owner:'Read Only User'})});assert.equal(response.status,403);
});
