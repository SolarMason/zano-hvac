/* ============================================================
   ZANO HVAC PWA — App JavaScript
   ============================================================ */
(() => {
  'use strict';

  /* ----------------------------------------------------------
     1. Service Worker registration (PWA core)
     ---------------------------------------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[ZANO] Service worker registered:', reg.scope))
        .catch(err => console.warn('[ZANO] Service worker registration failed:', err));
    });
  }

  /* ----------------------------------------------------------
     2. Install prompt (Android/Chrome) and iOS A2HS hint
     ---------------------------------------------------------- */
  let deferredInstallEvent = null;
  const installPrompt = document.getElementById('installPrompt');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallEvent = e;
    if (installPrompt && !sessionStorage.getItem('zano-install-dismissed')) {
      installPrompt.classList.add('show');
    }
  });

  // Show iOS-specific A2HS hint (since iOS doesn't fire beforeinstallprompt)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                     || window.navigator.standalone === true;

  if (isIOS && !isStandalone && installPrompt && !sessionStorage.getItem('zano-install-dismissed')) {
    setTimeout(() => {
      installPrompt.classList.add('show');
      const installBtn = installPrompt.querySelector('[data-install]');
      const installText = installPrompt.querySelector('.text span');
      if (installBtn) installBtn.textContent = 'Show Me How';
      if (installText) installText.textContent = 'Tap Share, then "Add to Home Screen"';
    }, 1500);
  }

  if (installPrompt) {
    const installBtn = installPrompt.querySelector('[data-install]');
    const cancelBtn  = installPrompt.querySelector('[data-cancel]');
    const closeBtn   = installPrompt.querySelector('.close');

    installBtn?.addEventListener('click', async () => {
      if (deferredInstallEvent) {
        deferredInstallEvent.prompt();
        const choice = await deferredInstallEvent.userChoice;
        deferredInstallEvent = null;
        installPrompt.classList.remove('show');
        if (choice.outcome === 'accepted') showToast('Installed! Find ZANO on your home screen.');
      } else if (isIOS) {
        showToast('Tap the Share icon below, then "Add to Home Screen"', 4000);
      }
    });

    [cancelBtn, closeBtn].forEach(btn => btn?.addEventListener('click', () => {
      installPrompt.classList.remove('show');
      sessionStorage.setItem('zano-install-dismissed', '1');
    }));
  }

  /* ----------------------------------------------------------
     3. Connection status (PWA offline awareness)
     ---------------------------------------------------------- */
  function updateConnectionStatus() {
    if (!navigator.onLine) {
      showToast('You are offline. Cached pages still available.');
    }
  }
  window.addEventListener('online',  () => showToast('Back online ✓'));
  window.addEventListener('offline', () => showToast('You are offline'));

  /* ----------------------------------------------------------
     4. Toast helper
     ---------------------------------------------------------- */
  function showToast(message, duration = 2600) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  }
  window.zanoToast = showToast;

  /* ----------------------------------------------------------
     5. Active link highlighting
     ---------------------------------------------------------- */
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const filename = path.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-route]').forEach(el => {
    const route = el.getAttribute('data-route');
    if (
      (route === '/' && (path === '/' || filename === 'index.html')) ||
      (route !== '/' && (path.endsWith(route) || filename === route.replace(/^\//, '')))
    ) {
      el.classList.add('active');
    }
  });

  /* ----------------------------------------------------------
     6. Native share (uses Web Share API when available)
     ---------------------------------------------------------- */
  document.addEventListener('click', async (e) => {
    const shareBtn = e.target.closest('[data-share]');
    if (!shareBtn) return;
    e.preventDefault();
    const shareData = {
      title: shareBtn.dataset.shareTitle || document.title,
      text:  shareBtn.dataset.shareText  || 'Trusted HVAC/R & Plumbing in the Tristate area.',
      url:   shareBtn.dataset.shareUrl   || location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        showToast('Link copied to clipboard');
      } catch {
        showToast('Unable to share');
      }
    }
  });

  /* ----------------------------------------------------------
     7. Tel/email tap haptic feedback (where supported)
     ---------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (link && 'vibrate' in navigator) navigator.vibrate(8);
  });

  /* ----------------------------------------------------------
     8. Form handling — saves to localStorage and shows confirmation
     (No external dependencies; can be wired to a backend later)
     ---------------------------------------------------------- */
  document.querySelectorAll('form[data-zano-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formName = form.dataset.zanoForm;
      const data = Object.fromEntries(new FormData(form).entries());
      data._submittedAt = new Date().toISOString();
      data._formName = formName;

      // Persist to localStorage queue (so it survives even when offline)
      try {
        const queue = JSON.parse(localStorage.getItem('zano-form-queue') || '[]');
        queue.push(data);
        localStorage.setItem('zano-form-queue', JSON.stringify(queue));
      } catch (err) { console.warn('Queue save failed', err); }

      const success = form.querySelector('.form-success');
      const error   = form.querySelector('.form-error');
      success?.classList.add('show');
      error?.classList.remove('show');
      form.reset();
      showToast('Request received — we will be in touch.');
      setTimeout(() => success?.classList.remove('show'), 6000);
      
      // Try to register a background sync if supported
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
          reg.sync.register('zano-form-sync').catch(() => {});
        });
      }
    });
  });

  /* ----------------------------------------------------------
     9. Save and replay form queue when back online (best-effort)
     ---------------------------------------------------------- */
  window.zanoFlushQueue = function() {
    const queue = JSON.parse(localStorage.getItem('zano-form-queue') || '[]');
    return queue;
  };

  /* ----------------------------------------------------------
     10. Year stamping
     ---------------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  /* ----------------------------------------------------------
     11. Lazy-load images that have data-src
     ---------------------------------------------------------- */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
  }

  /* ----------------------------------------------------------
     12. Pull-to-refresh hint (visual only on supported browsers)
     ---------------------------------------------------------- */
  document.documentElement.style.overscrollBehaviorY = 'contain';

  /* ----------------------------------------------------------
     13. Cookie banner (shown once)
     ---------------------------------------------------------- */
  if (!localStorage.getItem('zano-cookie-ok')) {
    setTimeout(() => {
      const banner = document.getElementById('cookieBanner');
      if (banner) banner.classList.add('show');
    }, 1200);
  }
  document.querySelectorAll('[data-cookie-accept]').forEach(btn =>
    btn.addEventListener('click', () => {
      localStorage.setItem('zano-cookie-ok', '1');
      document.getElementById('cookieBanner')?.classList.remove('show');
    })
  );

  console.log('[ZANO] App ready · ' + (isStandalone ? 'standalone' : 'browser') + ' mode');
})();
