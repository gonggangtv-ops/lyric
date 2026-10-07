/* =====================================================================
   cards: song title card, music player widget (vinyl / CD / app card /
   cassette) with cover art, opening title, end credits
   ===================================================================== */
const CARD_STYLES = [["glass", "กระจก", "🪟"], ["minimal", "มินิมอล", "✒️"], ["vinyl", "แผ่นเสียง", "💿"], ["eq", "อีควอไลเซอร์", "🎚"]];
const CARD_POS = [["tl", "↖ บนซ้าย"], ["tc", "⬆ บนกลาง"], ["tr", "↗ บนขวา"], ["bl", "↙ ล่างซ้าย"], ["bc", "⬇ ล่างกลาง"], ["br", "↘ ล่างขวา"]];
const CARD_SHOW = [["always", "ค้างตั้งแต่เวลาเริ่มถึงเวลาจบ"], ["intro", "เปิดตัวใหญ่กลางจอ แล้วย่อไปค้างที่มุม"], ["once", "แสดงครั้งเดียวสักพัก แล้วจางหาย"], ["repeat", "แสดงซ้ำเป็นระยะ"], ["ranges", "กำหนดหลายช่วงเอง"]];
const PLAYERS = [["vinyl", "แผ่นเสียง", "💿"], ["cd", "แผ่น CD", "📀"], ["card", "เครื่องเล่นเพลง", "📱"], ["cassette", "เทปคาสเซ็ต", "📼"]];
const OPEN_ANIMS = [["zoom", "🔍 ซูมเข้า"], ["type", "⌨️ พิมพ์ทีละตัว"], ["letters", "⬆️ ตัวอักษรลอยขึ้น"], ["shine", "✨ แสงกวาด"], ["neon", "💡 นีออนกะพริบ"], ["split", "➗ แยกเปิด"], ["blur", "🌫 เบลอเป็นชัด"]];
const CREDIT_MODES = [["scroll", "🎞 เลื่อนขึ้นแบบหนัง"], ["page", "📄 ทีละหน้า"], ["float", "⬆️ ลอยขึ้นทีละบรรทัด"], ["zoom", "🔍 ซูมทีละบรรทัด"]];
const titleText = () => (P.title || M.name || "ชื่อเพลง").trim();
const artistText = () => (P.artist || "").trim();

/* ---------- cover art (uploaded, or a generated placeholder from the bg colours) ---------- */
let coverPh = null, coverPhKey = "";
function coverSrc() {
  const m = MEDIA.get("cover"); if (m && m.el && m.el.naturalWidth) return m.el;
  const key = P.bg.colors.join(); if (coverPh && coverPhKey === key) return coverPh;
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 256, 256);
  P.bg.colors.forEach((col, i) => g.addColorStop(i / Math.max(1, P.bg.colors.length - 1), col)); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.fillStyle = "rgba(255,255,255,.85)"; x.font = "900 120px Kanit,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("♪", 128, 136);
  coverPh = c; coverPhKey = key; return c;
}
function drawCoverSq(ctx, x, y, s, r) { const src = coverSrc(), sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height, k = Math.max(s / sw, s / sh); ctx.save(); rr(ctx, x, y, s, s, r); ctx.clip(); ctx.drawImage(src, x + (s - sw * k) / 2, y + (s - sh * k) / 2, sw * k, sh * k); ctx.restore(); }

