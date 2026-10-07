/* =====================================================================
   modes: Thai-TV karaoke, streaming (music-app scroll), romanisation, Mood Styles
   ===================================================================== */
const KR_SETS = {
  tvthai: { n: "ทีวีไทย", pre: "#ffffff", preStroke: "#0a0a0a", post: "#0a0ad7", postStroke: "#ffffff", rom: "#f0952b" },
  blue:   { n: "บลูไวท์", pre: "#ffffff", preStroke: "#161616", post: "#2a31d8", postStroke: "#ffffff", rom: "#ffb300" },
  yellow: { n: "เหลืองคลาสสิก", pre: "#ffffff", preStroke: "#111111", post: "#ffd400", postStroke: "#111111", rom: "#ff7a00" },
  pink:   { n: "ชมพู", pre: "#ffffff", preStroke: "#3a0030", post: "#ff2d7b", postStroke: "#ffffff", rom: "#ffe14d" },
  cyan:   { n: "ฟ้าซีเอียน", pre: "#ffffff", preStroke: "#06222e", post: "#00d5ff", postStroke: "#06222e", rom: "#ffd400" },
  green:  { n: "เขียว", pre: "#ffffff", preStroke: "#06240f", post: "#5dff6a", postStroke: "#06240f", rom: "#ffd400" },
};

/* ---------- romanisation (bundled @pcampus/thai-romanization) ---------- */
const romCache = new Map();
function romanizeText(text) {
  if (romCache.has(text)) return romCache.get(text);
  let out = "";
  try {
    const R = window.ThaiRom;
    out = words(text).filter(w => w.trim()).map(w => { if (!/[฀-๿]/.test(w)) return w; try { return R.romanize(w); } catch { return w; } }).join(" ").replace(/\s+/g, " ").trim();
  } catch { out = ""; }
  romCache.set(text, out); return out;
}
function romFor(l) {
  let r = l.rom != null ? l.rom : romanizeText(l.text); const c = P.tv.romCase;
  if (c === "upper") r = r.toUpperCase(); else if (c === "title") r = r.replace(/\b\w/g, m => m.toUpperCase());
  return r;
}

