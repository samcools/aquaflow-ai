'use strict';

const BASE_ROLE_PERMISSIONS = {
  'System Administrator': ['*'],
  'Municipal Administrator': ['programme.*','project.*','milestone.*','workitem.*','comment.*','incident.*','workorder.*','asset.*','meter.*','contractor.*','risk.*','document.*','evidence.*','notification.*','search.read','dashboard.read','audit.read','ai.query','approval.read','approval.decide','finance.read','revenue.read'],
  'Executive': ['dashboard.read','programme.read','project.read','milestone.read','workitem.read','incident.read','workorder.read','asset.read','meter.read','contractor.read','risk.read','document.read','evidence.read','audit.read','search.read','ai.query','approval.read','approval.decide','finance.read','revenue.read'],
  'Programme Manager': ['dashboard.read','programme.read','programme.update','project.*','milestone.*','workitem.*','comment.*','incident.read','workorder.read','risk.*','document.*','evidence.*','notification.*','search.read','audit.read','ai.query','approval.read','finance.read','revenue.read'],
  'Project Manager': ['dashboard.read','programme.read','project.read','project.update','milestone.*','workitem.*','comment.*','incident.read','workorder.read','workorder.create','risk.*','document.*','evidence.*','notification.*','search.read','audit.read','ai.query','approval.read','finance.read','revenue.read'],
  'Engineer': ['dashboard.read','programme.read','project.read','milestone.read','workitem.read','workitem.update','comment.*','incident.*','workorder.*','asset.*','meter.read','risk.read','document.*','evidence.*','notification.read','search.read','ai.query'],
  'Field Technician': ['dashboard.read','project.read','workitem.read','workitem.update','comment.*','incident.read','incident.update','workorder.read','workorder.update','asset.read','document.create','document.read','evidence.*','notification.read','search.read','ai.query'],
  'Finance': ['dashboard.read','programme.read','project.read','workorder.read','contractor.read','risk.read','finance.*','revenue.*','approval.read','approval.decide','document.*','audit.read','search.read','ai.query'],
  'Revenue Assurance': ['dashboard.read','programme.read','project.read','incident.read','meter.*','revenue.*','risk.read','workitem.*','comment.*','document.*','evidence.*','search.read','ai.query','audit.read'],
  'Contractor': ['dashboard.read','project.read','workitem.read','workitem.update','comment.create','comment.read','incident.read','workorder.read','workorder.update','document.create','document.read','evidence.*','notification.read','search.read'],
  'Auditor': ['dashboard.read','programme.read','project.read','milestone.read','workitem.read','comment.read','incident.read','workorder.read','asset.read','meter.read','contractor.read','risk.read','document.read','evidence.read','approval.read','finance.read','revenue.read','audit.read','search.read'],
  'Read-Only Oversight': ['dashboard.read','programme.read','project.read','milestone.read','workitem.read','incident.read','workorder.read','asset.read','meter.read','contractor.read','risk.read','document.read','evidence.read','approval.read','finance.read','revenue.read','search.read','ai.query']
};

const ROLE_PERMISSIONS = new Proxy(BASE_ROLE_PERMISSIONS, {
  get(target, property) {
    if (typeof property !== 'string') return target[property];
    return Object.prototype.hasOwnProperty.call(target, property) ? target[property] : target['Read-Only Oversight'];
  }
});

function permissionsForRole(role) { return [...ROLE_PERMISSIONS[role]]; }
function matchesPermission(granted, requested) {
  if (granted === '*' || granted === requested) return true;
  if (granted.endsWith('.*')) return requested.startsWith(granted.slice(0, -1));
  return false;
}
function hasPermission(user, requested) { return Boolean(user?.permissions?.some(granted => matchesPermission(granted, requested))); }

module.exports = { ROLE_PERMISSIONS, BASE_ROLE_PERMISSIONS, permissionsForRole, matchesPermission, hasPermission };