/* Keeps the first AquaFlow AI visual identity while retaining later brand behavior. */
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

  function apply() {
    document.querySelectorAll('.pyrneo-logo').forEach((img) => {
      img.src = img.classList.contains('sidebar-logo') ? '/pyrneo-logo-white.svg' : '/pyrneo-logo.svg';
      img.style.background = 'transparent';
      img.style.cursor = 'pointer';
      img.setAttribute('role', 'button');
      img.setAttribute('tabindex', '0');
      img.setAttribute('title', 'Go to AquaFlow home');
      if (!img.dataset.homeBound) {
        img.dataset.homeBound = 'true';
        img.addEventListener('click', home);
        img.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            home();
          }
        });
      }
    });

    const brand = document.querySelector('.aquaflow-name');
    if (brand) {
      brand.innerHTML = '<span class="aqua-symbol small" aria-hidden="true">◉</span><div><strong>AquaFlow AI</strong><span>Municipal Water Recovery</span></div>';
    }

    const login = document.querySelector('.login-card');
    if (login && !login.querySelector('.login-aquaflow-logo')) {
      const product = login.querySelector('.product-lockup');
      product?.insertAdjacentHTML('beforebegin','<img src="/aquaflow-logo.svg" class="login-aquaflow-logo" alt="AquaFlow AI">');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once:true });
  else apply();
})();