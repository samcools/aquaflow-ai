'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, validateRows } = require('../backend/lib/csv');

test('CSV parser handles quoted commas and normalises headers', () => {
  const parsed = parseCsv('Account Reference,Zone,Current Reading\n"ACC,001",Central,42.5\n');
  assert.deepEqual(parsed.headers, ['accountReference','zone','currentReading']);
  assert.equal(parsed.rows[0].accountReference, 'ACC,001');
  assert.equal(parsed.rows[0].currentReading, 42.5);
});

test('meter import validates required account reference', () => {
  const result = validateRows('meters', [{ zone:'Central', currentReading:10 }], []);
  assert.equal(result[0].valid, false);
  assert.match(result[0].errors.join(' '), /accountReference is required/);
});

test('import identifies duplicates against tenant records', () => {
  const existing = [{ accountReference:'ACC-100', meterNumber:'MTR-100' }];
  const result = validateRows('meters', [{ accountReference:'ACC-100', meterNumber:'MTR-100' }], existing);
  assert.equal(result[0].valid, false);
  assert.match(result[0].errors.join(' '), /Duplicate of an existing record/);
});

test('import identifies duplicates inside the same batch', () => {
  const rows = [{ name:'Valve Chamber A', type:'valve' }, { name:'Valve Chamber A', type:'valve' }];
  const result = validateRows('assets', rows, []);
  assert.equal(result[0].valid, true);
  assert.equal(result[1].valid, false);
  assert.match(result[1].errors.join(' '), /Duplicate within this import file/);
});
