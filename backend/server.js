'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { dashboardSummary, explainIncidentPriority } = require('./lib/domain');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const RUNTIME_FILE = path.join(DATA_DIR, 'runtime.json');
const SEED_FILE = path.join(ROOT, 'database', 'seed', 'demo.json');
const FRONTEND_DIR = path.join(ROOT, 'frontend');

function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

const PORT = Number(process.env.PORT || 8000);
const NODE_ENV = process.env.NODE_ENV || process.env.APP_ENV || 'development';
const DEMO_MODE = String(process.env.DEMO_MODE || 'true').toLowerCase() === 'true';
const DEMO_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'demo@aquaflow.local';
const DEMO_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'ChangeMe!2026';
const TOKEN_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'development-only-aquaflow-secret-change-me';
const TOKEN_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 28800);

if (NODE_ENV === 'production') {
  const unsafe = !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || DEMO_PASSWORD === 'ChangeMe!2026';
  if (unsafe) {
    throw new Error('Production startup blocked: configure a strong SESSION_SECRET and non-default DEMO_ADMIN_PASSWORD.');
  }
}

function ensureRuntimeData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RUNTIME_FILE)) fs.copyFileSync(SEED_FILE, RUNTIME_FILE);
}

function readData() {
  ensureRuntimeData();
  return JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'));
}