/* ---------- karaoke (Thai TV style): two alternating rows, sung colour wipes across ---------- */
function drawTV(ctx, W, H, t) {
  const tv = P.tv, set = { ...KR_SETS[tv.set] || KR_SETS.tvthai, ...(tv.custom ? tv.colors : {}) }, tl = timed(), base = Math.min(W, H), u = base / 360;
  const st = { ...P.text, fx: "none", vertical: false, lineHeight: 1.15, letterSpacing: 0 }, px = base * tv.size / 100, rpx = px * tv.romSize / 100, yB = H * tv.bottom / 100;
  // a line occupies slot k%2 from the previous line's start until the next-next line takes the slot
  const vis = [];
  tl.forEach((x, k) => {
    const prev = tl[k - 1], nn = tl[k + 2], from = prev && (x.start - prev.start) < 12 ? prev.start : x.start - 3, to = Math.min(x.end + 0.6, nn ? nn.start : x.end + 0.6);
    if (t >= from - 0.25 && t < to && (tv.showNext || t >= x.start - 0.15)) vis.push({ x, k, from, to });
  });
  // measure first so a wrapped (2-row) line pushes the upper slot up instead of overlapping
  const maxW = W * 0.9, romH = tv.rom ? px * 0.55 + rpx * 1.1 : 0;
  vis.forEach(v => { const L = layoutText(ctx, v.x.l.text || " ", st, px, tv.split ? maxW : 1e9); v.L = L; v.sc = !tv.split && L.w > maxW ? maxW / L.w : 1; v.h = (L.rows.length * L.lh + romH) * v.sc; });
  const lower = vis.find(v => v.k % 2 === 1), lowerH = lower ? lower.h : px * 1.3 + romH;
  for (const v of vis) {
    const { x, k, L, sc } = v, l = x.l; if (!l.text.trim()) continue;
    const a = clamp((t - v.from + 0.25) / 0.25, 0, 1) * clamp((v.to - t) / 0.25, 0, 1); if (a <= 0) continue;
    const slot = k % 2, bottom = slot === 1 ? yB : yB - lowerH - px * 0.35, yc = bottom - v.h + L.lh * sc / 2;
    const left = slot === 0 ? W * 0.05 : W * 0.95 - L.w * sc, fits = L.w * sc < W * 0.62, xl = fits ? left : (W - L.w * sc) / 2;
    const kt = unitTimes(l, L, x.end - x.start), el = t - x.start;
    ctx.save(); ctx.globalAlpha = a * TXA; ctx.translate(xl, yc); ctx.scale(sc, sc);
    ctx.font = fontStr(st, px); ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.lineJoin = "round"; setLS(ctx, 0);
    const sw = px * tv.strokeW / 100 * 1.6 + u * 0.5;
    L.rows.forEach((r, ri) => {
      const y = ri * L.lh;
      // unsung layer
      ctx.strokeStyle = set.preStroke; ctx.lineWidth = sw; ctx.fillStyle = set.pre;
      r.toks.forEach(tk => { if (tk.u < 0) return; ctx.strokeText(tk.s, tk.x, y); ctx.fillText(tk.s, tk.x, y); });
      // sung layer (clipped per token)
      r.toks.forEach(tk => {
        if (tk.u < 0) return; const p = clamp((el - kt[tk.u]) / Math.max(0.05, kt[tk.u + 1] - kt[tk.u]), 0, 1); if (p <= 0) return;
        ctx.save(); ctx.beginPath(); ctx.rect(tk.x - sw, y - L.lh, tk.w * p + sw + (p >= 1 ? sw : 0), L.lh * 2); ctx.clip();
        ctx.strokeStyle = set.postStroke; ctx.lineWidth = sw; ctx.fillStyle = set.post; ctx.strokeText(tk.s, tk.x, y); ctx.fillText(tk.s, tk.x, y); ctx.restore();
      });
    });
    if (tv.rom) {
      const rs = { ...st, weight: 700 }, rt = romFor(l); ctx.font = fontStr(rs, rpx); ctx.fillStyle = set.rom; ctx.strokeStyle = set.preStroke; ctx.lineWidth = sw * 0.6;
      const ry = (L.rows.length - 1) * L.lh + px * 0.55 + rpx * 0.7, rw = ctx.measureText(rt).width;
      let rx = (L.w - rw) / 2 > 0 && !fits ? (L.w - rw) / 2 : slot === 1 && fits ? L.w - rw : 0;
      rx = clamp(rx, (W * 0.04 - xl) / sc, (W * 0.96 - xl) / sc - rw); // keep the reading on screen
      ctx.strokeText(rt, rx, ry); ctx.fillText(rt, rx, ry);
    }
    // countdown dots before a line that follows a long gap
    if (tv.dots) { const prev = tl[k - 1], gap = prev ? x.start - prev.end : x.start; const d = x.start - t; if (gap > 3 && d > 0 && d <= 3) { const nd = Math.ceil(d); for (let i = 0; i < 3; i++) { ctx.fillStyle = i < nd ? set.post : rgba(set.pre, 0.25); ctx.beginPath(); ctx.arc(i * px * 0.55 + px * 0.2, -px * 0.95, px * 0.17, 0, 7); ctx.fill(); } } }
    ctx.restore();
  }
}

