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

/* ------------------------------------------------------------------ *
 * Blog search — filters the already-rendered cards. No index to build,
 * no network request, works with JavaScript off (the cards just show).
 * ------------------------------------------------------------------ */
(function initBlogSearch() {
  var input = document.querySelector('[data-search-target]');
  if (!input) return;
  var grid = document.querySelector(input.getAttribute('data-search-target'));
  var status = document.querySelector('.blog-search-status');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-search]'));

  function apply() {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var hit = !q || card.getAttribute('data-search').toLowerCase().indexOf(q) !== -1;
      card.hidden = !hit;
      if (hit) shown++;
    });
    if (!status) return;
    if (!q) status.textContent = '';
    else if (shown === 0) status.textContent = 'No blogs match “' + input.value.trim() + '”.';
    else status.textContent = shown + (shown === 1 ? ' blog' : ' blogs') + ' matching “' + input.value.trim() + '”.';
  }

  input.addEventListener('input', apply);
  input.addEventListener('search', apply);
})();

/* ------------------------------------------------------------------ *
 * Contributor form — live word counts, friendly validation, and a
 * submission that keeps the reader on the page.
 * ------------------------------------------------------------------ */
(function initContributeForm() {
  var form = document.getElementById('contribute-form');
  if (!form) return;

  var errorBox = document.getElementById('form-error');
  var success  = document.getElementById('contribute-success');
  var button   = document.getElementById('submit-btn');

  function words(s) { return s.trim() ? s.trim().split(/\s+/).length : 0; }

  Array.prototype.forEach.call(form.querySelectorAll('.wordcount'), function (out) {
    var field = document.getElementById(out.getAttribute('data-for'));
    if (!field) return;
    var limit = parseInt(field.getAttribute('data-wordlimit'), 10);
    var update = function () {
      var n = words(field.value);
      out.textContent = n;
      if (limit) out.parentNode.classList.toggle('over', n > limit);
    };
    field.addEventListener('input', update);
    update();
  });

  function fail(message, field) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    errorBox.scrollIntoView({ block: 'center' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) {
      el.removeAttribute('aria-invalid');
    });

    var required = form.querySelectorAll('[required]');
    for (var i = 0; i < required.length; i++) {
      var f = required[i];
      var empty = f.type === 'checkbox' ? !f.checked : !f.value.trim();
      if (empty) {
        return fail(f.type === 'checkbox'
          ? 'Please confirm you are happy for us to publish this.'
          : 'Please fill in “' + form.querySelector('label[for="' + f.id + '"]').textContent.replace('*', '').trim() + '”.', f);
      }
      if (f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value.trim())) {
        return fail('That email address does not look right.', f);
      }
    }

    var org = document.getElementById('orgDescription');
    if (org && words(org.value) > 250) {
      return fail('The organisation description is over 250 words — please trim it a little.', org);
    }

    for (var j = 0; j < 2; j++) {
      var file = [document.getElementById('photo'), document.getElementById('image')][j];
      if (file && file.files[0] && file.files[0].size > 5 * 1024 * 1024) {
        return fail('“' + file.files[0].name + '” is larger than 5MB. Please use a smaller image.', file);
      }
    }

    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Sending…';

    fetch('/api/submit', { method: 'POST', body: new FormData(form) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d && res.d.error ? res.d.error : 'Submission failed');
        form.hidden = true;
        success.hidden = false;
        success.scrollIntoView({ block: 'center' });
      })
      .catch(function (err) {
        button.removeAttribute('aria-busy');
        button.textContent = 'Send for review';
        fail('Sorry — we could not send that just now (' + err.message + '). Please try again, or email the team.');
      });
  });
})();
