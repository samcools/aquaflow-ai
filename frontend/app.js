'use strict';

const state = {
  token: sessionStorage.getItem('aquaflowToken') || '',
  user: null,
  dashboard: null,
  section: 'command',
  tabs: { delivery:'projects', operations:'incidents', assets:'assets', revenue:'revenue', governance:'risks', documents:'documents' },
  cache: {},
  recognition: null,
  speaking: false,
  listening: false,
  creating: null,
  agentOpen: false
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const safe = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = v => new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(v||0));
const number = v => new Intl.NumberFormat('en-ZA',{maximumFractionDigits:1}).format(Number(v||0));
const date = v => { if(!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? safe(v) : d.toLocaleDateString('en-ZA'); };

const pageGuides = {
  command: {
    title:'Executive Command Centre',
    subtitle:'Live operational view of delivery, loss reduction and revenue recovery.',
    hint:'Explain executive status, prioritised incidents, NRW, revenue recovery, approvals, programme risks and recent activity.',
    explanation:'This is the Executive Command Centre. It combines programme delivery, high-priority water-loss incidents, non-revenue-water indicators, verified revenue recovery, approvals, risks and recent audit activity. Use it to identify what requires management intervention and then drill into the responsible workspace.'
  },
  delivery: {
    title:'Programme & Project Delivery',
    subtitle:'Connect recovery plans to milestones, work items, owners and deadlines.',
    hint:'Explain project health, open milestones, blocked work, ownership and overdue delivery. I can also create or update authorised delivery records.',
    explanation:'This page manages the delivery chain from programme to project, milestone and work item. Projects show accountable owners, progress, risk and budget. Milestones track measurable delivery points, while work items capture the operational tasks and blockers required to reach those milestones.'
  },
  operations: {
    title:'Incident & Work Order Response',
    subtitle:'Move detected losses through verification, assignment, repair and closure.',
    hint:'Explain incident priority, water-loss impact, work-order status, assigned teams and SLA exposure. I can update incident and work-order records when your role allows it.',
    explanation:'This page manages water incidents and field response. Incidents record the affected zone, asset, severity, estimated water loss and responsible team. Work orders convert those incidents into executable field activity with priority, assignment, SLA and completion status.'
  },
  assets: {
    title:'Assets & Meter Intelligence',
    subtitle:'Understand infrastructure condition, meter anomalies and NRW drivers.',
    hint:'Explain asset criticality, meter anomaly flags, NRW data and contractor performance. I can update asset, meter and contractor records when authorised.',
    explanation:'This page combines infrastructure and consumption intelligence. The Assets tab shows condition and criticality, Meters highlights anomaly indicators for investigation, NRW shows water-balance performance, and Contractors provides delivery-performance context. AI anomaly flags are advisory and are not fraud findings.'
  },
  revenue: {
    title:'Revenue Recovery & Finance',
    subtitle:'Separate forecast, AI estimate and evidence-backed realised recovery.',
    hint:'Explain forecast recovery, AI estimates, verified realised value, approved budgets, expenditure and variances.',
    explanation:'This page connects operational recovery with financial outcomes. Forecast recovery is a plan, AI-estimated recovery is advisory, and verified realised recovery is evidence-backed. Budget and expenditure views help management understand whether interventions are financially controlled.'
  },
  governance: {
    title:'Governance & Human Oversight',
    subtitle:'Manage risks, approvals, interventions and operational notifications.',
    hint:'Explain major risks, pending approvals and interventions. Human approvals remain explicit and are never bypassed by the assistant.',
    explanation:'This page is the human-oversight layer. Risks capture delivery threats and mitigations, approvals record decisions requiring accountable human authorisation, interventions describe corrective actions, and notifications surface operational events that may require attention.'
  },
  documents: {
    title:'Evidence & Documents',
    subtitle:'Link delivery claims to documents, photos and verification evidence.',
    hint:'Explain what evidence is linked to delivery records and help you navigate to the associated work. Uploads still follow document permissions.',
    explanation:'This page provides the evidence layer for accountable delivery. Documents can be linked to projects, incidents, work orders, assets and milestones. Evidence records can also indicate whether completion has been independently verified. A 100% progress value does not automatically mean verified completion.'
  },
  audit: {
    title:'Audit & Activity',
    subtitle:'Trace user, AI and operational changes across the platform.',
    hint:'Ask who changed a record, what happened at a specific time, or what changed recently. Audit results are tenant-scoped and permission-controlled.',
    explanation:'This page shows the accountability trail. It records who performed actions, which records were affected and when the activity occurred. AI and voice-initiated actions are recorded through the same activity mechanism as normal application actions.'
  }
};

async function api(path, options={}) {
  const headers = { ...(options.headers||{}) };
  const isForm = options.body instanceof FormData;
  if (!isForm && options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path,{...options,headers});
  const type = response.headers.get('content-type') || '';
  const body = type.includes('application/json') ? await response.json().catch(()=>({})) : await response.text();
  if (response.status === 401) { signOut(); throw new Error(body?.error || 'Your session expired.'); }
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body;
}

function toast(message,tone='good') {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast ${tone}`;
  el.hidden = false;
  clearTimeout(el._timer);
  el._timer = setTimeout(()=>el.hidden=true,3500);
}

function setAgentState(mode,label) {
  const panel = $('#voiceAgent');
  const launcher = $('#agentLauncher');
  if (panel) panel.classList.remove('listening','processing','speaking');
  if (launcher) launcher.classList.remove('active');
  if (mode && mode !== 'ready') {
    panel?.classList.add(mode);
    launcher?.classList.add('active');
  }
  const text = label || ({ready:'Ready',listening:'Listening',processing:'Processing',speaking:'Speaking'}[mode] || 'Ready');
  if ($('#voiceState')) $('#voiceState').textContent = text;
  if ($('#launcherState')) $('#launcherState').textContent = text;
}

function stopSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  state.speaking = false;
  if (!state.listening) setAgentState('ready');
}

function stopVoiceInput() {
  if (!state.recognition || !state.listening) return;
  try { state.recognition.stop(); } catch {}
  state.listening = false;
  $('#micButton')?.classList.remove('listening');
  if ($('#liveTranscript')) $('#liveTranscript').hidden = true;
  setAgentState('ready');
}

async function signOut() {
  stopVoiceInput();
  stopSpeech();
  if (state.token) { try { await api('/api/auth/logout',{method:'POST'}); } catch {} }
  state.token=''; state.user=null; state.dashboard=null; state.cache={};
  sessionStorage.removeItem('aquaflowToken');
  closeAgent();
  $('#appView').hidden=true;
  $('#loginView').hidden=false;
}

async function login(e) {
  e.preventDefault();
  $('#loginMessage').textContent='';
  try {
    const result = await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:$('#email').value,password:$('#password').value,role:$('#roleSelect').value})});
    state.token=result.token; state.user=result.user;
    sessionStorage.setItem('aquaflowToken',result.token);
    $('#loginView').hidden=true; $('#appView').hidden=false;
    await loadAll();
  } catch(err) { $('#loginMessage').textContent=err.message; }
}

async function restoreSession() {
  if(!state.token) return;
  try {
    const me=await api('/api/auth/me'); state.user=me.user;
    $('#loginView').hidden=true; $('#appView').hidden=false;
    await loadAll();
  } catch { signOut(); }
}

function chip(v) {
  const text=String(v||'unknown');
  const cls=text.toLowerCase().replace(/[^a-z0-9-]/g,'-');
  return `<span class="chip ${safe(cls)}">${safe(text)}</span>`;
}
function metric(label,value,note,tone='') { return `<article class="metric-card ${tone}"><span class="metric-label">${safe(label)}</span><strong class="metric-value">${safe(value)}</strong><span class="metric-note">${safe(note)}</span></article>`; }
function progress(v) { const n=Math.max(0,Math.min(100,Number(v||0))); return `<div class="progress"><span style="width:${n}%"></span></div><small>${n}%</small>`; }
function table(headers,rows) { return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${safe(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${headers.length}" class="empty">No records available.</td></tr>`}</tbody></table></div>`; }

async function loadAll() {
  const [me,dashboard] = await Promise.all([api('/api/auth/me'),api('/api/dashboard')]);
  state.user=me.user; state.dashboard=dashboard; state.cache={};
  $('#userRole').textContent=state.user.role;
  $('#tenantName').textContent=state.user.tenantId==='demo-metro'?'Demo Metro Municipality':state.user.tenantId;
  $('#dataBadge').textContent=dashboard.synthetic?'Synthetic data':'Authorised live data';
  $('#notificationBadge').textContent=`${dashboard.notifications?.length||0} alerts`;
  renderCommand();
  updatePageContext();
  await renderCurrentSection();
}

function renderCommand() {
  const d=state.dashboard||{}, s=d.summary||{};
  $('#metricGrid').innerHTML=[
    metric('Active projects',s.activeProjects,`${s.atRiskProjects||0} at risk`,s.atRiskProjects?'attention':'good'),
    metric('Critical incidents',s.criticalIncidents,`${s.openWorkOrders||0} open work orders`,s.criticalIncidents?'danger':'good'),
    metric('Estimated open loss',`${number(s.estimatedOpenLossKlPerDay)} kL/day`,'Operational estimate','attention'),
    metric('Verified recovery',money(s.verifiedRecovery),`Forecast ${money(s.projectedRecovery)}`,'good'),
    metric('Pending approvals',(d.approvals||[]).filter(a=>a.status==='pending').length,'Human decisions required','attention'),
    metric('Meter anomalies',(d.meters||[]).filter(m=>Number(m.anomaly?.score||0)>=40).length,'Review before action',''),
    metric('Open risks',(d.risks||[]).filter(r=>r.status!=='closed').length,'Programme risk register',''),
    metric('Unread alerts',(d.notifications||[]).length,'Operational notifications','')
  ].join('');

  $('#priorityIncidents').innerHTML=(d.incidents||[]).slice(0,5).map(i=>`<div class="incident-row"><div><strong>${safe(i.id)} · ${safe(i.zone)}</strong><small>${safe(i.asset)}</small></div><div><small>Why prioritised</small>${safe((i.priority?.reasons||[]).join(', ')||'No elevated factors')}</div><div>${chip(i.priority?.band||i.severity)}</div><div><strong>${safe(i.priority?.score||0)}/100</strong><small>${number(i.estimatedLossKlPerDay)} kL/day</small></div></div>`).join('')||'<p class="empty">No open incidents.</p>';
  $('#projectPreview').innerHTML=(d.projects||[]).slice(0,5).map(p=>`<div class="compact-row"><div><strong>${safe(p.name)}</strong><small>${safe(p.owner)} · ${safe(p.nextMilestone||'No milestone')}</small></div>${chip(p.health?.band||p.risk)}<div>${progress(p.progress)}</div></div>`).join('')||'<p class="empty">No projects.</p>';
  $('#nrwPreview').innerHTML=(d.nrw||[]).slice(0,3).map(n=>`<div class="kpi-line"><span>${safe(n.zone||n.name||'Municipal balance')}</span><strong>${number(n.calculated?.nrwPercent ?? n.currentNRWPercent)}%</strong><small>Target ${number(n.targetNRWPercent)}%</small></div>`).join('')||'<p class="empty">Data unavailable</p>';
  renderActivities(d.activities||[],'#activityPreview',6);
  renderRevenueCards();
  renderRecoveryVisual();
  renderManagementFocus();
}

function renderRecoveryVisual() {
  const d=state.dashboard||{},s=d.summary||{};
  const projectHealth=Math.max(0,Math.min(100,100-Number(s.atRiskProjects||0)*12-Number(s.delayedProjects||0)*10));
  const nrw=Number(s.currentNRWPercent||0), nrwGoal=nrw?Math.max(0,Math.min(100,100-nrw)):0;
  const verification=s.projectedRecovery?Math.max(0,Math.min(100,Number(s.verifiedRecovery||0)/Number(s.projectedRecovery)*100)):0;
  $('#recoveryVisual').innerHTML=[
    ['Delivery confidence',`${number(projectHealth)}%`,projectHealth,'Projects, delays and risk'],
    ['Water retained',`${number(nrwGoal)}%`,nrwGoal,'Inverse of calculated NRW'],
    ['Recovery verified',`${number(verification)}%`,verification,'Realised vs forecast revenue']
  ].map(([label,value,pct,note])=>`<div class="visual-kpi"><span>${safe(label)}</span><strong>${safe(value)}</strong><small>${safe(note)}</small><div class="visual-bar"><i style="width:${Math.max(0,Math.min(100,Number(pct)))}%"></i></div></div>`).join('');
}

function renderManagementFocus() {
  const d=state.dashboard||{}, s=d.summary||{};
  const items=[];
  if(Number(s.criticalIncidents||0)>0) items.push(['!','Critical incidents',`${s.criticalIncidents} high/critical incident(s) require operational attention.`]);
  if(Number(s.atRiskProjects||0)>0) items.push(['↗','At-risk delivery',`${s.atRiskProjects} project(s) are at risk and should be reviewed with accountable owners.`]);
  if((d.approvals||[]).filter(a=>a.status==='pending').length) items.push(['✓','Pending decisions',`${(d.approvals||[]).filter(a=>a.status==='pending').length} approval(s) require human decision.`]);
  if(!items.length) items.push(['✓','Stable position','No high-priority management exceptions are present in the current authorised dataset.']);
  $('#managementFocus').innerHTML=`<div class="focus-list">${items.slice(0,4).map(([icon,title,detail])=>`<div class="focus-item"><span class="focus-icon">${safe(icon)}</span><div><strong>${safe(title)}</strong><small>${safe(detail)}</small></div></div>`).join('')}</div>`;
}

function renderRevenueCards() {
  const d=state.dashboard||{},s=d.summary||{},rows=d.revenue||[];
  const ai=rows.reduce((a,r)=>a+Number(r.aiEstimatedRecovery||0),0);
  $('#revenueCards').innerHTML=`<article class="revenue-card"><small>Forecast</small><strong>${money(s.projectedRecovery)}</strong><span>Programme projection</span></article><article class="revenue-card"><small>AI estimate</small><strong>${money(ai)}</strong><span>Advisory; not booked</span></article><article class="revenue-card"><small>Verified realised</small><strong>${money(s.verifiedRecovery)}</strong><span>Evidence-backed recovery</span></article>`;
}

function renderActivities(rows,target,limit=50) {
  $(target).innerHTML=rows.slice(0,limit).map(a=>`<div class="activity-item"><small>${safe(new Date(a.timestamp).toLocaleString('en-ZA',{dateStyle:'short',timeStyle:'short'}))}</small><div><strong>${safe(a.action)}</strong><small>${safe(a.user)}</small></div>${chip(a.recordType)}</div>`).join('')||'<p class="empty">No activity.</p>';
}

async function getResource(resource,force=false) {
  if(!force&&state.cache[resource]) return state.cache[resource];
  const endpoint=resource==='nrw'?'/api/nrw':resource==='zones'?'/api/zones':`/api/${resource}`;
  const rows=await api(endpoint); state.cache[resource]=rows; return rows;
}

const renderers={
  projects:r=>table(['Project','Owner','Status','Progress','Risk','Budget','Actions'],r.map(x=>`<tr><td><strong>${safe(x.name)}</strong><small>${safe(x.id)}</small></td><td>${safe(x.owner)}</td><td>${chip(x.status)}</td><td>${progress(x.progress)}</td><td>${chip(x.risk)}</td><td>${money(x.budget)}</td><td>${actions('projects',x)}</td></tr>`)),
  milestones:r=>table(['Milestone','Project','Status','Progress','Due','Actions'],r.map(x=>`<tr><td><strong>${safe(x.name)}</strong><small>${safe(x.id)}</small></td><td>${safe(x.projectId)}</td><td>${chip(x.status)}</td><td>${progress(x.progress)}</td><td>${date(x.dueDate)}</td><td>${actions('milestones',x)}</td></tr>`)),
  'work-items':r=>table(['Work item','Project','Owner','Priority','Status','Actions'],r.map(x=>`<tr><td><strong>${safe(x.name)}</strong><small>${safe(x.id)}</small></td><td>${safe(x.projectId)}</td><td>${safe(x.owner||'—')}</td><td>${chip(x.priority)}</td><td>${chip(x.status)}</td><td>${actions('work-items',x)}</td></tr>`)),
  comments:r=>table(['Record','Comment','Author','Created'],r.map(x=>`<tr><td>${chip(x.recordType)}<small>${safe(x.recordId)}</small></td><td>${safe(x.body)}</td><td>${safe(x.author||x.createdBy||'—')}</td><td>${date(x.createdAt)}</td></tr>`)),
  incidents:r=>table(['Incident','Zone / Asset','Severity','Status','Loss','Team','Actions'],r.map(x=>`<tr><td><strong>${safe(x.id)}</strong><small>${safe(x.category)}</small></td><td>${safe(x.zone)}<small>${safe(x.asset)}</small></td><td>${chip(x.severity)}</td><td>${chip(x.status)}</td><td>${number(x.estimatedLossKlPerDay)} kL/day</td><td>${safe(x.assignedTeam||'Unassigned')}</td><td>${actions('incidents',x)}</td></tr>`)),
  'work-orders':r=>table(['Work order','Description','Priority','Status','Team','SLA','Actions'],r.map(x=>`<tr><td><strong>${safe(x.id)}</strong><small>${safe(x.incidentId||'')}</small></td><td>${safe(x.description)}</td><td>${chip(x.priority)}</td><td>${chip(x.status)}</td><td>${safe(x.assignedTeam||'Unassigned')}</td><td>${safe(x.slaHours||'—')}h</td><td>${actions('work-orders',x)}</td></tr>`)),
  zones:r=>table(['Zone','Municipality','Pressure','NRW','Risk'],r.map(x=>`<tr><td><strong>${safe(x.name||x.zone)}</strong></td><td>${safe(x.municipality||'—')}</td><td>${safe(x.pressureBar||'—')}</td><td>${number(x.nrwPercent||0)}%</td><td>${chip(x.risk||'medium')}</td></tr>`)),
  assets:r=>table(['Asset','Type','Zone','Condition','Criticality','Actions'],r.map(x=>`<tr><td><strong>${safe(x.name)}</strong><small>${safe(x.id)}</small></td><td>${safe(x.type)}</td><td>${safe(x.zone||'—')}</td><td>${chip(x.condition||'unknown')}</td><td>${chip(x.criticality||'medium')}</td><td>${actions('assets',x)}</td></tr>`)),
  meters:r=>table(['Meter','Account','Zone','Reading','Anomaly','Reason','Actions'],r.map(x=>`<tr><td><strong>${safe(x.id)}</strong></td><td>${safe(x.accountReference)}</td><td>${safe(x.zone||'—')}</td><td>${number(x.currentReading||x.consumptionKl||0)}</td><td><strong>${safe(x.anomaly?.score||'—')}</strong></td><td>${safe((x.anomaly?.reasons||[]).join(', ')||'No material anomaly')}</td><td>${actions('meters',x)}</td></tr>`)),
  nrw:r=>table(['Zone / period','Input volume','Authorised','NRW','Target'],r.map(x=>`<tr><td><strong>${safe(x.zone||x.period||x.id)}</strong></td><td>${number(x.systemInputVolumeKl||0)} kL</td><td>${number(x.billedAuthorisedConsumptionKl||0)} kL</td><td><strong>${number(x.calculated?.nrwPercent ?? x.currentNRWPercent)}%</strong></td><td>${number(x.targetNRWPercent||0)}%</td></tr>`)),
  contractors:r=>table(['Contractor','Status','SLA','Performance','Actions'],r.map(x=>`<tr><td><strong>${safe(x.name)}</strong><small>${safe(x.id)}</small></td><td>${chip(x.status||'active')}</td><td>${safe(x.slaPerformance||x.slaPercent||'—')}</td><td>${safe(x.performance||'—')}</td><td>${actions('contractors',x)}</td></tr>`)),
  revenue:r=>table(['Recovery item','Forecast','AI estimate','Verified realised','Actions'],r.map(x=>`<tr><td><strong>${safe(x.description)}</strong></td><td>${money(x.projectedRecovery)}</td><td>${money(x.aiEstimatedRecovery)}</td><td>${money(x.verifiedRealisedRecovery)}</td><td>${actions('revenue',x)}</td></tr>`)),
  budgets:r=>table(['Budget','Approved','Committed','Actual','Actions'],r.map(x=>`<tr><td><strong>${safe(x.name)}</strong></td><td>${money(x.approvedAmount||x.amount)}</td><td>${money(x.committedAmount)}</td><td>${money(x.actualAmount)}</td><td>${actions('budgets',x)}</td></tr>`)),
  expenditures:r=>table(['Description','Project','Amount','Status','Actions'],r.map(x=>`<tr><td><strong>${safe(x.description)}</strong></td><td>${safe(x.projectId||'—')}</td><td>${money(x.amount)}</td><td>${chip(x.status||'recorded')}</td><td>${actions('expenditures',x)}</td></tr>`)),
  risks:r=>table(['Risk','Level','Owner','Status','Mitigation','Actions'],r.map(x=>`<tr><td><strong>${safe(x.name)}</strong></td><td>${chip(x.level)}</td><td>${safe(x.owner||'—')}</td><td>${chip(x.status||'open')}</td><td>${safe(x.mitigation||'—')}</td><td>${actions('risks',x)}</td></tr>`)),
  approvals:r=>table(['Approval','Record','Status','Requested by','Decision'],r.map(x=>`<tr><td><strong>${safe(x.subject)}</strong></td><td>${chip(x.recordType)}<small>${safe(x.recordId)}</small></td><td>${chip(x.status)}</td><td>${safe(x.requestedBy||x.createdBy||'—')}</td><td>${x.status==='pending'?`<button class="mini approve" data-approval="${safe(x.id)}" data-decision="approved">Approve</button> <button class="mini reject" data-approval="${safe(x.id)}" data-decision="rejected">Reject</button>`:safe(x.decidedBy||'—')}</td></tr>`)),
  interventions:r=>table(['Intervention','Owner','Status','Expected benefit','Actions'],r.map(x=>`<tr><td><strong>${safe(x.name)}</strong></td><td>${safe(x.owner||'—')}</td><td>${chip(x.status||'planned')}</td><td>${safe(x.expectedBenefit||'—')}</td><td>${actions('interventions',x)}</td></tr>`)),
  notifications:r=>table(['Notification','Severity','Status','Created'],r.map(x=>`<tr><td><strong>${safe(x.message)}</strong></td><td>${chip(x.severity||'info')}</td><td>${x.read?'Read':`<button class="mini" data-read-notification="${safe(x.id)}">Mark read</button>`}</td><td>${date(x.createdAt)}</td></tr>`)),
  documents:r=>table(['Document','Linked record','Type','Size','Download'],r.map(x=>`<tr><td><strong>${safe(x.name)}</strong><small>${safe(x.originalName||'')}</small></td><td>${chip(x.recordType||'general')}<small>${safe(x.recordId||'')}</small></td><td>${safe(x.mimeType||'metadata')}</td><td>${x.size?`${number(x.size/1024)} KB`:'—'}</td><td>${x.storedName?`<a class="link-button" href="/api/documents/${encodeURIComponent(x.id)}/download">Download</a>`:'Metadata only'}</td></tr>`)),
  evidence:r=>table(['Evidence','Record','Type','Verified','Actions'],r.map(x=>`<tr><td><strong>${safe(x.name||x.id)}</strong></td><td>${chip(x.recordType)}<small>${safe(x.recordId)}</small></td><td>${safe(x.type||'evidence')}</td><td>${chip(x.verified?'verified':'pending')}</td><td>${actions('evidence',x)}</td></tr>`))
};

function actions(resource,row) { return `<button class="mini edit-record" data-resource="${safe(resource)}" data-id="${safe(row.id)}">Edit</button> <button class="mini archive-record" data-resource="${safe(resource)}" data-id="${safe(row.id)}">Archive</button>`; }

async function renderCurrentSection() {
  if(state.section==='command'||state.section==='audit') { if(state.section==='audit') renderActivities(state.dashboard?.activities||[],'#activityFull',100); return; }
  const resource=state.tabs[state.section]; if(!resource) return;
  const rows=await getResource(resource);
  const target={delivery:'#deliveryTable',operations:'#operationsTable',assets:'#assetsTable',revenue:'#financeTable',governance:'#governanceTable',documents:'#documentsTable'}[state.section];
  $(target).innerHTML=(renderers[resource]||(()=>'<p class="empty">No renderer available.</p>'))(rows);
  bindDynamic();
}

function updatePageContext() {
  const guide=pageGuides[state.section]||pageGuides.command;
  $('#pageTitle').textContent=guide.title;
  $('#pageSubtitle').textContent=guide.subtitle;
  $('#agentPageContext').textContent=guide.title;
  $('#agentPageHint').textContent=guide.hint;
}

function showSection(name) {
  if(!pageGuides[name]) return;
  state.section=name;
  $$('.section').forEach(s=>{s.hidden=true;s.classList.remove('active-section');});
  const section=$(`#${name}Section`); if(section){section.hidden=false;section.classList.add('active-section');}
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.section===name));
  updatePageContext();
  renderCurrentSection();
  window.scrollTo({top:0,behavior:'smooth'});
}

