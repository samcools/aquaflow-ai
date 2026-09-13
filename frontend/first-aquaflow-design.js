/* Keeps the first AquaFlow AI visual identity while using the supplied Pyrneo wordmark. */
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

  function makeBlackBackgroundTransparent(img) {
    if (!img || img.dataset.transparencyProcessed === 'true') return;
    if (!img.complete || !img.naturalWidth) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const p = frame.data;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i], g = p[i + 1], b = p[i + 2], a = p[i + 3];
        if (!a) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;
        if (max <= 3) {
          p[i + 3] = 0;
          continue;
        }
        if (max < 24 && chroma < 10) {
          p[i + 3] = Math.round(a * Math.max(0, Math.min(1, (max - 3) / 21)));
        }
      }
      ctx.putImageData(frame, 0, 0);
      img.dataset.transparencyProcessed = 'true';
      img.src = canvas.toDataURL('image/png');
    } catch {
      img.dataset.transparencyProcessed = 'fallback';
      img.style.mixBlendMode = 'screen';
    }
  }

  function bindHomeLogo(img) {
    img.dataset.transparencyProcessed = 'false';
    img.src = '/pyrneo-logo.webp';
    img.style.background = 'transparent';
    img.style.cursor = 'pointer';
    img.setAttribute('role', 'button');
    img.setAttribute('tabindex', '0');
    img.setAttribute('title', 'Go to AquaFlow home');
    img.setAttribute('aria-label', 'Pyrneo — go to AquaFlow home');
    const process = () => makeBlackBackgroundTransparent(img);
    img.addEventListener('load', process, { once:true });
    if (img.complete) queueMicrotask(process);
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