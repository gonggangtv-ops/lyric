/* =====================================================================
   text: layout, 20 entrance animations (+exit/loop), 11 text effects,
   word-level karaoke highlight, word-by-word reveal, word effects
   ===================================================================== */
const ANIMS = [
  ["fade", "จาง", "✨"], ["pop", "ป๊อป", "💥"], ["slideUp", "เลื่อนขึ้น", "⬆"], ["slideLeft", "เลื่อนซ้าย", "⬅"], ["slideRight", "เลื่อนขวา", "➡"],
  ["zoom", "ซูม", "🔍"], ["glowPop", "GlowPop", "💫"], ["typewriter", "พิมพ์ดีด", "⌨"], ["bounce", "เด้ง", "🏀"], ["flip", "พลิก", "🔄"],
  ["blur", "เบลอ", "🌫"], ["rise", "ลอยขึ้น", "🎈"], ["drop", "หล่น", "⬇"], ["spin", "หมุน", "🌀"], ["elastic", "ยืดหยุ่น", "🪀"],
  ["wipe", "ปาด", "🧽"], ["spread", "กระจาย", "↔"], ["glitch", "กลิตช์", "📺"], ["swing", "แกว่ง", "🎐"], ["stomp", "กระแทก", "🥁"], ["none", "ไม่มี", "⏹"],
];
const ANIM_IDS = ANIMS.map(a => a[0]);
const EASES = [["easeOut", "นุ่ม"], ["easeInOut", "เข้า-ออก"], ["spring", "สปริง"], ["linear", "คงที่"]];
const EXITS = [["fade", "จาง"], ["slideUp", "ลอยขึ้น"], ["slideDown", "ลงล่าง"], ["zoomIn", "ซูมเข้า"], ["shrink", "หด"], ["blur", "เบลอ"], ["none", "ตัดทันที"]];
const LOOPS = [["none", "ไม่มี"], ["float", "ลอย"], ["breathe", "หายใจ"], ["sway", "โยก"], ["shake", "สั่น"]];
const TEXTFX = [["none", "ปกติ", "Aa"], ["gradient", "ไล่สี", "🌈"], ["rainbow", "รุ้ง", "🎨"], ["gold", "ทอง", "🥇"], ["chrome", "โครเมียม", "🪞"],
  ["shine", "แสงกวาด", "✨"], ["sparkle", "แสงวิบ", "⭐"], ["neon", "นีออน", "💡"], ["outline", "ตัวโปร่ง", "⭕"], ["longShadow", "เงายาว", "🌓"], ["retro", "เรโทร", "📼"], ["glitch", "กลิตช์", "📺"]];

const easeF = {
  linear: x => x, easeOut: x => 1 - Math.pow(1 - x, 3), easeIn: x => x * x * x,
  easeInOut: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  spring: x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.cos(x * 4.5 * Math.PI * 0.5) * Math.pow(1 - x, 1.2) * 0.6 - Math.pow(1 - x, 2) * 0.4, // same curve as index.html
};
const bounceOut = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
const elasticOut = x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * 2.0944) + 1;

