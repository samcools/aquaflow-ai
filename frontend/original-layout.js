/* AquaFlow original layout restoration.
 * Keeps the existing functional modules intact while restoring the approved
 * Project Guardian-style dashboard hierarchy and brand behavior. */
'use strict';

(() => {
  function byId(id){ return document.getElementById(id); }

  function installPyrneoBranding(){
    document.querySelectorAll('.pyrneo-logo').forEach((img) => {
      const isHeader = img.classList.contains('sidebar-logo');
      img.src = isHeader ? '/pyrneo-logo-white.svg' : '/pyrneo-logo.svg';
      img.style.background = 'transparent';
      img.style.cursor = 'pointer';
      img.setAttribute('role','button');
      img.setAttribute('tabindex','0');
      img.setAttribute('title','Go to AquaFlow home');
      const goHome = () => {
        const app = byId('appView');
        if (app && !app.hidden && typeof showSection === 'function') {
          showSection('command');
          window.scrollTo({ top:0, behavior:'smooth' });
        } else {
          window.location.href = '/';
        }
      };
      img.addEventListener('click', goHome);
      img.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goHome();
        }
      });
    });
  }

  function installOriginalLayoutState(){
    if (typeof showSection === 'function') {
      const baseShowSection = showSection;
      showSection = function(section){
        document.body.dataset.afSection = section;
        return baseShowSection(section);
      };
    }
    document.body.dataset.afSection = 'command';
  }

  function labelCommandCentre(){
    const brand = document.querySelector('.aquaflow-name');
    if (brand) {
      brand.innerHTML = '<div class="brand-copy"><strong>AquaFlow AI</strong><span>Municipal Water Recovery</span></div>';
    }
  }

  function addOriginalHeaderControls(){
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || sidebar.querySelector('.original-header-meta')) return;
    const meta = document.createElement('div');
    meta.className = 'original-header-meta';
    meta.innerHTML = '<span class="workspace-pill">DEMO WORKSPACE</span><span class="period-pill">Current Recovery View</span><span class="user-pill" aria-hidden="true">AD</span>';
    sidebar.appendChild(meta);
  }

  function enhanceCommandCards(){
    const command = byId('commandSection');
    if (!command) return;
    const focus = byId('managementFocus')?.closest('.panel');
    if (focus) {
      focus.classList.add('assurance-panel');
      const title = focus.querySelector('h2');
      if (title) title.textContent = 'Assurance & Management Controls';
      const eyebrow = focus.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = 'GOVERNANCE OVERVIEW';
    }
    const recovery = command.querySelector('.recovery-pulse-panel');
    if (recovery) {
      const heading = recovery.querySelector('h2');
      if (heading) heading.textContent = 'Recovery Activity';
      const eyebrow = recovery.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = 'PROGRAMME ACTIVITY';
    }
    const assistant = command.querySelector('.ayanda-spotlight');
    if (assistant) {
      const heading = assistant.querySelector('h2');
      if (heading) heading.textContent = 'AI Project Assistant';
    }
  }

  function install(){
    installPyrneoBranding();
    installOriginalLayoutState();
    labelCommandCentre();
    addOriginalHeaderControls();
    enhanceCommandCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