/* ---------- streaming: lyrics scroll like a music app ---------- */
function drawStream(ctx, W, H, t) {
  const s = P.stream, tl = timed(); if (!tl.length) return;
  const base = Math.min(W, H), px = base * s.size / 100, st = { ...P.text, fx: "none", vertical: false, lineHeight: 1.22, letterSpacing: 0, align: s.align, weight: Math.max(700, P.text.weight) };
  const maxW = W * (s.align === "left" ? 0.82 : 0.86), x0 = s.align === "left" ? W * 0.09 : W / 2, rpx = px * 0.5;
  // layout heights
  const items = tl.map(x => { const L = layoutText(ctx, x.l.text || "♪", st, px, maxW); return { x, L, h: L.h + (s.rom ? rpx * 1.4 : 0) + px * 0.55 }; });
  let k = 0; for (let j = 0; j < tl.length; j++) if (tl[j].start <= t + 0.05) k = j;
  const offs = []; let acc = 0; items.forEach(it => { offs.push(acc); acc += it.h; });
  // ease the scroll between lines
  const cur = tl[k], prevOff = k > 0 ? offs[k - 1] + items[k - 1].h / 2 : offs[0] + items[0].h / 2, curOff = offs[k] + items[k].h / 2;
  const p = t < cur.start ? 0 : easeF.easeInOut(clamp((t - cur.start) / 0.55, 0, 1)), off = k === 0 && t < cur.start ? curOff : lerp(prevOff, curOff, p);
  const cy = H * s.top / 100;
  if (s.dim > 0) { const pad = base * 0.04; ctx.save(); ctx.fillStyle = rgba(s.card, s.dim / 100); rr(ctx, W * 0.04, pad, W * 0.92, H - pad * 2, base * 0.04); ctx.fill(); ctx.restore(); }
  items.forEach((it, j) => {
    const yc = cy + (offs[j] + it.h / 2 - off); if (yc < -it.h || yc > H + it.h) return;
    const dist = Math.abs(j - k), isCur = j === k && t >= cur.start - 0.05 && t < cur.end + 0.3, L = it.L;
    ctx.save(); ctx.globalAlpha = (isCur ? 1 : clamp(0.42 - dist * 0.06, 0.12, 0.42)) * TXA;
    if (s.blur && !isCur && CAN_FILTER && dist > 0) ctx.filter = `blur(${Math.min(6, dist * 1.4) * base / 720}px)`;
    const sc = isCur ? 1 : 0.94; ctx.translate(x0, yc - (s.rom ? rpx * 0.7 : 0)); ctx.scale(sc, sc);
    ctx.font = fontStr(st, px); ctx.textBaseline = "middle"; ctx.textAlign = "left"; setLS(ctx, 0);
    const kt = unitTimes(it.x.l, L, it.x.end - it.x.start), el = t - it.x.start;
    L.rows.forEach((r, ri) => {
      const y = -L.h / 2 + L.lh * (ri + 0.5), rx = s.align === "left" ? 0 : -r.w / 2;
      r.toks.forEach(tk => {
        if (tk.u < 0) return;
        if (isCur && s.fill) {
          const q = clamp((el - kt[tk.u]) / Math.max(0.05, kt[tk.u + 1] - kt[tk.u]), 0, 1);
          ctx.fillStyle = "rgba(255,255,255,.42)"; ctx.fillText(tk.s, rx + tk.x, y);
          if (q > 0) { ctx.save(); ctx.beginPath(); ctx.rect(rx + tk.x - 2, y - L.lh, tk.w * q + 2, L.lh * 2); ctx.clip(); ctx.shadowColor = s.glow; ctx.shadowBlur = px * 0.5; ctx.fillStyle = "#ffffff"; ctx.fillText(tk.s, rx + tk.x, y); ctx.restore(); }
        } else { if (isCur) { ctx.shadowColor = s.glow; ctx.shadowBlur = px * 0.5; } ctx.fillStyle = "#ffffff"; ctx.fillText(tk.s, rx + tk.x, y); ctx.shadowBlur = 0; }
      });
    });
    if (s.rom) { const rt = romFor(it.x.l); ctx.font = fontStr({ ...st, weight: 600 }, rpx); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.textAlign = s.align === "left" ? "left" : "center"; ctx.fillText(rt, 0, L.h / 2 + rpx * 0.8); }
    ctx.restore();
  });
}

