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
 * Card search — filters already-rendered cards. No index to build, no
 * network request, and with JavaScript off the cards simply all show.
 *
 * Runs over every [data-search-target] on the page, so the blogs grid and
 * the casebook grid share one implementation. A grid can also carry a
 * [data-region-filter] dropdown; the two conditions are combined, and the
 * status line reports the result of both together.
 * ------------------------------------------------------------------ */
(function initCardSearch() {
  document.querySelectorAll('[data-search-target]').forEach(function (input) {
    var grid = document.querySelector(input.getAttribute('data-search-target'));
    if (!grid) return;

    var wrap   = input.closest('.blog-search') || document;
    var status = wrap.querySelector('.blog-search-status');
    var region = document.querySelector('[data-region-filter="' + input.getAttribute('data-search-target') + '"]');
    var noun   = input.getAttribute('data-search-noun') || 'blog';
    var plural = noun === 'case study' ? 'case studies' : noun + 's';
    var cards  = Array.prototype.slice.call(grid.querySelectorAll('[data-search]'));

    function apply() {
      var q = input.value.trim().toLowerCase();
      var r = region ? region.value : '';
      var shown = 0;

      cards.forEach(function (card) {
        var textHit   = !q || card.getAttribute('data-search').toLowerCase().indexOf(q) !== -1;
        var regionHit = !r || card.getAttribute('data-region') === r;
        var hit = textHit && regionHit;
        card.hidden = !hit;
        if (hit) shown++;
      });

      if (!status) return;
      if (!q && !r) { status.textContent = ''; return; }

      // Describe whichever filters are actually on, so the line reads as a
      // sentence rather than as a list of empty slots.
      var where = '';
      if (r && region) where = ' in ' + region.options[region.selectedIndex].text;
      var matching = q ? ' matching \u201C' + input.value.trim() + '\u201D' : '';

      status.textContent = shown === 0
        ? 'No ' + plural + matching + where + '.'
        : shown + ' ' + (shown === 1 ? noun : plural) + matching + where + '.';
    }

    input.addEventListener('input', apply);
    input.addEventListener('search', apply);
    if (region) region.addEventListener('change', apply);
  });
})();

/* ------------------------------------------------------------------ *
 * Contributor form — live word counts, friendly validation, and a
 * submission that keeps the reader on the page.
 * ------------------------------------------------------------------ */
(function initSubmissionForms() {
  [
    { form: 'contribute-form', error: 'form-error',     success: 'contribute-success',
      button: 'submit-btn',          endpoint: '/api/submit',
      hide: ['contribute-intro', 'contribute-steps'], files: ['photo', 'image'] },
    { form: 'casebook-form',   error: 'casebook-error', success: 'casebook-success',
      button: 'casebook-submit-btn', endpoint: '/api/submit-casebook',
      hide: ['casebook-intro', 'casebook-steps'],     files: ['image'] },
  ].forEach(setup);

  function setup(cfg) {
    var form = document.getElementById(cfg.form);
    if (!form) return;

    var errorBox = document.getElementById(cfg.error);
    var success  = document.getElementById(cfg.success);
    var button   = document.getElementById(cfg.button);
    var buttonLabel = button ? button.textContent : 'Send for review';

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
          if (f.type === 'checkbox') {
            return fail('Please confirm you are happy for us to publish this.', f);
          }
          var label = form.querySelector('label[for="' + f.id + '"]').textContent.replace('*', '').trim();
          // A dropdown is chosen from, not filled in.
          var verb = f.tagName === 'SELECT' ? 'Please choose a ' : 'Please fill in “';
          return fail(f.tagName === 'SELECT'
            ? verb + label.toLowerCase() + '.'
            : verb + label + '”.', f);
        }
        if (f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value.trim())) {
          return fail('That email address does not look right.', f);
        }
      }

      // Every field that advertises a word limit is checked the same way. The
      // silent character caps need no check here — maxlength already stopped them.
      var capped = form.querySelectorAll('[data-wordlimit]');
      for (var k = 0; k < capped.length; k++) {
        var c = capped[k];
        var limit = parseInt(c.getAttribute('data-wordlimit'), 10);
        if (limit && words(c.value) > limit) {
          var name = form.querySelector('label[for="' + c.id + '"]').textContent.replace('*', '').trim();
          return fail('“' + name + '” is over ' + limit + ' words — please trim it a little.', c);
        }
      }

      for (var j = 0; j < cfg.files.length; j++) {
        var file = document.getElementById(cfg.files[j]);
        if (file && file.files[0] && file.files[0].size > 5 * 1024 * 1024) {
          return fail('“' + file.files[0].name + '” is larger than 5MB. Please use a smaller image.', file);
        }
      }

      button.setAttribute('aria-busy', 'true');
      button.textContent = 'Sending…';

      fetch(cfg.endpoint, { method: 'POST', body: new FormData(form) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d && res.d.error ? res.d.error : 'Submission failed');
          form.hidden = true;
          // Once it is sent, the page is just the thank-you: the page heading and
          // the "what happens next" steps have both served their purpose.
          cfg.hide.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.hidden = true;
          });
          success.hidden = false;
          window.scrollTo(0, 0);
        })
        .catch(function (err) {
          button.removeAttribute('aria-busy');
          button.textContent = buttonLabel;
          fail('Sorry — we could not send that just now (' + err.message + '). Please try again, or email the team.');
        });
    });
  }
})();
