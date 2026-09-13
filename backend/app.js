'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const multer = require('multer');
const { JsonStore, cleanString, newId } = require('./lib/store');
const { dashboardSummary, explainIncidentPriority, projectHealth, meterAnomalyScore, workOrderSla, calculateNRW, entitySearchText } = require('./lib/domain');
const { signToken, safeEqualText, createDemoUser, authMiddleware, requirePermission } = require('./lib/auth');
const { hasPermission, ROLE_PERMISSIONS } = require('./lib/policy');
const { tenantData, answerQuery } = require('./lib/assistant');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const STORAGE_DIR = path.join(ROOT, 'storage', 'private');
const RUNTIME_FILE = path.join(ROOT, 'data', 'runtime.json');
const SEED_FILE = path.join(ROOT, 'database', 'seed', 'demo.json');

function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const idx = text.indexOf('=');
    if (idx < 1) continue;
    const key = text.slice(0, idx).trim();
    const value = text.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

const config = {
  env: process.env.NODE_ENV || process.env.APP_ENV || 'development',
  demoMode: String(process.env.DEMO_MODE || 'true').toLowerCase() === 'true',
  demoEmail: process.env.DEMO_ADMIN_EMAIL || 'demo@aquaflow.local',
  demoPassword: process.env.DEMO_ADMIN_PASSWORD || 'ChangeMe!2026',
  tokenSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'development-only-aquaflow-secret-change-me',
  tokenTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 28800),
  maxUploadMb: Math.max(1, Math.min(25, Number(process.env.MAX_UPLOAD_MB || 10)))
};

if (config.env === 'production') {
  const unsafe = config.demoMode || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || config.demoPassword === 'ChangeMe!2026';
  if (unsafe) throw new Error('Production startup blocked: disable DEMO_MODE, configure a strong SESSION_SECRET and use production identity.');
}

const store = new JsonStore({ runtimeFile: RUNTIME_FILE, seedFile: SEED_FILE });
const auth = authMiddleware(config.tokenSecret);
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'],
  connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"]
} } }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use((req, res, next) => { req.correlationId = crypto.randomUUID(); res.setHeader('x-correlation-id', req.correlationId); next(); });

const rate = new Map();
app.use('/api', (req, res, next) => {
  const key = `${req.ip || 'unknown'}:${req.path.startsWith('/auth/login') ? 'login' : 'api'}`;
  const now = Date.now();
  const entry = rate.get(key) || { start: now, count: 0 };
  if (now - entry.start > 60_000) { entry.start = now; entry.count = 0; }
  entry.count += 1; rate.set(key, entry);
  const max = req.path.startsWith('/auth/login') ? 20 : 360;
  if (entry.count > max) return res.status(429).json({ error: 'Too many requests. Try again shortly.', correlationId: req.correlationId });
  next();
});

function sanitizeValue(value, depth = 0) {
  if (depth > 3) return null;
  if (typeof value === 'string') return cleanString(value, 1000);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitizeValue(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value).slice(0, 80)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) continue;
      out[cleanString(key, 80)] = sanitizeValue(item, depth + 1);
    }
    return out;
  }
  return undefined;
}
const sanitizeRecord = input => sanitizeValue(input || {}) || {};
const scoped = user => tenantData(store.read(), user.tenantId);

function requireAny(...permissions) {
  return (req, res, next) => permissions.some(p => hasPermission(req.user, p)) ? next() : res.status(403).json({ error: 'You are not authorised to perform this action.', correlationId: req.correlationId });
}

function csvEscape(value) {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function toCsv(rows) {
  if (!rows.length) return 'No data\n';
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  return `${headers.map(csvEscape).join(',')}\n${rows.map(r => headers.map(h => csvEscape(r[h])).join(',')).join('\n')}\n`;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'AquaFlow AI', environment: config.env, demoMode: config.demoMode, storage: 'json-demo', aiProvider: process.env.AI_PROVIDER || 'deterministic', timestamp: new Date().toISOString() }));
app.get('/api/capabilities', (_req, res) => res.json({
  product: 'AquaFlow AI', tagline: 'Turning Municipal Water Recovery Plans into Accountable Delivery', demoMode: config.demoMode,
  languages: ['en-ZA','af-ZA','zu-ZA','xh-ZA','st-ZA','tn-ZA','nso-ZA','ts-ZA','ve-ZA','ss-ZA','nr-ZA'],
  voice: { browserSpeech: true, preferredIdentity: 'Ayanda', dedicatedProviderConfigured: Boolean(process.env.TTS_PROVIDER) },
  ai: { provider: process.env.AI_PROVIDER || 'deterministic', model: process.env.AI_MODEL || null },
  integrations: ['gis','billing','scada','telemetry','notifications'].map(id => ({ id, status: process.env[`${id.toUpperCase()}_PROVIDER`] ? 'configured' : 'integration-ready' }))
}));