const fieldSchemas={
  projects:[['name','Project name','text',true],['owner','Owner','text',true],['status','Status','select','active|at-risk|delayed|completed'],['risk','Risk','select','low|medium|high|critical'],['progress','Progress %','number'],['budget','Budget ZAR','number'],['nextMilestone','Next milestone','text']],
  milestones:[['projectId','Project ID','text',true],['name','Milestone','text',true],['status','Status','select','not-started|in-progress|complete|blocked'],['progress','Progress %','number'],['dueDate','Due date','date']],
  'work-items':[['projectId','Project ID','text',true],['name','Work item','text',true],['owner','Owner','text'],['priority','Priority','select','low|medium|high|critical'],['status','Status','select','todo|in-progress|blocked|done']],
  incidents:[['zone','Zone','text',true],['asset','Asset','text',true],['category','Category','select','leak|burst|meter-anomaly|pressure|quality'],['severity','Severity','select','low|medium|high|critical'],['status','Status','select','detected|verified|assigned|dispatched|repair-in-progress|repaired|closed'],['estimatedLossKlPerDay','Est. loss kL/day','number'],['populationAffected','Population affected','number'],['assignedTeam','Assigned team','text']],
  'work-orders':[['description','Description','text',true],['incidentId','Incident ID','text'],['projectId','Project ID','text'],['priority','Priority','select','low|medium|high|critical'],['assignedTeam','Assigned team','text'],['status','Status','select','assigned|dispatched|repair-in-progress|repaired|verified|closed'],['slaHours','SLA hours','number'],['estimatedCost','Estimated cost','number']],
  assets:[['name','Asset name','text',true],['type','Type','text',true],['zone','Zone','text'],['condition','Condition','select','good|fair|poor|critical'],['criticality','Criticality','select','low|medium|high|critical']],
  meters:[['accountReference','Account reference','text',true],['zone','Zone','text'],['status','Status','select','active|inactive|investigate'],['currentReading','Current reading','number'],['averageConsumptionKl','Average consumption kL','number'],['currentConsumptionKl','Current consumption kL','number']],
  contractors:[['name','Contractor name','text',true],['status','Status','select','active|suspended|complete'],['performance','Performance note','text']],
  risks:[['name','Risk','text',true],['level','Level','select','low|medium|high|critical'],['owner','Owner','text'],['status','Status','select','open|mitigating|closed'],['mitigation','Mitigation','text']],
  interventions:[['name','Intervention','text',true],['owner','Owner','text'],['status','Status','select','planned|approved|in-progress|complete'],['expectedBenefit','Expected benefit','text']],
  revenue:[['description','Description','text',true],['projectedRecovery','Forecast','number'],['aiEstimatedRecovery','AI estimate','number'],['verifiedRealisedRecovery','Verified realised','number']],
  budgets:[['name','Budget','text',true],['approvedAmount','Approved amount','number'],['committedAmount','Committed amount','number'],['actualAmount','Actual amount','number']],
  expenditures:[['description','Description','text',true],['projectId','Project ID','text'],['amount','Amount','number'],['status','Status','select','recorded|approved|paid']],
  evidence:[['recordType','Record type','text',true],['recordId','Record ID','text',true],['name','Evidence description','text'],['type','Type','text'],['verified','Verified','select','false|true']]
};