/* ---------- song title card ---------- */
function cardVisibility(t) {
  const c = P.card, d = duration(), end = c.end > 0 ? c.end : d;
  const fade = (a, b) => clamp(Math.min((t - a) / 0.4, (b - t) / 0.5), 0, 1);
  switch (c.show) {
    case "always": return { a: t >= c.start && t <= end ? fade(c.start, end) : 0, big: 0 };
    case "intro": { if (t < c.start || t > end) return { a: 0, big: 0 }; const k = clamp((t - c.start - c.hold) / 0.8, 0, 1); return { a: fade(c.start, end), big: 1 - easeF.easeInOut(k) }; }
    case "once": return { a: fade(c.start, c.start + c.dur), big: 0 };
    case "repeat": { const per = Math.max(10, c.every * 60), ph = ((t - c.start) % per + per) % per; return { a: t >= c.start ? clamp(Math.min(ph / 0.4, (c.dur - ph) / 0.5), 0, 1) : 0, big: 0 }; }
    case "ranges": { for (const [a, b] of c.ranges || []) if (t >= a && t <= b) return { a: fade(a, b), big: 0 }; return { a: 0, big: 0 }; }
  }
  return { a: 0, big: 0 };
}
function drawTitleCard(ctx, W, H, t) {
  const c = P.card; if (!c.on) return; const v = cardVisibility(t); if (v.a <= 0.003) return;
  const base = Math.min(W, H), u = base / 360 * c.size, pad = 14 * u, tpx = 15 * u, apx = 11 * u, st = { font: P.text.font, weight: 800 };
  const title = titleText(), artist = artistText();
  ctx.save(); ctx.font = fontStr(st, tpx); const tw = ctx.measureText(title).width; ctx.font = fontStr({ ...st, weight: 500 }, apx); const aw = artist ? ctx.measureText(artist).width : 0;
  const icon = c.style === "vinyl" || c.style === "eq" ? 30 * u : 0, w = Math.min(W * 0.9, Math.max(tw, aw) + pad * 2 + (icon ? icon + 10 * u : 0)), h = (artist ? 52 : 38) * u;
  const [vy, hx] = c.pos.split(""), margin = base * 0.05;
  let x = hx === "l" ? margin : hx === "r" ? W - margin - w : (W - w) / 2, y = vy === "t" ? margin + (P.fx.vhs ? base * 0.05 : 0) : H - margin - h;
  let sc = 1; if (v.big > 0) { const bs = Math.min(2.2, W * 0.8 / w); sc = 1 + (bs - 1) * v.big; x = lerp(x, (W - w * sc) / 2, v.big); y = lerp(y, (H - h * sc) / 2 - H * 0.08, v.big); }
  ctx.globalAlpha = v.a; ctx.translate(x, y); ctx.scale(sc, sc);
  if (c.style === "glass") { ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = u; rr(ctx, 0, 0, w, h, 14 * u); ctx.fill(); ctx.stroke(); }
  else if (c.style === "minimal") { ctx.fillStyle = c.accent; ctx.fillRect(0, 6 * u, 3 * u, h - 12 * u); }
  else { ctx.fillStyle = "rgba(0,0,0,.45)"; rr(ctx, 0, 0, w, h, h / 2); ctx.fill(); }
  let tx = c.style === "minimal" ? 12 * u : pad;
  if (c.style === "vinyl") { const r = icon / 2, cx = pad * 0.6 + r, cy = h / 2; ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 2); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 0.6 * u; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.45 + k * 0.15), 0, 7); ctx.stroke(); } ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, 7); ctx.fill(); ctx.restore(); tx = pad * 0.6 + icon + 10 * u; }
  if (c.style === "eq") { const bw = icon / 5; for (let k = 0; k < 4; k++) { const hh = (0.3 + 0.7 * Math.abs(Math.sin(t * (3 + k) + k))) * (0.5 + level(t) * 0.5) * icon * 0.8; ctx.fillStyle = c.accent; rr(ctx, pad * 0.7 + k * bw * 1.25, h / 2 + icon * 0.4 - hh, bw, hh, bw / 2); ctx.fill(); } tx = pad * 0.6 + icon + 10 * u; }
  ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 4 * u;
  ctx.fillStyle = c.color; ctx.font = fontStr(st, tpx); ctx.fillText(title, tx, artist ? h * 0.37 : h / 2);
  if (artist) { ctx.globalAlpha *= 0.8; ctx.font = fontStr({ ...st, weight: 500 }, apx); ctx.fillText(artist, tx, h * 0.7); }
  ctx.restore();
}