app.post('/api/auth/login', (req, res) => {
  if (!config.demoMode) return res.status(503).json({ error: 'Demo authentication is disabled. Configure production identity.', correlationId: req.correlationId });
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const password = String(req.body?.password || '');
  if (!safeEqualText(email, config.demoEmail.toLowerCase()) || !safeEqualText(password, config.demoPassword)) return res.status(401).json({ error: 'Invalid email or password.', correlationId: req.correlationId });
  const requestedRole = cleanString(req.body?.role || 'System Administrator', 80);
  const role = ROLE_PERMISSIONS[requestedRole] ? requestedRole : 'System Administrator';
  const user = createDemoUser({ email: config.demoEmail, role, tenantId: 'demo-metro', ttlSeconds: config.tokenTtlSeconds });
  store.addActivity(user, `Signed in as ${role}`, 'authentication', user.sub, user.tenantId);
  res.json({ token: signToken(user, config.tokenSecret), user: { name: user.name, email: user.email, role, tenantId: user.tenantId }, expiresIn: config.tokenTtlSeconds });
});
app.get('/api/auth/me', auth, (req, res) => res.json({ user: { name: req.user.name, email: req.user.email, role: req.user.role, tenantId: req.user.tenantId, permissions: req.user.permissions } }));
app.post('/api/auth/logout', auth, (req, res) => { store.addActivity(req.user, 'Signed out', 'authentication', req.user.sub, req.user.tenantId); res.json({ ok: true }); });

app.get('/api/dashboard', auth, requirePermission('dashboard.read'), (req, res) => {
  const data = scoped(req.user);
  res.json({
    synthetic: Boolean(data.meta?.synthetic), label: data.meta?.label, summary: dashboardSummary(data), programmes: data.programmes || [],
    projects: (data.projects || []).map(p => ({ ...p, health: projectHealth(p) })),
    incidents: (data.incidents || []).map(i => ({ ...i, priority: explainIncidentPriority(i) })).sort((a,b) => b.priority.score - a.priority.score),
    workOrders: (data.workOrders || []).map(w => ({ ...w, sla: workOrderSla(w) })),
    meters: (data.meters || []).map(m => ({ ...m, anomaly: meterAnomalyScore(m) })).sort((a,b) => b.anomaly.score - a.anomaly.score),
    nrw: (data.nrw || []).map(n => ({ ...n, calculated: calculateNRW(n) })), revenue: data.revenue || [], risks: data.risks || [], approvals: data.approvals || [],
    notifications: (data.notifications || []).filter(n => !n.read).slice(0,10), activities: (data.activities || []).slice(0,20)
  });
});

const resources = [
  ['programmes','programmes','programme','prog',['name']], ['projects','projects','project','proj',['name','owner']], ['milestones','milestones','milestone','mil',['projectId','name']],
  ['work-items','workItems','workitem','wi',['projectId','name']], ['comments','comments','comment','com',['recordType','recordId','body']], ['incidents','incidents','incident','inc',['zone','asset']],
  ['work-orders','workOrders','workorder','wo',['description']], ['assets','assets','asset','asset',['name','type']], ['meters','meters','meter','meter',['accountReference']],
  ['contractors','contractors','contractor','ctr',['name']], ['risks','risks','risk','risk',['name','level']], ['interventions','interventions','project','int',['name']],
  ['documents','documents','document','doc',['name']], ['evidence','evidence','evidence','ev',['recordType','recordId']], ['notifications','notifications','notification','not',['message']],
  ['approvals','approvals','approval','app',['subject','recordType','recordId']], ['revenue','revenue','revenue','rev',['description']], ['budgets','budgets','finance','bud',['name']], ['expenditures','expenditures','finance','exp',['description']]
].map(([route,collection,stem,prefix,required]) => ({ route, collection, stem, prefix, required }));
const resourceMap = new Map(resources.map(r => [r.route, r]));