function fieldHtml([name,label,type,config],value='') {
  if(type==='select') return `<label>${safe(label)}<select name="${safe(name)}">${String(config).split('|').map(o=>`<option value="${safe(o)}" ${String(value)===o?'selected':''}>${safe(o)}</option>`).join('')}</select></label>`;
  return `<label>${safe(label)}<input name="${safe(name)}" type="${safe(type)}" value="${safe(value??'')}" ${config===true?'required':''}></label>`;
}

async function openRecordDialog(resource,id=null) {
  const schema=fieldSchemas[resource]; if(!schema){toast(`Form for ${resource} is not configured.`,'warning');return;}
  let record={};
  if(id){try{record=await api(`/api/${resource}/${encodeURIComponent(id)}`);}catch(e){toast(e.message,'danger');return;}}
  state.creating={resource,id};
  $('#recordDialogTitle').textContent=id?`Edit ${resource}`:`Create ${resource}`;
  $('#recordFields').innerHTML=schema.map(f=>fieldHtml(f,record[f[0]])).join('');
  $('#recordFormMessage').textContent=''; $('#recordDialog').showModal();
}

async function saveRecord(e) {
  e.preventDefault(); const {resource,id}=state.creating||{}; if(!resource)return;
  const payload=Object.fromEntries(new FormData(e.currentTarget).entries());
  for(const [name,,type] of fieldSchemas[resource]) { if(type==='number')payload[name]=Number(payload[name]||0); if(payload[name]==='true')payload[name]=true; if(payload[name]==='false')payload[name]=false; }
  try {
    await api(id?`/api/${resource}/${encodeURIComponent(id)}`:`/api/${resource}`,{method:id?'PATCH':'POST',body:JSON.stringify(payload)});
    $('#recordDialog').close(); delete state.cache[resource]; await loadAll(); showSection(state.section); toast(id?'Record updated.':'Record created.');
  } catch(err) { $('#recordFormMessage').textContent=err.message; }
}

