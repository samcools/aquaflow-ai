'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV='test';
process.env.APP_ENV='test';
process.env.DEMO_MODE='true';
process.env.DEMO_ADMIN_EMAIL='demo@aquaflow.local';
process.env.DEMO_ADMIN_PASSWORD='ChangeMe!2026';
process.env.SESSION_SECRET='test-session-secret-that-is-long-enough-for-aquaflow';
delete process.env.OPENAI_API_KEY;

const { httpApp } = require('../backend/http');
let server,baseUrl,token;

async function request(path,options={}) {
  return fetch(`${baseUrl}${path}`,{
    ...options,
    headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...(options.headers||{})}
  });
}

test.before(async()=>{
  await new Promise(resolve=>{
    server=httpApp.listen(0,'127.0.0.1',async()=>{
      baseUrl=`http://127.0.0.1:${server.address().port}`;
      const login=await fetch(`${baseUrl}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'demo@aquaflow.local',password:'ChangeMe!2026',role:'Executive'})});
      const body=await login.json();token=body.token;resolve();
    });
  });
});

test.after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));});

test('OpenAI settings start unconfigured and never expose a key',async()=>{
  const response=await request('/api/settings/openai');
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.configured,false);
  assert.equal(body.source,null);
  assert.equal(Object.hasOwn(body,'apiKey'),false);
  assert.equal(body.keyStorage,'ephemeral-server-session');
});

test('neural speech refuses to run without a configured key',async()=>{
  const response=await request('/api/assistant/speech',{method:'POST',body:JSON.stringify({text:'Hello from Ayanda',language:'en-ZA',voice:'coral'})});
  assert.equal(response.status,409);
  const body=await response.json();
  assert.match(body.error,/not configured/i);
});

test('session API key can be configured without being echoed',async()=>{
  const fake='sk-test-aquaflow-12345678901234567890';
  const save=await request('/api/settings/openai',{method:'POST',body:JSON.stringify({apiKey:fake,voice:'coral',aiModel:'gpt-5.6-luna',ttsModel:'gpt-4o-mini-tts'})});
  assert.equal(save.status,200);
  const saved=await save.json();
  assert.equal(saved.configured,true);
  assert.equal(saved.source,'session');
  assert.equal(Object.hasOwn(saved,'apiKey'),false);

  const status=await request('/api/settings/openai');
  const current=await status.json();
  assert.equal(current.configured,true);
  assert.equal(Object.hasOwn(current,'apiKey'),false);
});

test('session key can be cleared',async()=>{
  const response=await request('/api/settings/openai',{method:'POST',body:JSON.stringify({clear:true})});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.configured,false);
  assert.equal(body.cleared,true);
});

test('assistant question route remains grounded without OpenAI',async()=>{
  const response=await request('/api/assistant/query',{method:'POST',body:JSON.stringify({query:'What is causing the greatest water loss?'})});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.provider,'deterministic');
  assert.match(body.answer,/kL\/day|Data unavailable/i);
});
