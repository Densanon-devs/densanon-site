// ── i18n engine ────────────────────────────────────────────────────────────────
// The SINGLE source of truth for how a string is localized. Loaded three ways, and it has to behave
// identically in all three, which is why it is a classic script with a self-install guard rather than
// a module:
//
//   1. index.html loads it as a BLOCKING <script> before the big inline UI script. That matters:
//      the inline script has ~17 top-level `const` tables (COACH, NODE_INFO, TERRAIN_INFO, …) that
//      evaluate at parse time, so `t` must already exist as a function by then.
//   2. src/i18n.ts imports it, so the TypeScript half (content.ts, game.ts) calls the same `t`.
//      Both copies land in the same realm and the guard below makes the second load a no-op.
//   3. jsdom tests get it via test/_i18n_dom.ts, or not at all — see the next paragraph.
//
// EVERY call site passes its English text as the second argument: `t('hud.end_turn', 'End Turn')`.
// That is deliberate and it is what makes this retrofit safe. A missing dictionary, a missing key, a
// locale that never loaded, a jsdom test that does not inline this file — every one of those paths
// returns the English default instead of a bare key or an exception. It also means en.json is a pure
// BUILD ARTIFACT (scripts/i18n-extract.mjs harvests it from the defaults) and can never drift out of
// sync with the code, because the code is the source.
(function (g) {
  if (g.__I18N__) return;   // already installed by whichever of the three paths got here first

  var DICTS = {};       // locale id -> { key: string | {one:…, other:…} }
  var METAS = {};       // locale id -> { name, english, dir, wrap, font }
  var active = 'en';
  var missing = Object.create(null);   // keys asked for that the active dictionary lacked
  var used = Object.create(null);      // every key asked for, for coverage tooling

  var STORE_KEY = 'dc_lang';

  // English is always present as the last link in the fallback chain. Its dictionary stays EMPTY —
  // English text comes from the defaults at the call sites, so there is nothing to look up and
  // nothing that can go stale.
  METAS.en = { name: 'English', english: 'English', dir: 'ltr', wrap: 'space', font: null };
  DICTS.en = {};

  // ── pseudolocale ──────────────────────────────────────────────────────────
  // `en-XA` is not a translation, it is a TEST. It accents every letter (so anything still showing
  // plain ASCII is a string that never made it behind t()) and pads by ~35% (so any layout that will
  // burst under German bursts here first, before a translator is ever paid). Built at runtime from
  // the English defaults, so it needs no dictionary and never goes out of date.
  // Only letters the GLYPH ATLAS can draw. This used to accent the whole alphabet — ƀ ć đ ĝ ł ŕ ŧ ž —
  // and wrap in ⟦ ⟧ with · padding, none of which the atlas has. Every pseudolocalized plate therefore
  // fell out of the glyph renderer into the CSS-text fallback, which is nowrap and got clipped. So the
  // pseudolocale was exercising a path no real translation takes, and hiding the one they do.
  //
  // Restricted to the vowels plus n/c/y, which the atlas covers in both cases, and bracketed with
  // [ ] and padded with . — all three in the punctuation set. Nearly every English word carries a
  // vowel, so strings still read as unmistakably pseudolocalized.
  var ACCENT = { a:'á', e:'é', i:'í', o:'ó', u:'ú', n:'ñ', c:'ç', y:'ÿ',
                 A:'Á', E:'É', I:'Í', O:'Ó', U:'Ú', N:'Ñ', C:'Ç', Y:'Ÿ' };
  METAS['en-XA'] = { name: 'Pseudo (test)', english: 'Pseudolocale', dir: 'ltr', wrap: 'space', font: null, pseudo: true };

  function pseudoize(s) {
    // Placeholders and any embedded markup must survive verbatim or the string stops working as
    // HTML / stops interpolating. Only the prose between them gets accented.
    var out = '', i = 0, letters = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch === '{') { var e = s.indexOf('}', i); if (e < 0) { out += ch; i++; continue; }
                        out += s.slice(i, e + 1); i = e + 1; continue; }
      if (ch === '<') { var e2 = s.indexOf('>', i); if (e2 < 0) { out += ch; i++; continue; }
                        out += s.slice(i, e2 + 1); i = e2 + 1; continue; }
      if (ch === '&') { var e3 = s.indexOf(';', i); if (e3 > 0 && e3 - i <= 8) { out += s.slice(i, e3 + 1); i = e3 + 1; continue; } }
      out += (ACCENT[ch] || ch); if (/[A-Za-z]/.test(ch)) letters++; i++;
    }
    if (!letters) return out;                        // pure punctuation / icon strings: leave alone
    var pad = Math.max(1, Math.round(letters * 0.35));
    return '[' + out + ' ' + new Array(pad + 1).join('.') + ']';
  }

  // ── resolution ────────────────────────────────────────────────────────────
  function pluralOf(form, vars, locale) {
    var n = vars && typeof vars.count === 'number' ? vars.count : 0;
    var cat = 'other';
    try { cat = new Intl.PluralRules(locale).select(n); } catch (e) { cat = n === 1 ? 'one' : 'other'; }
    return form[cat] != null ? form[cat] : (form.other != null ? form.other : form.one);
  }

  // `{name}` substitution. `{{` escapes a literal brace. An unknown placeholder is left ALONE rather
  // than blanked — a visible `{foo}` in the UI is a bug report; a silent empty string is not.
  function interpolate(s, vars) {
    if (!vars || s.indexOf('{') < 0) return String(s).replace(/\{\{/g, '{').replace(/\}\}/g, '}');
    return String(s).replace(/\{\{|\}\}|\{(\w+)\}/g, function (m, name) {
      if (m === '{{') return '{';
      if (m === '}}') return '}';
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m;
    });
  }

  // t(key, englishDefault, vars) — englishDefault may be a string or a plural table {one, other, …}.
  function t(key, def, vars) {
    used[key] = true;
    var form = null;
    var dict = DICTS[active];
    if (dict && Object.prototype.hasOwnProperty.call(dict, key)) form = dict[key];
    if (form == null) {
      if (active !== 'en' && !METAS[active]?.pseudo) missing[key] = true;
      form = def;
    }
    if (form == null) return key;                        // no translation AND no default: loud on purpose
    if (typeof form === 'object') form = pluralOf(form, vars, active === 'en-XA' ? 'en' : active);
    if (METAS[active] && METAS[active].pseudo) form = pseudoize(String(form));
    return interpolate(form, vars);
  }

  // HTML-escape. NOT applied automatically: a good number of these strings intentionally carry markup
  // (<b>, <br>, &amp;) because they are built into template literals. Call this explicitly when
  // interpolating anything player- or data-supplied.
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var I18n = {
    // register(id, meta, dict) — locale packs (public/i18n.locales.js) call this at load time.
    register: function (id, meta, dict) {
      METAS[id] = Object.assign({ name: id, english: id, dir: 'ltr', wrap: 'space', font: null }, meta || {});
      DICTS[id] = dict || {};
      return I18n;
    },
    get locale() { return active; },
    meta: function (id) { return METAS[id || active] || METAS.en; },
    // Every locale that has a pack loaded, English first. The pseudolocale is hidden unless asked for,
    // so a player never finds it in the settings list by accident.
    list: function (opts) {
      var ids = Object.keys(METAS).filter(function (id) { return (opts && opts.pseudo) || !METAS[id].pseudo; });
      ids.sort(function (a, b) { return a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b); });
      return ids.map(function (id) { return Object.assign({ id: id }, METAS[id]); });
    },
    dir: function () { return I18n.meta().dir; },
    // 'space' for languages that break on whitespace, 'char' for Chinese/Japanese/Thai, which have no
    // spaces at all — cardface.js and the coach both ask before wrapping.
    wrapMode: function () { return I18n.meta().wrap || 'space'; },
    font: function () { return I18n.meta().font || null; },

    // Apply the locale to the document: lang/dir attributes and the optional per-locale font stack.
    // Called at boot and again by setLocale for the no-reload path.
    apply: function (doc) {
      doc = doc || (typeof document !== 'undefined' ? document : null);
      if (!doc || !doc.documentElement) return;
      var m = I18n.meta();
      doc.documentElement.setAttribute('lang', active);
      doc.documentElement.setAttribute('dir', m.dir || 'ltr');
      if (m.font) doc.documentElement.style.setProperty('--f-loc', m.font);
      else doc.documentElement.style.removeProperty('--f-loc');
    },

    // A language change reloads. It is the honest option: those ~17 top-level tables in index.html
    // bake their text at parse time, so a live swap would leave half the UI in the old language. A
    // reload is instant on a local bundle and cannot be half-applied.
    setLocale: function (id, opts) {
      if (!METAS[id]) return false;
      active = id;
      try { g.localStorage && g.localStorage.setItem(STORE_KEY, id); } catch (e) { /* private mode */ }
      I18n.apply();
      if (!(opts && opts.reload === false) && g.location && typeof g.location.reload === 'function') g.location.reload();
      return true;
    },

    // Boot-time pick: an explicit saved choice wins; otherwise match the browser/OS language, exact
    // tag first ('pt-BR') then base ('pt'); otherwise English.
    init: function () {
      var saved = null;
      try { saved = g.localStorage && g.localStorage.getItem(STORE_KEY); } catch (e) { /* private mode */ }
      if (saved && METAS[saved]) active = saved;
      else {
        var navs = (g.navigator && (g.navigator.languages || [g.navigator.language])) || [];
        for (var i = 0; i < navs.length && active === 'en'; i++) {
          var tag = String(navs[i] || '');
          if (METAS[tag]) { active = tag; break; }
          var base = tag.split('-')[0];
          if (METAS[base]) { active = base; break; }
        }
      }
      I18n.apply();
      return active;
    },

    // ── tooling hooks (used by scripts/i18n-extract.mjs and the i18n tests) ──
    missing: function () { return Object.keys(missing); },
    used: function () { return Object.keys(used); },
    resetTracking: function () { missing = Object.create(null); used = Object.create(null); },
    // Coverage of a loaded pack against the keys the running app actually asked for.
    coverage: function (id) {
      var d = DICTS[id] || {}, u = Object.keys(used);
      var have = u.filter(function (k) { return Object.prototype.hasOwnProperty.call(d, k); }).length;
      return { locale: id, used: u.length, translated: have, pct: u.length ? Math.round(have * 100 / u.length) : 100 };
    },
    esc: esc,
    _interpolate: interpolate,
    _pseudoize: pseudoize,
  };

  g.__I18N__ = I18n;
  g.I18n = I18n;
  g.t = t;
  if (typeof module !== 'undefined' && module.exports) module.exports = { I18n: I18n, t: t };
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