/* ---------- music player widget ---------- */
function drawPlayerBlurBg(ctx, W, H) {
  if (!P.player.on || !P.player.blurBg) return; const src = coverSrc(), sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  ctx.save(); if (CAN_FILTER) ctx.filter = `blur(${Math.round(Math.min(W, H) * 0.04)}px) brightness(.6)`; drawMedia(ctx, src, sw, sh, W, H, "cover"); ctx.restore();
}
function drawPlayer(ctx, W, H, t) {
  const p = P.player; if (!p.on) return;
  const base = Math.min(W, H), S = base * 0.5 * p.size, cx = W * p.x / 100, cy = H * p.y / 100, spin = p.spin && isFinite(t) ? t * 0.9 : 0, d = duration() || 1;
  ctx.save();
  if (p.style === "vinyl" || p.style === "cd") {
    const r = S / 2;
    ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = r * 0.15; ctx.shadowOffsetY = r * 0.04;
    ctx.translate(cx, cy); ctx.rotate(spin);
    if (p.style === "vinyl") {
      ctx.fillStyle = "#0b0b0d"; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = Math.max(1, r * 0.006); for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.42 + k * 0.04), 0, 7); ctx.stroke(); }
      const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0.35, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.09)"); g.addColorStop(0.65, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, 7); ctx.clip(); drawCoverSq(ctx, -r * 0.36, -r * 0.36, r * 0.72, 0); ctx.restore();
      ctx.fillStyle = "#0b0b0d"; ctx.beginPath(); ctx.arc(0, 0, r * 0.03, 0, 7); ctx.fill();
    } else {
      const g = ctx.createConicGradient ? ctx.createConicGradient(0, 0, 0) : null;
      if (g) { ["#dfe6f0", "#f5c6ff", "#c6f0ff", "#fff3c4", "#dfe6f0", "#c9d6ff", "#ffd6e7", "#dfe6f0"].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c)); ctx.fillStyle = g; } else ctx.fillStyle = "#dfe6f0";
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.save(); ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(0, 0, r * 0.98, 0, 7); ctx.arc(0, 0, r * 0.3, 0, 7, true); ctx.clip(); drawCoverSq(ctx, -r, -r, r * 2, 0); ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, 7); ctx.fill();
    }
    ctx.rotate(-spin);
    if (p.arm && p.style === "vinyl") { const a = -0.55 + 0.25 * clamp(now() / d, 0, 1); ctx.save(); ctx.translate(r * 0.95, -r * 0.9); ctx.rotate(a); ctx.strokeStyle = "#c9ccd3"; ctx.lineWidth = r * 0.04; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.15, r * 1.15); ctx.lineTo(-r * 0.32, r * 1.3); ctx.stroke(); ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.arc(0, 0, r * 0.09, 0, 7); ctx.fill(); ctx.restore(); }
  } else if (p.style === "card") {
    const w = S * 1.25, h = w * 1.32, x = cx - w / 2, y = cy - h / 2, pad = w * 0.08, cs = w - pad * 2;
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = w * 0.08; ctx.fillStyle = "rgba(18,18,24,.82)"; rr(ctx, x, y, w, h, w * 0.07); ctx.fill(); ctx.shadowBlur = 0;
    drawCoverSq(ctx, x + pad, y + pad, cs, w * 0.04);
    const ty = y + pad + cs + w * 0.1, st = { font: P.text.font, weight: 800 };
    ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.font = fontStr(st, w * 0.075); ctx.fillText(titleText().slice(0, 28), x + pad, ty);
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.font = fontStr({ ...st, weight: 500 }, w * 0.055); ctx.fillText(artistText().slice(0, 34), x + pad, ty + w * 0.08);
    const by = ty + w * 0.17, pr = clamp(t / d, 0, 1); ctx.fillStyle = "rgba(255,255,255,.2)"; rr(ctx, x + pad, by, cs, w * 0.012, w * 0.006); ctx.fill(); ctx.fillStyle = "#fff"; rr(ctx, x + pad, by, cs * pr, w * 0.012, w * 0.006); ctx.fill();
    ctx.beginPath(); ctx.arc(x + pad + cs * pr, by + w * 0.006, w * 0.018, 0, 7); ctx.fill();
    ctx.font = `600 ${w * 0.04}px ui-monospace,monospace`; ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillText(fmt(t, 0), x + pad, by + w * 0.05); ctx.textAlign = "right"; ctx.fillText("-" + fmt(Math.max(0, d - t), 0), x + pad + cs, by + w * 0.05);
    const iy = by + w * 0.13; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = `${w * 0.09}px sans-serif`; ctx.fillText("⏮", cx - w * 0.22, iy); ctx.fillText("⏸", cx, iy); ctx.fillText("⏭", cx + w * 0.22, iy);
  } else if (p.style === "cassette") {
    const w = S * 1.5, h = w * 0.64, x = cx - w / 2, y = cy - h / 2;
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = w * 0.05; ctx.fillStyle = "#2b2b31"; rr(ctx, x, y, w, h, w * 0.04); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#f3e9d2"; rr(ctx, x + w * 0.06, y + h * 0.08, w * 0.88, h * 0.58, w * 0.02); ctx.fill();
    ctx.fillStyle = P.fx.bokehCfg.c1; ctx.fillRect(x + w * 0.06, y + h * 0.17, w * 0.88, h * 0.05);
    ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = fontStr({ font: P.text.font, weight: 800 }, h * 0.08); ctx.fillText(titleText().slice(0, 30), cx, y + h * 0.3);
    ctx.fillStyle = "#1a1a1e"; rr(ctx, x + w * 0.2, y + h * 0.36, w * 0.6, h * 0.24, h * 0.12); ctx.fill();
    [-1, 1].forEach(s => { const rx = cx + s * w * 0.18, ry = y + h * 0.48, rr2 = h * 0.1; ctx.save(); ctx.translate(rx, ry); ctx.rotate(spin * 2); ctx.fillStyle = "#e9e9ee"; ctx.beginPath(); ctx.arc(0, 0, rr2, 0, 7); ctx.fill(); ctx.fillStyle = "#1a1a1e"; for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.fillRect(-rr2 * 0.12, rr2 * 0.35, rr2 * 0.24, rr2 * 0.5); } ctx.restore(); });
    ctx.fillStyle = "#3a3a42"; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h); ctx.lineTo(x + w * 0.25, y + h * 0.78); ctx.lineTo(x + w * 0.75, y + h * 0.78); ctx.lineTo(x + w * 0.8, y + h); ctx.fill();
  }
  ctx.restore();
}

