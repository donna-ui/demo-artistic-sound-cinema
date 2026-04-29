    // ============================================================
    // TOUCH detect (drives Tap-to-Calibrate + dock visibility)
    // ============================================================
    (function () {
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (isTouch || window.innerWidth <= 1024) document.body.classList.add('touch');
    })();

    // ============================================================
    // CALIBRATION ENGINE — real device readout on load
    // ============================================================
    (function () {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const w = window.innerWidth, h = window.innerHeight;
      const ar = w / h;
      let aspect = '1:1';
      if (ar >= 2.3) aspect = '21:9';
      else if (ar >= 1.7) aspect = '16:9';
      else if (ar >= 1.5) aspect = '3:2';
      else if (ar >= 1.3) aspect = '4:3';
      else if (ar < 0.85) aspect = '9:16';

      const dpi = Math.round((window.devicePixelRatio || 1) * 96);
      const cd = (window.screen && window.screen.colorDepth) || 24;
      const refresh = (window.screen && window.screen.refreshRate) ? Math.round(window.screen.refreshRate) : 60;
      const t = new Date();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'PST';
      const tzShort = tz.split('/').pop().toUpperCase();
      const time = t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' ' + tzShort;

      const cb = (window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'sRGB · DARK' : 'sRGB';
      const colorStr = cd + '-bit · ' + cb;

      const lines = [
        { txt: '> CALIBRATING REFERENCE ROOM',          cls: '' },
        { txt: '> ROOM:    ' + w + ' × ' + h + ' / ' + aspect, cls: 'ok' },
        { txt: '> COLOR:   ' + colorStr,                 cls: 'ok' },
        { txt: '> REFRESH: ' + refresh + ' Hz',          cls: 'ok' },
        { txt: '> AMBIENT: ' + time,                     cls: 'ok' },
        { txt: '> DPR:     ' + (window.devicePixelRatio || 1).toFixed(2), cls: 'ok' },
        { txt: '> READY.',                                cls: 'ready' }
      ];

      // Hero spec values — only set if the legacy spec band exists on the page
      const setSpec = function (id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setSpec('specAspect', aspect);
      setSpec('specColor', cd + '-bit · sRGB');
      setSpec('specRefresh', refresh + ' Hz');
      setSpec('specTime', time);
      setSpec('heroSpecLive', w + '×' + h + ' / ' + refresh + 'Hz');

      const out = document.getElementById('calReadout');
      const overlay = document.getElementById('calibration');
      const main = document.getElementById('main');

      if (reduced) {
        out.textContent = lines.map(l => l.txt).join('\n');
        overlay.classList.add('done');
        main.classList.add('revealed');
        showDock();
        return;
      }

      let li = 0, ci = 0, buffer = '';
      const cursor = '<span class="cal-cursor"></span>';
      function tick() {
        if (li >= lines.length) {
          setTimeout(() => {
            overlay.classList.add('done');
            main.classList.add('revealed');
            showDock();
          }, 320);
          return;
        }
        const cur = lines[li];
        if (ci <= cur.txt.length) {
          const wrapStart = cur.cls ? '<span class="' + cur.cls + '">' : '';
          const wrapEnd = cur.cls ? '</span>' : '';
          const renderedLines = lines.slice(0, li).map(l => {
            return l.cls ? '<span class="' + l.cls + '">' + l.txt + '</span>' : l.txt;
          }).join('\n');
          const partial = wrapStart + cur.txt.slice(0, ci) + wrapEnd;
          out.innerHTML = renderedLines + (li > 0 ? '\n' : '') + partial + cursor;
          ci++;
          setTimeout(tick, li === 0 ? 22 : 14);
        } else {
          li++; ci = 0;
          setTimeout(tick, 90);
        }
      }
      function showDock() {
        const dock = document.getElementById('mdock');
        if (dock) setTimeout(() => dock.classList.add('visible'), 600);
        if (document.body.classList.contains('touch') && navigator.vibrate) {
          setTimeout(() => navigator.vibrate([12, 80, 12]), 720);
        }
        // hero video starts AFTER calibration sequence completes
        if (window.__startHeroVideo) setTimeout(window.__startHeroVideo, 280);
      }

      // Hide tap button + prompt — calibration auto-runs with countdown
      const tap = document.getElementById('calTap');
      const prompt = document.querySelector('.cal-prompt');
      if (tap) tap.style.display = 'none';
      if (prompt) prompt.style.display = 'none';

      // Film-leader countdown: 3, 2, 1 — then run the typed sequence
      const countNode = document.createElement('div');
      countNode.className = 'cal-count';
      out.parentNode.insertBefore(countNode, out);

      function step(n) {
        if (n === 0) {
          countNode.style.opacity = '0';
          setTimeout(() => { countNode.remove(); tick(); }, 220);
          return;
        }
        countNode.textContent = String(n);
        countNode.style.animation = 'none';
        // restart the per-tick animation
        void countNode.offsetWidth;
        countNode.style.animation = 'calCount 0.7s ease-out forwards';
        setTimeout(() => step(n - 1), 700);
      }
      setTimeout(() => step(3), 380);
    })();

    // ============================================================
    // HERO VIDEO — starts AFTER calibration sequence; plays at 0.4× speed
    // ============================================================
    (function () {
      const v = document.getElementById('heroVideo');
      if (!v) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      const RATE = 0.4; // way slow — meditative dolly

      window.__startHeroVideo = function () {
        const src = v.querySelector('source[data-src]');
        if (!src || src.src) return;
        src.src = src.dataset.src;
        v.load();
        v.playbackRate = RATE;
        const p = v.play();
        if (p && typeof p.then === 'function') {
          p.then(() => { v.playbackRate = RATE; }).catch(() => {});
        }
        // some browsers reset rate after metadata loads
        v.addEventListener('loadeddata', () => { v.playbackRate = RATE; }, { once: true });
        v.addEventListener('playing', () => { v.playbackRate = RATE; }, { once: true });
      };
    })();

    // ============================================================
    // NAV scroll state
    // ============================================================
    (function () {
      const nav = document.getElementById('nav');
      let last = 0;
      function onScroll() {
        const y = window.scrollY;
        if (y > 30) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
        last = y;
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    })();

    // cursor spotlight removed in 9.0 perf pass

    // ============================================================
    // REFERENCE ROOM sticky-scroll layer reveal
    // ============================================================
    (function () {
      const steps = document.querySelectorAll('.ref-step');
      const layers = document.querySelectorAll('.svg-layer');
      if (!steps.length) return;

      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = parseInt(entry.target.dataset.layer, 10);
          steps.forEach((s) => s.classList.remove('active'));
          entry.target.classList.add('active');
          // Accumulate layers up to this index. Newly-activating layers get
          // a brief "flash" class so the reveal reads as a deliberate light-up.
          layers.forEach((l, i) => {
            const wasOn = l.classList.contains('on');
            if (i <= idx) {
              l.classList.add('on');
              if (!wasOn && i > 0) {
                l.classList.remove('flash');
                void l.offsetWidth;
                l.classList.add('flash');
              }
            } else {
              l.classList.remove('on', 'flash');
            }
          });
        });
      }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
      steps.forEach((s) => io.observe(s));
    })();

    // ============================================================
    // CERTIFICATIONS — production-logo cascade
    // ============================================================
    (function () {
      const row = document.getElementById('certRow');
      if (!row) return;
      const certs = row.querySelectorAll('.cert');
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            certs.forEach((c, i) => {
              setTimeout(() => c.classList.add('in'), i * 380);
            });
            io.disconnect();
          }
        });
      }, { threshold: 0.3 });
      io.observe(row);
    })();

    // ============================================================
    // FEATURED INSTALLS — only verifiable Houzz portfolio entries
    // ============================================================
    (function () {
      const tbody = document.getElementById('ledgerBody');
      if (!tbody) return;
      // Sourced from Jeff's Houzz portfolio — the named, public ones.
      const rooms = [
        { loc: 'MANHATTAN BEACH, CA', spec: 'Home Media Center',                 tag: 'A/V'     },
        { loc: 'TUSTIN, CA',          spec: 'Contemporary Landscape Speaker System', tag: 'OUTDOOR' },
        { loc: 'LAGUNA HILLS, CA',    spec: 'Whole-house automation',             tag: 'CONTROL' },
        { loc: 'RANCHO CUCAMONGA, CA',spec: 'Custom installation',                tag: 'A/V'     }
      ];
      let html = '';
      let mhtml = '';
      rooms.forEach((r) => {
        html += '<tr>';
        html += '<td class="col-yr">&mdash;</td>';
        html += '<td class="col-loc">' + r.loc + '</td>';
        html += '<td class="col-spec">' + r.spec + '</td>';
        html += '<td class="col-tag">' + r.tag + '</td>';
        html += '</tr>';

        mhtml += '<div class="lm-card">';
        mhtml += '<span class="lm-tag">' + r.tag + '</span>';
        mhtml += '<span class="lm-loc">' + r.loc.split(',')[0] + '</span>';
        mhtml += '<span class="lm-spec">' + r.spec + '</span>';
        mhtml += '</div>';
      });
      tbody.innerHTML = html;
      const mob = document.getElementById('ledgerMobile');
      if (mob) mob.innerHTML = mhtml;
    })();

    // ============================================================
    // PAGE-LEVEL LETTERBOX PROGRESSION + FEATURE PRESENTATION
    // ============================================================
    (function () {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;
      const isMobile = window.innerWidth <= 1024;
      const peak = isMobile ? 4.5 : 9;     // mobile: thinner cinema bars

      const card = document.getElementById('featureCard');
      let cardFired = false;

      function onScroll() {
        const sh = document.documentElement.scrollHeight - window.innerHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / sh));
        let lb = 0;
        if (p < 0.15) lb = 0;
        else if (p < 0.65) lb = ((p - 0.15) / 0.5) * peak;
        else if (p < 0.78) lb = peak;
        else if (p < 0.92) lb = peak - ((p - 0.78) / 0.14) * (peak * 0.66);
        else lb = peak * 0.33;
        document.documentElement.style.setProperty('--letterbox', lb.toFixed(2) + 'vh');

        if (!cardFired && p > 0.60 && p < 0.66) {
          cardFired = true;
          card.classList.add('visible');
          setTimeout(() => card.classList.remove('visible'), 1100);
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    })();

    // mobile reference-room pager removed in 9.0 cleanup (desktop ref-room responsive)

    // ============================================================
    // MOBILE BOTTOM DOCK — vibration on tap
    // ============================================================
    (function () {
      const dock = document.getElementById('mdock');
      if (!dock) return;
      dock.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        const v = parseInt(a.dataset.vib || '0', 10);
        if (v && navigator.vibrate) navigator.vibrate(v === 2 ? [20, 40, 20] : 25);
      });
    })();

    // ============================================================
    // AUDIO — opt-in reference tone (A 440Hz)
    // ============================================================
    (function () {
      const btn = document.getElementById('toneBtn');
      const phone = document.getElementById('phoneNumber');
      if (!btn) return;
      let ctx = null;

      function ensureCtx() {
        if (!ctx) {
          const C = window.AudioContext || window.webkitAudioContext;
          if (!C) return null;
          ctx = new C();
        }
        return ctx;
      }
      function tone(freq, dur, type) {
        const a = ensureCtx(); if (!a) return;
        if (a.state === 'suspended') a.resume();
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = type || 'sine';
        o.frequency.value = freq;
        g.gain.value = 0;
        o.connect(g); g.connect(a.destination);
        const now = a.currentTime;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.10, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.start(now);
        o.stop(now + dur + 0.02);
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        tone(440, 1.6, 'sine');
        btn.querySelector('.tone-dot').style.boxShadow = '0 0 24px var(--cyan)';
        setTimeout(() => { btn.querySelector('.tone-dot').style.boxShadow = ''; }, 1700);
      });
      phone.addEventListener('mouseenter', () => { tone(523.25, 0.45, 'sine'); }); // C5
    })();

    // ============================================================
    // FORM mono note — live field counter
    // ============================================================
    (function () {
      const form = document.querySelector('.form');
      const note = document.getElementById('formNote');
      if (!form || !note) return;
      const fields = form.querySelectorAll('input, select, textarea');
      function update() {
        let filled = 0;
        fields.forEach(f => {
          if (f.tagName === 'SELECT') { if (f.selectedIndex > 0) filled++; }
          else if (f.value && f.value.trim().length > 0) filled++;
        });
        note.textContent = '// PRE-CALIBRATION · ' + String(filled).padStart(2,'0') + ' OF ' + String(fields.length).padStart(2,'0') + ' FIELDS · NO PHONE TREE';
      }
      fields.forEach(f => {
        f.addEventListener('input', update);
        f.addEventListener('change', update);
      });
    })();