async function archiveRecord(resource,id) {
  if(!confirm('Archive this record? It can be restored through the API/audit workflow.'))return;
  try { await api(`/api/${resource}/${encodeURIComponent(id)}/archive`,{method:'POST'}); delete state.cache[resource]; await loadAll(); showSection(state.section); toast('Record archived.'); } catch(e) { toast(e.message,'danger'); }
}

function openAgent() {
  state.agentOpen=true; $('#voiceAgent').classList.add('open'); $('#voiceAgent').setAttribute('aria-hidden','false'); $('#agentScrim').hidden=false; setTimeout(()=>$('#assistantQuery')?.focus(),160);
}
function closeAgent() { state.agentOpen=false; $('#voiceAgent')?.classList.remove('open'); $('#voiceAgent')?.setAttribute('aria-hidden','true'); if($('#agentScrim'))$('#agentScrim').hidden=true; }

function appendBubble(text,who='assistant',sources=[]) {
  const box=$('#assistantConversation'),el=document.createElement('div'); el.className=who==='user'?'user-bubble':'assistant-bubble';
  if(who==='assistant') {
    const sourceText=(sources||[]).slice(0,4).map(s=>`${s.type}: ${s.id}`).join(' · ');
    el.innerHTML=`<strong>Ayanda</strong><span>${safe(text)}</span>${sourceText?`<small>${safe(sourceText)}</small>`:''}`;
  } else el.textContent=text;
  box.appendChild(el); box.scrollTop=box.scrollHeight;
}

