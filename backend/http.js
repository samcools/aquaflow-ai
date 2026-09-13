'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { app, store, config } = require('./app');
const { authMiddleware } = require('./lib/auth');
const { hasPermission } = require('./lib/policy');
const { parseCsv, schemaFor, validateRows } = require('./lib/csv');
const { buildVoiceRouter } = require('./voice-router');

const httpApp = express();
const COOKIE_NAME = 'aquaflow_session';
const auth = authMiddleware(config.tokenSecret);
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try { cookies[key] = decodeURIComponent(value); } catch { cookies[key] = value; }
  }
  return cookies;
}

httpApp.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  if (!req.headers.authorization && cookies[COOKIE_NAME]) req.headers.authorization = `Bearer ${cookies[COOKIE_NAME]}`;

  const originalJson = res.json.bind(res);
  res.json = body => {
    if (req.path === '/api/auth/login' && body?.token) {
      const production = (process.env.NODE_ENV || process.env.APP_ENV) === 'production';
      res.cookie(COOKIE_NAME, body.token, {
        httpOnly: true,
        secure: production,
        sameSite: 'strict',
        path: '/',
        maxAge: Number(body.expiresIn || 28800) * 1000
      });
    } else if (req.path === '/api/auth/logout') {
      res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict', path: '/' });
    }
    return originalJson(body);
  };
  next();
});

// Parse normal API JSON at the outer gateway so pre-app routers such as the
// governed voice command layer receive the same request body as the core app.
// express.json ignores text/csv, so the CSV ingestion parser below is unaffected.
httpApp.use(express.json({ limit:'1mb' }));

const csvBody = express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' });

function importContext(req, res) {
  try {
    const resource = String(req.query.resource || '').trim();
    const schema = schemaFor(resource);
    if (!hasPermission(req.user, schema.permission)) {
      res.status(403).json({ error: 'You are not authorised to import this resource.' });
      return null;
    }
    const parsed = parseCsv(req.body);
    if (!parsed.headers.length) {
      res.status(400).json({ error: 'CSV file is empty or has no header row.' });
      return null;
    }
    const unknownHeaders = parsed.headers.filter(header => !schema.allowed.includes(header));
    const existing = store.list(resource, req.user.tenantId);
    const validation = validateRows(resource, parsed.rows, existing);
    return { resource, schema, parsed, validation, unknownHeaders };
  } catch (error) {
    res.status(400).json({ error: error.message || 'CSV import validation failed.' });
    return null;
  }
}

httpApp.post('/api/imports/csv/preview', auth, csvBody, (req, res) => {
  const context = importContext(req, res);
  if (!context) return;
  const { resource, parsed, validation, unknownHeaders } = context;
  const valid = validation.filter(row => row.valid);
  const invalid = validation.filter(row => !row.valid);
  res.json({ resource, headers:parsed.headers, totalRows:validation.length, validRows:valid.length, invalidRows:invalid.length, unknownHeaders, sample:validation.slice(0,25), canApply:invalid.length===0&&validation.length>0, note:unknownHeaders.length?'Unknown columns will be ignored during import.':'All columns are recognised.' });
});

httpApp.post('/api/imports/csv/apply', auth, csvBody, (req, res) => {
  const context = importContext(req, res);
  if (!context) return;
  const { resource, schema, validation, unknownHeaders } = context;
  const valid = validation.filter(row => row.valid);
  const invalid = validation.filter(row => !row.valid);
  const allowValidOnly = String(req.query.mode || '').toLowerCase() === 'valid-only';
  if (invalid.length && !allowValidOnly) return res.status(409).json({ error:'Import was not applied because one or more rows failed validation.', invalidRows:invalid.length, sample:invalid.slice(0,25) });
  if (!valid.length) return res.status(400).json({ error:'No valid records are available to import.' });
  const created = valid.map(entry => store.create(resource, entry.record, req.user, schema.prefix));
  const importRecord = store.create('imports', { resource, format:'csv', importedCount:created.length, rejectedCount:invalid.length, ignoredColumns:unknownHeaders, status:invalid.length?'completed-with-rejections':'completed', importedAt:new Date().toISOString() }, req.user, 'import');
  res.status(201).json({ importId:importRecord.id, resource, imported:created.length, rejected:invalid.length, ignoredColumns:unknownHeaders, createdIds:created.map(record=>record.id) });
});

httpApp.get('/api/imports/history', auth, (req, res) => {
  if (!hasPermission(req.user, 'audit.read') && !hasPermission(req.user, 'project.create') && !hasPermission(req.user, 'meter.create')) return res.status(403).json({ error:'You are not authorised to view import history.' });
  res.json(store.list('imports', req.user.tenantId));
});

httpApp.use(buildVoiceRouter({ store, tokenSecret: config.tokenSecret }));

// Serve the validated base UI with the original dashboard restoration and
// the single global Ayanda controller injected after the base bundle. The
// base index remains untouched, making the enhancement reversible and easy
// to test independently.
function serveEnhancedIndex(_req, res, next) {
  try {
    const indexPath = path.join(FRONTEND_DIR, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace('</head>', '  <link rel="stylesheet" href="/original-dashboard.css">\n</head>');
    html = html.replace('</body>', '  <script src="/original-dashboard.js"></script>\n</body>');
    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
}

httpApp.get('/', serveEnhancedIndex);
httpApp.get('/index.html', serveEnhancedIndex);
httpApp.use(app);

module.exports = { httpApp, parseCookies, COOKIE_NAME, serveEnhancedIndex };