/* ---------- Mood Styles (from index.html) ---------- */
const MOODS = [
  { n: "Sad Rain", e: "🌧", bg: ["#1A1D29", "#2a2f45"], vig: 1, rain: 1, bk: { c1: "#60a5fa", c2: "#93c5fd", shape: "circle", count: 16, size: 90, blur: 60, opacity: 0.22, speed: 14 }, viz: ["wave", "#93c5fd", "#60a5fa", 0.5, 0.45], tx: ["Kanit", "#F0EDE8", "#60a5fa", "#1A1D29", 6, 1, 1, 0], an: ["fade", "blur", "rise"], dur: 1.2 },
  { n: "Zueng Warm", e: "🧡", bg: ["#F5E6D3", "#E8C4B8"], kb: 1, parts: 1, bk: { c1: "#fde68a", c2: "#ff7eb8", shape: "heart", count: 18, size: 85, blur: 48, opacity: 0.32, speed: 10 }, viz: ["bars", "#fde68a", "#ff7eb8", 0.75, 0.6], tx: ["Prompt", "#3D2B1F", "#fde68a", "#fff7ed", 4, 0, 1, 0], an: ["slideUp", "rise", "fade"], dur: 0.9 },
  { n: "Cyber Neon", e: "⚡", bg: ["#0a0a0a", "#0f2027"], vig: 1, bk: { c1: "#00f0ff", c2: "#ff00ff", shape: "star", count: 20, size: 70, blur: 40, opacity: 0.35, speed: 12 }, viz: ["laser", "#00f0ff", "#ff00ff", 0.9, 0.55], tx: ["Inter", "#00f0ff", "#ff00ff", "#000000", 8, 1, 1, 1], an: ["glowPop", "glitch", "wipe"], dur: 0.7 },
  { n: "Aurora", e: "🌌", bg: ["#0b486b", "#3a7bd5"], vig: 1, parts: 1, fx: { aurora: 1 }, bk: { c1: "#00ff87", c2: "#60efff", shape: "circle", count: 18, size: 90, blur: 55, opacity: 0.3, speed: 10 }, viz: ["particles", "#00ff87", "#60efff", 0.8, 0.6], tx: ["Kanit", "#eafff5", "#00ff87", "#0b2a1a", 6, 1, 1, 0], an: ["pop", "blur", "rise"], dur: 0.8 },
  { n: "Neon Night", e: "🌃", bg: ["#0f0c29", "#302b63"], vig: 1, bk: { c1: "#ff2d7b", c2: "#00f0ff", shape: "circle", count: 22, size: 100, blur: 60, opacity: 0.4, speed: 14 }, viz: ["equalizer", "#ff2d7b", "#00f0ff", 0.9, 0.55], tx: ["Kanit", "#ffffff", "#ff2d7b", "#000000", 8, 1, 1, 0], an: ["bounce", "stomp", "pop"], dur: 0.6 },
  { n: "Chill Lofi", e: "☕", bg: ["#2b1055", "#7597de"], vig: 1, kb: 1, parts: 1, bk: { c1: "#c4b5fd", c2: "#7dd3fc", shape: "circle", count: 14, size: 95, blur: 62, opacity: 0.24, speed: 8 }, viz: ["wave", "#c4b5fd", "#7dd3fc", 0.6, 0.45], tx: ["Prompt", "#f5f3ff", "#c4b5fd", "#2b1055", 0, 1, 1, 1], an: ["blur", "rise", "fade"], dur: 1.1 },
  { n: "Romantic Rose", e: "🌹", bg: ["#3b0a2a", "#c9184a"], vig: 1, kb: 1, parts: 1, bk: { c1: "#ff8fb1", c2: "#ffd1dc", shape: "heart", count: 16, size: 80, blur: 50, opacity: 0.3, speed: 9 }, viz: ["circle", "#ff8fb1", "#ffd1dc", 0.8, 0.5], tx: ["Prompt", "#fff0f3", "#ff8fb1", "#5a0a2a", 0, 1, 1, 1], an: ["fade", "elastic", "rise"], dur: 1 },
  { n: "Sunset Drive", e: "🌅", bg: ["#ff9966", "#6a3093"], vig: 1, kb: 1, parts: 1, bk: { c1: "#ffd166", c2: "#ff5e7a", shape: "circle", count: 16, size: 90, blur: 55, opacity: 0.28, speed: 10 }, viz: ["spectrum", "#ffd166", "#ff5e7a", 0.8, 0.55], tx: ["Kanit", "#fff7ed", "#ff9966", "#6a3093", 0, 1, 1, 0], an: ["slideUp", "rise", "swing"], dur: 0.9 },
  { n: "Inferno", e: "🔥", bg: ["#120000", "#7f1d1d"], vig: 1, parts: 1, bk: { c1: "#ff3d00", c2: "#ffd400", shape: "circle", count: 18, size: 80, blur: 50, opacity: 0.3, speed: 16 }, viz: ["fire", "#ff3d00", "#ffd400", 0.9, 0.6], tx: ["Kanit", "#fff1c9", "#ff5a1f", "#2a0500", 5, 1, 1, 0], an: ["drop", "stomp", "bounce"], dur: 0.6 },
  { n: "Ocean Dream", e: "🌊", bg: ["#0f2027", "#2c5364"], vig: 1, kb: 1, parts: 1, bk: { c1: "#38bdf8", c2: "#67e8f9", shape: "circle", count: 18, size: 90, blur: 58, opacity: 0.26, speed: 9 }, viz: ["orbit", "#67e8f9", "#38bdf8", 0.85, 0.5], tx: ["Prompt", "#ecfeff", "#38bdf8", "#0f2027", 0, 1, 1, 1], an: ["wipe", "rise", "blur"], dur: 1 },
  { n: "Golden Luxury", e: "👑", bg: ["#0a0a0a", "#3d2f0b"], vig: 1, kb: 1, parts: 1, bk: { c1: "#ffd76a", c2: "#ff9a1f", shape: "star", count: 12, size: 60, blur: 40, opacity: 0.22, speed: 8 }, viz: ["stars", "#ffd76a", "#ff9a1f", 0.8, 0.5], tx: ["Prompt", "#ffd76a", "#ff9a1f", "#3a2200", 0, 1, 1, 3], an: ["spread", "fade", "blur"], dur: 1.3, tfx: "gold" },
  { n: "Candy Pop", e: "🍭", bg: ["#ffd6e8", "#c9b6ff"], parts: 1, bk: { c1: "#ff4fa3", c2: "#7c5cff", shape: "star", count: 20, size: 70, blur: 40, opacity: 0.35, speed: 14 }, viz: ["bars", "#ff4fa3", "#7c5cff", 0.8, 0.55], tx: ["Prompt", "#ffffff", "#ff4fa3", "#ff4fa3", 6, 1, 0, 0], an: ["bounce", "pop", "elastic"], dur: 0.7 },
  { n: "Midnight Space", e: "🪐", bg: ["#02010a", "#1b1464"], vig: 1, kb: 1, parts: 1, fx: { stars: 1 }, bk: { c1: "#818cf8", c2: "#e0e7ff", shape: "circle", count: 12, size: 60, blur: 40, opacity: 0.22, speed: 6 }, viz: ["stars", "#e0e7ff", "#818cf8", 0.9, 0.5], tx: ["Kanit", "#e0e7ff", "#818cf8", "#02010a", 0, 1, 1, 2], an: ["spread", "blur", "fade"], dur: 1.4 },
  { n: "Forest Zen", e: "🌿", bg: ["#0b3d2e", "#1f6f4a"], vig: 1, kb: 1, parts: 1, bk: { c1: "#34d399", c2: "#bef264", shape: "circle", count: 14, size: 85, blur: 55, opacity: 0.24, speed: 8 }, viz: ["particles", "#34d399", "#bef264", 0.8, 0.55], tx: ["Prompt", "#ecfdf5", "#34d399", "#0b3d2e", 0, 1, 1, 1], an: ["rise", "fade", "blur"], dur: 1.1 },
  { n: "Retro Synthwave", e: "🕹", bg: ["#2d0a4e", "#ff2a6d"], vig: 1, fx: { synth: 1 }, bk: { c1: "#05d9e8", c2: "#ff2a6d", shape: "star", count: 18, size: 75, blur: 45, opacity: 0.3, speed: 13 }, viz: ["radial", "#05d9e8", "#ff2a6d", 0.9, 0.55], tx: ["Inter", "#ffffff", "#05d9e8", "#2d0a4e", 6, 1, 1, 1], an: ["swing", "stomp", "glitch"], dur: 0.7 },
  { n: "Minimal Mono", e: "◻️", bg: ["#0a0a0a", "#1c1c1c"], bk: { c1: "#ffffff", c2: "#9ca3af", shape: "circle", count: 10, size: 60, blur: 50, opacity: 0.1, speed: 6 }, viz: ["bars", "#ffffff", "#9ca3af", 0.55, 0.4], tx: ["Inter", "#ffffff", "#ffffff", "#000000", 0, 0, 0, 4], an: ["fade", "wipe", "rise"], dur: 1 },
  { n: "Vinyl Night", e: "🎶", bg: ["#1b1030", "#3a1c55"], vig: 1, parts: 1, bk: { c1: "#c084fc", c2: "#f472b6", shape: "circle", count: 12, size: 80, blur: 55, opacity: 0.2, speed: 8 }, viz: ["wave", "#c084fc", "#f472b6", 0.35, 0.35], tx: ["Prompt", "#f5f3ff", "#c084fc", "#1b1030", 0, 1, 1, 1], an: ["fade", "rise", "blur"], dur: 1.1 },
  { n: "Lo-fi Cassette", e: "📼", bg: ["#2b1b12", "#6b3f1d"], vig: 1, parts: 1, fx: { grain: 1 }, bk: { c1: "#fbbf24", c2: "#fb7185", shape: "circle", count: 10, size: 70, blur: 50, opacity: 0.18, speed: 7 }, viz: ["bars", "#fbbf24", "#fb7185", 0.4, 0.3], tx: ["Kanit", "#fff7ed", "#fbbf24", "#2b1b12", 0, 1, 0, 1], an: ["fade", "slideUp", "rise"], dur: 1 },
  { n: "Music App Dark", e: "🎧", bg: ["#121212", "#1f1f1f"], bk: { c1: "#1ed760", c2: "#ffffff", shape: "circle", count: 8, size: 60, blur: 50, opacity: 0.08, speed: 6 }, viz: ["bars", "#1ed760", "#ffffff", 0.45, 0.3], tx: ["Kanit", "#ffffff", "#1ed760", "#000000", 0, 1, 0, 0], an: ["fade", "wipe", "rise"], dur: 0.9 },
  { n: "Silver CD", e: "💿", bg: ["#0e1a2b", "#27456b"], vig: 1, parts: 1, bk: { c1: "#93c5fd", c2: "#e0e7ff", shape: "circle", count: 12, size: 75, blur: 55, opacity: 0.2, speed: 8 }, viz: ["circle", "#93c5fd", "#e0e7ff", 0.4, 0.3], tx: ["Prompt", "#eff6ff", "#93c5fd", "#0e1a2b", 0, 1, 1, 2], an: ["spread", "fade", "blur"], dur: 1.2, tfx: "chrome" },
];
function applyMood(m) {
  P.mood = m.n;
  Object.assign(P.bg, { type: P.bg.type === "image" || P.bg.type === "video" ? P.bg.type : "gradient", colors: m.bg.slice() });
  const keepMedia = {}; FX_IDS.forEach(k => { if (!["bokeh"].includes(k)) P.fx[k] = false; });
  Object.assign(P.fx, { vignette: !!m.vig, kenBurns: !!m.kb, particles: !!m.parts, rain: !!m.rain, bokeh: true, bokehCfg: { ...m.bk } }, m.fx ? Object.fromEntries(Object.entries(m.fx).map(([k, v]) => [k, !!v])) : {}, keepMedia);
  Object.assign(P.viz, { on: true, mode: m.viz[0], c1: m.viz[1], c2: m.viz[2], opacity: m.viz[3], height: m.viz[4] });
  const [font, color, glowColor, stroke, strokeW, shadow, glow, ls] = m.tx;
  Object.assign(P.text, { font, color, glowColor, stroke, strokeW, shadow: !!shadow, glow: !!glow, letterSpacing: ls, fx: m.tfx || "none", c2: glowColor });
  Object.assign(P.anim, { random: true, pool: m.an.slice(), dur: m.dur, type: m.an[0] });
  P.kar.sung = glowColor; P.stream.glow = glowColor;
  P.lines.forEach(l => { if (l.a) delete l.a.type; });
}
function moodOff() {
  P.mood = null; FX_IDS.forEach(k => P.fx[k] = false); P.viz.on = false; P.text.fx = "none"; P.anim.random = false;
}
