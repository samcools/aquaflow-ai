/* AquaFlow Ayanda neural voice.
 * One audible output path only: OpenAI neural TTS.
 * No browser TTS fallback is used, preventing robotic/multiple voices.
 */
'use strict';

(() => {
  const VOICES=[
    ['marin','Ayanda Natural 1 · Marin · recommended'],
    ['coral','Ayanda Natural 2 · Coral · warm'],
    ['shimmer','Ayanda Natural 3 · Shimmer · friendly'],
    ['nova','Ayanda Natural 4 · Nova · confident'],
    ['sage','Ayanda Natural 5 · Sage · calm']
  ];
  const state={configured:false,source:null,voice:localStorage.getItem('aquaflowOpenAIVoice')||'marin',currentAudio:null,requestController:null};
  const $=selector=>document.querySelector(selector);

  async function jsonRequest(path,options={}){
    const response=await fetch(path,{credentials:'same-origin',...options,headers:{'content-type':'application/json',...(options.headers||{})}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||`Request failed (${response.status})`);
    return body;
  }

  function notify(message,tone='good'){
    if(typeof showToast==='function')return showToast(message,tone);
    const el=$('#toast');if(el){el.textContent=message;el.className=`toast ${tone}`;el.hidden=false;setTimeout(()=>{el.hidden=true;},3200);}
  }

  function setProviderStatus(){
    const el=$('#openAIProviderStatus');
    if(el){el.classList.toggle('configured',state.configured);el.innerHTML=`<i></i><span>${state.configured?'Ayanda neural voice active':'Add OpenAI API key to enable Ayanda voice'}</span>`;}
    const locale=$('#voiceLocaleStatus');
    if(locale)locale.textContent=state.configured?`Ayanda · ${state.voice} · neural human-like voice`:'Ayanda · text only until neural voice is configured';
    const launcher=$('#launcherState');
    if(launcher&&!state.configured&&launcher.textContent==='Ready')launcher.textContent='Ready · text';
  }

  function isConfigured(){return state.configured;}

  async function refreshStatus(){
    try{
      const status=await jsonRequest('/api/settings/openai');
      state.configured=Boolean(status.configured);state.source=status.source||null;
      const saved=localStorage.getItem('aquaflowOpenAIVoice');
      if(saved&&VOICES.some(([v])=>v===saved))state.voice=saved;
      else if(status.voice&&VOICES.some(([v])=>v===status.voice))state.voice=status.voice;
      else state.voice='marin';
      localStorage.setItem('aquaflowOpenAIVoice',state.voice);
      setProviderStatus();renderVoicePicker();return status;
    }catch{state.configured=false;setProviderStatus();renderVoicePicker();return null;}
  }

  function renderVoicePicker(){
    let picker=$('.voice-picker');
    const controls=$('.voice-controls');
    if(!picker&&controls){controls.insertAdjacentHTML('beforeend','<div class="voice-picker"><label for="voiceSelect">Preferred Ayanda voice</label><select id="voiceSelect" aria-label="Choose preferred human-like Ayanda voice"></select><button id="previewVoiceButton" class="voice-preview-button" type="button">▶ Preview</button><span class="neural-voice-hint">Human-like neural voices only · South African/African delivery where supported.</span></div>');picker=$('.voice-picker');}
    const select=$('#voiceSelect');if(!select)return;
    select.innerHTML='';
    VOICES.forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;select.appendChild(option);});
    if(!VOICES.some(([v])=>v===state.voice))state.voice='marin';
    select.value=state.voice;
    select.onchange=async()=>{
      state.voice=select.value||'marin';localStorage.setItem('aquaflowOpenAIVoice',state.voice);setProviderStatus();
      try{await jsonRequest('/api/settings/openai',{method:'POST',body:JSON.stringify({voice:state.voice})});}catch{}
    };
    const preview=$('#previewVoiceButton');if(preview)preview.onclick=()=>previewVoice();
  }

  function stopSpeaking(){
    if(state.requestController){try{state.requestController.abort();}catch{}state.requestController=null;}
    if(state.currentAudio){try{state.currentAudio.pause();if(state.currentAudio.src)URL.revokeObjectURL(state.currentAudio.src);state.currentAudio.removeAttribute('src');state.currentAudio.load();}catch{}state.currentAudio=null;}
    try{window.speechSynthesis?.cancel?.();}catch{}
  }

  async function speak(text,{language}={}){
    if(!state.configured)throw new Error('OpenAI neural voice is not configured.');
    stopSpeaking();
    const controller=new AbortController();state.requestController=controller;
    try{
      const response=await fetch('/api/assistant/speech',{method:'POST',credentials:'same-origin',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({text:String(text||''),language:language||$('#languageSelect')?.value||'en-ZA',voice:state.voice})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`Neural voice failed (${response.status})`);}
      const blob=await response.blob();if(controller.signal.aborted)return;
      const url=URL.createObjectURL(blob),audio=new Audio(url);state.currentAudio=audio;
      await new Promise((resolve,reject)=>{
        audio.onended=()=>{URL.revokeObjectURL(url);if(state.currentAudio===audio)state.currentAudio=null;resolve();};
        audio.onerror=()=>{URL.revokeObjectURL(url);if(state.currentAudio===audio)state.currentAudio=null;reject(new Error('Neural audio playback failed.'));};
        audio.play().catch(reject);
      });
    }catch(error){if(error.name==='AbortError')return;notify(error.message,'warning');throw error;}
    finally{if(state.requestController===controller)state.requestController=null;}
  }

  async function previewVoice(){
    if(!state.configured){notify('Add your OpenAI API key in AI & Voice Settings to preview Ayanda.','warning');return;}
    const lang=$('#languageSelect')?.value||'en-ZA';
    const samples={
      'en-ZA':'Hello, I am Ayanda. I am ready to help with your AquaFlow questions and commands.',
      'af-ZA':'Hallo, ek is Ayanda. Ek is gereed om met jou AquaFlow-vrae en opdragte te help.',
      'zu-ZA':'Sawubona, ngingu-Ayanda. Ngikulungele ukusiza ngemibuzo nemiyalo yakho ye-AquaFlow.',
      'xh-ZA':'Molo, ndingu-Ayanda. Ndikulungele ukukunceda ngemibuzo nemiyalelo yakho ye-AquaFlow.'
    };
    try{await speak(samples[lang]||samples['en-ZA'],{language:lang});}catch{}
  }

  function injectSettingsDialog(){
    if($('#openAISettingsDialog'))return;
    const controls=$('.agent-controls');
    if(controls&&!$('#openAISettingsButton'))controls.insertAdjacentHTML('beforeend','<button id="openAISettingsButton" class="btn ghost compact ai-settings-button" type="button">⚙ AI & Voice Settings</button>');
    document.body.insertAdjacentHTML('beforeend',`
      <dialog id="openAISettingsDialog" class="ai-settings-dialog">
        <form id="openAISettingsForm" method="dialog">
          <div class="panel-head"><div><p class="eyebrow">AYANDA · NEURAL AI</p><h2>AI & Voice Settings</h2></div><button type="button" id="closeOpenAISettings" class="icon-btn">×</button></div>
          <div id="openAIProviderStatus" class="ai-provider-status"><i></i><span>Checking provider…</span></div>
          <div class="ai-settings-grid">
            <label class="span-2">OpenAI API key<input id="openAIKey" type="password" autocomplete="off" placeholder="Enter API key"><span class="ai-key-note">Held only in server memory for this authenticated session; never written to GitHub or browser storage.</span></label>
            <label>AI model<select id="openAIModel"><option value="gpt-5.6-luna">GPT-5.6 Luna · fast</option><option value="gpt-5.6-terra">GPT-5.6 Terra</option><option value="gpt-5.6-sol">GPT-5.6 Sol</option></select></label>
            <label>Speech model<select id="openAITTSModel"><option value="gpt-4o-mini-tts">GPT-4o mini TTS · neural</option></select></label>
            <label class="span-2">Custom African female voice ID (optional)<input id="openAICustomVoice" autocomplete="off" placeholder="voice_…"><span class="ai-key-note">Use an eligible consented custom voice when available; otherwise AquaFlow uses your selected curated neural voice with South African delivery instructions.</span></label>
          </div>
          <p class="microcopy">The preferred voice is selected in the Ayanda panel. Only curated human-like neural voices are offered. Browser text-to-speech is disabled.</p>
          <p id="openAISettingsMessage" class="form-message"></p>
          <div class="dialog-actions"><button id="clearOpenAIKey" type="button" class="btn ghost">Clear session key</button><button id="testOpenAIKey" type="button" class="btn ghost">Test connection</button><button type="submit" class="btn primary">Save settings</button></div>
        </form>
      </dialog>`);
    $('#openAISettingsButton')?.addEventListener('click',async()=>{await populateSettings();$('#openAISettingsDialog').showModal();});
    $('#closeOpenAISettings')?.addEventListener('click',()=>$('#openAISettingsDialog').close());
    $('#openAISettingsForm')?.addEventListener('submit',saveSettings);
    $('#testOpenAIKey')?.addEventListener('click',testConnection);
    $('#clearOpenAIKey')?.addEventListener('click',clearSettings);
  }

  async function populateSettings(){
    const status=await refreshStatus();if(!status)return;
    $('#openAIModel').value=status.aiModel||'gpt-5.6-luna';$('#openAITTSModel').value=status.ttsModel||'gpt-4o-mini-tts';$('#openAIKey').value='';
    $('#openAISettingsMessage').textContent=status.configured?'Neural Ayanda is configured.':'Enter an OpenAI API key to enable Ayanda voice and OpenAI-grounded answers.';
  }

  async function saveSettings(event){
    event.preventDefault();const msg=$('#openAISettingsMessage');msg.textContent='Saving…';
    try{
      const body={apiKey:$('#openAIKey').value.trim(),aiModel:$('#openAIModel').value,ttsModel:$('#openAITTSModel').value,voice:state.voice,customVoiceId:$('#openAICustomVoice').value.trim()};
      const result=await jsonRequest('/api/settings/openai',{method:'POST',body:JSON.stringify(body)});
      state.configured=Boolean(result.configured);state.source=result.source||null;$('#openAIKey').value='';msg.textContent='Saved.';setProviderStatus();renderVoicePicker();notify('Ayanda neural voice enabled.');
    }catch(error){msg.textContent=error.message;}
  }

  async function testConnection(){
    const msg=$('#openAISettingsMessage');msg.textContent='Testing…';
    try{
      if($('#openAIKey').value.trim())await jsonRequest('/api/settings/openai',{method:'POST',body:JSON.stringify({apiKey:$('#openAIKey').value.trim(),aiModel:$('#openAIModel').value,ttsModel:$('#openAITTSModel').value,voice:state.voice,customVoiceId:$('#openAICustomVoice').value.trim()})});
      const result=await jsonRequest('/api/settings/openai/test',{method:'POST',body:'{}'});msg.textContent=result.message||'OpenAI connection verified.';await refreshStatus();
    }catch(error){msg.textContent=error.message;}
  }

  async function clearSettings(){
    try{await jsonRequest('/api/settings/openai',{method:'POST',body:JSON.stringify({clear:true})});state.configured=false;state.source=null;stopSpeaking();setProviderStatus();$('#openAISettingsMessage').textContent='Session key cleared. Ayanda remains available in text mode.';notify('OpenAI session key cleared.','warning');}catch(error){$('#openAISettingsMessage').textContent=error.message;}
  }

  function enhance(){
    try{window.speechSynthesis?.cancel?.();}catch{}
    injectSettingsDialog();renderVoicePicker();setTimeout(refreshStatus,100);
    $('#languageSelect')?.addEventListener('change',()=>setProviderStatus());
    $('#agentLauncher')?.addEventListener('click',()=>refreshStatus());
    $('#sidebarAgentButton')?.addEventListener('click',()=>refreshStatus());
  }

  window.AyandaVoice={speak,stopSpeaking,isConfigured,refreshStatus,previewVoice,getSelectedVoice:()=>state.voice};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
