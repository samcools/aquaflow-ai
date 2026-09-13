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

function calculateNRW(record = {}) {
  const input = Number(record.systemInputVolumeKl || 0);
  const billed = Number(record.billedAuthorisedConsumptionKl || 0);
  const unbilled = Number(record.unbilledAuthorisedConsumptionKl || 0);
  if (input <= 0) return { available: false, nrwKl: null, nrwPercent: null };
  const nrwKl = Math.max(0, input - billed - unbilled);
  return { available: true, nrwKl: Math.round(nrwKl), nrwPercent: Number(((nrwKl / input) * 100).toFixed(1)) };
}

function projectHealth(project = {}) {
  let score = 100;
  const reasons = [];
  if ((project.daysLate || 0) > 0) {
    score -= Math.min(35, Number(project.daysLate) * 2);
    reasons.push(`${project.daysLate} day(s) late`);
  }
  if (['high', 'critical'].includes(String(project.risk || '').toLowerCase())) {
    score -= project.risk === 'critical' ? 30 : 20;
    reasons.push(`${project.risk} delivery risk`);
  }
  if (Number(project.budget || 0) > 0 && Number(project.actualExpenditure || 0) > Number(project.budget || 0)) {
    score -= 25;
    reasons.push('actual expenditure exceeds approved budget');
  }
  if (Number(project.progress || 0) < 35 && ['active', 'in-progress', 'at-risk'].includes(project.status)) {
    score -= 10;
    reasons.push('low progress for an active project');
  }
  score = clamp(score, 0, 100);
  return { score, band: score >= 80 ? 'healthy' : score >= 60 ? 'watch' : score >= 40 ? 'at-risk' : 'critical', reasons };
}

function meterAnomalyScore(meter = {}) {
  let score = 0;
  const reasons = [];
  const type = String(meter.anomalyType || '').toLowerCase();
  if (type.includes('zero')) { score += 35; reasons.push('zero consumption anomaly'); }
  if (type.includes('sudden')) { score += 30; reasons.push('sudden consumption change'); }
  if (type.includes('estimated')) { score += 20; reasons.push('repeated estimated readings'); }
  if ((meter.daysSinceRead || 0) > 60) { score += 25; reasons.push('meter has not been physically read for more than 60 days'); }
  if ((meter.estimatedMonthlyRevenueRisk || 0) > 10000) { score += 20; reasons.push('material estimated monthly revenue exposure'); }
  score = clamp(score, 0, 100);
  return { score, band: priorityBand(score), reasons: reasons.length ? reasons : ['no material anomaly indicators'] };
}

function workOrderSla(workOrder = {}, now = new Date()) {
  if (!workOrder.createdAt || !Number(workOrder.slaHours)) return { available: false, breached: false, hoursRemaining: null };
  if (['closed', 'verified'].includes(String(workOrder.status || '').toLowerCase())) return { available: true, breached: false, hoursRemaining: 0 };
  const due = new Date(new Date(workOrder.createdAt).getTime() + Number(workOrder.slaHours) * 3600000);
  const hoursRemaining = (due.getTime() - now.getTime()) / 3600000;
  return { available: true, breached: hoursRemaining < 0, hoursRemaining: Number(hoursRemaining.toFixed(1)), dueAt: due.toISOString() };
}

function dashboardSummary(data = {}) {
  const projects = data.projects || [];
  const incidents = data.incidents || [];
  const workOrders = data.workOrders || [];
  const programmes = data.programmes || [];
  const approvals = data.approvals || [];
  const risks = data.risks || [];
  const notifications = data.notifications || [];
  const milestones = data.milestones || [];
  const workItems = data.workItems || [];

  const activeProjects = projects.filter(p => ['active', 'in-progress', 'at-risk'].includes(p.status)).length;
  const delayedProjects = projects.filter(p => p.status === 'delayed' || Number(p.daysLate || 0) > 0).length;
  const atRiskProjects = projects.filter(p => p.status === 'at-risk' || ['high', 'critical'].includes(p.risk)).length;
  const criticalIncidents = incidents.filter(i => ['critical', 'high'].includes(i.severity) && i.status !== 'closed').length;
  const openWorkOrders = workOrders.filter(w => !['closed', 'verified'].includes(w.status)).length;
  const totalEstimatedLoss = incidents.filter(i => i.status !== 'closed').reduce((sum, i) => sum + Number(i.estimatedLossKlPerDay || 0), 0);
  const projectedRecovery = (data.revenue || []).reduce((sum, r) => sum + Number(r.projectedRecovery || 0), 0);
  const aiEstimatedRecovery = (data.revenue || []).reduce((sum, r) => sum + Number(r.aiEstimatedRecovery || 0), 0);
  const verifiedRecovery = (data.revenue || []).reduce((sum, r) => sum + Number(r.verifiedRealisedRecovery || 0), 0);
  const nrw = (data.nrw || []).map(calculateNRW).filter(x => x.available);
  const currentNRWPercent = nrw.length ? Number((nrw.reduce((s, x) => s + x.nrwPercent, 0) / nrw.length).toFixed(1)) : null;

  return {
    programmes: programmes.length,
    activeProjects,
    delayedProjects,
    atRiskProjects,
    criticalIncidents,
    openWorkOrders,
    milestonesDue: milestones.filter(m => !['complete', 'completed', 'verified'].includes(String(m.status || '').toLowerCase())).length,
    overdueWorkItems: workItems.filter(w => w.dueDate && new Date(w.dueDate) < new Date() && !['done', 'closed', 'complete', 'completed'].includes(String(w.status || '').toLowerCase())).length,
    pendingApprovals: approvals.filter(a => a.status === 'pending').length,
    highRisks: risks.filter(r => ['high', 'critical'].includes(r.level) && r.status !== 'closed').length,
    unreadNotifications: notifications.filter(n => !n.read).length,
    estimatedOpenLossKlPerDay: Math.round(totalEstimatedLoss),
    projectedRecovery,
    aiEstimatedRecovery,
    verifiedRecovery,
    currentNRWPercent
  };
}

function entitySearchText(record = {}) {
  return Object.values(record).filter(v => ['string', 'number', 'boolean'].includes(typeof v)).join(' ').toLowerCase();
}

module.exports = {
  clamp,
  incidentPriorityScore,
  priorityBand,
  explainIncidentPriority,
  calculateNRW,
  projectHealth,
  meterAnomalyScore,
  workOrderSla,
  dashboardSummary,
  entitySearchText
};
