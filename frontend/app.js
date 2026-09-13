'use strict';

const state = {
  token: sessionStorage.getItem('aquaflowToken') || '',
  dashboard: null,
  section: 'command',
  recognition: null,
  speaking: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (value) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value) => new Intl.NumberFormat('en-ZA').format(Number(value || 0));
const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    signOut();
    throw new Error(body.error || 'Your session has expired.');
  }
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

function signOut() {
  stopSpeech();
  state.token = '';
  state.dashboard = null;
  sessionStorage.removeItem('aquaflowToken');
  $('#appView').hidden = true;
  $('#loginView').hidden = false;
}

async function login(event) {
  event.preventDefault();
  const message = $('#loginMessage');
  message.textContent = '';
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('#email').value, password: $('#password').value })
    });
    state.token = result.token;
    sessionStorage.setItem('aquaflowToken', result.token);
    $('#loginView').hidden = true;
    $('#appView').hidden = false;
    await loadDashboard();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function restoreSession() {
  if (!state.token) return;
  try {
    await api('/api/auth/me');
    $('#loginView').hidden = true;
    $('#appView').hidden = false;
    await loadDashboard();
  } catch {
    signOut();
  }
}

function metric(label, value, note, tone = '') {
  return `<article class="metric-card ${tone}"><span class="metric-label">${safe(label)}</span><strong class="metric-value">${safe(value)}</strong><span class="metric-note">${safe(note)}</span></article>`;
}

function chip(value) {
  const cls = safe(String(value || '').toLowerCase().replace(/[^a-z-]/g, ''));
  return `<span class="chip ${cls}">${safe(value || 'unknown')}</span>`;
}

function renderDashboard() {
  const data = state.dashboard;
  if (!data) return;
  const s = data.summary;
  $('#metricGrid').innerHTML = [
    metric('Active projects', s.activeProjects, `${s.atRiskProjects} currently at risk`, s.atRiskProjects ? 'attention' : 'good'),
    metric('High / critical incidents', s.criticalIncidents, `${s.openWorkOrders} open work orders`, s.criticalIncidents ? 'danger' : 'good'),
    metric('Estimated open water loss', `${number(s.estimatedOpenLossKlPerDay)} kL/day`, 'Synthetic incident estimates', 'attention'),
    metric('Verified revenue recovery', money(s.verifiedRecovery), `Projected: ${money(s.projectedRecovery)}`, 'good')
  ].join('');

  $('#priorityIncidents').innerHTML = data.incidents.slice(0, 4).map(i => `
    <div class="incident-row">
      <div><div class="item-title">${safe(i.id)} · ${safe(i.zone)}</div><div class="item-sub">${safe(i.asset)} · ${number(i.estimatedLossKlPerDay)} kL/day</div></div>
      <div><div class="item-sub">Why prioritised</div><div>${safe(i.priority.reasons.join(', '))}</div></div>
      <div>${chip(i.priority.band)}</div>
      <div><span class="priority-score">${safe(i.priority.score)}</span><span class="item-sub"> / 100</span></div>
    </div>`).join('') || '<p class="item-sub">No open incidents.</p>';

  $('#projectPreview').innerHTML = data.projects.slice(0, 4).map(p => `
    <div class="project-row">
      <div><div class="item-title">${safe(p.name)}</div><div class="item-sub">${safe(p.owner)} · ${safe(p.nextMilestone)}</div></div>
      <div>${chip(p.risk)}</div>
      <div><div class="progress" aria-label="${safe(p.progress)} percent complete"><span style="width:${Math.max(0, Math.min(100, Number(p.progress || 0)))}%"></span></div></div>
      <strong>${safe(p.progress)}%</strong>
    </div>`).join('');

  renderActivities(data.activities || [], '#activityPreview', 5);
  renderProjects(data.projects || []);
  renderIncidents(data.incidents || []);
  renderRevenue(data.revenue || [], s);
  renderActivities(data.activities || [], '#activityFull', 50);
}