/* port of the original __fx: returns opacity T, offsets B/J (px@360), scale C, flipX G, rot R, blur bl, letterspacing ls, wipe cl */
function animFx(k, start, end, t) {
  const c = t - start - (k.delay || 0), none = k.type === "none", S = none ? 1 : clamp(c / Math.max(0.05, k.dur), 0, 1), E = (easeF[k.ease] || easeF.easeOut)(S);
  const r = { T: 1, B: 0, J: 0, C: 1, G: 0, R: 0, bl: 0, ls: 0, cl: 1, S, c, gp: 0 };
  if (!none) {
    if (c < 0) r.T = 0;
    else switch (k.type) {
      case "fade": r.T = E; break;
      case "pop": r.T = E; r.C = 0.4 + 0.6 * E; break;
      case "slideUp": r.T = E; r.J = (1 - E) * 40; break;
      case "slideLeft": r.T = E; r.B = (1 - E) * 80; break;
      case "slideRight": r.T = E; r.B = (1 - E) * -80; break;
      case "zoom": r.T = E; r.C = 0.2 + 0.8 * E; break;
      case "glowPop": r.T = E; r.C = 0.7 + 0.3 * E + (S < 1 ? Math.sin(E * Math.PI) * 0.15 : 0); r.gp = S < 1 ? 12 * (1 - E) + 18 * E : 0; break;
      case "typewriter": break;
      case "bounce": { r.T = E; const j = S < 0.6 ? (1 - Math.cos(E * Math.PI * 2.2)) * 0.18 : 0; r.J = (1 - E) * 30 - j * 18; r.C = 0.6 + 0.4 * E + j * 0.12; break; }
      case "flip": r.T = E; r.G = (1 - E) * 90; r.C = 0.8 + 0.2 * E; break;
      case "blur": r.T = E; r.bl = (1 - E) * 14; r.C = 1 + (1 - E) * 0.08; break;
      case "rise": r.T = E; r.J = (1 - E) * 60; r.C = 0.92 + 0.08 * E; r.bl = (1 - E) * 4; break;
      case "drop": r.T = Math.min(1, S * 5); r.J = -(1 - bounceOut(S)) * 150; break;
      case "spin": r.T = E; r.R = (1 - E) * -180; r.C = 0.3 + 0.7 * E; break;
      case "elastic": r.T = Math.min(1, S * 8); r.C = Math.max(0.001, elasticOut(S)); break;
      case "wipe": r.T = 1; r.cl = E; break;
      case "spread": r.T = E; r.ls = (1 - E) * 18; r.bl = (1 - E) * 6; break;
      case "glitch": r.T = S < 0.55 && Math.sin(S * 210) > 0.55 ? 0.3 : Math.min(1, S * 3); r.B = Math.sin(S * 130) * (1 - S) * 16; break;
      case "swing": r.T = E; r.R = Math.sin(S * Math.PI * 3) * (1 - S) * 25; r.J = (1 - E) * -20; break;
      case "stomp": r.T = Math.min(1, S * 4); r.C = 1 + (1 - E) * 0.7; break;
    }
  }
  const ex = k.exit || "fade", ed = Math.min(k.exitDur || 0.3, Math.max(0.05, (end - start) / 3));
  if (ex !== "none") {
    const p = clamp((t - (end - ed)) / ed, 0, 1), q = p * p * (3 - 2 * p);
    if (p > 0) { r.T *= 1 - q; switch (ex) { case "slideUp": r.J -= q * 40; break; case "slideDown": r.J += q * 40; break; case "zoomIn": r.C *= 1 + q * 0.35; break; case "shrink": r.C *= 1 - q * 0.4; break; case "blur": r.bl += q * 14; break; } }
  }
  const lp = k.loop || "none";
  if (lp !== "none" && c > 0) { const w = t - start; switch (lp) { case "float": r.J += Math.sin(w * 2) * 4; break; case "breathe": r.C *= 1 + 0.03 * Math.sin(w * 2.4); break; case "sway": r.R += Math.sin(w * 1.6) * 2.2; break; case "shake": r.B += Math.sin(w * 43) * 1.3; r.J += Math.cos(w * 51) * 1.3; break; } }
  r.T = clamp(r.T, 0, 1); return r;
}

