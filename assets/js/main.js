/* ==========================================================================
   Healthier UK — site behaviour
   Nav, splash + leaf scatter, scroll reveal, gallery lightbox, forms
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- Header */
  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = document.querySelector('.mobile-menu-toggle');
    var drawer = document.querySelector('.mobile-nav-drawer');
    if (toggle && drawer) {
      toggle.addEventListener('click', function () {
        var open = drawer.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    document.querySelectorAll('.mobile-submenu-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parent = btn.closest('.mobile-nav-item');
        var sub = parent && parent.querySelector('.mobile-submenu');
        if (!sub) return;
        var open = sub.classList.toggle('open');
        btn.textContent = open ? '–' : '+';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    // Close the drawer when the viewport grows past the desktop breakpoint
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1080 && drawer && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------------------------------------------------------- Splash */
  function initSplash() {
    var splash = document.getElementById('splash');
    if (!splash) return;

    var shown = false;
    try { shown = sessionStorage.getItem('huSplashSeen') === '1'; } catch (e) { /* private mode */ }

    if (shown) {
      splash.parentNode.removeChild(splash);
      document.body.classList.remove('splash-locked');
      return;
    }

    document.body.classList.add('splash-locked');
    splash.classList.add('is-open');

    // Stagger the petals settling in
    var petals = Array.prototype.slice.call(splash.querySelectorAll('.hu-petal'));
    petals.forEach(function (p, i) {
      p.style.animationDelay = (0.05 + i * 0.028).toFixed(3) + 's';
    });

    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem('huSplashSeen', '1'); } catch (e) {}
      document.body.classList.remove('splash-locked');
      document.body.classList.add('revealing');
      splash.classList.add('is-gone');
      window.setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
        document.body.classList.remove('revealing');
      }, 1100);
    }

    function scatter() {
      if (finished || splash.classList.contains('is-scattering')) return;

      if (reduceMotion) { finish(); return; }

      splash.classList.add('is-scattering');

      var stage = splash.querySelector('.splash-stage');
      var box = stage ? stage.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
      var cx = box.left + box.width / 2;
      var cy = box.top + box.height * 0.42;
      var reach = Math.max(window.innerWidth, window.innerHeight) * 0.95;

      petals.forEach(function (petal, i) {
        var r = petal.getBoundingClientRect();
        var px = r.left + r.width / 2;
        var py = r.top + r.height / 2;

        var dx = px - cx;
        var dy = py - cy;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;

        // Fly outward along the radius, with a little wind and lift
        var wobble = (i % 5 - 2) * 0.16;
        var ux = dx / len + wobble * 0.5;
        var uy = dy / len - 0.28;               // bias upward, like leaves catching air
        var ulen = Math.sqrt(ux * ux + uy * uy) || 1;

        var dist = reach * (0.55 + ((i * 37) % 40) / 100);
        var tx = (ux / ulen) * dist;
        var ty = (uy / ulen) * dist;
        var rot = (i % 2 ? 1 : -1) * (120 + ((i * 53) % 220));
        var delay = (i % 8) * 0.055 + Math.random() * 0.12;

        petal.style.transitionDelay = delay.toFixed(3) + 's, ' + (delay + 0.75).toFixed(3) + 's';
        // Next frame so the transition is registered before the transform lands
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            petal.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) rotate(' + rot + 'deg) scale(.6)';
            petal.classList.add('gone');
          });
        });
      });

      window.setTimeout(function () { splash.classList.add('is-lifting'); }, 900);
      window.setTimeout(finish, 2150);
    }

    var enterBtn = splash.querySelector('.splash-enter');
    var skipBtn = splash.querySelector('.splash-skip');
    if (enterBtn) enterBtn.addEventListener('click', scatter);
    if (skipBtn) skipBtn.addEventListener('click', finish);

    splash.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') finish();
      if (e.key === 'Enter' && document.activeElement === splash) scatter();
    });

    if (enterBtn) window.setTimeout(function () { enterBtn.focus({ preventScroll: true }); }, 700);
  }

  /* --------------------------------------------------------- Scroll reveal */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  /* -------------------------------------------------------------- Marquee */
  function initMarquee() {
    document.querySelectorAll('.marquee-track').forEach(function (track) {
      if (track.dataset.cloned === '1') return;
      track.innerHTML += track.innerHTML;   // duplicate for a seamless -50% loop
      track.dataset.cloned = '1';
    });
  }

  /* ------------------------------------------------------------- Lightbox */
  function initLightbox() {
    var items = document.querySelectorAll('.gallery-item img');
    if (!items.length) return;

    var modal = document.createElement('div');
    modal.className = 'lightbox-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<button class="lightbox-close" aria-label="Close image">&times;</button>' +
      '<img class="lightbox-content" alt="">';
    document.body.appendChild(modal);

    var img = modal.querySelector('.lightbox-content');
    var closeBtn = modal.querySelector('.lightbox-close');

    function open(src, alt) {
      img.src = src;
      img.alt = alt || '';
      modal.classList.add('open');
      closeBtn.focus();
    }
    function close() { modal.classList.remove('open'); }

    items.forEach(function (thumb) {
      thumb.parentElement.setAttribute('role', 'button');
      thumb.parentElement.setAttribute('tabindex', '0');
      thumb.parentElement.addEventListener('click', function () { open(thumb.src, thumb.alt); });
      thumb.parentElement.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(thumb.src, thumb.alt); }
      });
    });

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ----------------------------------------------------------------- Toast */
  function toast(message) {
    var el = document.createElement('div');
    el.className = 'toast-notice';
    el.setAttribute('role', 'status');
    el.textContent = message;
    document.body.appendChild(el);
    window.requestAnimationFrame(function () { el.classList.add('show'); });
    window.setTimeout(function () {
      el.classList.remove('show');
      window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, 4200);
  }

  /* ----------------------------------------------------------------- Forms */
  function initForms() {
    document.querySelectorAll('form[data-ajax="true"]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var isNewsletter = form.classList.contains('newsletter-form');
        toast(isNewsletter
          ? 'Thanks for signing up — we’ll be in touch.'
          : 'Thanks for getting in touch — we’ll reply soon.');
        form.reset();
      });
    });
  }

  /* ------------------------------------------------------------------ Boot */
  function boot() {
    initHeader();
    initSplash();
    initReveal();
    initMarquee();
    initLightbox();
    initForms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
