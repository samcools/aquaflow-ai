/* AquaFlow OpenAI neural voice bridge.
 * - Keeps API keys server-side after submission.
 * - Uses OpenAI TTS for Ayanda when configured.
 * - Falls back to the browser speech provider only when neural voice is not configured.
 */
'use strict';

(() => {
  const VOICES = [
    ['coral','Ayanda · Coral — warm & conversational'],
    ['marin','Ayanda · Marin — natural & clear'],
    ['shimmer','Ayanda · Shimmer — bright & friendly'],
    ['nova','Ayanda · Nova — confident & energetic'],
    ['sage','Ayanda · Sage — calm & professional'],
    ['cedar','Ayanda · Cedar — grounded & measured'],
    ['alloy','Ayanda · Alloy — balanced'],
    ['ash','Ayanda · Ash — direct'],
    ['ballad','Ayanda · Ballad — expressive'],
    ['echo','Ayanda · Echo — crisp'],
    ['fable','Ayanda · Fable — narrative'],
    ['onyx','Ayanda · Onyx — deep'],
    ['verse','Ayanda · Verse — polished']
  ];

  const state = {
    configured:false,
    source:null,
    voice:localStorage.getItem('aquaflowOpenAIVoice') || 'coral',
    currentAudio:null,
    requestController:null,
    nativeSpeak:null,
    nativeCancel:null,
    proxyInstalled:false
  };

  const $ = selector => document.querySelector(selector);

  async function jsonRequest(path, options={}) {
    const response = await fetch(path, {
      credentials:'same-origin',
      ...options,
      headers:{ 'content-type':'application/json', ...(options.headers||{}) }
    });
    const body = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  }

  function notify(message, tone='good') {
    if (typeof showToast === 'function') return showToast(message,tone);
    const el=$('#toast');
    if(el){el.textContent=message;el.className=`toast ${tone}`;el.hidden=false;setTimeout(()=>{el.hidden=true;},3200);}
  }

  function setProviderStatus() {
    const el=$('#openAIProviderStatus');
    if(!el)return;
    el.classList.toggle('configured',state.configured);
    el.innerHTML=`<i></i><span>${state.configured ? `OpenAI neural voice active${state.source==='server'?' · server key':''}` : 'OpenAI neural voice not configured · browser fallback active'}</span>`;
    const locale=$('#voiceLocaleStatus');
    if(locale && state.configured) locale.textContent=`Ayanda · OpenAI neural · ${state.voice}`;
  }

  async function refreshStatus() {
    try {
      const status=await jsonRequest('/api/settings/openai');
      state.configured=Boolean(status.configured);state.source=status.source||null;
      if(status.voice){state.voice=status.voice;localStorage.setItem('aquaflowOpenAIVoice',state.voice);}
      setProviderStatus();renderNeuralVoicePicker();
      return status;
    } catch { state.configured=false;setProviderStatus();return null; }
  }

  function renderNeuralVoicePicker() {
    const select=$('#voiceSelect');if(!select)return;
    select.innerHTML='';
    VOICES.forEach(([value,label])=>{
      const option=document.createElement('option');option.value=value;option.textContent=label;select.appendChild(option);
    });
    if(!VOICES.some(([v])=>v===state.voice))state.voice='coral';
    select.value=state.voice;
    select.onchange=()=>{
      state.voice=select.value||'coral';
      localStorage.setItem('aquaflowOpenAIVoice',state.voice);
      const hidden=$('#openAIVoice');if(hidden)hidden.value=state.voice;
      setProviderStatus();
    };
    const picker=select.closest('.voice-picker');
    if(picker){
      const label=picker.querySelector('label');if(label)label.textContent=state.configured?'Ayanda neural voice':'Ayanda voice';
      if(!picker.querySelector('.neural-voice-hint'))picker.insertAdjacentHTML('beforeend','<span class="neural-voice-hint">OpenAI neural speech is preferred when configured.</span>');
    }
  }

  function stopNeuralAudio() {
    if(state.requestController){try{state.requestController.abort();}catch{}state.requestController=null;}
    if(state.currentAudio){try{state.currentAudio.pause();state.currentAudio.src='';}catch{}state.currentAudio=null;}
  }

  async function neuralSpeak(utterance) {
    stopNeuralAudio();
    const controller=new AbortController();state.requestController=controller;
    try {
      utterance.onstart?.(new Event('start'));
      const response=await fetch('/api/assistant/speech',{
        method:'POST',credentials:'same-origin',signal:controller.signal,
        headers:{'content-type':'application/json'},
        body:JSON.stringify({text:utterance.text,language:utterance.lang||$('#languageSelect')?.value||'en-ZA',voice:state.voice})
      });
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`Neural voice failed (${response.status})`);}
      const blob=await response.blob();
      if(controller.signal.aborted)return;
      const url=URL.createObjectURL(blob),audio=new Audio(url);state.currentAudio=audio;
      audio.onended=()=>{URL.revokeObjectURL(url);state.currentAudio=null;utterance.onend?.(new Event('end'));};
      audio.onerror=()=>{URL.revokeObjectURL(url);state.currentAudio=null;utterance.onerror?.(new Event('error'));};
      await audio.play();
    } catch(error) {
      if(error.name==='AbortError')return;
      utterance.onerror?.(new Event('error'));
      notify(`${error.message}. Check AI & Voice Settings.`,'warning');
    } finally { if(state.requestController===controller)state.requestController=null; }
  }

  function installSpeechProxy() {
    if(state.proxyInstalled||!('speechSynthesis'in window))return;
    const synth=window.speechSynthesis;
    state.nativeSpeak=synth.speak.bind(synth);state.nativeCancel=synth.cancel.bind(synth);
    try {
      synth.speak=(utterance)=>{
        if(state.configured)return void neuralSpeak(utterance);
        return state.nativeSpeak(utterance);
      };
      synth.cancel=()=>{stopNeuralAudio();return state.nativeCancel();};
      state.proxyInstalled=true;
    } catch { state.proxyInstalled=false; }
  }

  function injectSettingsDialog() {
    if($('#openAISettingsDialog'))return;
    const controls=$('.agent-controls');
    if(controls&&!$('#openAISettingsButton')) controls.insertAdjacentHTML('beforeend','<button id="openAISettingsButton" class="btn ghost compact ai-settings-button" type="button">⚙ AI & Voice Settings</button>');
    document.body.insertAdjacentHTML('beforeend',`
      <dialog id="openAISettingsDialog" class="ai-settings-dialog">
        <form id="openAISettingsForm" method="dialog">
          <div class="panel-head"><div><p class="eyebrow">AYANDA · NEURAL AI</p><h2>OpenAI & Voice Settings</h2></div><button type="button" id="closeOpenAISettings" class="icon-btn">×</button></div>
          <div id="openAIProviderStatus" class="ai-provider-status"><i></i><span>Checking provider…</span></div>
          <div class="ai-settings-grid">
            <label class="span-2">OpenAI API key<input id="openAIKey" type="password" autocomplete="off" placeholder="Enter key to enable neural Ayanda + OpenAI answers"><span class="ai-key-note">The key is sent to the AquaFlow server over HTTPS and held only in memory for this authenticated session. It is not written to GitHub, localStorage or demo records.</span></label>
            <label>AI model<select id="openAIModel"><option value="gpt-5.6-luna">GPT-5.6 Luna · fast</option><option value="gpt-5.6-terra">GPT-5.6 Terra</option><option value="gpt-5.6-sol">GPT-5.6 Sol</option></select></label>
            <label>Speech model<select id="openAITTSModel"><option value="gpt-4o-mini-tts">GPT-4o mini TTS · neural</option></select></label>
            <label>Ayanda neural voice<select id="openAIVoice">${VOICES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>
            <label>Custom OpenAI voice ID (optional)<input id="openAICustomVoice" autocomplete="off" placeholder="voice_…"></label>
          </div>
          <p class="microcopy">Ayanda is configured as a warm professional South African female persona. Language selection applies to both recognition and neural speech. Governed edits still use AquaFlow RBAC, validation and audit controls.</p>
          <p id="openAISettingsMessage" class="form-message"></p>
          <div class="dialog-actions"><button id="clearOpenAIKey" type="button" class="btn ghost">Clear session key</button><button id="testOpenAIKey" type="button" class="btn ghost">Test connection</button><button type="submit" class="btn primary">Save settings</button></div>
        </form>
      </dialog>`);

    $('#openAISettingsButton')?.addEventListener('click',async()=>{await populateSettings();$('#openAISettingsDialog').showModal();});
    $('#closeOpenAISettings')?.addEventListener('click',()=>$('#openAISettingsDialog').close());
    $('#openAISettingsForm')?.addEventListener('submit',saveSettings);
    $('#testOpenAIKey')?.addEventListener('click',testConnection);
    $('#clearOpenAIKey')?.addEventListener('click',clearSettings);
    $('#openAIVoice')?.addEventListener('change',e=>{state.voice=e.target.value||'coral';localStorage.setItem('aquaflowOpenAIVoice',state.voice);renderNeuralVoicePicker();});
  }

  async function populateSettings() {
    const status=await refreshStatus();
    if(!status)return;
    $('#openAIModel').value=status.aiModel||'gpt-5.6-luna';
    $('#openAITTSModel').value=status.ttsModel||'gpt-4o-mini-tts';
    $('#openAIVoice').value=status.voice||state.voice||'coral';
    $('#openAIKey').value='';$('#openAISettingsMessage').textContent=status.configured?'Neural Ayanda is configured. Enter a new key only to replace the current session key.':'Enter an OpenAI API key to enable neural voice and OpenAI-grounded answers.';
  }

  async function saveSettings(event) {
    event.preventDefault();const msg=$('#openAISettingsMessage');msg.textContent='Saving…';
    try {
      const body={apiKey:$('#openAIKey').value.trim(),aiModel:$('#openAIModel').value,ttsModel:$('#openAITTSModel').value,voice:$('#openAIVoice').value,customVoiceId:$('#openAICustomVoice').value.trim()};
      const result=await jsonRequest('/api/settings/openai',{method:'POST',body:JSON.stringify(body)});
      state.configured=Boolean(result.configured);state.source=result.source||null;state.voice=result.voice||body.voice||'coral';localStorage.setItem('aquaflowOpenAIVoice',state.voice);
      $('#openAIKey').value='';msg.textContent='Saved. Ayanda will now use the neural voice for speech and OpenAI for grounded questions.';setProviderStatus();renderNeuralVoicePicker();notify('Ayanda neural voice enabled.');
    } catch(error){msg.textContent=error.message;}
  }

  async function testConnection() {
    const msg=$('#openAISettingsMessage');msg.textContent='Testing…';
    try {
      if($('#openAIKey').value.trim()) await jsonRequest('/api/settings/openai',{method:'POST',body:JSON.stringify({apiKey:$('#openAIKey').value.trim(),aiModel:$('#openAIModel').value,ttsModel:$('#openAITTSModel').value,voice:$('#openAIVoice').value,customVoiceId:$('#openAICustomVoice').value.trim()})});
      const result=await jsonRequest('/api/settings/openai/test',{method:'POST',body:'{}'});msg.textContent=result.message||'OpenAI connection verified.';await refreshStatus();
    } catch(error){msg.textContent=error.message;}
  }

  async function clearSettings() {
    try{await jsonRequest('/api/settings/openai',{method:'POST',body:JSON.stringify({clear:true})});state.configured=false;state.source=null;setProviderStatus();$('#openAISettingsMessage').textContent='Session key cleared. Browser voice fallback is active.';notify('OpenAI session key cleared.','warning');}catch(error){$('#openAISettingsMessage').textContent=error.message;}
  }

  function enhance() {
    installSpeechProxy();injectSettingsDialog();renderNeuralVoicePicker();
    if('speechSynthesis'in window)window.speechSynthesis.onvoiceschanged=()=>renderNeuralVoicePicker();
    $('#languageSelect')?.addEventListener('change',()=>setTimeout(()=>{renderNeuralVoicePicker();setProviderStatus();},0));
    $('#agentLauncher')?.addEventListener('click',()=>refreshStatus());
    $('#sidebarAgentButton')?.addEventListener('click',()=>refreshStatus());
    setTimeout(refreshStatus,250);
  }

  installSpeechProxy();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,0),{once:true});else setTimeout(enhance,0);
})();
