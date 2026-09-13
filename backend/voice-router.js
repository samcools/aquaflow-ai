'use strict';

const express = require('express');
const { authMiddleware, requirePermission } = require('./lib/auth');
const { hasPermission } = require('./lib/policy');
const { cleanString } = require('./lib/store');

const RESOURCE_CONFIG = {
  project: { collection:'projects', permission:'project.update', label:'Project', fields:{ status:['active','at-risk','delayed','completed'], risk:['low','medium','high','critical'], progress:'percent' } },
  milestone: { collection:'milestones', permission:'milestone.update', label:'Milestone', fields:{ status:['not-started','in-progress','complete','blocked'], progress:'percent' } },
  'work item': { collection:'workItems', permission:'workitem.update', label:'Work item', fields:{ status:['todo','in-progress','blocked','done'], priority:['low','medium','high','critical'] } },
  incident: { collection:'incidents', permission:'incident.update', label:'Incident', fields:{ status:['detected','verified','assigned','dispatched','repair-in-progress','repaired','closed'], severity:['low','medium','high','critical'] } },
  'work order': { collection:'workOrders', permission:'workorder.update', label:'Work order', fields:{ status:['assigned','dispatched','repair-in-progress','repaired','verified','closed'], priority:['low','medium','high','critical'] } },
  asset: { collection:'assets', permission:'asset.update', label:'Asset', fields:{ condition:['good','fair','poor','critical'], criticality:['low','medium','high','critical'] } },
  meter: { collection:'meters', permission:'meter.update', label:'Meter', fields:{ status:['active','inactive','investigate'] } },
  contractor: { collection:'contractors', permission:'contractor.update', label:'Contractor', fields:{ status:['active','suspended','complete'] } },
  risk: { collection:'risks', permission:'risk.update', label:'Risk', fields:{ status:['open','mitigating','closed'], level:['low','medium','high','critical'] } }
};

function normalise(value) {
  return cleanString(value,220).toLowerCase().replace(/\s+/g,' ').trim();
}

function recordLabel(row) {
  return row?.name || row?.description || row?.subject || row?.accountReference || row?.id || 'record';
}

function findRecord(store, collection, rawTarget, tenantId) {
  const target = normalise(rawTarget);
  const rows = store.list(collection, tenantId);
  const exact = rows.find(row => normalise(row.id) === target || normalise(row.name) === target || normalise(row.description) === target || normalise(row.accountReference) === target);
  if (exact) return exact;
  const partial = rows.filter(row => [row.id,row.name,row.description,row.accountReference,row.subject].some(v => v && normalise(v).includes(target)));
  return partial.length === 1 ? partial[0] : null;
}

function validateValue(field, value, rule) {
  if (rule === 'percent') {
    const n = Number(String(value).replace(/%/g,'').trim());
    if (!Number.isFinite(n) || n < 0 || n > 100) return { error:'Progress must be between 0 and 100.' };
    return { value:n };
  }
  const text = normalise(value).replace(/\s+/g,'-');
  if (Array.isArray(rule) && !rule.includes(text)) return { error:`${field} must be one of: ${rule.join(', ')}.` };
  return { value:text };
}

function permissionError(res, req, permission) {
  return res.status(403).json({ error:`You are not authorised to perform this voice update (${permission}).`, correlationId:req.correlationId });
}