/* ---------- layout ---------- */
const layoutCache = new Map();
const segW = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter("th", { granularity: "word" }) : null;
const segG = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter("th", { granularity: "grapheme" }) : null;
const words = text => segW ? [...segW.segment(text)].map(s => s.segment) : text.split(/(\s+)/).filter(Boolean);
const graphemes = text => segG ? [...segG.segment(text)].map(s => s.segment) : [...text];
const HAS_LS = (() => { try { return "letterSpacing" in document.createElement("canvas").getContext("2d"); } catch { return false; } })();
function fontStr(st, px) { return `${st.italic ? "italic " : ""}${st.weight || 700} ${Math.max(1, px)}px "${st.font}","Kanit","Noto Sans Thai",sans-serif`; }
function setLS(ctx, px) { if (HAS_LS) ctx.letterSpacing = (px || 0).toFixed(1) + "px"; }
/* returns { rows:[{w, toks:[{s,x,w,u}]}], units, w, h, lh } — u = karaoke unit index (−1 for spaces) */
function layoutText(ctx, text, st, px, maxW, lsPx = 0) {
  const key = [text, st.font, st.weight, st.italic, Math.round(px), Math.round(maxW), st.vertical, Math.round(lsPx * 10), st.lineHeight].join("|");
  let r = layoutCache.get(key); if (r) return r;
  ctx.save(); ctx.font = fontStr(st, px); setLS(ctx, lsPx);
  const mw = s => ctx.measureText(s).width;
  const rows = []; let u = 0;
  if (st.vertical) {
    for (const g of graphemes(text)) { if (/^\s+$/.test(g)) { rows.push({ w: 0, toks: [] }); continue; } const w = mw(g); rows.push({ w, toks: [{ s: g, x: 0, w, u: u++ }] }); }
  } else {
    let row = { w: 0, toks: [] };
    const push = () => { while (row.toks.length && /^\s+$/.test(row.toks[row.toks.length - 1].s)) { row.w -= row.toks.pop().w; } if (row.toks.length) rows.push(row); row = { w: 0, toks: [] }; };
    for (const tk of words(text)) {
      const sp = /^\s+$/.test(tk); if (sp && !row.toks.length) continue;
      let w = mw(tk);
      if (row.toks.length && row.w + w > maxW && !sp) push();
      if (w > maxW && !sp) { // very long unbroken token → split by grapheme
        let cur = ""; for (const g of graphemes(tk)) { if (cur && mw(cur + g) > maxW) { const cw = mw(cur); row.toks.push({ s: cur, x: row.w, w: cw, u }); row.w += cw; push(); cur = ""; } cur += g; }
        w = mw(cur); row.toks.push({ s: cur, x: row.w, w, u: u++ }); row.w += w; continue;
      }
      row.toks.push({ s: tk, x: row.w, w, u: sp ? -1 : u++ }); row.w += w;
    }
    push();
  }
  ctx.restore();
  const lh = px * (st.lineHeight || 1.3);
  r = { rows, units: u, w: Math.max(0, ...rows.map(x => x.w)), h: rows.length * lh, lh };
  if (layoutCache.size > 400) layoutCache.clear();
  layoutCache.set(key, r); return r;
}
/* karaoke unit boundaries (seconds from line start), length units+1 */
function unitTimes(l, L, dur) {
  const n = L.units; if (!n) return [0, dur];
  if (l.kt && l.kt.length === n + 1) return l.kt;
  const lens = []; L.rows.forEach(r => r.toks.forEach(t => { if (t.u >= 0) lens[t.u] = Math.max(1, graphemes(t.s).length); }));
  const tot = lens.reduce((a, b) => a + b, 0) || 1, span = Math.max(0.3, dur * 0.88 - 0.1), out = [0.05]; let acc = 0;
  for (let i = 0; i < n; i++) { acc += lens[i] || 1; out.push(0.05 + span * acc / tot); }
  return out;
}

/* ---------- fills ---------- */
function makeFill(ctx, st, bw, bh, t, colorOverride) {
  const c1 = colorOverride || st.color, c2 = st.c2, ang = (st.angle ?? 90) * Math.PI / 180;
  const lin = (a, stops) => { const dx = Math.cos(a) * bw / 2, dy = Math.sin(a) * bh / 2, g = ctx.createLinearGradient(-dx, -dy, dx, dy); stops.forEach(s => g.addColorStop(clamp(s[0], 0, 1), s[1])); return g; };
  if (colorOverride) return colorOverride;
  switch (st.fx) {
    case "gradient": case "sparkle": return lin(ang, [[0, c1], [1, c2]]);
    case "rainbow": { const hh = t * 60; return lin(ang === Math.PI / 2 ? 0 : ang, [0, 1, 2, 3, 4, 5, 6].map(i => [i / 6, `hsl(${Math.round(hh + i * 60) % 360},90%,62%)`])); }
    case "gold": return lin(Math.PI / 2, [[0, "#fff6c0"], [0.3, "#ffd86b"], [0.5, "#c58a12"], [0.7, "#ffe08a"], [1, "#9a6a0a"]]);
    case "chrome": return lin(Math.PI / 2, [[0, "#ffffff"], [0.45, "#9aa5b8"], [0.5, "#2b3345"], [0.55, "#cfd8e8"], [1, "#ffffff"]]);
    case "shine": { const p = (t * 0.5) % 1.8 - 0.3; return lin(0.2, [[0, c1], [p - 0.14, c1], [p, "#ffffff"], [p + 0.14, c1], [1, c1]]); }
    default: return c1;
  }
}

