'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { JsonStore } = require('../backend/lib/store');

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aquaflow-store-'));
  const seedFile = path.join(dir, 'seed.json');
  const runtimeFile = path.join(dir, 'runtime.json');
  fs.writeFileSync(seedFile, JSON.stringify({ projects: [], activities: [] }));
  return { dir, store: new JsonStore({ runtimeFile, seedFile }) };
}

test('store isolates records by tenant', () => {
  const { dir, store } = fixture();
  try {
    store.create('projects', { name:'Tenant A project', owner:'A' }, { tenantId:'tenant-a', sub:'u-a', name:'A' }, 'proj');
    store.create('projects', { name:'Tenant B project', owner:'B' }, { tenantId:'tenant-b', sub:'u-b', name:'B' }, 'proj');
    assert.equal(store.list('projects','tenant-a').length,1);
    assert.equal(store.list('projects','tenant-b').length,1);
    assert.equal(store.list('projects','tenant-a')[0].name,'Tenant A project');
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('update cannot change tenant or immutable identifiers', () => {
  const { dir, store } = fixture();
  try {
    const user={ tenantId:'tenant-a', sub:'u-a', name:'A' };
    const project=store.create('projects',{ name:'Original', owner:'A' },user,'proj');
    const updated=store.update('projects',project.id,{ id:'forged', tenantId:'tenant-b', createdBy:'forged', name:'Updated' },user);
    assert.equal(updated.id,project.id);
    assert.equal(updated.tenantId,'tenant-a');
    assert.equal(updated.createdBy,'u-a');
    assert.equal(updated.name,'Updated');
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('cross-tenant update is denied by lookup boundary', () => {
  const { dir, store } = fixture();
  try {
    const project=store.create('projects',{ name:'Protected', owner:'A' },{ tenantId:'tenant-a', sub:'u-a', name:'A' },'proj');
    const result=store.update('projects',project.id,{ name:'Compromised' },{ tenantId:'tenant-b', sub:'u-b', name:'B' });
    assert.equal(result,null);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
