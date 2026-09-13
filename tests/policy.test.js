'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { permissionsForRole, matchesPermission, hasPermission } = require('../backend/lib/policy');

test('system administrator receives wildcard permission', () => {
  assert.deepEqual(permissionsForRole('System Administrator'), ['*']);
});

test('unknown role fails safe to read-only permissions', () => {
  const permissions = permissionsForRole('Unexpected Role From Client');
  assert.equal(permissions.includes('*'), false);
  assert.equal(permissions.includes('project.read'), true);
  assert.equal(permissions.includes('project.update'), false);
  assert.equal(permissions.includes('approval.decide'), false);
});

test('wildcard resource permission matches child action', () => {
  assert.equal(matchesPermission('project.*', 'project.update'), true);
  assert.equal(matchesPermission('project.*', 'incident.update'), false);
});

test('read-only oversight cannot mutate records', () => {
  const user = { permissions: permissionsForRole('Read-Only Oversight') };
  assert.equal(hasPermission(user, 'project.read'), true);
  assert.equal(hasPermission(user, 'project.create'), false);
  assert.equal(hasPermission(user, 'finance.approve'), false);
});