/* how much the opening / credits cover the lyrics (lyrics fade under them) */
function coverAmount(t) {
  let a = 0; const o = P.open, c = P.credits;
  if (o.on) { const e = t - o.start; if (e >= 0 && e <= o.dur) a = Math.max(a, clamp(Math.min(e / 0.5, (o.dur - e) / 0.6), 0, 1)); }
  if (c.on) { const d = duration(), s = c.start > 0 ? c.start : Math.max(0, d - c.dur), e = t - s; if (e >= 0 && e <= c.dur) a = Math.max(a, clamp(Math.min(e / 0.6, (c.dur - e) / 0.6), 0, 1)); }
  return a;
}
/* ---------- opening title ---------- */
function drawOpening(ctx, W, H, t) {
  const o = P.open; if (!o.on) return; const el2 = t - o.start; if (el2 < 0 || el2 > o.dur) return;
  const a = clamp(Math.min(el2 / 0.5, (o.dur - el2) / 0.6), 0, 1), p = clamp(el2 / Math.min(1.4, o.dur * 0.5), 0, 1), e = easeF.easeOut(p);
  const lines = (o.text.trim() ? o.text : [titleText(), artistText()].filter(Boolean).join("\n")).split("\n").filter(x => x.trim());
  const base = Math.min(W, H), px0 = base * 0.1 * o.size, st = { ...P.text, fx: P.text.fx, weight: 900, vertical: false, letterSpacing: 0, lineHeight: 1.2 };
  ctx.save(); if (o.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${o.dim / 100 * a})`; ctx.fillRect(0, 0, W, H); }
  let y = H * 0.46 - (lines.length - 1) * px0 * 0.55;
  lines.forEach((ln, i) => {
    const px = i === 0 ? px0 : px0 * 0.5, L = layoutText(ctx, ln, st, px, W * 0.86);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y);
    let opt = {};
    switch (o.anim) {
      case "zoom": ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); ctx.globalAlpha *= e; break;
      case "type": opt.typeChars = Math.floor(clamp(el2 / Math.max(0.4, o.dur * 0.45), 0, 1) * ln.length); break;
      case "letters": opt.tokTr = tk => { const q = clamp((el2 - tk.x / Math.max(1, L.w) * 0.8) / 0.5, 0, 1); return { a: q, dy: (1 - easeF.easeOut(q)) * px * 0.6, s: 1, bl: 0 }; }; break;
      case "shine": { const sx = ((el2 * 0.55) % 1.6 - 0.3) * L.w * 1.25 - L.w * 0.6; opt.after = () => { ctx.save(); ctx.beginPath(); ctx.rect(sx - px * 0.45, -L.h, px * 0.9, L.h * 2); ctx.clip(); ctx.globalAlpha *= 0.85; drawStyledBlock(ctx, L, { ...st, color: "#ffffff", fx: "none", glow: true, glowColor: "#ffffff", strokeW: 0 }, px, base / 360, t, {}); ctx.restore(); }; ctx.globalAlpha *= e; break; }
      case "neon": ctx.globalAlpha *= el2 < 1 ? (Math.sin(el2 * 60) > 0.2 ? 1 : 0.25) : 1; break;
      case "split": { const g = (1 - e) * px * 1.2; ctx.save(); ctx.beginPath(); ctx.rect(-W, -L.h, W * 2, L.h); ctx.clip(); ctx.translate(0, -g); drawStyledBlock(ctx, L, st, px, base / 360, t, {}); ctx.restore(); ctx.beginPath(); ctx.rect(-W, 0, W * 2, L.h); ctx.clip(); ctx.translate(0, g); break; }
      case "blur": if (CAN_FILTER) ctx.filter = `blur(${((1 - e) * px * 0.3).toFixed(1)}px)`; ctx.globalAlpha *= e; break;
    }
    drawStyledBlock(ctx, L, st, px, base / 360, t, opt); if (opt.after) opt.after();
    ctx.restore(); y += px * 1.25 + (i === 0 ? px0 * 0.1 : 0);
  });
  ctx.restore();
}

/* ---------- end credits ---------- */
function drawCredits(ctx, W, H, t) {
  const c = P.credits; if (!c.on) return; const d = duration(), start = c.start > 0 ? c.start : Math.max(0, d - c.dur), el2 = t - start; if (el2 < 0 || el2 > c.dur + 0.3) return;
  const a = clamp(Math.min(el2 / 0.6, (c.dur - el2) / 0.6), 0, 1), base = Math.min(W, H), px = base * 0.045 * c.size, lh = px * 1.6, st = { font: P.text.font, weight: 700 };
  const rows = c.text.split("\n").map(x => x.trim()).filter(Boolean);
  ctx.save(); ctx.fillStyle = `rgba(0,0,0,${c.dim / 100 * a})`; ctx.fillRect(0, 0, W, H); ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = px * 0.3;
  const drawRow = (r, y, al = 1, sc = 1) => {
    ctx.save(); ctx.globalAlpha = a * al; ctx.translate(W / 2, y); ctx.scale(sc, sc);
    const m = r.match(/^([^:：]+)[:：]\s*(.*)$/);
    if (m && m[2]) { ctx.font = fontStr({ ...st, weight: 500 }, px * 0.85); ctx.textAlign = "right"; ctx.globalAlpha *= 0.75; ctx.fillText(m[1].trim(), -px * 0.5, 0); ctx.globalAlpha /= 0.75; ctx.font = fontStr(st, px); ctx.textAlign = "left"; ctx.fillText(m[2].trim(), px * 0.5, 0); }
    else { ctx.font = fontStr({ ...st, weight: m ? 500 : 800 }, m ? px * 0.85 : px * 1.15); ctx.textAlign = "center"; ctx.fillText(m ? m[1] : r, 0, 0); }
    ctx.restore();
  };
  const p = clamp(el2 / c.dur, 0, 1);
  if (c.mode === "scroll") { const total = rows.length * lh, y0 = H + lh - p * (H + total + lh * 2); rows.forEach((r, i) => drawRow(r, y0 + i * lh)); }
  else if (c.mode === "page") { const per = Math.max(1, Math.floor(H * 0.6 / lh)), pages = Math.ceil(rows.length / per), pi = Math.min(pages - 1, Math.floor(p * pages)), pp = p * pages - pi, al = clamp(Math.min(pp / 0.15, (1 - pp) / 0.15), 0, 1), ch = rows.slice(pi * per, pi * per + per); ch.forEach((r, i) => drawRow(r, H / 2 - (ch.length - 1) * lh / 2 + i * lh, pages === 1 ? 1 : al)); }
  else { const each = c.dur / (rows.length + 1); rows.forEach((r, i) => { const q = clamp((el2 - i * each * 0.8) / 0.6, 0, 1); if (q <= 0) return; const y = H / 2 - (rows.length - 1) * lh / 2 + i * lh; c.mode === "float" ? drawRow(r, y + (1 - easeF.easeOut(q)) * lh, q) : drawRow(r, y, q, 0.6 + 0.4 * easeF.spring(q)); }); }
  ctx.restore();
}
