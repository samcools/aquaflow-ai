'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COLLECTIONS = new Set([
  'programmes', 'projects', 'milestones', 'workItems', 'comments', 'activities',
  'incidents', 'workOrders', 'assets', 'meters', 'zones', 'contractors', 'budgets',
  'expenditures', 'revenue', 'interventions', 'indicators', 'documents', 'evidence',
  'notifications', 'approvals', 'risks', 'nrw', 'users'
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function newId(prefix = 'rec') {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cleanString(value, max = 300) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

class JsonStore {
  constructor({ runtimeFile, seedFile }) {
    this.runtimeFile = runtimeFile;
    this.seedFile = seedFile;
  }

  ensure() {
    fs.mkdirSync(path.dirname(this.runtimeFile), { recursive: true });
    if (!fs.existsSync(this.runtimeFile)) fs.copyFileSync(this.seedFile, this.runtimeFile);
  }

  read() {
    this.ensure();
    return JSON.parse(fs.readFileSync(this.runtimeFile, 'utf8'));
  }

  write(data) {
    this.ensure();
    const temp = `${this.runtimeFile}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2));
    fs.renameSync(temp, this.runtimeFile);
  }

  reset() {
    fs.mkdirSync(path.dirname(this.runtimeFile), { recursive: true });
    fs.copyFileSync(this.seedFile, this.runtimeFile);
    return this.read();
  }

  assertCollection(name) {
    if (!COLLECTIONS.has(name)) throw new Error(`Unknown collection: ${name}`);
  }

  tenantVisible(record, tenantId) {
    if (!tenantId || tenantId === '*') return true;
    if (!record || typeof record !== 'object') return false;
    return !record.tenantId || record.tenantId === tenantId;
  }

  list(name, tenantId) {
    this.assertCollection(name);
    const data = this.read();
    return clone((data[name] || []).filter(record => this.tenantVisible(record, tenantId)));
  }

  get(name, id, tenantId) {
    return this.list(name, tenantId).find(record => record.id === id) || null;
  }

  create(name, input, user, idPrefix) {
    this.assertCollection(name);
    const data = this.read();
    data[name] = data[name] || [];
    const now = new Date().toISOString();
    const record = {
      ...clone(input),
      id: input.id || newId(idPrefix || name.slice(0, 3)),
      tenantId: input.tenantId || user?.tenantId || 'demo-metro',
      createdAt: input.createdAt || now,
      updatedAt: now,
      createdBy: input.createdBy || user?.sub || user?.email || 'system'
    };
    data[name].push(record);
    this.addActivityToData(data, user, `Created ${name.slice(0, -1) || name}: ${record.name || record.description || record.id}`, name, record.id, record.tenantId);
    this.write(data);
    return clone(record);
  }

  update(name, id, patch, user) {
    this.assertCollection(name);
    const data = this.read();
    const rows = data[name] || [];
    const index = rows.findIndex(record => record.id === id && this.tenantVisible(record, user?.tenantId));
    if (index < 0) return null;
    const immutable = new Set(['id', 'tenantId', 'createdAt', 'createdBy']);
    const safePatch = {};
    for (const [key, value] of Object.entries(patch || {})) {
      if (!immutable.has(key)) safePatch[key] = value;
    }
    rows[index] = { ...rows[index], ...clone(safePatch), updatedAt: new Date().toISOString(), updatedBy: user?.sub || user?.email || 'system' };
    this.addActivityToData(data, user, `Updated ${name.slice(0, -1) || name}: ${rows[index].name || rows[index].description || id}`, name, id, rows[index].tenantId);
    this.write(data);
    return clone(rows[index]);
  }

  archive(name, id, user) {
    return this.update(name, id, { archived: true, archivedAt: new Date().toISOString() }, user);
  }

  restore(name, id, user) {
    return this.update(name, id, { archived: false, restoredAt: new Date().toISOString() }, user);
  }

  addActivityToData(data, user, action, recordType, recordId, tenantId) {
    data.activities = data.activities || [];
    data.activities.unshift({
      id: newId('act'),
      tenantId: tenantId || user?.tenantId || 'demo-metro',
      timestamp: new Date().toISOString(),
      userId: user?.sub || 'system',
      user: cleanString(user?.name || user?.email || 'System', 120),
      action: cleanString(action, 300),
      recordType: cleanString(recordType, 60),
      recordId: cleanString(recordId, 120)
    });
    data.activities = data.activities.slice(0, 1000);
  }

  addActivity(user, action, recordType, recordId, tenantId) {
    const data = this.read();
    this.addActivityToData(data, user, action, recordType, recordId, tenantId);
    this.write(data);
  }

  transaction(mutator) {
    const data = this.read();
    const result = mutator(data);
    this.write(data);
    return clone(result);
  }
}

module.exports = { JsonStore, COLLECTIONS, newId, cleanString };
