/* AquaFlow original-dashboard interaction layer.
 * One global chatbot icon, one recognition controller and one speech-synthesis path.
 * Loaded after the validated application bundle. */
'use strict';

(() => {
  const BOT_ICON = `<svg class="ayanda-bot-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <defs><linearGradient id="ayg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#48c7ff"/><stop offset="1" stop-color="#0b63c7"/></linearGradient></defs>
    <path d="M32 5c-13.8 0-25 10.1-25 22.6v8.8C7 49 18.2 59 32 59s25-10 25-22.6v-8.8C57 15.1 45.8 5 32 5Z" fill="url(#ayg)"/>
    <rect x="12" y="17" width="40" height="30" rx="15" fill="#f5fbff"/>
    <circle cx="25" cy="31" r="4" fill="#08a8d8"/><circle cx="39" cy="31" r="4" fill="#08a8d8"/>
    <path d="M24 39c5.2 4 10.8 4 16 0" fill="none" stroke="#0b63c7" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M32 10V4" stroke="#42c6ff" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="3" r="2.5" fill="#65dcff"/>
  </svg>`;

  const ctl = {
    recognition: null,
    shouldListen: false,
    commandArmed: false,
    starting: false,
    suspendedForSpeech: false,
    lastFinal: '',
    lastFinalAt: 0,
    language: 'en-ZA'
  };

  const languageNames = {
    'en-ZA':'English · South Africa','af-ZA':'Afrikaans · South Africa','zu-ZA':'isiZulu · South Africa','xh-ZA':'isiXhosa · South Africa',
    'st-ZA':'Sesotho · South Africa','tn-ZA':'Setswana · South Africa','nso-ZA':'Sepedi · South Africa','ts-ZA':'itsonga · South Africa',
    've-ZA':'Tshivenda · South Africa','ss-ZA':'siSwati · South Africa','nr-ZA':'isiNdebele · South Africa'
  };

  const navTerms = {
    command:['command centre','dashboard','overview','ikhaya','ekhaya','kakaretso','tshobokanyo'],
    delivery:['delivery','projects','project','milestones','work items','projek','projekte','amaphrojekthi','iiprojekthi','diporojeke','tiphurojeke','dzhiphurojeke','emaphrojekthi'],
    operations:['operations','water operations','incidents','incident','work orders','izigameko','izehlo','diketsahalo','ditiragalo','swiendlakalo','zwiwo','tigameko','izehlakalo'],
    assets:['assets','meters','asset','meter','bates','meters','ii-asethi','iimitha','dithoto','dimetara','nhundzu','timitara','ndaka','mimitha','timphahla','emamitha','iimpahla','amamitha'],
    revenue:['revenue','finance','recovery','inkomste','ingeniso','lekeno','lotseno','letseno','mali','mbuelo','imali'],
    governance:['governance','risks','approvals','risk','approval','bestuur','ulawulo','puso','taolo','vulawuri','vhulangi','kuphatsa','ukuphatha'],
    documents:['documents','evidence','document','bewyse','amaxwebhu','ditokomane','matsalwa','manwalwa','imibhalo','imitlolo'],
    audit:['audit','activity','logs','oudit','uphicotho','tlhahlobo','tlhatlhobo','oditi','luhlolo','ukuhlolwa']
  };

  const wakeRx = /(?:^|\b)(?:hey|hi|hello|sawubona|molo|dumelang|avuxeni|ndaa)?\s*,?\s*ayanda(?:\b|$)/i;

  function byId(id){ return document.getElementById(id); }
  function selectedLang(){ return byId('languageSelect')?.value || ctl.language || 'en-ZA'; }
  function stripWake(text){ return String(text||'').replace(wakeRx,'').replace(/^[\s,.:;-]+/,'').trim(); }

  function installBranding(){
    const brand = document.querySelector('.aquaflow-name');
    if (brand) brand.innerHTML = `<img src="/aquaflow-logo.svg" class="aquaflow-brandmark" alt="AquaFlow AI">`;
    const login = document.querySelector('.login-card');
    if (login && !login.querySelector('.login-aquaflow-logo')) {
      const pyrneo = login.querySelector('.login-logo');
      pyrneo?.insertAdjacentHTML('afterend','<img src="/aquaflow-logo.svg" class="login-aquaflow-logo" alt="AquaFlow AI">');
    }
  }

  function installConsistentBotIcon(){
    document.querySelectorAll('.launcher-orb,.orb-core,.mini-orb').forEach(node => { node.innerHTML = BOT_ICON; });
    const launcher = byId('agentLauncher');
    if (launcher) launcher.setAttribute('aria-label','Open Ayanda voice and chat assistant');
    const sidebarButton = byId('sidebarAgentButton');
    if (sidebarButton) sidebarButton.setAttribute('aria-label','Open Ayanda voice and chat assistant');
  }

  function installVoiceStatus(){
    const controls = document.querySelector('.voice-controls');
    if (!controls || controls.querySelector('.voice-locale-status')) return;
    const badge = document.createElement('span');
    badge.className='voice-locale-status'; badge.id='voiceLocaleStatus';
    controls.appendChild(badge);
    const wake = document.createElement('span');
    wake.className='wake-badge'; wake.id='wakeBadge'; wake.textContent='Hey, Ayanda · ready';
    controls.appendChild(wake);
    updateLocaleStatus();
  }

  function updateLocaleStatus(){
    ctl.language=selectedLang();
    const exact = exactVoice(ctl.language);
    const el=byId('voiceLocaleStatus');
    if (el) el.textContent = exact ? `${languageNames[ctl.language]||ctl.language} · ${exact.name}` : `${languageNames[ctl.language]||ctl.language} · system voice`;
  }

  function exactVoice(lang){
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const norm = s => String(s||'').toLowerCase().replace('_','-');
    const wanted=norm(lang), root=wanted.split('-')[0];
    const exact=voices.filter(v=>norm(v.lang)===wanted);
    if (exact.length) {
      if (wanted==='en-za') return exact.find(v=>/ayanda|south africa|africa/i.test(v.name)) || exact[0];
      return exact.find(v=>new RegExp(root,'i').test(`${v.name} ${v.lang}`)) || exact[0];
    }
    return null;
  }

  function setWakeBadge(text,active=false){
    const el=byId('wakeBadge'); if(!el)return; el.textContent=text; el.classList.toggle('listening',active);
  }

  function stopRecognition(){
    ctl.shouldListen=false; ctl.commandArmed=false;
    if (ctl.recognition) { try { ctl.recognition.abort(); } catch {} }
    try { state.listening=false; } catch {}
    byId('micButton')?.classList.remove('listening');
    setWakeBadge('Hey, Ayanda · paused',false);
  }

  function pauseRecognitionForSpeech(){
    ctl.suspendedForSpeech=true;
    if (ctl.recognition) { try { ctl.recognition.abort(); } catch {} }
  }

  function resumeRecognitionSoon(){
    ctl.suspendedForSpeech=false;
    if(ctl.shouldListen) setTimeout(ensureListening,90);
  }

  function unifiedSpeak(text){
    if(!byId('speakToggle')?.checked || !('speechSynthesis' in window)) { try{setAgentState('ready');}catch{} return; }
    pauseRecognitionForSpeech();
    speechSynthesis.cancel();
    const lang=selectedLang();
    const u=new SpeechSynthesisUtterance(String(text||''));
    const voice=exactVoice(lang);
    u.lang=lang; if(voice)u.voice=voice;
    u.rate=1.06; u.pitch=1; u.volume=1;
    u.onstart=()=>{ try{state.speaking=true;setAgentState('speaking',`Speaking · ${languageNames[lang]||lang}`);}catch{} };
    u.onend=()=>{ try{state.speaking=false;setAgentState('ready');}catch{} resumeRecognitionSoon(); };
    u.onerror=()=>{ try{state.speaking=false;setAgentState('ready','Voice unavailable');}catch{} resumeRecognitionSoon(); };
    speechSynthesis.speak(u);
  }

  function normalizeSelectedLanguage(text){
    let q=String(text||'').trim();
    q=q.replace(/^(maak oop|vula|bula|pfula)\b/i,'open');
    q=q.replace(/^(ngibonise|ndibonise|mpontshe|mpontsha|ndzi kombela|ngikhombise)\b/i,'show');
    q=q.replace(/^(shintsha|tshintsha|fetola|fetosha|cinca|tshintja)\b/i,'change');
    q=q.replace(/^(abela|yabela|abelela)\b/i,'assign');
    for (const [section,terms] of Object.entries(navTerms)) {
      const sorted=[...terms].sort((a,b)=>b.length-a.length);
      for(const term of sorted){
        const rx=new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i');
        if(rx.test(q)){
          const canonical={command:'dashboard',delivery:'projects',operations:'incidents',assets:'assets',revenue:'revenue',governance:'governance',documents:'documents',audit:'audit'}[section];
          q=q.replace(rx,canonical); break;
        }
      }
    }
    return q;
  }

  function resolveLocalSection(text){
    const q=String(text||'').toLowerCase();
    const navVerb=/^(open|show|go to|take me to|navigate|gaan na|vula|bula|pfula)\b/i.test(q);
    if(!navVerb)return null;
    for(const [section,terms] of Object.entries(navTerms)) if(terms.some(term=>q.includes(term))) return section;
    return null;
  }

  function sectionLabel(section){
    return {command:'Command Centre',delivery:'Projects & Delivery',operations:'Water Operations',assets:'Assets & Meters',revenue:'Revenue & Finance',governance:'Governance',documents:'Evidence',audit:'Audit'}[section]||section;
  }

  function localExecutiveBriefing(q){
    const d=state?.dashboard, s=d?.summary; if(!d||!s)return null;
    if(!/(status|attention|briefing|executive|overview|what needs|greatest water loss|highest water loss|largest loss)/i.test(q))return null;
    if(/greatest water loss|highest water loss|largest loss/i.test(q)){
      const incidents=[...(d.incidents||[])].sort((a,b)=>Number(b.estimatedLossKlPerDay||0)-Number(a.estimatedLossKlPerDay||0));
      const top=incidents[0];
      return top ? `${top.id} in ${top.zone} is currently the largest recorded open loss at approximately ${Number(top.estimatedLossKlPerDay||0).toLocaleString()} kilolitres per day. ${top.assignedTeam?`It is assigned to ${top.assignedTeam}.`:'It is currently unassigned.'}` : 'There are no open incidents with recorded water-loss data.';
    }
    return `${s.activeProjects||0} active projects, ${s.atRiskProjects||0} at risk, ${s.criticalIncidents||0} high or critical incidents and ${s.openWorkOrders||0} open work orders. Estimated open water loss is ${Number(s.estimatedOpenLossKlPerDay||0).toLocaleString()} kilolitres per day. Verified revenue recovery is ${new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(s.verifiedRecovery||0))}.`;
  }

  const coreRunAgentQuery = typeof runAgentQuery === 'function' ? runAgentQuery : null;

  async function fastAgentQuery(input,opts={}){
    const raw=String(input||'').trim(); if(!raw)return;
    const localSection=resolveLocalSection(raw);
    if(localSection){
      try{openAgent();appendBubble(raw,'user');showSection(localSection);const msg=`Opening ${sectionLabel(localSection)}.`;appendBubble(msg);unifiedSpeak(msg);setAgentState('ready');}catch{}
      return;
    }
    const stripped=stripWake(raw);
    if(/^(explain|describe)\s+(this|the current)\s+page$/i.test(stripped)||/what (is|does) this page/i.test(stripped)){
      return explainCurrentPage();
    }
    const local=localExecutiveBriefing(stripped);
    if(local){
      openAgent();appendBubble(raw,'user');appendBubble(local,'assistant');unifiedSpeak(local);return;
    }
    const normalized=normalizeSelectedLanguage(stripped);
    if(!coreRunAgentQuery)return;
    return coreRunAgentQuery(normalized,opts);
  }

  try { runAgentQuery = fastAgentQuery; speak = unifiedSpeak; } catch {}

  function handleFinalTranscript(text){
    const now=Date.now();
    if(text===ctl.lastFinal && now-ctl.lastFinalAt<900)return;
    ctl.lastFinal=text; ctl.lastFinalAt=now;
    const heard=String(text||'').trim(); if(!heard)return;
    const wake=heard.match(wakeRx);
    if(wake){
      try{openAgent();}catch{}
      const rest=stripWake(heard);
      ctl.commandArmed=!rest;
      setWakeBadge(rest?'Hey, Ayanda · executing':'Hey, Ayanda · listening for command',true);
      if(rest){ byId('assistantQuery').value=rest; fastAgentQuery(rest,{fromVoice:true}); }
      else { byId('assistantQuery').value=''; try{setAgentState('listening','Listening for command');}catch{} }
      return;
    }
    if(ctl.commandArmed){
      ctl.commandArmed=false; byId('assistantQuery').value=heard; setWakeBadge('Hey, Ayanda · executing',true); fastAgentQuery(heard,{fromVoice:true});
    }
  }

  function buildRecognition(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){
      byId('micButton')?.setAttribute('disabled','disabled');
      setWakeBadge('Voice recognition unavailable',false); return null;
    }
    try { state.recognition?.abort?.(); } catch {}
    const r=new SR(); r.continuous=true; r.interimResults=true; r.maxAlternatives=1; r.lang=selectedLang();
    r.onstart=()=>{ctl.starting=false;try{state.listening=true;}catch{}setWakeBadge('Hey, Ayanda · listening',true);};
    r.onresult=e=>{
      let interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const t=e.results[i][0].transcript.trim();
        if(e.results[i].isFinal) handleFinalTranscript(t); else interim += `${t} `;
      }
      if(ctl.commandArmed && interim.trim()){
        byId('liveTranscript').hidden=false; byId('transcriptText').textContent=interim.trim();
      }
    };
    r.onerror=e=>{
      ctl.starting=false;try{state.listening=false;}catch{}
      if(e.error==='not-allowed'||e.error==='service-not-allowed'){ctl.shouldListen=false;setWakeBadge('Microphone permission needed',false);}
      else if(!ctl.suspendedForSpeech)setWakeBadge('Hey, Ayanda · reconnecting',false);
    };
    r.onend=()=>{
      ctl.starting=false;try{state.listening=false;}catch{}
      if(!ctl.suspendedForSpeech && ctl.shouldListen)setTimeout(ensureListening,100);
    };
    ctl.recognition=r; try{state.recognition=r;}catch{}
    return r;
  }

  function ensureListening(){
    if(!ctl.shouldListen||ctl.suspendedForSpeech||ctl.starting)return;
    if(!ctl.recognition)buildRecognition();
    if(!ctl.recognition)return;
    ctl.recognition.lang=selectedLang(); ctl.starting=true;
    try{ctl.recognition.start();}catch{ctl.starting=false;setTimeout(()=>{if(ctl.shouldListen)ensureListening();},140);}
  }

  function enableWakeWord(){
    ctl.shouldListen=true; setWakeBadge('Hey, Ayanda · listening',true); ensureListening();
  }

  function manualVoice(){
    try{openAgent();stopSpeech();}catch{}
    ctl.commandArmed=true; ctl.shouldListen=true;
    byId('liveTranscript').hidden=false; byId('transcriptText').textContent='Listening for your command…';
    try{setAgentState('listening','Listening for command');}catch{}
    ensureListening();
  }

  function changeLanguage(){
    ctl.language=selectedLang();
    updateLocaleStatus();
    ctl.commandArmed=false;
    if(ctl.recognition){try{ctl.recognition.abort();}catch{} ctl.recognition.lang=ctl.language;}
    if(ctl.shouldListen)setTimeout(ensureListening,100);
  }

  function wireSingleVoiceControls(){
    const mic=byId('micButton'); if(mic)mic.onclick=manualVoice;
    const stop=byId('stopVoiceButton'); if(stop)stop.onclick=()=>{stopRecognition();speechSynthesis?.cancel?.();try{setAgentState('ready');}catch{}};
    const lang=byId('languageSelect'); if(lang)lang.onchange=changeLanguage;
    if('speechSynthesis' in window) speechSynthesis.onvoiceschanged=updateLocaleStatus;

    // Start wake-word recognition after the first user gesture. This avoids browser
    // autoplay/microphone restrictions while keeping the wake phrase available globally.
    const gesture=()=>{enableWakeWord();document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);};
    document.addEventListener('pointerdown',gesture,true);document.addEventListener('keydown',gesture,true);
  }

  function enhance(){
    installBranding(); installConsistentBotIcon(); installVoiceStatus(); wireSingleVoiceControls();
    // Re-apply the identical bot mark if a later render replaces any assistant surface.
    new MutationObserver(()=>installConsistentBotIcon()).observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true}); else enhance();
})();