/* draw one row of tokens. mode: "base" | "sung" ; per-token callbacks handle reveal/motion */
function paintTokens(ctx, row, x0, y, st, px, u, t, opt) {
  for (const tk of row.toks) {
    if (/^\s+$/.test(tk.s)) continue;
    let s = tk.s;
    if (opt.typeChars != null) { const rem = opt.typeChars - (opt.charAcc || 0); opt.charAcc = (opt.charAcc || 0) + tk.s.length; if (rem <= 0) continue; if (rem < tk.s.length) s = tk.s.slice(0, rem); }
    const tr = opt.tokTr ? opt.tokTr(tk) : null;
    if (tr && tr.a <= 0.001) continue;
    ctx.save();
    if (tr) { const cx = x0 + tk.x + tk.w / 2; ctx.translate(cx, y + (tr.dy || 0)); if (tr.s && tr.s !== 1) ctx.scale(tr.s, tr.s); ctx.translate(-cx, -y); ctx.globalAlpha *= tr.a; if (tr.bl > 0.4 && CAN_FILTER) ctx.filter = `blur(${tr.bl.toFixed(1)}px)`; }
    opt.draw(s, x0 + tk.x, y, tk);
    ctx.restore();
  }
}
const CAN_FILTER = (() => { try { const c = document.createElement("canvas").getContext("2d"); c.filter = "blur(2px)"; return c.filter === "blur(2px)"; } catch { return false; } })();