for (const r of resources) {
  app.get(`/api/${r.route}`, auth, requirePermission(`${r.stem}.read`), (req,res) => res.json(store.list(r.collection, req.user.tenantId).filter(row => req.query.archived === 'true' ? row.archived : !row.archived)));
  app.get(`/api/${r.route}/:id`, auth, requirePermission(`${r.stem}.read`), (req,res) => { const row = store.get(r.collection, req.params.id, req.user.tenantId); return row ? res.json(row) : res.status(404).json({ error: 'Record not found.', correlationId: req.correlationId }); });
  app.post(`/api/${r.route}`, auth, requirePermission(`${r.stem}.create`), (req,res) => {
    const input = sanitizeRecord(req.body); const missing = r.required.filter(f => input[f] === undefined || input[f] === null || String(input[f]).trim() === '');
    if (missing.length) return res.status(400).json({ error: `Required field(s): ${missing.join(', ')}`, correlationId: req.correlationId });
    return res.status(201).json(store.create(r.collection, input, req.user, r.prefix));
  });
  app.patch(`/api/${r.route}/:id`, auth, requirePermission(`${r.stem}.update`), (req,res) => { const row = store.update(r.collection, req.params.id, sanitizeRecord(req.body), req.user); return row ? res.json(row) : res.status(404).json({ error: 'Record not found.', correlationId: req.correlationId }); });
  app.post(`/api/${r.route}/:id/archive`, auth, requireAny(`${r.stem}.archive`,`${r.stem}.update`), (req,res) => { const row = store.archive(r.collection, req.params.id, req.user); return row ? res.json(row) : res.status(404).json({ error: 'Record not found.', correlationId: req.correlationId }); });
  app.post(`/api/${r.route}/:id/restore`, auth, requireAny(`${r.stem}.archive`,`${r.stem}.update`), (req,res) => { const row = store.restore(r.collection, req.params.id, req.user); return row ? res.json(row) : res.status(404).json({ error: 'Record not found.', correlationId: req.correlationId }); });
}

app.get('/api/nrw', auth, requirePermission('dashboard.read'), (req,res) => res.json(store.list('nrw', req.user.tenantId).map(n => ({ ...n, calculated: calculateNRW(n) }))));
app.get('/api/zones', auth, requireAny('asset.read','dashboard.read'), (req,res) => res.json(store.list('zones', req.user.tenantId)));
app.post('/api/approvals/:id/decision', auth, requirePermission('approval.decide'), (req,res) => {
  const decision = cleanString(req.body?.decision,20).toLowerCase(); if (!['approved','rejected'].includes(decision)) return res.status(400).json({ error: 'Decision must be approved or rejected.', correlationId: req.correlationId });
  const row = store.update('approvals', req.params.id, { status: decision, decisionComment: cleanString(req.body?.comment,500), decidedAt: new Date().toISOString(), decidedBy: req.user.name }, req.user);
  return row ? res.json(row) : res.status(404).json({ error: 'Approval not found.', correlationId: req.correlationId });
});
app.post('/api/notifications/:id/read', auth, requirePermission('notification.read'), (req,res) => { const row = store.update('notifications', req.params.id, { read:true, readAt:new Date().toISOString() }, req.user); return row ? res.json(row) : res.status(404).json({ error:'Notification not found.', correlationId:req.correlationId }); });

app.get('/api/search', auth, requirePermission('search.read'), (req,res) => {
  const q = cleanString(req.query.q,160).toLowerCase(); if (!q || q.length < 2) return res.json({ query:q, results:[] });
  const data = scoped(req.user); const searchable = [['programmes','programme'],['projects','project'],['milestones','milestone'],['workItems','workitem'],['incidents','incident'],['workOrders','workorder'],['assets','asset'],['meters','meter'],['contractors','contractor'],['risks','risk'],['documents','document'],['evidence','evidence'],['approvals','approval'],['revenue','revenue'],['comments','comment'],['activities','audit']];
  const results = [];
  for (const [collection,stem] of searchable) {
    if (stem === 'audit' ? !hasPermission(req.user,'audit.read') : !hasPermission(req.user,`${stem}.read`)) continue;
    for (const record of data[collection] || []) { if (entitySearchText(record).includes(q)) results.push({ collection, type:stem, id:record.id, title:record.name || record.description || record.subject || record.id, record }); if (results.length >= 50) break; }
    if (results.length >= 50) break;
  }
  res.json({ query:q, results });
});

app.post('/api/assistant/query', auth, requirePermission('ai.query'), async (req,res,next) => {
  try { const query = cleanString(req.body?.query,800); if (!query) return res.status(400).json({ error:'Query is required.', correlationId:req.correlationId }); const result = await answerQuery(query, store.read(), req.user, process.env); store.addActivity(req.user, `Asked AquaFlow AI: ${query.slice(0,100)}`, 'ai', newId('ai'), req.user.tenantId); res.json(result); } catch (error) { next(error); }
});