function selectVoice(lang) {
  const voices=window.speechSynthesis?.getVoices?.()||[],root=lang.split('-')[0].toLowerCase(),list=voices.filter(v=>(v.lang||'').toLowerCase().startsWith(root));
  return list.find(v=>/ayanda/i.test(v.name))||list.find(v=>/south africa|africa|zulu|xhosa/i.test(`${v.name} ${v.lang}`))||list[0]||null;
}

function speak(text) {
  if(!$('#speakToggle')?.checked||!('speechSynthesis' in window)) { setAgentState('ready'); return; }
  if(state.listening) stopVoiceInput();
  if('speechSynthesis' in window) speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text),lang=$('#languageSelect').value,voice=selectVoice(lang);
  u.lang=lang; if(voice)u.voice=voice; u.rate=1.02; u.pitch=1;
  u.onstart=()=>{state.speaking=true;setAgentState('speaking',voice?`Speaking · ${voice.name}`:'Speaking');};
  u.onend=()=>{state.speaking=false;setAgentState('ready');};
  u.onerror=()=>{state.speaking=false;setAgentState('ready','Voice unavailable');};
  speechSynthesis.speak(u);
}

function isCommandIntent(q) { return /^(open|go to|show|take me to|create|add|archive|update|set|change|assign|mark|comment)\b/i.test(q); }
function isPageExplanation(q) { return /^(explain|describe)\s+(this|the current)\s+page$/i.test(q.trim()) || /what (is|does) this page/i.test(q); }

