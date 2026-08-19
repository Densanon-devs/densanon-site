// ── SHARED card-face renderer ──────────────────────────────────────────────
// The SINGLE source of truth for how a card face is composited (frame layout +
// canvas text). Loaded by BOTH the app (index.html) and the pre-bake generator
// (scripts/gen-cards harness), so pre-baked images always match the runtime
// fallback. If you tweak FRAMES or renderFace here, re-run `npm run gen:cards`.
(function (g) {
  // Per-frame layout regions [x0,y0,x1,y1] as FRACTIONS of the card, cost circle
  // centre [cx,cy], cost-digit height `csize`, `dark` (tan panels → dark text),
  // `nocost` (curse — no cost digit).
  g.FRAMES = {
    common:   { art:[0.124,0.113,0.908,0.679], cost:[0.186,0.093], csize:0.096, name:[0.254,0.042,0.851,0.145], desc:[0.137,0.676,0.867,0.941], dark:false, aspect:1.0 },
    engineer: { art:[0.185,0.171,0.855,0.707], cost:[0.184,0.116], csize:0.110, name:[0.285,0.092,0.862,0.181], desc:[0.133,0.693,0.868,0.900], dark:false, aspect:1.0 },
    warlord:  { art:[0.156,0.180,0.872,0.671], cost:[0.153,0.183], csize:0.096, name:[0.258,0.152,0.852,0.216], desc:[0.130,0.692,0.870,0.878], dark:false, aspect:1.0 },
    uncommon: { art:[0.107,0.127,0.902,0.689], cost:[0.142,0.091], csize:0.110, name:[0.218,0.069,0.823,0.162], desc:[0.135,0.671,0.865,0.936], dark:false, aspect:1.0 },
    nomad:    { art:[0.120,0.124,0.891,0.670], cost:[0.156,0.110], csize:0.110, name:[0.252,0.048,0.826,0.138], desc:[0.135,0.660,0.865,0.925], dark:true,  aspect:1.0 },
    rare:     { art:[0.148,0.129,0.867,0.691], cost:[0.188,0.124], csize:0.110, name:[0.272,0.084,0.816,0.168], desc:[0.158,0.672,0.846,0.908], dark:false, aspect:1.0 },
    curse:    { art:[0.130,0.127,0.880,0.701], cost:[0.150,0.095], csize:0.095, name:[0.218,0.070,0.774,0.144], desc:[0.168,0.694,0.822,0.897], dark:false, nocost:true, aspect:1.0 },
  };
  // Which border frame a card wears: its general's, else curse, else its rarity's.
  g.frameFor = function (c) {
    const gg = c.general;
    if (gg === 'warlord' || gg === 'engineer' || gg === 'nomad') return gg;
    if (c.curse || c.cat === 'Curse') return 'curse';
    const r = c.rarity;
    if (r === 'rare' || r === 'elite') return 'rare';
    if (r === 'uncommon') return 'uncommon';
    return 'common';
  };
  g.faceKey = function (c) {
    const frame = g.frameFor(c), F = g.FRAMES[frame] || g.FRAMES.common;
    const cp = c.cp != null ? c.cp : c.cost;
    return frame + '|' + (F.nocost ? '' : cp) + '|' + (c.name || '') + '|' + (c.text || '');
  };

  const _frameImg = {}, _digitImg = {}, _artImg = {};
  g._frameImg = _frameImg; g._digitImg = _digitImg; g._artImg = _artImg; g._fcReady = false;
  // Load per-card art (assets/cards/art/<id>.jpg). Only some cards have art; missing ones are skipped.
  g.preloadArt = function (ids, base) {
    base = base || 'assets/';
    return Promise.all((ids || []).map(id => new Promise(res => {
      const im = new Image(); im.onload = () => { _artImg[id] = im; res(); }; im.onerror = () => res();
      im.src = base + 'cardart/' + id + '.jpg';
    })));
  };
  // per-card art crop anchor: { <id>: { x, y } } with 0..1 (0.5 = centre; y<0.5 shows more of the TOP = "art moved down")
  let _artOffsets = {};
  g.setArtOffsets = function (o) { _artOffsets = o || {}; };
  // Preload the frame PNGs + metallic digits + fonts, then flip _fcReady and fire the
  // window.onCardAssetsReady() hook (the app uses it to bake the hand; the generator to start).
  g.preloadFrameAssets = function (base) {
    base = base || 'assets/';
    const frames = ['common','engineer','warlord','uncommon','nomad','rare','curse'];
    const digits = ['0','1','2','3','4','5','6','7','8','9'];
    let pending = frames.length + digits.length + 1;   // +1: fonts before canvas text
    const done = () => { if (--pending === 0) { g._fcReady = true; if (typeof g.onCardAssetsReady === 'function') g.onCardAssetsReady(); } };
    frames.forEach(n => { const im = new Image(); im.onload = done; im.onerror = done; im.src = base + 'frames/' + n + '.png'; _frameImg[n] = im; });
    digits.forEach(d => { const im = new Image(); im.onload = done; im.onerror = done; im.src = base + 'digits/' + d + '.png'; _digitImg[d] = im; });
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(done, done); else done();
  };

  function _wrapText(ctx, text, maxw) {
    const words = String(text).split(/\s+/), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxw || !cur) cur = t; else { lines.push(cur); cur = w; } }
    if (cur) lines.push(cur); return lines;
  }
  function _drawFit(ctx, text, region, S0, o) {
    if (!text) return;
    const x0 = region[0]*S0, y0 = region[1]*S0, x1 = region[2]*S0, y1 = region[3]*S0;
    const padX = (x1-x0)*o.padx, padY = (y1-y0)*o.pady, bw = (x1-x0)-2*padX, bh = (y1-y0)-2*padY;
    let f = bh * o.start, lines = [];
    for (let i = 0; i < 48; i++) {
      ctx.font = `${o.weight} ${f}px ${o.family}`;
      lines = _wrapText(ctx, text, bw);
      const lh = f*1.16, fits = lines.length*lh <= bh && lines.every(l => ctx.measureText(l).width <= bw);
      if (fits || f < 5 * S0 / 600) break;   // the floor scales too, or small faces stop shrinking early and overflow
      f *= 0.93;
    }
    const lh = f*1.16, cx = (x0+x1)/2;
    let ty = y0 + padY + (bh - lines.length*lh)/2 + f*0.80;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    for (const ln of lines) {
      // An ABSOLUTE 1.5px floor made the outline ~2.3x too heavy relative to the glyph at S0=256,
      // which reads as muddy, closed-counter text on every Collection tile and hand card.
      if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = Math.max(1.5 * S0 / 600, f*0.13); ctx.strokeText(ln, cx, ty); }
      ctx.fillStyle = o.color; ctx.fillText(ln, cx, ty); ty += lh;
    }
  }
  // Composite the full card FACE (frame + metallic cost digits + name + description) and return the
  // CANVAS. Drawing costs about 1.5 ms; encoding that canvas to a data URL costs another 17 ms, and
  // measured on the Collection screen the encode was 92% of the whole per-face bill. The generator
  // genuinely needs bytes, so `renderFace` below still encodes — but the game does not: it hands the
  // pixels to an <img> via a blob, where the encode happens off the main thread.
  //
  // `size` is the edge of the square canvas. Every measurement in here is a fraction of it, so the
  // face composites identically at any size — which matters because a Collection tile is 104 px and
  // decoding a 600 px image to paint it means 33x more pixels than reach the screen.
  g.renderFaceCanvas = function (c, size) {
    const frame = g.frameFor(c), F = g.FRAMES[frame] || g.FRAMES.common, S0 = Math.max(64, Math.round(size || 600));
    const cp = c.cp != null ? c.cp : c.cost;
    const cv = document.createElement('canvas'); cv.width = S0; cv.height = S0;
    const ctx = cv.getContext('2d'); if (!ctx) return null;   // e.g. jsdom without canvas
    // card art fills the window BEHIND the frame (the frame's window edges/vignette overlay it), cover-fit + clipped
    const aim = _artImg[c.artId || c.id]; const A = F.art;
    if (aim && aim.naturalWidth && A) {
      const ax = A[0]*S0, ay = A[1]*S0, aw = (A[2]-A[0])*S0, ah = (A[3]-A[1])*S0;
      const sc = Math.max(aw/aim.naturalWidth, ah/aim.naturalHeight), dw = aim.naturalWidth*sc, dh = aim.naturalHeight*sc;
      const off = _artOffsets[c.artId || c.id] || {}, anchorX = off.x != null ? off.x : 0.5, anchorY = off.y != null ? off.y : 0.5;
      const zoom = off.scale != null ? off.scale : 0.90;    // global default: slight zoom-out with a thin letterbox
      // The offsets file records this nudge in 600px-canvas pixels, so it has to be scaled with the
      // canvas or a smaller face shifts its art further than the artist asked for.
      const nudge = S0 / 600, px = (off.px || 0) * nudge, py = (off.py || 0) * nudge;
      const zdw = dw * zoom, zdh = dh * zoom;
      ctx.save(); ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip();
      if (zoom < 1) { ctx.fillStyle = '#0b0906'; ctx.fillRect(ax, ay, aw, ah); }   // dark letterbox behind a shrunk image
      ctx.drawImage(aim, ax + (aw-zdw)*anchorX + px, ay + (ah-zdh)*anchorY + py, zdw, zdh); ctx.restore();
    }
    const fim = _frameImg[frame]; if (fim && fim.naturalWidth) ctx.drawImage(fim, 0, 0, S0, S0);
    if (!F.nocost) {
      const chars = String(cp).split('').filter(ch => /\d/.test(ch)).map(ch => _digitImg[ch]).filter(im => im && im.naturalWidth);
      const dh = S0 * (F.csize || 0.11), ws = chars.map(im => im.naturalWidth * dh / im.naturalHeight);
      const gap = 2 * S0 / 600;            // proportional, so a two-digit cost kerns the same at any size
      let totw = ws.reduce((a, b) => a + b, 0) + gap * Math.max(0, chars.length - 1), px = F.cost[0]*S0 - totw/2; const cy = F.cost[1]*S0;
      chars.forEach((im, i) => { ctx.drawImage(im, px, cy - dh/2, ws[i], dh); px += ws[i] + gap; });
    }
    const fam = '"Arial Narrow","Roboto Condensed",system-ui,sans-serif';
    const col = F.dark ? '#241d10' : '#f4eecf', str = F.dark ? null : '#000';
    _drawFit(ctx, c.name || '', F.name, S0, { padx:0.04, pady:0.08, start:0.80, weight:'700', family:fam, color:col, stroke:str });
    _drawFit(ctx, c.text || '', F.desc, S0, { padx:0.07, pady:0.11, start:0.36, weight:'600', family:fam, color:col, stroke:str });
    return cv;
  };

  // Encoded form, for the offline generator (which writes files) and for anything that still wants a
  // string. `mime` defaults to PNG; the generator passes 'image/webp'. Returns '' where there is no
  // canvas at all, which is what the jsdom tests see.
  g.renderFace = function (c, mime, quality) {
    const cv = g.renderFaceCanvas(c);
    return cv ? cv.toDataURL(mime || 'image/png', quality) : '';
  };
})(typeof window !== 'undefined' ? window : this);
