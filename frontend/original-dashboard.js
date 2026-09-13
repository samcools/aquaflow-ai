/* AquaFlow original-dashboard interaction layer.
 * One global chatbot icon, one recognition controller and one speech-synthesis path.
 * Adds user-selectable, persisted, human-like voice preferences per language.
 */
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

  const ctl={recognition:null,shouldListen:false,commandArmed:false,starting:false,suspendedForSpeech:false,lastFinal:'',lastFinalAt:0,language:'en-ZA'};
  const languageNames={
    'en-ZA':'English · South Africa','af-ZA':'Afrikaans · South Africa','zu-ZA':'isiZulu · South Africa','xh-ZA':'isiXhosa · South Africa',
    'st-ZA':'Sesotho · South Africa','tn-ZA':'Setswana · South Africa','nso-ZA':'Sepedi · South Africa','ts-ZA':'itsonga · South Africa',
    've-ZA':'Tshivenda · South Africa','ss-ZA':'siSwati · South Africa','nr-ZA':'isiNdebele · South Africa'
  };
  const previewText={
    'en-ZA':'Hello, I am Ayanda. I am ready to help you manage AquaFlow.',
    'af-ZA':'Hallo, ek is Ayanda. Ek is gereed om jou met AquaFlow te help.',
    'zu-ZA':'Sawubona, ngingu-Ayanda. Ngikulungele ukukusiza nge-AquaFlow.',
    'xh-ZA':'Molo, ndingu-Ayanda. Ndikulungele ukukunceda nge-AquaFlow.',
    'st-ZA':'Dumela, ke nna Ayanda. Ke ikemiseditse ho o thusa ka AquaFlow.',
    'tn-ZA':'Dumela, ke Ayanda. Ke ipaakanyeditse go go thusa ka AquaFlow.',
    'nso-ZA':'Dumela, ke Ayanda. Ke ikemišeditše go go thuša ka AquaFlow.',
    'ts-ZA':'Avuxeni, ndzi Ayanda. ndzi lunghekele ku ku pfuna hi AquaFlow.',
    've-ZA':'Ndaa, ndi Ayanda. Ndo lugela u ni thusa nga AquaFlow.',
    'ss-ZA':'Sawubona, ngingu-Ayanda. Ngikulungele kukusita nge-AquaFlow.',
    'nr-ZA':'Lotjhani, ngingu-Ayanda. Ngikulungele ukukusiza nge-AquaFlow.'
  };
  const navTerms={
    command:['command centre','dashboard','overview','ikhaya','ekhaya','kakaretso','tshobokanyo'],
    delivery:['delivery','projects','project','milestones','work items','projek','projekte','amaphrojekthi','iiprojekthi','diporojeke','tiphurojeke','dzhiphurojeke','emaphrojekthi'],
    operations:['operations','water operations','incidents','incident','work orders','izigameko','izehlo','diketsahalo','ditiragalo','swiendlakalo','zwiwo','tigameko','izehlakalo'],
    assets:['assets','meters','asset','meter','bates','ii-asethi','iimitha','dithoto','dimetara','nhundzu','timitara','ndaka','mimitha','timphahla','emamitha','iimpahla','amamitha'],
    revenue:['revenue','finance','recovery','inkomste','ingeniso','lekeno','lotseno','letseno','mali','mbuelo','imali'],
    governance:['governance','risks','approvals','risk','approval','bestuur','ulawulo','puso','taolo','vulawuri','vhulangi','kuphatsa','ukuphatha'],
    documents:['documents','evidence','document','bewyse','amaxwebhu','ditokomane','matsalwa','manwalwa','imibhalo','imitlolo'],
    audit:['audit','activity','logs','oudit','uphicotho','tlhahlobo','tlhatlhobo','oditi','luhlolo','ukuhlolwa']
  };
  const wakeRx=/(?:^|\b)(?:hey|hi|hello|sawubona|molo|dumelang|avuxeni|ndaa)?\s*,?\s*ayanda(?:\b|$)/i;
  const byId=id=>document.getElementById(id);
  const selectedLang=()=>byId('languageSelect')?.value||ctl.language||'en-ZA';
  const stripWake=text=>String(text||'').replace(wakeRx,'').replace(/^[\s,.:;-]+/,'').trim();
  const norm=s=>String(s||'').toLowerCase().replace(/_/g,'-');
  const voiceKey=lang=>`aquaflowVoice:${lang}`;

  function installBranding(){
    const login=document.querySelector('.login-card');
    if(login&&!login.querySelector('.login-aquaflow-logo')) login.querySelector('.product-lockup')?.insertAdjacentHTML('beforebegin','<img src="/aquaflow-logo.svg" class="login-aquaflow-logo" alt="AquaFlow AI">');
  }

  function installConsistentBotIcon(){
    document.querySelectorAll('.launcher-orb,.orb-core,.mini-orb').forEach(node=>{if(!node.querySelector('.ayanda-bot-icon'))node.innerHTML=BOT_ICON;});
    byId('agentLauncher')?.setAttribute('aria-label','Open Ayanda voice and chat assistant');
    byId('sidebarAgentButton')?.setAttribute('aria-label','Open Ayanda voice and chat assistant');
  }

  function naturalScore(voice,lang){
    const name=String(voice?.name||'');
    const vlang=norm(voice?.lang),wanted=norm(lang),root=wanted.split('-')[0];
    let score=0;
    if(vlang===wanted)score+=80;else if(vlang.split('-')[0]===root)score+=45;
    if(/natural|neural|premium|enhanced|online|wavenet|studio|high quality|hq/i.test(name))score+=80;
    if(/ayanda|tumi|thando|south africa|afric/i.test(name))score+=55;
    if(/microsoft|google|apple|siri|samsung/i.test(name))score+=15;
    if(voice?.localService===false)score+=12;
    if(/compact|espeak|festival|basic|classic/i.test(name))score-=50;
    return score;
  }

  function candidateVoices(lang){
    const voices=window.speechSynthesis?.getVoices?.()||[],wanted=norm(lang),root=wanted.split('-')[0];
    const exact=voices.filter(v=>norm(v.lang)===wanted);
    const sameRoot=voices.filter(v=>norm(v.lang).split('-')[0]===root&&!exact.includes(v));
    const fallback=root==='en'?voices.filter(v=>/^en-(gb|us|au|ie|za)$/i.test(norm(v.lang))&&!exact.includes(v)&&!sameRoot.includes(v)):[];
    return [...exact,...sameRoot,...fallback].sort((a,b)=>naturalScore(b,lang)-naturalScore(a,lang)||String(a.name).localeCompare(String(b.name)));
  }

  function preferredVoice(lang){
    const list=candidateVoices(lang),saved=localStorage.getItem(voiceKey(lang));
    if(saved&&saved!=='auto'){
      const match=list.find(v=>`${v.name}|${v.lang}`===saved);
      if(match)return match;
    }
    return list[0]||null;
  }

  function voiceQuality(voice,lang){
    if(!voice)return 'System fallback';
    const score=naturalScore(voice,lang);
    if(score>=130)return 'Recommended · natural';
    if(score>=85)return 'Good local voice';
    if(score>=45)return 'Compatible voice';
    return 'Basic system voice';
  }

  function installVoiceStatus(){
    const controls=document.querySelector('.voice-controls');
    if(!controls)return;
    if(!controls.querySelector('.voice-picker')) controls.insertAdjacentHTML('beforeend','<div class="voice-picker"><label for="voiceSelect">Ayanda voice</label><select id="voiceSelect" aria-label="Choose Ayanda voice"><option value="auto">Best natural voice</option></select><button id="previewVoiceButton" class="voice-preview-button" type="button">▶ Preview</button></div>');
    if(!controls.querySelector('.voice-locale-status')) controls.insertAdjacentHTML('beforeend','<span class="voice-locale-status" id="voiceLocaleStatus"></span><span class="wake-badge" id="wakeBadge">Hey, Ayanda · ready</span>');
    populateVoiceSelect();updateLocaleStatus();
  }

  function populateVoiceSelect(){
    const select=byId('voiceSelect');if(!select)return;
    const lang=selectedLang(),voices=candidateVoices(lang),saved=localStorage.getItem(voiceKey(lang))||'auto';
    select.innerHTML='<option value="auto">Best natural voice (recommended)</option>';
    voices.forEach((voice,index)=>{
      const option=document.createElement('option');option.value=`${voice.name}|${voice.lang}`;
      option.textContent=`${index===0?'★ ':''}${voice.name} · ${voice.lang} · ${voiceQuality(voice,lang)}`;select.appendChild(option);
    });
    select.value=[...select.options].some(o=>o.value===saved)?saved:'auto';
    if(!voices.length){const option=document.createElement('option');option.disabled=true;option.value='none';option.textContent='No matching installed voice — system fallback';select.appendChild(option);}
  }

  function updateLocaleStatus(){
    ctl.language=selectedLang();const voice=preferredVoice(ctl.language),el=byId('voiceLocaleStatus');
    if(el)el.textContent=voice?`${languageNames[ctl.language]||ctl.language} · ${voice.name} · ${voiceQuality(voice,ctl.language)}`:`${languageNames[ctl.language]||ctl.language} · system fallback`;
  }
  function selectVoice(){const lang=selectedLang(),value=byId('voiceSelect')?.value||'auto';localStorage.setItem(voiceKey(lang),value);updateLocaleStatus();}
  function previewVoice(){const lang=selectedLang();unifiedSpeak(previewText[lang]||previewText['en-ZA'],{force:true});}
  function setWakeBadge(text,active=false){const el=byId('wakeBadge');if(el){el.textContent=text;el.classList.toggle('listening',active);}}

  function stopRecognition(){ctl.shouldListen=false;ctl.commandArmed=false;if(ctl.recognition){try{ctl.recognition.abort();}catch{}}try{state.listening=false;}catch{}byId('micButton')?.classList.remove('listening');setWakeBadge('Hey, Ayanda · paused');}
  function pauseRecognitionForSpeech(){ctl.suspendedForSpeech=true;if(ctl.recognition){try{ctl.recognition.abort();}catch{}}}
  function resumeRecognitionSoon(){ctl.suspendedForSpeech=false;if(ctl.shouldListen)setTimeout(ensureListening,90);}

  function unifiedSpeak(text,options={}){
    if(!options.force&&!byId('speakToggle')?.checked){try{setAgentState('ready');}catch{}return;}
    if(!('speechSynthesis'in window)){try{setAgentState('ready','Speech synthesis unavailable');}catch{}return;}
    pauseRecognitionForSpeech();window.speechSynthesis.cancel();
    const lang=selectedLang(),utterance=new SpeechSynthesisUtterance(String(text||'')),voice=preferredVoice(lang);
    utterance.lang=lang;if(voice)utterance.voice=voice;utterance.rate=1.0;utterance.pitch=1.0;utterance.volume=1;
    utterance.onstart=()=>{try{state.speaking=true;setAgentState('speaking',`Speaking · ${voice?.name||languageNames[lang]||lang}`);}catch{}};
    utterance.onend=()=>{try{state.speaking=false;setAgentState('ready');}catch{}resumeRecognitionSoon();};
    utterance.onerror=()=>{try{state.speaking=false;setAgentState('ready','Voice unavailable');}catch{}resumeRecognitionSoon();};
    window.speechSynthesis.speak(utterance);
  }

  function normalizeSelectedLanguage(text){
    let q=String(text||'').trim();
    q=q.replace(/^(maak oop|vula|bula|pfula)\b/i,'open').replace(/^(ngibonise|ndibonise|mpontshe|mpontsha|ndzi kombela|ngikhombise)\b/i,'show').replace(/^(shintsha|tshintsha|fetola|fetosha|cinca|tshintja)\b/i,'change').replace(/^(abela|yabela|abelela)\b/i,'assign');
    for(const [section,terms]of Object.entries(navTerms))for(const term of [...terms].sort((a,b)=>b.length-a.length)){const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),rx=new RegExp(`\\b${escaped}\\b`,'i');if(rx.test(q)){const canonical={command:'dashboard',delivery:'projects',operations:'incidents',assets:'assets',revenue:'revenue',governance:'governance',documents:'documents',audit:'audit'}[section];q=q.replace(rx,canonical);break;}}
    return q;
  }

  function resolveLocalSection(text){const q=String(text||'').toLowerCase();if(!/^(open|show|go to|take me to|navigate|gaan na|vula|bula|pfula)\b/i.test(q))return null;for(const [section,terms]of Object.entries(navTerms))if(terms.some(term=>q.includes(term)))return section;return null;}
  const sectionLabel=section=>({command:'Command Centre',delivery:'Projects & Delivery',operations:'Water Operations',assets:'Assets & Meters',revenue:'Revenue & Finance',governance:'Governance',documents:'Evidence',audit:'Audit'}[section]||section);
  function localExecutiveBriefing(q){const d=state?.dashboard,s=d?.summary;if(!d||!s||!/(status|attention|briefing|executive|overview|what needs|greatest water loss|highest water loss|largest loss)/i.test(q))return null;if(/greatest water loss|highest water loss|largest loss/i.test(q)){const top=[...(d.incidents||[])].sort((a,b)=>Number(b.estimatedLossKlPerDay||0)-Number(a.estimatedLossKlPerDay||0))[0];return top?`${top.id} in ${top.zone} is currently the largest recorded open loss at approximately ${Number(top.estimatedLossKlPerDay||0).toLocaleString()} kilolitres per day. ${top.assignedTeam?`It is assigned to ${top.assignedTeam}.`:'It is currently unassigned.'}`:'There are no open incidents with recorded water-loss data.';}return `${s.activeProjects||0} active projects, ${s.atRiskProjects||0} at risk, ${s.criticalIncidents||0} high or critical incidents and ${s.openWorkOrders||0} open work orders. Estimated open water loss is ${Number(s.estimatedOpenLossKlPerDay||0).toLocaleString()} kilolitres per day. Verified revenue recovery is ${new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(s.verifiedRecovery||0))}.`;}

  const coreRunAgentQuery=typeof runAgentQuery==='function'?runAgentQuery:null;
  async function fastAgentQuery(input,opts={}){const raw=String(input||'').trim();if(!raw)return;const localSection=resolveLocalSection(raw);if(localSection){try{openAgent();appendBubble(raw,'user');showSection(localSection);const msg=`Opening ${sectionLabel(localSection)}.`;appendBubble(msg);unifiedSpeak(msg);setAgentState('ready');}catch{}return;}const stripped=stripWake(raw);if(/^(explain|describe)\s+(this|the current)\s+page$/i.test(stripped)||/what (is|does) this page/i.test(stripped))return explainCurrentPage();const local=localExecutiveBriefing(stripped);if(local){openAgent();appendBubble(raw,'user');appendBubble(local,'assistant');unifiedSpeak(local);return;}if(coreRunAgentQuery)return coreRunAgentQuery(normalizeSelectedLanguage(stripped),opts);}
  try{runAgentQuery=fastAgentQuery;speak=unifiedSpeak;}catch{}

  function handleFinalTranscript(text){const now=Date.now();if(text===ctl.lastFinal&&now-ctl.lastFinalAt<900)return;ctl.lastFinal=text;ctl.lastFinalAt=now;const heard=String(text||'').trim();if(!heard)return;if(wakeRx.test(heard)){try{openAgent();}catch{}const rest=stripWake(heard);ctl.commandArmed=!rest;setWakeBadge(rest?'Hey, Ayanda · executing':'Hey, Ayanda · listening for command',true);if(rest){if(byId('assistantQuery'))byId('assistantQuery').value=rest;fastAgentQuery(rest,{fromVoice:true});}else{if(byId('assistantQuery'))byId('assistantQuery').value='';try{setAgentState('listening','Listening for command');}catch{}}return;}if(ctl.commandArmed){ctl.commandArmed=false;if(byId('assistantQuery'))byId('assistantQuery').value=heard;setWakeBadge('Hey, Ayanda · executing',true);fastAgentQuery(heard,{fromVoice:true});}}

  function buildRecognition(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){byId('micButton')?.setAttribute('disabled','disabled');setWakeBadge('Voice recognition unavailable');return null;}try{state.recognition?.abort?.();}catch{}const r=new SR();r.continuous=true;r.interimResults=true;r.maxAlternatives=1;r.lang=selectedLang();r.onstart=()=>{ctl.starting=false;try{state.listening=true;}catch{}setWakeBadge('Hey, Ayanda · listening',true);};r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript.trim();if(e.results[i].isFinal)handleFinalTranscript(t);else interim+=`${t} `;}if(ctl.commandArmed&&interim.trim()){if(byId('liveTranscript'))byId('liveTranscript').hidden=false;if(byId('transcriptText'))byId('transcriptText').textContent=interim.trim();}};r.onerror=e=>{ctl.starting=false;try{state.listening=false;}catch{}if(e.error==='not-allowed'||e.error==='service-not-allowed'){ctl.shouldListen=false;setWakeBadge('Microphone permission needed');}else if(!ctl.suspendedForSpeech)setWakeBadge('Hey, Ayanda · reconnecting');};r.onend=()=>{ctl.starting=false;try{state.listening=false;}catch{}if(!ctl.suspendedForSpeech&&ctl.shouldListen)setTimeout(ensureListening,100);};ctl.recognition=r;try{state.recognition=r;}catch{}return r;}
  function ensureListening(){if(!ctl.shouldListen||ctl.suspendedForSpeech||ctl.starting)return;if(!ctl.recognition)buildRecognition();if(!ctl.recognition)return;ctl.recognition.lang=selectedLang();ctl.starting=true;try{ctl.recognition.start();}catch{ctl.starting=false;setTimeout(()=>{if(ctl.shouldListen)ensureListening();},140);}}
  function enableWakeWord(){ctl.shouldListen=true;setWakeBadge('Hey, Ayanda · listening',true);ensureListening();}
  function manualVoice(){try{openAgent();stopSpeech();}catch{}ctl.commandArmed=true;ctl.shouldListen=true;if(byId('liveTranscript'))byId('liveTranscript').hidden=false;if(byId('transcriptText'))byId('transcriptText').textContent='Listening for your command…';try{setAgentState('listening','Listening for command');}catch{}ensureListening();}
  function changeLanguage(){ctl.language=selectedLang();populateVoiceSelect();updateLocaleStatus();ctl.commandArmed=false;if(ctl.recognition){try{ctl.recognition.abort();}catch{}ctl.recognition.lang=ctl.language;}if(ctl.shouldListen)setTimeout(ensureListening,100);}

  function wireSingleVoiceControls(){if(byId('micButton'))byId('micButton').onclick=manualVoice;if(byId('stopVoiceButton'))byId('stopVoiceButton').onclick=()=>{stopRecognition();window.speechSynthesis?.cancel?.();try{setAgentState('ready');}catch{}};if(byId('languageSelect'))byId('languageSelect').onchange=changeLanguage;if(byId('voiceSelect'))byId('voiceSelect').onchange=selectVoice;if(byId('previewVoiceButton'))byId('previewVoiceButton').onclick=previewVoice;if('speechSynthesis'in window)window.speechSynthesis.onvoiceschanged=()=>{populateVoiceSelect();updateLocaleStatus();};const gesture=()=>{enableWakeWord();document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);};document.addEventListener('pointerdown',gesture,true);document.addEventListener('keydown',gesture,true);}

  function enhance(){installBranding();installConsistentBotIcon();installVoiceStatus();wireSingleVoiceControls();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();