async function explainCurrentPage({speakAnswer=true}={}) {
  openAgent();
  const guide=pageGuides[state.section]||pageGuides.command;
  appendBubble('Explain this page','user'); appendBubble(guide.explanation,'assistant');
  if(speakAnswer) speak(guide.explanation); else setAgentState('ready');
}

async function runAgentQuery(query,{fromVoice=false}={}) {
  query=String(query||'').trim(); if(!query)return;
  openAgent(); appendBubble(query,'user'); $('#assistantQuery').value='';
  if(isPageExplanation(query)) { const guide=pageGuides[state.section]||pageGuides.command; appendBubble(guide.explanation); speak(guide.explanation); return; }
  if(/^archive\b/i.test(query) && !confirm('Ayanda is about to archive a record. Continue?')) { appendBubble('Archive cancelled.'); setAgentState('ready'); return; }
  setAgentState('processing');
  try {
    const command=isCommandIntent(query);
    const result=await api(command?'/api/assistant/command':'/api/assistant/query',{method:'POST',body:JSON.stringify(command?{command:query,page:state.section}:{query,language:$('#languageSelect').value,page:state.section})});
    const answer=result.confirmation||result.answer||'Completed.';
    appendBubble(answer,'assistant',result.sources||[]);
    if(result.type==='navigate') navigateFromAssistant(result.target);
    if(result.type==='action') toast(answer);
    speak(answer);
    await loadAll();
    await renderCurrentSection();
  } catch(err) {
    const message=`I could not complete that request: ${err.message}`; appendBubble(message); setAgentState('ready','Error'); if(!fromVoice)toast(err.message,'danger');
  }
}