function renderProjects(projects) {
  $('#projectsTable').innerHTML = projects.map(p => `
    <tr>
      <td><strong>${safe(p.name)}</strong><div class="item-sub">${safe(p.id)}</div></td>
      <td>${safe(p.owner)}</td><td>${chip(p.status)}</td>
      <td><div class="progress"><span style="width:${Math.max(0, Math.min(100, Number(p.progress || 0)))}%"></span></div><div class="item-sub">${safe(p.progress)}%</div></td>
      <td>${chip(p.risk)}</td><td class="money">${money(p.budget)}</td><td>${safe(p.nextMilestone || '—')}</td>
    </tr>`).join('');
}

function renderIncidents(incidents) {
  $('#incidentsTable').innerHTML = incidents.map(i => `
    <tr>
      <td><strong>${safe(i.id)}</strong><div class="item-sub">${safe(i.category)}</div></td>
      <td>${safe(i.zone)}<div class="item-sub">${safe(i.asset)}</div></td>
      <td>${chip(i.severity)}</td><td>${chip(i.status)}</td>
      <td>${number(i.estimatedLossKlPerDay)} kL/day</td>
      <td><strong>${safe(i.priority.score)}/100</strong><div>${chip(i.priority.band)}</div></td>
      <td>${safe(i.assignedTeam)}</td>
    </tr>`).join('');
}

function renderRevenue(revenue, summary) {
  const ai = revenue.reduce((sum, r) => sum + Number(r.aiEstimatedRecovery || 0), 0);
  $('#revenueCards').innerHTML = `
    <article class="revenue-card"><span class="item-sub">Forecast</span><strong>${money(summary.projectedRecovery)}</strong></article>
    <article class="revenue-card"><span class="item-sub">AI estimate</span><strong>${money(ai)}</strong></article>
    <article class="revenue-card"><span class="item-sub">Verified realised</span><strong>${money(summary.verifiedRecovery)}</strong></article>`;
}

function renderActivities(activities, target, limit) {
  $(target).innerHTML = activities.slice(0, limit).map(a => {
    const when = new Date(a.timestamp);
    return `<div class="activity-item"><div class="item-sub">${safe(when.toLocaleString('en-ZA', { dateStyle:'short', timeStyle:'short' }))}</div><div><div class="item-title">${safe(a.action)}</div><div class="item-sub">${safe(a.user)}</div></div><div>${chip(a.recordType)}</div></div>`;
  }).join('') || '<p class="item-sub">No recent activity.</p>';
}

async function loadDashboard() {
  const data = await api('/api/dashboard');
  state.dashboard = data;
  $('#dataBadge').textContent = data.synthetic ? 'Synthetic data' : 'Authorised live data';
  renderDashboard();
}

function showSection(name) {
  state.section = name;
  const titles = { command:'Executive Command Centre', projects:'Programme & Project Delivery', incidents:'Incident & Work Order Response', revenue:'Revenue Recovery', activity:'Audit & Activity' };
  $('.active-section')?.classList.remove('active-section');
  $$('.section').forEach(s => s.hidden = true);
  const section = $(`#${name}Section`);
  if (section) { section.hidden = false; section.classList.add('active-section'); }
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.section === name));
  $('#pageTitle').textContent = titles[name] || 'AquaFlow AI';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function appendBubble(text, who = 'assistant') {
  const box = $('#assistantConversation');
  const div = document.createElement('div');
  div.className = who === 'user' ? 'user-bubble' : 'assistant-bubble';
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  state.speaking = false;
  $('#voiceState').textContent = 'Ready';
}

function selectVoice(language) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const langRoot = language.split('-')[0].toLowerCase();
  const candidates = voices.filter(v => (v.lang || '').toLowerCase().startsWith(langRoot));
  return candidates.find(v => /ayanda/i.test(v.name)) || candidates.find(v => /south africa|africa|zulu|xhosa/i.test(`${v.name} ${v.lang}`)) || candidates[0] || null;
}