function findProject(value, tenantId) { const target = cleanString(value,180).toLowerCase(); return store.list('projects',tenantId).find(p => p.id.toLowerCase() === target || String(p.name || '').toLowerCase() === target || String(p.name || '').toLowerCase().includes(target)) || null; }
app.post('/api/assistant/command', auth, requirePermission('ai.query'), (req,res) => {
  const raw = cleanString(req.body?.command,800); const cmd = raw.toLowerCase(); if (!raw) return res.status(400).json({ error:'Command is required.', correlationId:req.correlationId });
  const nav = [['dashboard','dashboard'],['project','projects'],['incident','incidents'],['work order','work-orders'],['meter','meters'],['asset','assets'],['contractor','contractors'],['finance','finance'],['revenue','revenue'],['risk','risks'],['audit','audit'],['approval','approvals']];
  if (/^(open|go to|show|take me to)\b/.test(cmd)) { const hit = nav.find(([term]) => cmd.includes(term)); if (hit) return res.json({ type:'navigate', target:hit[1], confirmation:`Opening ${hit[1].replace('-',' ')}.` }); }
  let m = raw.match(/^create\s+(?:a\s+)?project\s+(.+)$/i);
  if (m) { if (!hasPermission(req.user,'project.create')) return res.status(403).json({ error:'You are not authorised to create projects.', correlationId:req.correlationId }); const row = store.create('projects',{ name:cleanString(m[1],160), owner:req.user.name, status:'active', progress:0, risk:'medium', budget:0, actualExpenditure:0 },req.user,'proj'); return res.status(201).json({ type:'action', action:'project.create', record:row, confirmation:`Project ${row.name} created.` }); }
  m = raw.match(/^add\s+milestone\s+(.+?)\s+to\s+(.+)$/i);
  if (m) { if (!hasPermission(req.user,'milestone.create')) return res.status(403).json({ error:'You are not authorised to create milestones.', correlationId:req.correlationId }); const p=findProject(m[2],req.user.tenantId); if(!p) return res.status(404).json({ error:'Project not found.', correlationId:req.correlationId }); const row=store.create('milestones',{projectId:p.id,name:cleanString(m[1],180),status:'not-started',progress:0},req.user,'mil'); return res.status(201).json({type:'action',action:'milestone.create',record:row,confirmation:`Milestone ${row.name} added to ${p.name}.`}); }
  m = raw.match(/^add\s+work\s*item\s+(.+?)\s+to\s+(.+)$/i);
  if (m) { if (!hasPermission(req.user,'workitem.create')) return res.status(403).json({ error:'You are not authorised to create work items.', correlationId:req.correlationId }); const p=findProject(m[2],req.user.tenantId); if(!p) return res.status(404).json({ error:'Project not found.', correlationId:req.correlationId }); const row=store.create('workItems',{projectId:p.id,name:cleanString(m[1],180),owner:req.user.name,status:'todo',priority:'medium'},req.user,'wi'); return res.status(201).json({type:'action',action:'workitem.create',record:row,confirmation:`Work item ${row.name} added to ${p.name}.`}); }
  m = raw.match(/^archive\s+work\s*item\s+([\w-]+)$/i);
  if (m) { if(!hasPermission(req.user,'workitem.update')) return res.status(403).json({error:'You are not authorised to archive work items.',correlationId:req.correlationId}); const row=store.archive('workItems',m[1],req.user); return row ? res.json({type:'action',action:'workitem.archive',record:row,confirmation:`Work item ${row.name || row.id} archived.`}) : res.status(404).json({error:'Work item not found.',correlationId:req.correlationId}); }
  m = raw.match(/^update\s+work\s*item\s+([\w-]+)\s+(?:to\s+)?(.+)$/i);
  if (m) { if(!hasPermission(req.user,'workitem.update')) return res.status(403).json({error:'You are not authorised to update work items.',correlationId:req.correlationId}); const row=store.update('workItems',m[1],{status:cleanString(m[2],50)},req.user); return row ? res.json({type:'action',action:'workitem.update',record:row,confirmation:`Work item ${row.name || row.id} updated to ${row.status}.`}) : res.status(404).json({error:'Work item not found.',correlationId:req.correlationId}); }
  m = raw.match(/^comment\s+on\s+(project|incident|work\s*order|work\s*item)\s+([\w-]+)\s*:?\s*(.+)$/i);
  if (m) { if(!hasPermission(req.user,'comment.create')) return res.status(403).json({error:'You are not authorised to add comments.',correlationId:req.correlationId}); const row=store.create('comments',{recordType:m[1].toLowerCase().replace(/\s+/g,'-'),recordId:m[2],body:cleanString(m[3],1000),author:req.user.name},req.user,'com'); return res.status(201).json({type:'action',action:'comment.create',record:row,confirmation:'Comment added.'}); }
  return res.json({ type:'unrecognised', confirmation:'That request does not match a governed executable command. Try “create project …”, “add milestone … to …”, “add work item … to …”, “archive work item ID”, “comment on project ID: …”, or “open incidents”.' });
});