async function askAssistant(e) { e.preventDefault(); await runAgentQuery($('#assistantQuery').value); }

function navigateFromAssistant(target) {
  const map={dashboard:'command',command:'command',projects:'delivery',delivery:'delivery',milestones:'delivery','work-items':'delivery',incidents:'operations',operations:'operations','work-orders':'operations',zones:'operations',meters:'assets',assets:'assets',contractors:'assets',finance:'revenue',revenue:'revenue',risks:'governance',governance:'governance',approvals:'governance',documents:'documents',evidence:'documents',audit:'audit'};
  if(map[target]) showSection(map[target]);
}

function setupSpeech() {
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR) { $('#micButton').disabled=true; $('#micButton').title='Speech recognition is not available in this browser.'; return; }
  const r=new SR(); r.interimResults=true; r.continuous=false; r.maxAlternatives=1;
  r.onstart=()=>{stopSpeech();state.listening=true;$('#micButton').classList.add('listening');$('#liveTranscript').hidden=false;$('#transcriptText').textContent='Listening…';setAgentState('listening');};
  r.onresult=e=>{
    let interim='',final='';
    for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)final+=t;else interim+=t;}
    const text=(final||interim).trim(); if(text){$('#assistantQuery').value=text;$('#transcriptText').textContent=text;}
    if(final && $('#autoSendVoice').checked){setTimeout(()=>runAgentQuery(final,{fromVoice:true}),120);}
  };
  r.onerror=e=>{state.listening=false;$('#micButton').classList.remove('listening');$('#liveTranscript').hidden=true;setAgentState('ready',e.error==='not-allowed'?'Microphone permission needed':'Voice input unavailable');};
  r.onend=()=>{state.listening=false;$('#micButton').classList.remove('listening');$('#liveTranscript').hidden=true;if(!state.speaking&&$('#voiceState').textContent==='Listening')setAgentState('ready');};
  state.recognition=r;
  if('speechSynthesis' in window) speechSynthesis.onvoiceschanged=()=>selectVoice($('#languageSelect').value);
}

