'use strict';

const express = require('express');
const { app } = require('./app');

const httpApp = express();
const COOKIE_NAME = 'aquaflow_session';

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
  if (!req.headers.authorization && cookies[COOKIE_NAME]) {
    req.headers.authorization = `Bearer ${cookies[COOKIE_NAME]}`;
  }

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

httpApp.use(app);

module.exports = { httpApp, parseCookies, COOKIE_NAME };
