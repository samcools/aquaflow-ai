/* Keeps the first AquaFlow AI visual identity while using one transparent Pyrneo logo. */
'use strict';
(() => {
  const home = () => {
    const app = document.getElementById('appView');
    if (app && !app.hidden && typeof showSection === 'function') {
      showSection('command');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = '/';
    }
  };

  function bindHomeLogo(img) {
    img.src = '/pyrneo-logo-white.svg';
    img.style.background = 'transparent';
    img.style.cursor = 'pointer';
    img.setAttribute('role', 'button');
    img.setAttribute('tabindex', '0');
    img.setAttribute('title', 'Go to AquaFlow home');
    img.setAttribute('aria-label', 'Pyrneo — go to AquaFlow home');
    if (img.dataset.homeBound) return;
    img.dataset.homeBound = 'true';
    img.addEventListener('click', home);
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        home();
      }
    });
  }

  function apply() {
    document.querySelectorAll('.pyrneo-logo').forEach(bindHomeLogo);

    document.querySelectorAll('.login-aquaflow-logo,.aquaflow-brandmark').forEach(node => node.remove());
    document.querySelectorAll('.aqua-symbol').forEach(node => node.remove());

    const brand = document.querySelector('.aquaflow-name');
    if (brand) brand.innerHTML = '<div><strong>AquaFlow AI</strong><span>Municipal Water Recovery</span></div>';

    const product = document.querySelector('.product-lockup');
    if (product) {
      const copy = product.querySelector('div');
      if (copy) copy.innerHTML = '<p class="eyebrow">MUNICIPAL INTELLIGENCE</p><h1 id="loginTitle">AquaFlow AI</h1>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once:true });
  else apply();
})();