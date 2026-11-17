/* Reale Revenue Systems: progressive enhancement. Pages work without this file. */
(function () {
  'use strict';
  var cfg = {};
  try { cfg = JSON.parse(document.getElementById('rrs-config').textContent || '{}'); } catch (e) { cfg = {}; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── Analytics event layer (D-015) ─────────────────────────────────────── */
  window.dataLayer = window.dataLayer || [];
  function track(event, props) {
    var payload = Object.assign({ event: event, page: location.pathname }, props || {});
    window.dataLayer.push(payload);
    if (typeof window.plausible === 'function') window.plausible(event, { props: props || {} });
  }
  window.rrsTrack = track;
  if (cfg.analytics && cfg.analytics.provider === 'plausible' && cfg.analytics.id) {
    var s = document.createElement('script');
    s.defer = true; s.src = 'https://plausible.io/js/script.js'; s.setAttribute('data-domain', cfg.analytics.id);
    window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
    document.head.appendChild(s);
  } else if (cfg.analytics && cfg.analytics.provider === 'ga4') {
    // GA4 needs a consent banner before loading. Not built yet (KNOWN-ISSUES), so it stays off.
    console.warn('[rrs] GA4 configured but consent banner not implemented; analytics not loaded.');
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-cta]');
    if (a) track('cta_click', { cta: a.getAttribute('data-cta'), href: a.getAttribute('href') || '' });
  });
  $$('details.faq__item').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) track('faq_open', { question: (d.querySelector('summary') || {}).textContent || '' }); });
  });

  /* ── Error monitoring (only if configured) ─────────────────────────────── */
  var errCount = 0;
  function reportError(msg, extra) {
    if (!cfg.errorEndpoint || errCount++ > 4) return;
    try { navigator.sendBeacon(cfg.errorEndpoint, JSON.stringify(Object.assign({ message: String(msg).slice(0, 500), page: location.pathname, ua: navigator.userAgent, at: new Date().toISOString() }, extra || {}))); } catch (e) { /* ignore */ }
  }
  window.addEventListener('error', function (e) { reportError(e.message, { source: e.filename, line: e.lineno }); });
  window.addEventListener('unhandledrejection', function (e) { reportError(e.reason && e.reason.message ? e.reason.message : 'unhandledrejection'); });

  /* ── Mobile navigation ─────────────────────────────────────────────────── */
  var header = $('[data-header]');
  var toggle = $('[data-menu-toggle]');
  function setNav(open) {
    if (!header || !toggle) return;
    if (open) { header.setAttribute('data-open', ''); header.style.setProperty('--nav-top', Math.max(0, header.getBoundingClientRect().bottom) + 'px'); } else header.removeAttribute('data-open');
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  }
  if (toggle) {
    toggle.addEventListener('click', function () { setNav(!header.hasAttribute('data-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && header.hasAttribute('data-open')) { setNav(false); toggle.focus(); } });
    $$('#site-nav a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) setNav(false); });
  }

  /* ── Attribution (first touch + current) ───────────────────────────────── */
  var params = new URLSearchParams(location.search);
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var attribution = {};
  try {
    var stored = JSON.parse(localStorage.getItem('rrs_attr') || 'null');
    if (!stored) {
      stored = { referrer: document.referrer || '', landing_page: location.pathname + location.search, first_touch_at: new Date().toISOString() };
      UTM.forEach(function (k) { if (params.get(k)) stored[k] = params.get(k).slice(0, 150); });
      localStorage.setItem('rrs_attr', JSON.stringify(stored));
    }
    attribution = stored;
  } catch (e) {
    attribution = { referrer: document.referrer || '', landing_page: location.pathname + location.search, first_touch_at: new Date().toISOString() };
  }
  UTM.forEach(function (k) { if (params.get(k)) attribution[k] = params.get(k).slice(0, 150); }); // current campaign wins

  function fillAttribution(form) {
    $$('[data-attr]', form).forEach(function (input) {
      var k = input.getAttribute('data-attr');
      if (attribution[k]) input.value = attribution[k];
    });
  }

  /* ── Validation helpers ────────────────────────────────────────────────── */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function errEl(form, name) { return form.querySelector('[data-error-for="' + name + '"]'); }
  function fieldEl(form, name) {
    var group = form.querySelector('.chips[data-field="' + name + '"]');
    return group || form.querySelector('[name="' + name + '"]');
  }
  function setError(form, name, msg) {
    var el = fieldEl(form, name); var er = errEl(form, name);
    if (el) {
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      if (er && er.id) el.setAttribute('aria-describedby', er.id);
    }
    if (er) { er.textContent = msg || ''; er.hidden = !msg; }
    return !msg;
  }
  function val(form, name) { var el = form.querySelector('[name="' + name + '"]'); return el ? String(el.value || '').trim() : ''; }
  function checked(form, name) { var el = form.querySelector('[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function checkedAll(form, name) { return $$('[name="' + name + '"]:checked', form).map(function (i) { return i.value; }); }
  function normalizeUrl(v) { if (!v) return ''; return /^https?:\/\//i.test(v) ? v : 'https://' + v; }
  function validUrl(v) { try { var u = new URL(normalizeUrl(v)); return /\./.test(u.hostname); } catch (e) { return false; } }
  function validPhone(v) { var d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 15; }

  var RULES = {
    business_name: function (f) { return val(f, 'business_name') ? '' : 'Enter your business name.'; },
    website: function (f) { var v = val(f, 'website'); return !v || validUrl(v) ? '' : 'Enter a valid website address, or leave it blank.'; },
    city: function (f) { var c = checked(f, 'city'); if (!c) return 'Choose your city.'; if (c === 'Other' && !val(f, 'city_other')) return 'Enter your city.'; return ''; },
    industry: function (f) { return checked(f, 'industry') ? '' : 'Choose your industry.'; },
    contact_name: function (f) { return val(f, 'contact_name') ? '' : 'Enter your name.'; },
    email: function (f) { return EMAIL.test(val(f, 'email')) ? '' : 'Enter a valid email address.'; },
    phone: function (f) {
      var v = val(f, 'phone'); var ch = checked(f, 'preferred_channel');
      if (v && !validPhone(v)) return 'Enter a valid phone number, or leave it blank.';
      if (!v && (ch === 'phone' || ch === 'text')) return 'Add a phone number so we can ' + (ch === 'text' ? 'text' : 'call') + ' you, or choose email.';
      return '';
    },
    consent_sms: function (f) { var c = f.querySelector('[name="consent_sms"]'); return checked(f, 'preferred_channel') === 'text' && c && !c.checked ? 'Tick the box so we’re allowed to text you, or choose another option.' : ''; },
    message: function (f) { return val(f, 'message') ? '' : 'Enter a message.'; },
    consent_contact: function (f) { var c = f.querySelector('[name="consent_contact"]'); return c && c.checked ? '' : 'Please confirm we may contact you about your request.'; },
  };
  function validate(form, names) {
    var firstBad = null;
    names.forEach(function (n) {
      var msg = RULES[n] ? RULES[n](form) : '';
      setError(form, n, msg);
      if (msg && !firstBad) firstBad = n;
    });
    if (firstBad) {
      var el = fieldEl(form, firstBad);
      var focusable = el && (el.matches('input,textarea') ? el : el.querySelector('input'));
      if (focusable) focusable.focus();
      return false;
    }
    return true;
  }

  function isSpam(form) {
    if (val(form, 'company_website')) return true; // honeypot
    var started = Number(new Date(val(form, 'form_started_at') || 0));
    return !started || Date.now() - started < 3000; // humans take longer than 3 s
  }

  function send(payload) {
    if (!cfg.formEndpoint) return Promise.resolve('preview');
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    return fetch(cfg.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error('HTTP ' + r.status); return 'sent'; });
  }

  function showDone(form, mode) {
    $$('.snap-step, .snap-progress, .snap-form__title, .contact-form > .field, .contact-form > .consent, .contact-form > button', form).forEach(function (el) { el.hidden = true; el.style.display = 'none'; });
    var done = form.querySelector('[data-done]');
    if (done) {
      done.hidden = false;
      var note = done.querySelector('[data-preview-note]');
      if (note) note.hidden = mode !== 'preview';
      done.focus();
    }
  }

  function startTracking(form, eventName) {
    form.addEventListener('focusin', function once() {
      var t = form.querySelector('[name="form_started_at"]');
      if (t && !t.value) t.value = new Date().toISOString();
      if (eventName) track(eventName, {});
      form.removeEventListener('focusin', once);
    });
  }

  /* ── Snapshot multi-step form ──────────────────────────────────────────── */
  var snap = $('[data-snapshot-form]');
  if (snap) {
    fillAttribution(snap);
    startTracking(snap, 'snapshot_start');
    var steps = $$('.snap-step', snap);
    var status = $('[data-step-status]', snap);
    var current = 0;
    var STEP_FIELDS = [['business_name', 'website', 'city', 'industry'], [], ['contact_name', 'email', 'phone', 'consent_sms', 'consent_contact']];

    function show(i, focus) {
      current = i;
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      $$('[data-progress]', snap).forEach(function (p, k) { p.classList.toggle('is-current', k === i); p.classList.toggle('is-done', k < i); });
      if (status) status.textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      if (focus) { var first = steps[i].querySelector('input:not([type=hidden]):not([tabindex="-1"]), button'); if (first) first.focus(); }
    }
    show(0, false);

    // Prefill from links (?industry=…, ?interest=…)
    var ind = params.get('industry');
    if (ind) { var r = snap.querySelector('[name="industry"][value="' + CSS.escape(ind) + '"]'); if (r) r.checked = true; }
    var interest = params.get('interest');
    var interestInput = snap.querySelector('[name="interest"]');
    if (interest && interestInput) interestInput.value = interest.slice(0, 80);

    snap.addEventListener('click', function (e) {
      if (e.target.closest('[data-next]')) {
        if (!validate(snap, STEP_FIELDS[current])) return;
        track('snapshot_step', { step: current + 2 });
        show(Math.min(current + 1, steps.length - 1), true);
      } else if (e.target.closest('[data-back]')) {
        show(Math.max(current - 1, 0), true);
      }
    });

    snap.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'city') { var other = snap.querySelector('[data-other-for="city"]'); if (other) { other.hidden = t.value !== 'Other'; if (!other.hidden) other.focus(); } }
      if (t.name === 'preferred_channel') { var sms = snap.querySelector('[data-sms-consent]'); if (sms) { sms.hidden = t.value !== 'text'; if (sms.hidden) sms.querySelector('input').checked = false; } }
      if (t.name && t.name.indexOf('self_') === 0) updateSelfCheck();
      if (RULES[t.name] && t.getAttribute('aria-invalid') !== null) setError(snap, t.name, RULES[t.name](snap));
      if (t.closest('.chips[aria-invalid]')) setError(snap, t.name, RULES[t.name] ? RULES[t.name](snap) : '');
    });

    function selfAnswers() {
      var out = {};
      $$('[data-selfcheck]', snap).forEach(function (g) {
        var id = g.getAttribute('data-selfcheck');
        var c = g.querySelector('input:checked');
        if (c) out[id] = c.value === 'not_verified' ? 'not_verified' : Number(c.value);
      });
      return out;
    }
    function updateSelfCheck() {
      var out = $('[data-selfcheck-out]', snap);
      var earned = 0, possible = 0, nv = 0;
      $$('[data-selfcheck]', snap).forEach(function (g) {
        var c = g.querySelector('input:checked'); if (!c) return;
        var pts = Number(g.getAttribute('data-points'));
        if (c.value === 'not_verified') { nv++; return; }
        possible += pts; earned += pts * Number(c.value);
      });
      if (!out) return;
      if (!possible && !nv) { out.textContent = 'Answer any of the questions to see your self-reported follow-up readiness.'; return; }
      var txt = possible ? 'Self-reported follow-up readiness: ' + (Math.round(earned * 10) / 10) + ' of ' + possible + ' points you answered' : 'No scored answers yet';
      if (nv) txt += ' · ' + nv + ' marked Not verified (not counted against you)';
      out.textContent = txt + '. We confirm everything else in your Snapshot.';
    }

    snap.addEventListener('submit', function (e) {
      e.preventDefault();
      var formErr = $('[data-form-error]', snap);
      if (formErr) formErr.hidden = true;
      for (var i = 0; i < STEP_FIELDS.length; i++) {
        if (!STEP_FIELDS[i].length) continue;
        var ok = STEP_FIELDS[i].every(function (n) { return !(RULES[n] && RULES[n](snap)); });
        if (!ok) { show(i, false); validate(snap, STEP_FIELDS[i]); return; }
      }
      if (isSpam(snap)) { showDone(snap, 'preview'); return; }
      var city = checked(snap, 'city');
      var payload = {
        form: 'snapshot_request',
        submitted_at: new Date().toISOString(),
        business_name: val(snap, 'business_name'),
        website: normalizeUrl(val(snap, 'website')) || undefined,
        city: city === 'Other' ? val(snap, 'city_other') : city,
        industry: checked(snap, 'industry'),
        interest: val(snap, 'interest') || undefined,
        concerns: checkedAll(snap, 'concerns'),
        self_check: selfAnswers(),
        contact_name: val(snap, 'contact_name'),
        email: val(snap, 'email'),
        phone: val(snap, 'phone') || undefined,
        preferred_channel: checked(snap, 'preferred_channel') || 'email',
        consent_contact: true,
        consent_sms: !!(snap.querySelector('[name="consent_sms"]') || {}).checked,
        consent_text: (snap.querySelector('[name="consent_contact"]').parentNode.textContent || '').trim(),
        attribution: attribution,
        form_started_at: val(snap, 'form_started_at') || undefined,
        company_website: val(snap, 'company_website'),
      };
      var btn = snap.querySelector('button[type=submit]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      send(payload).then(function (mode) {
        track('snapshot_submit', { industry: payload.industry, mode: mode });
        showDone(snap, mode);
      }).catch(function (err) {
        reportError('snapshot submit failed: ' + err.message);
        if (btn) { btn.disabled = false; btn.textContent = 'Send my Snapshot request'; }
        if (formErr) { formErr.textContent = 'We couldn’t send your request just now. Please try again in a moment.'; formErr.hidden = false; }
      });
    });
  }

  /* ── Contact form ──────────────────────────────────────────────────────── */
  var contact = $('[data-contact-form]');
  if (contact) {
    fillAttribution(contact);
    startTracking(contact, null);
    var topic = params.get('topic');
    if (topic) { var tr = contact.querySelector('[name="topic"][value="' + CSS.escape(topic) + '"]'); if (tr) tr.checked = true; }
    contact.addEventListener('submit', function (e) {
      e.preventDefault();
      var formErr = $('[data-form-error]', contact);
      if (formErr) formErr.hidden = true;
      if (!validate(contact, ['contact_name', 'email', 'phone', 'message', 'consent_contact'])) return;
      if (isSpam(contact)) { showDone(contact, 'preview'); return; }
      var payload = {
        form: 'contact', submitted_at: new Date().toISOString(), contact_name: val(contact, 'contact_name'), business_name: val(contact, 'business_name') || undefined,
        email: val(contact, 'email'), phone: val(contact, 'phone') || undefined, topic: checked(contact, 'topic') || 'general', message: val(contact, 'message').slice(0, 2000),
        consent_contact: true, consent_text: (contact.querySelector('[name="consent_contact"]').parentNode.textContent || '').trim(), attribution: attribution,
        form_started_at: val(contact, 'form_started_at') || undefined, company_website: val(contact, 'company_website'),
      };
      send(payload).then(function (mode) { track('contact_submit', { topic: payload.topic, mode: mode }); showDone(contact, mode); })
        .catch(function (err) { reportError('contact submit failed: ' + err.message); if (formErr) { formErr.textContent = 'We couldn’t send your message just now. Please try again in a moment.'; formErr.hidden = false; } });
    });
  }

  /* ── Hypothetical impact calculator (mirrors engine.impactScenarios) ───── */
  $$('[data-calculator]').forEach(function (calc) {
    var UPLIFTS = [0.05, 0.1, 0.2];
    function num(n, d, max) { var v = Number((calc.querySelector('[name="' + n + '"]') || {}).value); return isFinite(v) && v > 0 ? Math.min(v, max) : d; }
    function update() {
      var inq = num('inquiries', 60, 100000), close = num('close', 30, 100) / 100, job = num('job', 400, 1000000);
      UPLIFTS.forEach(function (u, i) {
        var row = calc.querySelector('[data-row="' + i + '"]'); if (!row) return;
        var jobs = inq * close * u;
        row.querySelector('[data-jobs]').textContent = String(Math.round(jobs * 10) / 10);
        row.querySelector('[data-rev]').textContent = '$' + Math.round(jobs * job).toLocaleString('en-US');
      });
    }
    calc.addEventListener('input', update);
    calc.addEventListener('submit', function (e) { e.preventDefault(); });
  });

  /* ── Print ─────────────────────────────────────────────────────────────── */
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
})();
