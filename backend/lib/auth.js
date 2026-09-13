'use strict';

const crypto = require('crypto');
const { permissionsForRole, hasPermission } = require('./policy');

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token, secret) {
  try {
    const [header, body, signature] = String(token || '').split('.');
    if (!header || !body || !signature) return null;
    const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function safeEqualText(candidate, expected) {
  const a = crypto.createHash('sha256').update(String(candidate || '')).digest();
  const b = crypto.createHash('sha256').update(String(expected || '')).digest();
  return crypto.timingSafeEqual(a, b);
}

function createDemoUser({ email, role = 'System Administrator', tenantId = 'demo-metro', ttlSeconds = 28800 }) {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: `demo-${role.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    email,
    name: `AquaFlow ${role}`,
    role,
    tenantId,
    permissions: permissionsForRole(role),
    iat: now,
    exp: now + ttlSeconds
  };
}

function authMiddleware(secret) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const user = verifyToken(token, secret);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    req.user = user;
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) return res.status(403).json({ error: 'You are not authorised to perform this action.' });
    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  safeEqualText,
  createDemoUser,
  authMiddleware,
  requirePermission
};