/* full styled block draw at origin (already translated to block centre). returns bbox */
function drawStyledBlock(ctx, L, st, px, u, t, opt = {}) {
  const bw = L.w, bh = L.h, lh = L.lh, top = -bh / 2;
  const rowX = r => st.vertical ? -r.w / 2 : st.align === "left" ? -bw / 2 : st.align === "right" ? bw / 2 - r.w : -r.w / 2;
  ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.font = fontStr(st, px); setLS(ctx, opt.lsPx || 0);
  ctx.lineJoin = "round"; ctx.miterLimit = 2;
  const sw = (st.strokeW || 0) * u * 0.55, fill = makeFill(ctx, st, bw || 1, bh || 1, t);
  const glowB = st.glow ? px * 0.45 * (st.glowStr ?? 0.5) + (opt.gp || 0) * u : (opt.gp || 0) * u;
  const eachRow = fn => L.rows.forEach((r, ri) => fn(r, rowX(r), top + lh * (ri + 0.5)));
  const pass = (fillStyle, stroke, shadow, dx = 0, dy = 0, mode = null) => { const po = { ...opt, charAcc: 0,
    draw: (s, x, yy, tk) => {
      ctx.save();
      if (shadow) { ctx.shadowColor = shadow.c; ctx.shadowBlur = shadow.b; ctx.shadowOffsetX = shadow.x || 0; ctx.shadowOffsetY = shadow.y || 0; }
      if (mode) ctx.globalCompositeOperation = mode;
      if (stroke) { ctx.strokeStyle = stroke.c; ctx.lineWidth = stroke.w; ctx.strokeText(s, x, yy); }
      if (fillStyle) { ctx.fillStyle = typeof fillStyle === "function" ? fillStyle(tk) : fillStyle; ctx.fillText(s, x, yy); }
      ctx.restore();
    } }; eachRow((r, x0, y) => paintTokens(ctx, r, x0 + dx, y + dy, st, px, u, t, po)); };
  const fx = st.fx || "none";
  // back layers
  if (fx === "longShadow") { const d = Math.max(1, Math.round((st.depth || 6))); for (let i = d; i >= 1; i--) pass(st.depthColor, null, null, i * u * 0.7, i * u * 0.7); }
  if (fx === "retro") { pass(st.depthColor, sw ? { c: st.depthColor, w: sw } : null, null, u * (st.depth || 6) * 0.9, u * (st.depth || 6) * 0.9); pass(st.c2, null, null, u * (st.depth || 6) * 0.45, u * (st.depth || 6) * 0.45); }
  if (fx === "glitch") { const j = Math.sin(t * 37) > 0.7 ? u * 4 : u * 1.6; pass("rgba(255,0,80,.8)", null, null, -j, 0, "lighter"); pass("rgba(0,240,255,.8)", null, null, j, 0, "lighter"); }
  // stroke
  if (sw > 0 && fx !== "outline") pass(null, { c: st.stroke, w: sw * 2 }, glowB > 0 ? { c: st.glowColor, b: glowB } : null);
  // main fill
  const shadow = glowB > 0 ? { c: fx === "neon" ? st.glowColor : st.glowColor, b: fx === "neon" ? glowB * 2 + px * 0.25 : glowB } :
    st.shadow ? { c: "rgba(0,0,0,.55)", b: px * 0.22, y: px * 0.06 } : null;
  if (fx === "outline") pass(null, { c: st.color, w: Math.max(2 * u, sw * 2 || u * 2.2) }, shadow);
  else if (fx === "neon") { pass(null, { c: st.glowColor, w: Math.max(u * 1.6, px * 0.06) }, shadow); pass(mixHex(st.color, "#ffffff", 0.5), null, { c: st.glowColor, b: px * 0.3 }); }
  else pass(opt.baseFill || fill, null, (sw > 0 && glowB > 0) ? null : shadow);
  if (fx === "sparkle") { ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 9; i++) { const ph = (t * 0.9 + rnd(i, 1)) % 1, a = Math.sin(ph * Math.PI); if (a < 0.05) continue; const x = (rnd(i, 2) - 0.5) * bw, y = (rnd(i, 3) - 0.5) * bh, r = px * (0.12 + 0.18 * rnd(i, 4)) * a; drawSpark(ctx, x, y, r, rgba("#ffffff", a)); } ctx.restore(); }
  return { w: bw, h: bh };
}
function drawSpark(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); }
function shapePath(ctx, kind, x, y, r) {
  ctx.beginPath();
  if (kind === "heart") { const s = r / 16; ctx.moveTo(x, y + 6 * s); ctx.bezierCurveTo(x + 16 * s, y - 6 * s, x + 10 * s, y - 18 * s, x, y - 8 * s); ctx.bezierCurveTo(x - 10 * s, y - 18 * s, x - 16 * s, y - 6 * s, x, y + 6 * s); }
  else if (kind === "star") { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
  else if (kind === "flower") { for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ctx.moveTo(x, y); ctx.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.45, 0, 7); } }
  else if (kind === "note") { ctx.ellipse(x, y + r * 0.5, r * 0.45, r * 0.32, -0.4, 0, 7); ctx.rect(x + r * 0.3, y - r * 0.9, r * 0.14, r * 1.4); ctx.rect(x + r * 0.3, y - r * 0.9, r * 0.6, r * 0.18); }
  else ctx.arc(x, y, r, 0, 7);
}
const PASTEL = ["#ff9ecf", "#ffd36e", "#9ee7ff", "#b9a4ff", "#9ef0b3", "#ffb38a"];

