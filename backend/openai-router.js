'use strict';

const crypto = require('crypto');
const express = require('express');
const { authMiddleware, requirePermission } = require('./lib/auth');
const { answerQuery } = require('./lib/assistant');

const BUILTIN_VOICES = ['coral','marin','shimmer','nova','sage','cedar','alloy','ash','ballad','echo','fable','onyx','verse'];
const DEFAULT_TTS_MODEL = 'gpt-4o-mini-tts';
const DEFAULT_AI_MODEL = 'gpt-5.6-luna';
const runtimeBySession = new Map();

const LANGUAGE_NAMES = {
  'en-ZA':'South African English',
  'af-ZA':'Afrikaans',
  'zu-ZA':'isiZulu',
  'xh-ZA':'isiXhosa',
  'st-ZA':'Sesotho',
  'tn-ZA':'Setswana',
  'nso-ZA':'Sepedi',
  'ts-ZA':'itsonga',
  've-ZA':'Tshivenda',
  'ss-ZA':'siSwati',
  'nr-ZA':'isiNdebele'
};

function clean(value, max = 4096) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function sessionId(req) {
  const token = String(req.headers.authorization || '');
  return crypto.createHash('sha256').update(token).digest('hex');
}

function prune() {
  const now = Date.now();
  for (const [key, value] of runtimeBySession.entries()) if (!value || value.expiresAt < now) runtimeBySession.delete(key);
  if (runtimeBySession.size > 500) {
    const oldest = [...runtimeBySession.entries()].sort((a,b)=>(a[1].updatedAt||0)-(b[1].updatedAt||0)).slice(0,100);
    oldest.forEach(([key]) => runtimeBySession.delete(key));
  }
}

function getRuntime(req) {
  prune();
  const session = runtimeBySession.get(sessionId(req));
  const envKey = process.env.OPENAI_API_KEY || '';
  return {
    apiKey: session?.apiKey || envKey,
    source: session?.apiKey ? 'session' : (envKey ? 'server' : null),
    aiModel: session?.aiModel || process.env.AI_MODEL || DEFAULT_AI_MODEL,
    ttsModel: session?.ttsModel || process.env.OPENAI_TTS_MODEL || DEFAULT_TTS_MODEL,
    voice: session?.voice || process.env.OPENAI_TTS_VOICE || 'coral',
    customVoiceId: session?.customVoiceId || '',
    configured: Boolean(session?.apiKey || envKey)
  };
}

function ttsVoice(runtime) {
  if (runtime.customVoiceId) return { id: runtime.customVoiceId };
  return BUILTIN_VOICES.includes(runtime.voice) ? runtime.voice : 'coral';
}

function speechInstructions(language) {
  const languageName = LANGUAGE_NAMES[language] || 'the selected language';
  return [
    'You are Ayanda, a warm, confident, professional adult South African woman.',
    `Speak naturally in ${languageName}.`,
    'Use a human conversational cadence, natural phrasing, gentle warmth and clear executive diction.',
    'Use South African pronunciation and rhythm where the selected voice can support it.',
    'Avoid robotic delivery, exaggerated accents, announcer style, or theatrical performance.',
    'Keep the pace natural and responsive, with short pauses at punctuation.'
  ].join(' ');
}