fs.mkdirSync(STORAGE_DIR,{recursive:true});
const allowedMime = new Set(['application/pdf','image/jpeg','image/png','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const upload = multer({ storage:multer.diskStorage({ destination:(_req,_file,cb)=>cb(null,STORAGE_DIR), filename:(_req,file,cb)=>cb(null,`${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase().slice(0,10)}`) }), limits:{fileSize:config.maxUploadMb*1024*1024,files:1}, fileFilter:(_req,file,cb)=>cb(allowedMime.has(file.mimetype)?null:new Error('Unsupported file type.'),allowedMime.has(file.mimetype)) });
app.post('/api/documents/upload', auth, requirePermission('document.create'), upload.single('file'), (req,res) => { if(!req.file) return res.status(400).json({error:'A supported file is required.',correlationId:req.correlationId}); const row=store.create('documents',{name:cleanString(req.body?.name || req.file.originalname,200),originalName:cleanString(req.file.originalname,220),storedName:req.file.filename,mimeType:req.file.mimetype,size:req.file.size,recordType:cleanString(req.body?.recordType,60),recordId:cleanString(req.body?.recordId,120),status:'uploaded'},req.user,'doc'); res.status(201).json(row); });
app.get('/api/documents/:id/download', auth, requirePermission('document.read'), (req,res) => { const doc=store.get('documents',req.params.id,req.user.tenantId); if(!doc?.storedName) return res.status(404).json({error:'Document file not found.',correlationId:req.correlationId}); const file=path.join(STORAGE_DIR,path.basename(doc.storedName)); return fs.existsSync(file) ? res.download(file,doc.originalName || doc.name || 'document') : res.status(404).json({error:'Document file is unavailable.',correlationId:req.correlationId}); });

app.get('/api/reports/:resource.csv', auth, (req,res) => { const r=resourceMap.get(req.params.resource); if(!r) return res.status(404).json({error:'Report resource not found.',correlationId:req.correlationId}); if(!hasPermission(req.user,`${r.stem}.read`)) return res.status(403).json({error:'You are not authorised to export this data.',correlationId:req.correlationId}); res.type('text/csv').setHeader('content-disposition',`attachment; filename="aquaflow-${r.route}.csv"`); res.send(toCsv(store.list(r.collection,req.user.tenantId))); });
app.get('/api/reports/executive.json', auth, requirePermission('dashboard.read'), (req,res) => { const data=scoped(req.user); res.json({product:'AquaFlow AI',generatedAt:new Date().toISOString(),tenantId:req.user.tenantId,synthetic:Boolean(data.meta?.synthetic),summary:dashboardSummary(data),topIncidents:(data.incidents||[]).map(i=>({...i,priority:explainIncidentPriority(i)})).sort((a,b)=>b.priority.score-a.priority.score).slice(0,10),atRiskProjects:(data.projects||[]).map(p=>({...p,health:projectHealth(p)})).filter(p=>['at-risk','critical'].includes(p.health.band)||Number(p.daysLate||0)>0),revenue:data.revenue||[],risks:(data.risks||[]).filter(r=>r.status!=='closed'),pendingApprovals:(data.approvals||[]).filter(a=>a.status==='pending')}); });

app.post('/api/demo/reset', auth, requirePermission('*'), (req,res) => { if(!config.demoMode) return res.status(403).json({error:'Demo reset is disabled outside demo mode.',correlationId:req.correlationId}); store.reset(); store.addActivity(req.user,'Reset synthetic demo dataset','system','demo-reset',req.user.tenantId); res.json({ok:true,message:'Synthetic demo dataset reset.'}); });

app.use('/api',(req,res)=>res.status(404).json({error:'API route not found.',correlationId:req.correlationId}));
app.use(express.static(FRONTEND_DIR,{index:false,maxAge:config.env==='production'?'1h':0}));
app.get('/{*splat}',(_req,res)=>res.sendFile(path.join(FRONTEND_DIR,'index.html')));
app.use((error,req,res,_next)=>{ const status=error instanceof multer.MulterError || /Unsupported file type/.test(String(error.message||'')) ? 400 : 500; console.error(JSON.stringify({level:'error',correlationId:req.correlationId,message:error.message,path:req.path})); res.status(status).json({error:status===500?'A server error occurred.':cleanString(error.message,200),correlationId:req.correlationId}); });

module.exports = { app, store, config, sanitizeRecord, toCsv };