function buildVoiceRouter({ store, tokenSecret }) {
  const router = express.Router();
  const auth = authMiddleware(tokenSecret);

  router.post('/api/assistant/command', auth, requirePermission('ai.query'), (req,res,next) => {
    const raw = cleanString(req.body?.command,800);
    const cmd = normalise(raw);
    if (!raw) return res.status(400).json({ error:'Command is required.', correlationId:req.correlationId });

    const navigation = [
      ['command centre','dashboard'],['dashboard','dashboard'],['delivery','delivery'],['project','projects'],['milestone','milestones'],['work item','work-items'],
      ['water operations','operations'],['incident','incidents'],['work order','work-orders'],['zone','zones'],['asset','assets'],['meter','meters'],['contractor','contractors'],
      ['finance','finance'],['revenue','revenue'],['governance','governance'],['risk','risks'],['approval','approvals'],['evidence','evidence'],['document','documents'],['audit','audit']
    ];
    if (/^(open|go to|show|take me to)\b/.test(cmd)) {
      const hit = navigation.find(([term]) => cmd.includes(term));
      if (hit) return res.json({ type:'navigate', target:hit[1], confirmation:`Opening ${hit[0]}.` });
    }

    let match = raw.match(/^(?:set|update|change)\s+(project|milestone|work\s*item|incident|work\s*order|asset|meter|contractor|risk)\s+(.+?)\s+(status|risk|progress|priority|severity|condition|criticality|level)\s+(?:to\s+)?(.+)$/i);
    if (match) {
      const type = normalise(match[1]);
      const target = match[2];
      const field = normalise(match[3]);
      const rawValue = match[4];
      const cfg = RESOURCE_CONFIG[type];
      if (!cfg || !Object.prototype.hasOwnProperty.call(cfg.fields,field)) return res.status(400).json({ error:`${cfg?.label||'That record'} does not support voice updates to ${field}.`, correlationId:req.correlationId });
      if (!hasPermission(req.user,cfg.permission)) return permissionError(res,req,cfg.permission);
      const record = findRecord(store,cfg.collection,target,req.user.tenantId);
      if (!record) return res.status(404).json({ error:`${cfg.label} not found or the spoken name is ambiguous. Use the record ID or a more specific name.`, correlationId:req.correlationId });
      const checked = validateValue(field,rawValue,cfg.fields[field]);
      if (checked.error) return res.status(400).json({ error:checked.error, correlationId:req.correlationId });
      const updated = store.update(cfg.collection,record.id,{ [field]:checked.value },req.user);
      return res.json({ type:'action', action:`${type.replace(/\s+/g,'')}.update`, record:updated, confirmation:`${cfg.label} ${recordLabel(updated)} updated. ${field} is now ${checked.value}${field==='progress'?'%':''}.` });
    }

    match = raw.match(/^assign\s+(project|work\s*item|incident|work\s*order|risk)\s+(.+?)\s+to\s+(.+)$/i);
    if (match) {
      const type=normalise(match[1]), target=match[2], assignee=cleanString(match[3],180), cfg=RESOURCE_CONFIG[type];
      if (!cfg) return next();
      if (!hasPermission(req.user,cfg.permission)) return permissionError(res,req,cfg.permission);
      const record=findRecord(store,cfg.collection,target,req.user.tenantId);
      if (!record) return res.status(404).json({ error:`${cfg.label} not found or the spoken name is ambiguous.`, correlationId:req.correlationId });
      const field=(type==='incident'||type==='work order')?'assignedTeam':'owner';
      const updated=store.update(cfg.collection,record.id,{[field]:assignee},req.user);
      return res.json({type:'action',action:`${type.replace(/\s+/g,'')}.assign`,record:updated,confirmation:`${cfg.label} ${recordLabel(updated)} assigned to ${assignee}.`});
    }

    match = raw.match(/^set\s+project\s+(.+?)\s+owner\s+(?:to\s+)?(.+)$/i);
    if (match) {
      const cfg=RESOURCE_CONFIG.project;
      if (!hasPermission(req.user,cfg.permission)) return permissionError(res,req,cfg.permission);
      const record=findRecord(store,cfg.collection,match[1],req.user.tenantId);
      if(!record) return res.status(404).json({error:'Project not found or the spoken name is ambiguous.',correlationId:req.correlationId});
      const owner=cleanString(match[2],180),updated=store.update(cfg.collection,record.id,{owner},req.user);
      return res.json({type:'action',action:'project.assign',record:updated,confirmation:`Project ${recordLabel(updated)} owner changed to ${owner}.`});
    }

    return next();
  });

  return router;
}

module.exports = { buildVoiceRouter, findRecord, validateValue, RESOURCE_CONFIG };