function buildOpenAIRouter({ store, tokenSecret }) {
  const router = express.Router();
  const auth = authMiddleware(tokenSecret);

  router.get('/api/settings/openai', auth, requirePermission('ai.query'), (req,res) => {
    const runtime = getRuntime(req);
    res.json({
      configured: runtime.configured,
      source: runtime.source,
      aiModel: runtime.aiModel,
      ttsModel: runtime.ttsModel,
      voice: runtime.voice,
      customVoiceId: runtime.customVoiceId ? 'configured' : '',
      voices: BUILTIN_VOICES,
      keyStorage: 'ephemeral-server-session'
    });
  });

  router.post('/api/settings/openai', auth, requirePermission('ai.query'), (req,res) => {
    const id = sessionId(req);
    if (req.body?.clear === true) {
      runtimeBySession.delete(id);
      const runtime = getRuntime(req);
      return res.json({ configured:runtime.configured, source:runtime.source, cleared:true });
    }
    const apiKey = clean(req.body?.apiKey, 512);
    if (apiKey && apiKey.length < 20) return res.status(400).json({ error:'OpenAI API key appears incomplete.' });
    const previous = runtimeBySession.get(id) || {};
    const voice = clean(req.body?.voice, 80) || previous.voice || 'coral';
    const customVoiceId = clean(req.body?.customVoiceId, 160);
    const aiModel = clean(req.body?.aiModel, 100) || previous.aiModel || DEFAULT_AI_MODEL;
    const ttsModel = clean(req.body?.ttsModel, 100) || previous.ttsModel || DEFAULT_TTS_MODEL;
    runtimeBySession.set(id, {
      apiKey: apiKey || previous.apiKey || '',
      voice: BUILTIN_VOICES.includes(voice) ? voice : 'coral',
      customVoiceId: customVoiceId || previous.customVoiceId || '',
      aiModel,
      ttsModel,
      updatedAt: Date.now(),
      expiresAt: Date.now() + (8 * 60 * 60 * 1000)
    });
    const runtime = getRuntime(req);
    res.json({ configured:runtime.configured, source:runtime.source, aiModel:runtime.aiModel, ttsModel:runtime.ttsModel, voice:runtime.voice, customVoiceId:runtime.customVoiceId?'configured':'', keyStorage:'ephemeral-server-session' });
  });

  router.post('/api/settings/openai/test', auth, requirePermission('ai.query'), async (req,res) => {
    try {
      const runtime = getRuntime(req);
      if (!runtime.configured) return res.status(400).json({ error:'Configure an OpenAI API key first.' });
      const response = await fetch('https://api.openai.com/v1/models', {
        headers:{ authorization:`Bearer ${runtime.apiKey}` },
        signal:AbortSignal.timeout(10000)
      });
      if (!response.ok) return res.status(400).json({ error:`OpenAI rejected the key (HTTP ${response.status}).` });
      res.json({ ok:true, message:'OpenAI connection verified.' });
    } catch (error) {
      res.status(502).json({ error:`Could not reach OpenAI: ${clean(error.message,160)}` });
    }
  });

  router.post('/api/assistant/query', auth, requirePermission('ai.query'), async (req,res,next) => {
    try {
      const query = clean(req.body?.query, 800);
      if (!query) return res.status(400).json({ error:'Query is required.' });
      const runtime = getRuntime(req);
      const env = runtime.configured
        ? { ...process.env, AI_PROVIDER:'openai', OPENAI_API_KEY:runtime.apiKey, AI_MODEL:runtime.aiModel }
        : process.env;
      const result = await answerQuery(query, store.read(), req.user, env);
      store.addActivity(req.user, `Asked AquaFlow AI: ${query.slice(0,100)}`, 'ai', `ai-${Date.now()}`, req.user.tenantId);
      res.json({ ...result, provider:runtime.configured?'openai':'deterministic' });
    } catch (error) { next(error); }
  });

  router.post('/api/assistant/speech', auth, requirePermission('ai.query'), async (req,res) => {
    try {
      const text = clean(req.body?.text, 4096);
      const language = clean(req.body?.language, 20) || 'en-ZA';
      if (!text) return res.status(400).json({ error:'Speech text is required.' });
      const runtime = getRuntime(req);
      if (!runtime.configured) return res.status(409).json({ error:'OpenAI neural voice is not configured.' });
      const requestedVoice = clean(req.body?.voice,80);
      if (BUILTIN_VOICES.includes(requestedVoice)) runtime.voice = requestedVoice;
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method:'POST',
        headers:{ 'content-type':'application/json', authorization:`Bearer ${runtime.apiKey}` },
        body:JSON.stringify({
          model:runtime.ttsModel || DEFAULT_TTS_MODEL,
          voice:ttsVoice(runtime),
          input:text,
          instructions:speechInstructions(language),
          response_format:'mp3',
          speed:1
        }),
        signal:AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const detail = clean(await response.text(), 300);
        return res.status(502).json({ error:`OpenAI speech generation failed (HTTP ${response.status}).`, detail });
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader('Content-Type','audio/mpeg');
      res.setHeader('Cache-Control','no-store');
      res.setHeader('Content-Length',String(buffer.length));
      res.send(buffer);
    } catch (error) {
      res.status(502).json({ error:`Neural voice unavailable: ${clean(error.message,180)}` });
    }
  });

  return router;
}

module.exports = { buildOpenAIRouter, getRuntime, BUILTIN_VOICES, speechInstructions };