function startVoice() {
  openAgent();
  if(!state.recognition)return;
  if(state.listening){stopVoiceInput();return;}
  stopSpeech(); state.recognition.lang=$('#languageSelect').value;
  try{state.recognition.start();}catch{}
}

async function doSearch(e) {
  e.preventDefault(); const q=$('#searchInput').value.trim(); if(q.length<2)return;
  $('#searchResults').innerHTML='<p class="empty">Searching…</p>';
  try { const result=await api(`/api/search?q=${encodeURIComponent(q)}`); $('#searchResults').innerHTML=result.results.map(r=>`<div class="search-result"><div><strong>${safe(r.title)}</strong><small>${safe(r.type)} · ${safe(r.id)}</small></div>${chip(r.type)}</div>`).join('')||'<p class="empty">No authorised results found.</p>'; } catch(err) { $('#searchResults').innerHTML=`<p class="form-message">${safe(err.message)}</p>`; }
}

async function uploadDocument(e) {
  e.preventDefault(); $('#uploadMessage').textContent='';
  try { await api('/api/documents/upload',{method:'POST',body:new FormData(e.currentTarget)}); $('#uploadDialog').close(); e.currentTarget.reset(); delete state.cache.documents; await loadAll(); showSection('documents'); toast('Evidence uploaded securely.'); } catch(err) { $('#uploadMessage').textContent=err.message; }
}

async function approvalDecision(id,decision) {
  try { await api(`/api/approvals/${encodeURIComponent(id)}/decision`,{method:'POST',body:JSON.stringify({decision})}); delete state.cache.approvals; await loadAll(); showSection('governance'); toast(`Approval ${decision}.`); } catch(e) { toast(e.message,'danger'); }
}
async function markRead(id) { try { await api(`/api/notifications/${encodeURIComponent(id)}/read`,{method:'POST'}); delete state.cache.notifications; await loadAll(); showSection('governance'); } catch(e) { toast(e.message,'danger'); } }
function exportResource(resource) { window.open(`/api/reports/${encodeURIComponent(resource)}.csv`,'_blank','noopener'); }

function bindDynamic() {
  $$('.edit-record').forEach(b=>b.onclick=()=>openRecordDialog(b.dataset.resource,b.dataset.id));
  $$('.archive-record').forEach(b=>b.onclick=()=>archiveRecord(b.dataset.resource,b.dataset.id));
  $$('[data-approval]').forEach(b=>b.onclick=()=>approvalDecision(b.dataset.approval,b.dataset.decision));
  $$('[data-read-notification]').forEach(b=>b.onclick=()=>markRead(b.dataset.readNotification));
}

function bindAgentPrompts() { $$('[data-agent-prompt]').forEach(b=>b.onclick=()=>runAgentQuery(b.dataset.agentPrompt)); }

function bind() {
  $('#loginForm').onsubmit=login;
  $('#logoutButton').onclick=signOut;
  $('#refreshButton').onclick=loadAll;
  $('#activityRefresh').onclick=loadAll;
  $('#assistantForm').onsubmit=askAssistant;
  $('#micButton').onclick=startVoice;
  $('#stopVoiceButton').onclick=()=>{stopVoiceInput();stopSpeech();};
  $('#languageSelect').onchange=()=>{stopVoiceInput();stopSpeech();};
  $('#recordForm').onsubmit=saveRecord;
  $('#searchForm').onsubmit=doSearch;
  $('#uploadForm').onsubmit=uploadDocument;
  $('#globalSearchButton').onclick=()=>$('#searchDialog').showModal();
  $('#quickCreateButton').onclick=()=>openRecordDialog(state.section==='operations'?'incidents':state.section==='assets'?'assets':state.section==='governance'?'risks':'projects');
  $('#uploadDocumentButton').onclick=()=>$('#uploadDialog').showModal();
  $('#agentLauncher').onclick=openAgent; $('#sidebarAgentButton').onclick=openAgent; $('#openAgentButton').onclick=openAgent; $('#closeAgentButton').onclick=closeAgent; $('#agentScrim').onclick=closeAgent;
  $('#explainPageButton').onclick=()=>explainCurrentPage(); $$('.page-help').forEach(b=>b.onclick=()=>explainCurrentPage());
  $$('.close-dialog').forEach(b=>b.onclick=()=>$('#recordDialog').close());
  $$('.close-search').forEach(b=>b.onclick=()=>$('#searchDialog').close());
  $$('.close-upload').forEach(b=>b.onclick=()=>$('#uploadDialog').close());
  $$('.nav-item').forEach(b=>b.onclick=()=>showSection(b.dataset.section));
  $$('[data-go]').forEach(b=>b.onclick=()=>showSection(b.dataset.go));
  $$('.create-btn').forEach(b=>b.onclick=()=>openRecordDialog(b.dataset.resource));
  $$('.export-btn').forEach(b=>b.onclick=()=>exportResource(b.dataset.export));
  $$('.tab').forEach(b=>b.onclick=()=>{const section=b.closest('.section').id.replace('Section','');state.tabs[section]=b.dataset.tab;b.closest('.tabs').querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t===b));renderCurrentSection();});
  bindAgentPrompts();
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.agentOpen)closeAgent(); if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openAgent();}});
  window.addEventListener('beforeunload',()=>{stopVoiceInput();stopSpeech();});
}

bind(); setupSpeech(); updatePageContext(); restoreSession();