function speak(text) {
  if (!$('#speakToggle').checked || !('speechSynthesis' in window)) return;
  stopSpeech();
  const language = $('#languageSelect').value;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  const voice = selectVoice(language);
  if (voice) utterance.voice = voice;
  utterance.rate = 1.02;
  utterance.onstart = () => { state.speaking = true; $('#voiceState').textContent = voice ? `Speaking · ${voice.name}` : 'Speaking'; };
  utterance.onend = () => { state.speaking = false; $('#voiceState').textContent = 'Ready'; };
  utterance.onerror = () => { state.speaking = false; $('#voiceState').textContent = 'Voice unavailable'; };
  window.speechSynthesis.speak(utterance);
}

async function askAssistant(event) {
  event.preventDefault();
  const input = $('#assistantQuery');
  const query = input.value.trim();
  if (!query) return;
  appendBubble(query, 'user');
  input.value = '';
  $('#voiceState').textContent = 'Processing';
  try {
    const result = await api('/api/assistant/query', { method:'POST', body: JSON.stringify({ query, language: $('#languageSelect').value }) });
    appendBubble(result.answer, 'assistant');
    speak(result.answer);
    await loadDashboard();
  } catch (error) {
    appendBubble(`I could not complete that request: ${error.message}`, 'assistant');
    $('#voiceState').textContent = 'Error';
  }
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $('#micButton').disabled = true;
    $('#micButton').title = 'Speech recognition is not supported by this browser.';
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onstart = () => { stopSpeech(); $('#voiceState').textContent = 'Listening'; };
  recognition.onresult = (event) => {
    $('#assistantQuery').value = event.results[0][0].transcript;
    $('#voiceState').textContent = 'Ready';
  };
  recognition.onerror = () => { $('#voiceState').textContent = 'Voice input unavailable'; };
  recognition.onend = () => { if ($('#voiceState').textContent === 'Listening') $('#voiceState').textContent = 'Ready'; };
  state.recognition = recognition;
}

function startVoiceInput() {
  if (!state.recognition) return;
  stopSpeech();
  state.recognition.lang = $('#languageSelect').value;
  try { state.recognition.start(); } catch { /* already active */ }
}

function openProjectDialog() {
  $('#projectFormMessage').textContent = '';
  $('#projectDialog').showModal();
}

async function createProject(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const programmeId = state.dashboard?.programmes?.[0]?.id || '';
  const payload = Object.fromEntries(form.entries());
  payload.programmeId = programmeId;
  payload.budget = Number(payload.budget || 0);
  try {
    await api('/api/projects', { method:'POST', body: JSON.stringify(payload) });
    $('#projectDialog').close();
    event.currentTarget.reset();
    await loadDashboard();
    showSection('projects');
  } catch (error) {
    $('#projectFormMessage').textContent = error.message;
  }
}

function bindEvents() {
  $('#loginForm').addEventListener('submit', login);
  $('#logoutButton').addEventListener('click', signOut);
  $('#refreshButton').addEventListener('click', loadDashboard);
  $('#activityRefresh').addEventListener('click', loadDashboard);
  $('#assistantForm').addEventListener('submit', askAssistant);
  $('#micButton').addEventListener('click', startVoiceInput);
  $('#languageSelect').addEventListener('change', stopSpeech);
  $('#newProjectButton').addEventListener('click', openProjectDialog);
  $$('[data-new-project]').forEach(b => b.addEventListener('click', openProjectDialog));
  $('#closeProjectDialog').addEventListener('click', () => $('#projectDialog').close());
  $('#cancelProject').addEventListener('click', () => $('#projectDialog').close());
  $('#projectForm').addEventListener('submit', createProject);
  $$('.nav-item').forEach(b => b.addEventListener('click', () => showSection(b.dataset.section)));
  $$('[data-go]').forEach(b => b.addEventListener('click', () => showSection(b.dataset.go)));
  window.addEventListener('beforeunload', stopSpeech);
}

bindEvents();
setupSpeechRecognition();
restoreSession();