function writeData(data) {
  ensureRuntimeData();
  const temp = `${RUNTIME_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, RUNTIME_FILE);
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = String(token || '').split('.');
    if (!header || !body || !signature) return null;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  req.user = user;
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user?.permissions?.includes(permission) && !req.user?.permissions?.includes('*')) {
      return res.status(403).json({ error: 'You are not authorised to perform this action.' });
    }
    next();
  };
}

function cleanString(value, max = 180) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

function newId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function addActivity(data, user, action, recordType, recordId) {
  data.activities = data.activities || [];
  data.activities.unshift({
    id: newId('act'),
    timestamp: new Date().toISOString(),
    user: cleanString(user?.name || user?.email || 'System', 100),
    action: cleanString(action, 240),
    recordType: cleanString(recordType, 50),
    recordId: cleanString(recordId, 100)
  });
  data.activities = data.activities.slice(0, 250);
}

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '512kb' }));

const rate = new Map();
app.use('/api', (req, res, next) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = rate.get(key) || { start: now, count: 0 };
  if (now - current.start > 60_000) {
    current.start = now;
    current.count = 0;
  }
  current.count += 1;
  rate.set(key, current);
  if (current.count > 240) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AquaFlow AI', environment: NODE_ENV, demoMode: DEMO_MODE, timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const password = String(req.body?.password || '');
  if (!DEMO_MODE) return res.status(503).json({ error: 'Demo authentication is disabled. Configure an identity provider.' });
  const emailOk = crypto.timingSafeEqual(Buffer.from(email.padEnd(256)), Buffer.from(DEMO_EMAIL.toLowerCase().padEnd(256)));
  const passCandidate = Buffer.from(crypto.createHash('sha256').update(password).digest('hex'));
  const passExpected = Buffer.from(crypto.createHash('sha256').update(DEMO_PASSWORD).digest('hex'));
  const passOk = crypto.timingSafeEqual(passCandidate, passExpected);
  if (!emailOk || !passOk) return res.status(401).json({ error: 'Invalid email or password.' });

  const now = Math.floor(Date.now() / 1000);
  const user = {
    sub: 'demo-admin',
    email: DEMO_EMAIL,
    name: 'AquaFlow Demo Administrator',
    role: 'System Administrator',
    tenantId: 'demo-metro',
    permissions: ['*'],
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };
  res.json({ token: signToken(user), user: { name: user.name, email: user.email, role: user.role, tenantId: user.tenantId }, expiresIn: TOKEN_TTL_SECONDS });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: { name: req.user.name, email: req.user.email, role: req.user.role, tenantId: req.user.tenantId } });
});

app.get('/api/dashboard', auth, (req, res) => {
  const data = readData();
  const incidents = (data.incidents || []).map(i => ({ ...i, priority: explainIncidentPriority(i) }));
  res.json({
    synthetic: Boolean(data.meta?.synthetic),
    label: data.meta?.label,
    summary: dashboardSummary(data),
    programmes: data.programmes || [],
    projects: data.projects || [],
    incidents: incidents.sort((a, b) => b.priority.score - a.priority.score),
    workOrders: data.workOrders || [],
    revenue: data.revenue || [],
    activities: (data.activities || []).slice(0, 12)
  });
});

function listRoute(name) {
  app.get(`/api/${name}`, auth, (req, res) => res.json(readData()[name] || []));
}
['programmes', 'projects', 'milestones', 'incidents', 'workOrders', 'revenue', 'activities'].forEach(listRoute);

app.post('/api/projects', auth, requirePermission('project.create'), (req, res) => {
  const data = readData();
  const project = {
    id: newId('proj'),
    programmeId: cleanString(req.body?.programmeId, 100),
    name: cleanString(req.body?.name, 160),
    owner: cleanString(req.body?.owner, 120),
    status: cleanString(req.body?.status || 'active', 40),
    progress: Math.max(0, Math.min(100, Number(req.body?.progress || 0))),
    risk: cleanString(req.body?.risk || 'medium', 30),
    daysLate: Number(req.body?.daysLate || 0),
    budget: Number(req.body?.budget || 0),
    actualExpenditure: Number(req.body?.actualExpenditure || 0),
    nextMilestone: cleanString(req.body?.nextMilestone || '', 180)
  };
  if (!project.name || !project.owner) return res.status(400).json({ error: 'Project name and owner are required.' });
  data.projects = data.projects || [];
  data.projects.push(project);
  addActivity(data, req.user, `Created project: ${project.name}`, 'project', project.id);
  writeData(data);
  res.status(201).json(project);
});

app.patch('/api/projects/:id', auth, requirePermission('project.update'), (req, res) => {
  const data = readData();
  const project = (data.projects || []).find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  const allowed = ['name', 'owner', 'status', 'progress', 'risk', 'daysLate', 'budget', 'actualExpenditure', 'nextMilestone'];
  for (const key of allowed) {
    if (req.body[key] === undefined) continue;
    if (['progress', 'daysLate', 'budget', 'actualExpenditure'].includes(key)) project[key] = Number(req.body[key]);
    else project[key] = cleanString(req.body[key], 180);
  }
  project.progress = Math.max(0, Math.min(100, Number(project.progress || 0)));
  addActivity(data, req.user, `Updated project: ${project.name}`, 'project', project.id);
  writeData(data);
  res.json(project);
});

app.post('/api/incidents', auth, requirePermission('incident.create'), (req, res) => {
  const data = readData();
  const incident = {
    id: newId('inc'),
    municipality: cleanString(req.body?.municipality || 'Demo Metro Municipality', 140),
    ward: cleanString(req.body?.ward, 80),
    zone: cleanString(req.body?.zone, 120),
    asset: cleanString(req.body?.asset, 160),
    category: cleanString(req.body?.category || 'leak', 60),
    severity: cleanString(req.body?.severity || 'medium', 30),
    status: cleanString(req.body?.status || 'detected', 50),
    estimatedLossKlPerDay: Number(req.body?.estimatedLossKlPerDay || 0),
    populationAffected: Number(req.body?.populationAffected || 0),
    criticalFacilityAffected: Boolean(req.body?.criticalFacilityAffected),
    openHours: Number(req.body?.openHours || 0),
    recurrenceCount: Number(req.body?.recurrenceCount || 0),
    assignedTeam: cleanString(req.body?.assignedTeam || 'Unassigned', 120),
    location: cleanString(req.body?.location || 'Location pending verification', 180),
    detectedAt: new Date().toISOString()
  };
  if (!incident.zone || !incident.asset) return res.status(400).json({ error: 'Zone and asset are required.' });
  data.incidents = data.incidents || [];
  data.incidents.push(incident);
  addActivity(data, req.user, `Created ${incident.severity} incident in ${incident.zone}`, 'incident', incident.id);
  writeData(data);
  res.status(201).json({ ...incident, priority: explainIncidentPriority(incident) });
});

app.patch('/api/incidents/:id', auth, requirePermission('incident.update'), (req, res) => {
  const data = readData();
  const incident = (data.incidents || []).find(i => i.id === req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found.' });
  const allowed = ['severity', 'status', 'estimatedLossKlPerDay', 'populationAffected', 'criticalFacilityAffected', 'openHours', 'recurrenceCount', 'assignedTeam', 'location'];
  for (const key of allowed) {
    if (req.body[key] === undefined) continue;
    if (['estimatedLossKlPerDay', 'populationAffected', 'openHours', 'recurrenceCount'].includes(key)) incident[key] = Number(req.body[key]);
    else if (key === 'criticalFacilityAffected') incident[key] = Boolean(req.body[key]);
    else incident[key] = cleanString(req.body[key], 180);
  }
  addActivity(data, req.user, `Updated incident ${incident.id} to ${incident.status}`, 'incident', incident.id);
  writeData(data);
  res.json({ ...incident, priority: explainIncidentPriority(incident) });
});

app.post('/api/work-orders', auth, requirePermission('workorder.create'), (req, res) => {
  const data = readData();
  const workOrder = {
    id: newId('wo'),
    incidentId: cleanString(req.body?.incidentId, 100),
    projectId: cleanString(req.body?.projectId, 100),
    description: cleanString(req.body?.description, 240),
    priority: cleanString(req.body?.priority || 'medium', 30),
    assignedTeam: cleanString(req.body?.assignedTeam || 'Unassigned', 120),
    status: cleanString(req.body?.status || 'assigned', 50),
    slaHours: Number(req.body?.slaHours || 24),
    estimatedCost: Number(req.body?.estimatedCost || 0)
  };
  if (!workOrder.description) return res.status(400).json({ error: 'Work-order description is required.' });
  data.workOrders = data.workOrders || [];
  data.workOrders.push(workOrder);
  addActivity(data, req.user, `Created work order: ${workOrder.description}`, 'workOrder', workOrder.id);
  writeData(data);
  res.status(201).json(workOrder);
});

app.post('/api/assistant/query', auth, (req, res) => {
  const query = cleanString(req.body?.query, 500);
  const q = query.toLowerCase();
  const data = readData();
  const summary = dashboardSummary(data);
  const ranked = (data.incidents || []).filter(i => i.status !== 'closed').map(i => ({ ...i, priority: explainIncidentPriority(i) })).sort((a, b) => b.priority.score - a.priority.score);
  let answer;
  let sources = [];

  if (!query) return res.status(400).json({ error: 'Query is required.' });
  if (q.includes('greatest water loss') || q.includes('highest water loss') || q.includes('causing the greatest')) {
    const top = ranked[0];
    if (!top) answer = 'No open incident data is available.';
    else {
      answer = `${top.id} in ${top.zone} is the highest-priority open incident in the demo dataset, with an estimated loss of ${top.estimatedLossKlPerDay} kL/day. Priority is ${top.priority.band} (${top.priority.score}/100) because of ${top.priority.reasons.join(', ')}.`;
      sources = [{ type: 'incident', id: top.id }];
    }
  } else if (q.includes('late') || q.includes('overdue')) {
    const late = (data.projects || []).filter(p => p.daysLate > 0 || p.status === 'delayed');
    answer = late.length ? `${late.length} project(s) are late: ${late.map(p => `${p.name} (${p.daysLate} days)`).join('; ')}.` : 'No projects are currently recorded as late.';
    sources = late.map(p => ({ type: 'project', id: p.id }));
  } else if (q.includes('revenue') || q.includes('recovery')) {
    answer = `Projected recovery is ZAR ${summary.projectedRecovery.toLocaleString('en-ZA')}; verified realised recovery is ZAR ${summary.verifiedRecovery.toLocaleString('en-ZA')}. These values come from synthetic hackathon data.`;
    sources = (data.revenue || []).map(r => ({ type: 'revenue', id: r.id }));
  } else if (q.includes('brief') || q.includes('attention') || q.includes('risk')) {
    const top = ranked[0];
    answer = `Executive briefing: ${summary.atRiskProjects} project(s) are at risk, ${summary.criticalIncidents} high/critical incident(s) are open, and estimated open water loss is ${summary.estimatedOpenLossKlPerDay} kL/day.${top ? ` Immediate attention: ${top.id} in ${top.zone}.` : ''}`;
    sources = top ? [{ type: 'incident', id: top.id }] : [];
  } else {
    answer = `AquaFlow currently records ${summary.activeProjects} active project(s), ${summary.openWorkOrders} open work order(s), ${summary.criticalIncidents} high/critical incident(s), and ${summary.estimatedOpenLossKlPerDay} kL/day estimated open loss in the synthetic demonstration dataset.`;
  }

  addActivity(data, { name: 'AquaFlow AI' }, `Answered assistant query: ${query}`, 'aiInteraction', newId('ai'));
  writeData(data);
  res.json({ answer, sources, synthetic: Boolean(data.meta?.synthetic), mode: 'deterministic-demo-assistant' });
});

app.use(express.static(FRONTEND_DIR, { extensions: ['html'] }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  const correlationId = crypto.randomUUID();
  console.error(JSON.stringify({ level: 'error', correlationId, path: req.path, message: err?.message || 'Unknown error' }));
  res.status(500).json({ error: 'An unexpected error occurred.', correlationId });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AquaFlow AI listening on http://localhost:${PORT} (${NODE_ENV})`);
  });
}

module.exports = { app, readData, writeData, signToken, verifyToken };