/* ---------- normal-mode line ---------- */
const HIT = new Map();   // line index → bbox in canvas px (preview drag)
function drawLyricLine(ctx, W, H, t, x, isNext = false, nextOf = null) {
  const l = x.l, st = lineStyle(l), an = lineAnim(l, x.i), base = Math.min(W, H), u = base / 360;
  const px = base * st.size / 100 * (st.scale || 1) * (isNext ? 0.6 : 1);
  if (!l.text.trim()) return;
  const f = isNext ? { T: 0.42 * clamp((t - nextOf.start) / 0.4, 0, 1) * clamp((nextOf.end - t) / 0.3, 0, 1), B: 0, J: 0, C: 1, G: 0, R: 0, bl: 0, ls: 0, cl: 1, S: 1, c: 1, gp: 0 } : animFx(an, x.start, x.end, t);
  if (f.T <= 0.003) return;
  const lsPx = (st.letterSpacing + f.ls) * u;
  const L = layoutText(ctx, l.text, st, px, W * 0.86, lsPx);
  let cx = W * st.x / 100, cy = H * st.y / 100;
  if (isNext) { const ms = lineStyle(nextOf.l), mpx = base * ms.size / 100 * (ms.scale || 1), ML = layoutText(ctx, nextOf.l.text, ms, mpx, W * 0.86, ms.letterSpacing * u); cx = W * ms.x / 100; cy = H * ms.y / 100 + ML.h / 2 + L.h / 2 + px * 0.6; }
  ctx.save();
  ctx.translate(cx + f.B * u, cy + f.J * u);
  ctx.rotate(((st.rot || 0) + f.R) * Math.PI / 180);
  const beatK = P.bg.beat > 0 ? 1 + beatAt(t) * 0.06 * P.bg.beat : 1;
  ctx.scale(f.C * beatK, f.C * beatK * (f.G ? Math.cos(f.G * Math.PI / 180) : 1));
  ctx.globalAlpha = f.T;
  if (f.bl > 0.3 && CAN_FILTER) ctx.filter = `blur(${(f.bl * u * 0.6).toFixed(1)}px)`;
  if (f.cl < 1) { ctx.beginPath(); ctx.rect(-L.w / 2 - px, -L.h, (L.w + px * 2) * f.cl, L.h * 2); ctx.clip(); }
  const typeChars = an.type === "typewriter" && !isNext && f.c >= 0 && f.S < 1 ? Math.floor(f.S * l.text.length) : null;
  const dur = x.end - x.start, kt = (P.kar.on || P.kar.reveal) && !isNext ? unitTimes(l, L, dur) : null;
  const el = t - x.start;
  const opt = { lsPx, gp: f.gp, typeChars };
  // word-by-word reveal + motion
  if (kt && (P.kar.reveal || P.kar.wmotion !== "none")) {
    opt.tokTr = tk => {
      if (tk.u < 0) return null;
      const s0 = kt[tk.u], s1 = kt[tk.u + 1];
      let a = 1, dy = 0, s = 1, bl = 0;
      if (P.kar.reveal) {
        const p = clamp((el - s0) / Math.max(0.05, P.kar.revealDur), 0, 1), e = easeF.easeOut(p);
        if (p <= 0) a = P.kar.ghost ? 0.16 : 0;
        else switch (P.kar.revealAnim) { case "float": a = e; dy = (1 - e) * 18 * u; break; case "pop": a = e; s = 0.4 + 0.6 * easeF.spring(p); break; case "blur": a = e; bl = (1 - e) * 10 * u; break; case "drop": a = Math.min(1, p * 4); dy = -(1 - bounceOut(p)) * 26 * u; break; default: a = e; }
      }
      if (P.kar.on && P.kar.wmotion !== "none") {
        const cur = el >= s0 && el < s1, pp = clamp((el - s0) / Math.max(0.05, s1 - s0), 0, 1);
        if (P.kar.wmotion === "bounce" && cur) dy -= Math.sin(pp * Math.PI) * px * 0.18;
        if (P.kar.wmotion === "pop" && cur) s *= 1 + Math.sin(pp * Math.PI) * 0.18;
        if (P.kar.wmotion === "wave") dy += Math.sin(t * 5 + tk.u * 0.8) * px * 0.06;
      }
      return { a, dy, s, bl };
    };
  }
  drawStyledBlock(ctx, L, st, px, u, t, opt);
  // karaoke "sung" overlay
  if (kt && P.kar.on) {
    const top = -L.h / 2, rowX = r => st.vertical ? -r.w / 2 : st.align === "left" ? -L.w / 2 : st.align === "right" ? L.w / 2 - r.w : -r.w / 2;
    L.rows.forEach((r, ri) => {
      const y = top + L.lh * (ri + 0.5), x0 = rowX(r);
      r.toks.forEach(tk => {
        if (tk.u < 0) return;
        const s0 = kt[tk.u], s1 = kt[tk.u + 1]; let p = clamp((el - s0) / Math.max(0.05, s1 - s0), 0, 1);
        if (p <= 0) return;
        if (P.kar.style === "letter") { const g = graphemes(tk.s).length; p = Math.floor(p * g + 0.0001) / g; }
        const tr = opt.tokTr ? opt.tokTr(tk) : null; if (tr && tr.a <= 0.01) return;
        ctx.save();
        if (tr) { const cx2 = x0 + tk.x + tk.w / 2; ctx.translate(cx2, y + (tr.dy || 0)); ctx.scale(tr.s || 1, tr.s || 1); ctx.translate(-cx2, -y); }
        ctx.beginPath(); ctx.rect(x0 + tk.x - px * 0.1, y - L.lh, tk.w * p + px * 0.1 + (p >= 1 ? px * 0.2 : 0), L.lh * 2); ctx.clip();
        ctx.font = fontStr(st, px); setLS(ctx, lsPx); ctx.textBaseline = "middle"; ctx.textAlign = "left";
        const cur = p < 1 && el >= s0;
        const gl = (P.kar.wfx === "glow" && cur) ? px * 0.7 * (0.5 + P.kar.wfxAmt) : px * 0.25;
        ctx.shadowColor = P.kar.sung; ctx.shadowBlur = gl;
        if (st.strokeW > 0) { ctx.lineJoin = "round"; ctx.strokeStyle = st.stroke; ctx.lineWidth = st.strokeW * u * 1.1; ctx.strokeText(tk.s, x0 + tk.x, y); }
        ctx.fillStyle = P.kar.sung; ctx.fillText(tk.s, x0 + tk.x, y);
        ctx.restore();
      });
    });
    // word particle effects around the word being sung
    if (["sparkle", "flowers", "hearts", "notes", "bubbles", "stars"].includes(P.kar.wfx)) {
      L.rows.forEach((r, ri) => r.toks.forEach(tk => {
        if (tk.u < 0) return; const s0 = kt[tk.u], s1 = kt[tk.u + 1]; if (el < s0 || el > s1 + 0.8) return;
        const y = -L.h / 2 + L.lh * (ri + 0.5), x0 = rowX(r) + tk.x, cnt = Math.round(3 + 6 * P.kar.wfxAmt);
        for (let i = 0; i < cnt; i++) {
          const born = s0 + (s1 - s0) * (i / cnt), age = el - born, life = 0.9; if (age < 0 || age > life) continue;
          const q = age / life, k = tk.u * 31 + i, ang = rnd(k, 1) * Math.PI * 2, dist = px * (0.3 + 0.7 * q) * (0.6 + rnd(k, 2));
          const ex = x0 + rnd(k, 3) * tk.w + Math.cos(ang) * dist * 0.6, ey = y - px * 0.2 + Math.sin(ang) * dist * 0.5 - q * px * 0.5;
          const sz = px * 0.16 * P.kar.wfxSize * (1 - q * 0.5) * (0.6 + rnd(k, 4) * 0.8);
          const col = P.kar.wfxColor === "white" ? "#ffffff" : P.kar.wfxColor === "grad" ? P.kar.sung : PASTEL[k % PASTEL.length];
          ctx.save(); ctx.globalAlpha *= (1 - q); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = sz;
          const kind = { sparkle: "spark", flowers: "flower", hearts: "heart", notes: "note", bubbles: "bubble", stars: "star" }[P.kar.wfx];
          if (kind === "spark") drawSpark(ctx, ex, ey, sz * 1.4, col);
          else if (kind === "bubble") { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, sz * 0.15); ctx.beginPath(); ctx.arc(ex, ey, sz, 0, 7); ctx.stroke(); }
          else { shapePath(ctx, kind, ex, ey, sz); ctx.fill(); }
          ctx.restore();
        }
      }));
    }
  }
  ctx.restore();
  if (!isNext) HIT.set(x.i, { x: cx - L.w / 2 * f.C, y: cy - L.h / 2 * f.C, w: L.w * f.C, h: L.h * f.C });
}
