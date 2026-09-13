/* AquaFlow global Ayanda controller.
 * Exactly one recognition controller and one audible output path.
 * Speech output is delegated only to window.AyandaVoice (OpenAI neural TTS).
 */
'use strict';

(() => {
  const BOT_ICON=`<svg class="ayanda-bot-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="ayg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#48c7ff"/><stop offset="1" stop-color="#0b63c7"/></linearGradient></defs><path d="M32 5c-13.8 0-25 10.1-25 22.6v8.8C7 49 18.2 59 32 59s25-10 25-22.6v-8.8C57 15.1 45.8 5 32 5Z" fill="url(#ayg)"/><rect x="12" y="17" width="40" height="30" rx="15" fill="#f5fbff"/><circle cx="25" cy="31" r="4" fill="#08a8d8"/><circle cx="39" cy="31" r="4" fill="#08a8d8"/><path d="M24 39c5.2 4 10.8 4 16 0" fill="none" stroke="#0b63c7" stroke-width="2.6" stroke-linecap="round"/><path d="M32 10V4" stroke="#42c6ff" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="3" r="2.5" fill="#65dcff"/></svg>`;

  const ctl={recognition:null,shouldListen:false,commandArmed:false,starting:false,suspendedForSpeech:false,lastFinal:'',lastFinalAt:0,language:'en-ZA',authWatch:null};
  const wakeRx=/(?:^|\b)(?:hey|hi|hello)\s*,?\s*ayanda(?:\b|$)/i;
  const byId=id=>document.getElementById(id);
  const selectedLang=()=>byId('languageSelect')?.value||ctl.language||'en-ZA';
  const stripWake=text=>String(text||'').replace(wakeRx,'').replace(/^[\s,.:;-]+/,'').trim();
  const navTerms={
    command:['command centre','dashboard','overview','ikhaya','ekhaya','kakaretso','tshobokanyo'],
    delivery:['delivery','projects','project','milestones','work items','projek','projekte','amaphrojekthi','iiprojekthi','diporojeke','tiphurojeke','dzhiphurojeke','emaphrojekthi'],
    operations:['operations','water operations','incidents','incident','work orders','izigameko','izehlo','diketsahalo','ditiragalo','swiendlakalo','zwiwo','tigameko','izehlakalo'],
    assets:['assets','meters','asset','meter','ii-asethi','iimitha','dithoto','dimetara','nhundzu','timitara','ndaka','mimitha','timphahla','emamitha','iimpahla','amamitha'],
    revenue:['revenue','finance','recovery','inkomste','ingeniso','lekeno','lotseno','letseno','mali','mbuelo','imali'],
    governance:['governance','risks','approvals','risk','approval','bestuur','ulawulo','puso','taolo','vulawuri','vhulangi','kuphatsa','ukuphatha'],
    documents:['documents','evidence','document','bewyse','amaxwebhu','ditokomane','matsalwa','manwalwa','imibhalo','imitlolo'],
    audit:['audit','activity','logs','oudit','uphicotho','tlhahlobo','tlhatlhobo','oditi','luhlolo','ukuhlolwa']
  };

  function installConsistentBotIcon(){
    document.querySelectorAll('.launcher-orb,.orb-core,.mini-orb').forEach(node=>{if(!node.querySelector('.ayanda-bot-icon'))node.innerHTML=BOT_ICON;});
    byId('agentLauncher')?.setAttribute('aria-label','Open Ayanda voice and chat assistant');
    byId('sidebarAgentButton')?.setAttribute('aria-label','Open Ayanda voice and chat assistant');
  }

  function installVoiceStatus(){
    const controls=document.querySelector('.voice-controls');
    if(!controls)return;
    if(!controls.querySelector('.voice-locale-status'))controls.insertAdjacentHTML('beforeend','<span class="voice-locale-status" id="voiceLocaleStatus">Ayanda · neural voice</span><span class="wake-badge" id="wakeBadge">Hey/Hi Ayanda · ready</span>');
  }
  function setWakeBadge(text,active=false){const el=byId('wakeBadge');if(el){el.textContent=text;el.classList.toggle('listening',active);}}

  function pauseRecognitionForSpeech(){
    ctl.suspendedForSpeech=true;
    if(ctl.recognition){try{ctl.recognition.abort();}catch{}}
  }
  function resumeRecognitionSoon(){
    ctl.suspendedForSpeech=false;
    if(ctl.shouldListen)setTimeout(ensureListening,100);
  }

  async function unifiedSpeak(text,options={}){
    if(!options.force&&!byId('speakToggle')?.checked){try{setAgentState('ready');}catch{}return;}
    const voice=window.AyandaVoice;
    if(!voice?.isConfigured?.()){
      try{setAgentState('ready','Text answer · voice setup needed');}catch{}
      return;
    }
    pauseRecognitionForSpeech();
    try{
      try{state.speaking=true;setAgentState('speaking','Ayanda speaking');}catch{}
      await voice.speak(String(text||''),{language:selectedLang()});
    } finally {
      try{state.speaking=false;setAgentState('ready');}catch{}
      resumeRecognitionSoon();
    }
  }

  function normalizeSelectedLanguage(text){
    let q=String(text||'').trim();
    q=q.replace(/^(maak oop|vula|bula|pfula)\b/i,'open').replace(/^(ngibonise|ndibonise|mpontshe|mpontsha|ndzi kombela|ngikhombise)\b/i,'show').replace(/^(shintsha|tshintsha|fetola|fetosha|cinca|tshintja)\b/i,'change').replace(/^(abela|yabela|abelela)\b/i,'assign');
    for(const [section,terms]of Object.entries(navTerms))for(const term of [...terms].sort((a,b)=>b.length-a.length)){const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),rx=new RegExp(`\\b${escaped}\\b`,'i');if(rx.test(q)){const canonical={command:'dashboard',delivery:'projects',operations:'incidents',assets:'assets',revenue:'revenue',governance:'governance',documents:'documents',audit:'audit'}[section];q=q.replace(rx,canonical);break;}}
    return q;
  }

  function resolveLocalSection(text){
    const q=String(text||'').toLowerCase();
    if(!/^(open|show|go to|take me to|navigate|gaan na|vula|bula|pfula)\b/i.test(q))return null;
    for(const [section,terms]of Object.entries(navTerms))if(terms.some(term=>q.includes(term)))return section;
    return null;
  }
  const sectionLabel=section=>({command:'Command Centre',delivery:'Projects & Delivery',operations:'Water Operations',assets:'Assets & Meters',revenue:'Revenue & Finance',governance:'Governance',documents:'Evidence',audit:'Audit'}[section]||section);
  const coreRunAgentQuery=typeof runAgentQuery==='function'?runAgentQuery:null;

  async function fastAgentQuery(input,opts={}){
    const raw=String(input||'').trim();if(!raw)return;
    const stripped=stripWake(raw);
    const localSection=resolveLocalSection(stripped);
    if(localSection){
      try{openAgent();appendBubble(stripped,'user');showSection(localSection);const msg=`Opening ${sectionLabel(localSection)}.`;appendBubble(msg,'assistant');await unifiedSpeak(msg);setAgentState('ready');}catch{}
      return;
    }
    if(/^(explain|describe)\s+(this|the current)\s+page$/i.test(stripped)||/what (is|does) this page/i.test(stripped))return explainCurrentPage();
    if(coreRunAgentQuery)return coreRunAgentQuery(normalizeSelectedLanguage(stripped),opts);
  }

  function handleFinalTranscript(text){
    const now=Date.now();
    if(text===ctl.lastFinal&&now-ctl.lastFinalAt<800)return;
    ctl.lastFinal=text;ctl.lastFinalAt=now;
    const heard=String(text||'').trim();if(!heard)return;
    if(wakeRx.test(heard)){
      try{openAgent();}catch{}
      const rest=stripWake(heard);ctl.commandArmed=!rest;
      setWakeBadge(rest?'Ayanda · executing':'Ayanda · listening for command',true);
      if(rest){if(byId('assistantQuery'))byId('assistantQuery').value=rest;fastAgentQuery(rest,{fromVoice:true});}
      else{if(byId('assistantQuery'))byId('assistantQuery').value='';try{setAgentState('listening','Listening for command');}catch{}}
      return;
    }
    if(ctl.commandArmed){
      ctl.commandArmed=false;
      if(byId('assistantQuery'))byId('assistantQuery').value=heard;
      setWakeBadge('Ayanda · executing',true);
      fastAgentQuery(heard,{fromVoice:true});
    }
  }

  function stopRecognition({disable=false}={}){
    if(disable)ctl.shouldListen=false;
    ctl.commandArmed=false;ctl.starting=false;
    if(ctl.recognition){try{ctl.recognition.abort();}catch{}}
    try{state.listening=false;}catch{}
    byId('micButton')?.classList.remove('listening');
    if(disable)setWakeBadge('Hey/Hi Ayanda · paused');
  }

  function buildRecognition(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){byId('micButton')?.setAttribute('disabled','disabled');setWakeBadge('Voice recognition unavailable');return null;}
    if(ctl.recognition)return ctl.recognition;
    try{state.recognition?.abort?.();}catch{}
    const r=new SR();r.continuous=true;r.interimResults=true;r.maxAlternatives=1;r.lang=selectedLang();
    r.onstart=()=>{ctl.starting=false;try{state.listening=true;}catch{}setWakeBadge('Hey/Hi Ayanda · listening',true);};
    r.onresult=e=>{
      let interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const t=e.results[i][0].transcript.trim();
        if(e.results[i].isFinal)handleFinalTranscript(t);else interim+=`${t} `;
      }
      if(ctl.commandArmed&&interim.trim()){
        if(byId('liveTranscript'))byId('liveTranscript').hidden=false;
        if(byId('transcriptText'))byId('transcriptText').textContent=interim.trim();
      }
    };
    r.onerror=e=>{
      ctl.starting=false;try{state.listening=false;}catch{}
      if(e.error==='not-allowed'||e.error==='service-not-allowed')setWakeBadge('Allow microphone once to use Hey/Hi Ayanda');
      else if(!ctl.suspendedForSpeech)setWakeBadge('Hey/Hi Ayanda · reconnecting');
    };
    r.onend=()=>{ctl.starting=false;try{state.listening=false;}catch{}if(!ctl.suspendedForSpeech&&ctl.shouldListen)setTimeout(ensureListening,120);};
    ctl.recognition=r;try{state.recognition=r;}catch{}return r;
  }

  function ensureListening(){
    if(!ctl.shouldListen||ctl.suspendedForSpeech||ctl.starting)return;
    if(!ctl.recognition)buildRecognition();if(!ctl.recognition)return;
    ctl.recognition.lang=selectedLang();ctl.starting=true;
    try{ctl.recognition.start();}catch{ctl.starting=false;setTimeout(()=>{if(ctl.shouldListen)ensureListening();},180);}
  }
  function enableWakeWord(){ctl.shouldListen=true;setWakeBadge('Hey/Hi Ayanda · listening',true);ensureListening();}
  function manualVoice(){try{openAgent();window.AyandaVoice?.stopSpeaking?.();}catch{}ctl.commandArmed=true;ctl.shouldListen=true;if(byId('liveTranscript'))byId('liveTranscript').hidden=false;if(byId('transcriptText'))byId('transcriptText').textContent='Listening for your command…';try{setAgentState('listening','Listening for command');}catch{}ensureListening();}
  function changeLanguage(){ctl.language=selectedLang();ctl.commandArmed=false;if(ctl.recognition){try{ctl.recognition.abort();}catch{}ctl.recognition.lang=ctl.language;}window.AyandaVoice?.refreshStatus?.();if(ctl.shouldListen)setTimeout(ensureListening,120);}

  function wireAuthenticationAutostart(){
    const form=byId('loginForm');
    if(form?.onsubmit&&!form.dataset.ayandaWrapped){
      const original=form.onsubmit;
      form.dataset.ayandaWrapped='true';
      form.onsubmit=async event=>{const result=await original.call(form,event);setTimeout(()=>{if(state?.token&&!byId('appView')?.hidden)enableWakeWord();},80);return result;};
    }
    let attempts=0;
    ctl.authWatch=setInterval(()=>{
      attempts+=1;
      if(state?.token&&!byId('appView')?.hidden){clearInterval(ctl.authWatch);ctl.authWatch=null;enableWakeWord();}
      else if(attempts>40){clearInterval(ctl.authWatch);ctl.authWatch=null;}
    },250);
  }

  function wireSingleVoiceControls(){
    try{state.recognition?.abort?.();state.recognition=null;}catch{}
    if(byId('micButton'))byId('micButton').onclick=manualVoice;
    if(byId('stopVoiceButton'))byId('stopVoiceButton').onclick=()=>{stopRecognition({disable:true});window.AyandaVoice?.stopSpeaking?.();try{setAgentState('ready');}catch{}};
    if(byId('languageSelect'))byId('languageSelect').onchange=changeLanguage;
    try{startVoice=manualVoice;stopVoiceInput=()=>stopRecognition({disable:true});stopSpeech=()=>window.AyandaVoice?.stopSpeaking?.();runAgentQuery=fastAgentQuery;speak=unifiedSpeak;}catch{}
    wireAuthenticationAutostart();
  }

  function enhance(){installConsistentBotIcon();installVoiceStatus();wireSingleVoiceControls();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
