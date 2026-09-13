'use strict';

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function incidentPriorityScore(incident = {}) {
  const loss = clamp(incident.estimatedLossKlPerDay, 0, 1000) / 1000;
  const people = clamp(incident.populationAffected, 0, 100000) / 100000;
  const duration = clamp(incident.openHours, 0, 168) / 168;
  const recurrence = clamp(incident.recurrenceCount, 0, 10) / 10;
  const critical = incident.criticalFacilityAffected ? 1 : 0;
  const severity = { low: 0.15, medium: 0.4, high: 0.7, critical: 1 }[String(incident.severity || '').toLowerCase()] || 0.2;

  const score = (loss * 0.25) + (people * 0.15) + (duration * 0.10) + (recurrence * 0.10) + (critical * 0.20) + (severity * 0.20);
  return Math.round(score * 100);
}

function priorityBand(score) {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function explainIncidentPriority(incident) {
  const score = incidentPriorityScore(incident);
  const reasons = [];
  if ((incident.estimatedLossKlPerDay || 0) >= 300) reasons.push('high estimated daily water loss');
  if (incident.criticalFacilityAffected) reasons.push('critical facility affected');
  if ((incident.populationAffected || 0) >= 10000) reasons.push('large population affected');
  if ((incident.openHours || 0) >= 24) reasons.push('incident open for more than 24 hours');
  if ((incident.recurrenceCount || 0) >= 3) reasons.push('recurring incident pattern');
  if (!reasons.length) reasons.push('current operational severity and impact');
  return { score, band: priorityBand(score), reasons };
}

function dashboardSummary(data = {}) {
  const projects = data.projects || [];
  const incidents = data.incidents || [];
  const workOrders = data.workOrders || [];
  const programmes = data.programmes || [];

  const activeProjects = projects.filter(p => ['active', 'in-progress', 'at-risk'].includes(p.status)).length;
  const delayedProjects = projects.filter(p => p.status === 'delayed' || p.daysLate > 0).length;
  const atRiskProjects = projects.filter(p => p.status === 'at-risk' || p.risk === 'high' || p.risk === 'critical').length;
  const criticalIncidents = incidents.filter(i => ['critical', 'high'].includes(i.severity) && i.status !== 'closed').length;
  const openWorkOrders = workOrders.filter(w => !['closed', 'verified'].includes(w.status)).length;
  const totalEstimatedLoss = incidents.filter(i => i.status !== 'closed').reduce((sum, i) => sum + Number(i.estimatedLossKlPerDay || 0), 0);
  const projectedRecovery = (data.revenue || []).reduce((sum, r) => sum + Number(r.projectedRecovery || 0), 0);
  const verifiedRecovery = (data.revenue || []).reduce((sum, r) => sum + Number(r.verifiedRealisedRecovery || 0), 0);

  return {
    programmes: programmes.length,
    activeProjects,
    delayedProjects,
    atRiskProjects,
    criticalIncidents,
    openWorkOrders,
    estimatedOpenLossKlPerDay: Math.round(totalEstimatedLoss),
    projectedRecovery,
    verifiedRecovery
  };
}

module.exports = {
  clamp,
  incidentPriorityScore,
  priorityBand,
  explainIncidentPriority,
  dashboardSummary
};
