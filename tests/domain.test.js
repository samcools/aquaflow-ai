'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  incidentPriorityScore,
  priorityBand,
  explainIncidentPriority,
  dashboardSummary
} = require('../backend/lib/domain');

test('critical infrastructure incident receives a high explainable priority score', () => {
  const incident = {
    severity: 'critical',
    estimatedLossKlPerDay: 600,
    populationAffected: 25000,
    criticalFacilityAffected: true,
    openHours: 36,
    recurrenceCount: 4
  };
  const score = incidentPriorityScore(incident);
  const explanation = explainIncidentPriority(incident);
  assert.ok(score >= 55);
  assert.equal(explanation.score, score);
  assert.ok(['high', 'critical'].includes(explanation.band));
  assert.ok(explanation.reasons.length > 0);
});

test('priority bands are stable at thresholds', () => {
  assert.equal(priorityBand(10), 'low');
  assert.equal(priorityBand(30), 'medium');
  assert.equal(priorityBand(55), 'high');
  assert.equal(priorityBand(75), 'critical');
});

test('dashboard summary distinguishes projected and verified recovery', () => {
  const summary = dashboardSummary({
    programmes: [{ id: 'p1' }],
    projects: [{ status: 'at-risk', risk: 'high', daysLate: 4 }],
    incidents: [{ status: 'assigned', severity: 'critical', estimatedLossKlPerDay: 100 }],
    workOrders: [{ status: 'dispatched' }],
    revenue: [{ projectedRecovery: 1000000, verifiedRealisedRecovery: 250000 }]
  });
  assert.equal(summary.programmes, 1);
  assert.equal(summary.atRiskProjects, 1);
  assert.equal(summary.delayedProjects, 1);
  assert.equal(summary.criticalIncidents, 1);
  assert.equal(summary.openWorkOrders, 1);
  assert.equal(summary.projectedRecovery, 1000000);
  assert.equal(summary.verifiedRecovery, 250000);
});
