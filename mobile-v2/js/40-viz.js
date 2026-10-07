/* =====================================================================
   visualizer: 19 modes, all deterministic from the precomputed spectrum
   ===================================================================== */
const VIZ = [["bars", "📊", "Bars"], ["mirror", "🪞", "Mirror"], ["equalizer", "🎛", "Equalizer"], ["dots", "⚬", "Dots"], ["wave", "〰", "Wave"], ["spectrum", "🏔", "Spectrum"],
  ["heartbeat", "💓", "Heartbeat"], ["circle", "⭕", "Circle"], ["radial", "☀", "Radial"], ["rings", "🎯", "Rings"], ["pulse", "💥", "Pulse"], ["orbit", "🪐", "Orbit"],
  ["blob", "🫧", "Blob"], ["helix", "🧬", "Helix"], ["spectrogram", "🟦", "Heatmap"], ["particles", "✨", "Particles"], ["stars", "🌠", "Starfield"], ["laser", "🔦", "Laser"], ["fire", "🔥", "Fire"]];
const VIZ_POS = [["bottom", "ชิดล่าง"], ["behind", "หลังข้อความ"], ["top", "ด้านบน"], ["center", "กลางจอ"], ["front", "หน้าข้อความ"]];
const VIZ_COLOR = [["grad", "ไล่สี"], ["solid", "สีเดียว"], ["rainbow", "รุ้ง"], ["energy", "ตามพลังเสียง"]];
const ROUND_MODES = ["circle", "radial", "rings", "pulse", "orbit", "blob"];

function vizColor(v, i, n, val, t) {
  switch (v.colorMode) {
    case "solid": return v.c1;
    case "rainbow": return `hsl(${Math.round(i / Math.max(1, n) * 300 + t * 40) % 360},90%,62%)`;
    case "energy": return mixHex(v.c1, v.c2, clamp(val, 0, 1));
    default: return mixHex(v.c1, v.c2, n > 1 ? i / (n - 1) : 0);
  }
}
function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)); if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); } else { ctx.beginPath(); ctx.rect(x, y, w, h); } }

function drawViz(ctx, W, H, t) {
  const v = P.viz; if (!v.on) return;
  const m = Math.min(W, H), n = clamp(Math.round(v.count), 8, 128), b = bands(t, n), beat = beatAt(t) * v.beat, lv = level(t);
  const cx = W * v.x / 100, wide = W * 0.84, x0 = cx - wide / 2;
  const anchorY = v.pos === "bottom" ? H * 0.93 : v.pos === "top" ? H * 0.07 : H * 0.5, dir = v.pos === "top" ? 1 : -1;
  const maxH = H * 0.32 * v.height * (1 + beat * 0.15), R = m * 0.12 * (0.4 + v.size * 1.6) * (1 + beat * 0.12), cy = ROUND_MODES.includes(v.mode) && v.pos !== "top" && v.pos !== "bottom" ? H * 0.5 : anchorY + (v.pos === "bottom" ? -R * 1.6 : v.pos === "top" ? R * 1.6 : 0);
  const gap = wide / n, bw = Math.max(1, gap * (0.25 + v.thick * 0.7)), lw = Math.max(1, v.line * m / 720), spin = t * v.spin * 1.2;
  ctx.save(); ctx.globalAlpha = v.opacity; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (v.glow) { ctx.shadowBlur = m * 0.03 * v.glowStr; }
  const sc = c => { if (v.glow) ctx.shadowColor = c; };
  const peaksOf = () => { const pk = new Float32Array(n); for (let k = 0; k < 16; k++) { const bb = bands(Math.max(0, t - k / 30), n); for (let i = 0; i < n; i++) pk[i] = Math.max(pk[i], bb[i] * (1 - k * 0.035)); } return pk; };
  const drawBarsLike = (mirror) => {
    const base = mirror ? (v.pos === "bottom" ? H * 0.82 : v.pos === "top" ? H * 0.18 : anchorY) : anchorY;
    for (let i = 0; i < n; i++) {
      const h = Math.max(bw * 0.6, b[i] * maxH), x = x0 + i * gap + (gap - bw) / 2, c = vizColor(v, i, n, b[i], t); ctx.fillStyle = c; sc(c);
      if (mirror) { rr(ctx, x, base - h / 2 * 1.2, bw, h * 1.2, bw * v.round); ctx.fill(); }
      else { rr(ctx, x, dir < 0 ? base - h : base, bw, h, bw * v.round / 2); ctx.fill(); }
      if (v.reflect && !mirror && v.pos === "bottom") { ctx.save(); ctx.globalAlpha *= 0.22; ctx.shadowBlur = 0; rr(ctx, x, base + 2, bw, h * 0.35, bw * v.round / 2); ctx.fill(); ctx.restore(); }
    }
    if (v.peaks && !mirror) { const pk = peaksOf(); ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 0; for (let i = 0; i < n; i++) { const x = x0 + i * gap + (gap - bw) / 2, y = anchorY + dir * Math.max(bw * 0.6, pk[i] * maxH) + dir * lw * 2; ctx.fillRect(x, dir < 0 ? y - lw : y, bw, lw); } }
  };
  switch (v.mode) {
    case "bars": drawBarsLike(false); break;
    case "mirror": drawBarsLike(true); break;
    case "equalizer": {
      const seg = 14, sh = maxH / seg;
      for (let i = 0; i < n; i++) { const on = Math.round(b[i] * seg), x = x0 + i * gap + (gap - bw) / 2;
        for (let s = 0; s < seg; s++) { const c = s < on ? mixHex(v.c1, v.c2, s / seg) : null; if (!c) { ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.shadowBlur = 0; } else { ctx.fillStyle = c; sc(c); if (v.glow) ctx.shadowBlur = m * 0.02 * v.glowStr; }
          rr(ctx, x, dir < 0 ? anchorY - (s + 1) * sh + sh * 0.15 : anchorY + s * sh, bw, sh * 0.7, sh * 0.2 * v.round); ctx.fill(); } }
      break;
    }
    case "dots": for (let i = 0; i < n; i++) { const c = vizColor(v, i, n, b[i], t); ctx.fillStyle = c; sc(c); const k = Math.max(1, Math.round(b[i] * 8)), r = bw * 0.45, x = x0 + i * gap + gap / 2;
      for (let s = 0; s < k; s++) { ctx.beginPath(); ctx.arc(x, anchorY + dir * (s * r * 2.6 + r), r, 0, 7); ctx.fill(); } } break;
    case "wave": case "spectrum": {
      const pts = []; for (let i = 0; i < n; i++) pts.push([x0 + i * gap + gap / 2, anchorY + dir * b[i] * maxH]);
      const g = ctx.createLinearGradient(x0, 0, x0 + wide, 0); g.addColorStop(0, v.c1); g.addColorStop(1, v.colorMode === "solid" ? v.c1 : v.c2);
      ctx.beginPath(); ctx.moveTo(x0, anchorY); pts.forEach((p, i) => { if (!i) ctx.lineTo(p[0], p[1]); else { const q = pts[i - 1]; ctx.quadraticCurveTo(q[0], q[1], (q[0] + p[0]) / 2, (q[1] + p[1]) / 2); } });
      ctx.lineTo(x0 + wide, anchorY); sc(v.c1);
      if (v.mode === "spectrum") { ctx.closePath(); const fg = ctx.createLinearGradient(0, anchorY + dir * maxH, 0, anchorY); fg.addColorStop(0, rgba(v.c1, 0.9)); fg.addColorStop(1, rgba(v.c2, 0.15)); ctx.fillStyle = fg; ctx.fill(); }
      else { ctx.strokeStyle = g; ctx.lineWidth = lw * 1.4; ctx.stroke(); ctx.globalAlpha *= 0.25; ctx.lineTo(x0 + wide, anchorY); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); }
      break;
    }
    case "heartbeat": {
      const span = 3, steps = 160, base = v.pos === "bottom" ? H * 0.86 : anchorY; ctx.strokeStyle = v.c1; sc(v.c1); ctx.lineWidth = lw * 1.3; ctx.beginPath();
      for (let s = 0; s <= steps; s++) { const u = s / steps, tt = t - (1 - u) * span, bt = beatAt(tt), y = base - (Math.sin(tt * 40) * 0.15 + bt * (bt > 0.25 ? 1 : 0.2) * Math.sin(tt * 70)) * maxH * 0.8 - level(tt) * maxH * 0.15; s ? ctx.lineTo(x0 + u * wide, y) : ctx.moveTo(x0, y); }
      ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x0 + wide, base - level(t) * maxH * 0.15, lw * 2.5, 0, 7); ctx.fill(); break;
    }
    case "circle": for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + spin, L = b[i] * R * 1.1 + R * 0.04, c = vizColor(v, i, n, b[i], t); ctx.strokeStyle = c; sc(c); ctx.lineWidth = Math.max(1, (Math.PI * 2 * R / n) * (0.3 + v.thick * 0.5));
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * (R + L), cy + Math.sin(a) * (R + L)); ctx.stroke(); }
      ctx.strokeStyle = rgba(v.c1, 0.6); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, R * 0.96, 0, 7); ctx.stroke(); break;
    case "radial": for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + spin, L = R * (0.3 + b[i] * 1.8), c = vizColor(v, i, n, b[i], t); ctx.strokeStyle = c; sc(c); ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.25, cy + Math.sin(a) * R * 0.25); ctx.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); ctx.stroke(); } break;
    case "rings": for (let k = 0; k < 6; k++) { let s = 0; for (let i = Math.floor(k / 6 * n); i < Math.floor((k + 1) / 6 * n); i++) s += b[i]; s /= Math.max(1, n / 6);
      const c = vizColor(v, k, 6, s, t); ctx.strokeStyle = c; sc(c); ctx.lineWidth = lw * (1 + s * 2); ctx.globalAlpha = v.opacity * (0.35 + s * 0.65); ctx.beginPath(); ctx.arc(cx, cy, R * (0.35 + k * 0.22) * (1 + s * 0.25), 0, 7); ctx.stroke(); } break;
    case "pulse": {
      const fr = Math.floor(t * AFPS);
      for (let k = 0; k < 45; k++) { const j = fr - k; const bv = M.beats ? (M.beats[j] || 0) : (((j / AFPS) * 2) % 1 < 0.04 ? 1 : 0);
        if (bv < 0.45 || (M.beats && (M.beats[j - 1] || 0) > bv)) continue; const age = k / AFPS, q = age / 1.5; ctx.strokeStyle = v.c2; sc(v.c2); ctx.globalAlpha = v.opacity * (1 - q); ctx.lineWidth = lw * 2 * (1 - q) + 1; ctx.beginPath(); ctx.arc(cx, cy, R * (0.4 + q * 2.2), 0, 7); ctx.stroke(); }
      ctx.globalAlpha = v.opacity; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.5 + lv * 0.5)); g.addColorStop(0, rgba(v.c1, 0.9)); g.addColorStop(1, rgba(v.c1, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * (0.5 + lv * 0.5), 0, 7); ctx.fill(); break;
    }
    case "orbit": for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + spin * (1 + (i % 3) * 0.3), rad = R * (0.7 + (i % 4) * 0.18 + b[i] * 0.5), c = vizColor(v, i, n, b[i], t); ctx.fillStyle = c; sc(c);
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.9, Math.max(1.2, bw * 0.35 * (0.6 + b[i])), 0, 7); ctx.fill(); } break;
    case "blob": {
      const k = 24, pts = []; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2 + spin * 0.5, val = b[Math.floor(i / k * n)], r2 = R * (0.85 + val * 0.6 + Math.sin(t * 2 + i) * 0.03); pts.push([cx + Math.cos(a) * r2, cy + Math.sin(a) * r2]); }
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5); g.addColorStop(0, rgba(v.c1, 0.85)); g.addColorStop(1, rgba(v.c2, 0.55)); ctx.fillStyle = g; sc(v.c1);
      ctx.beginPath(); for (let i = 0; i <= k; i++) { const p = pts[i % k], q = pts[(i + 1) % k], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; i ? ctx.quadraticCurveTo(p[0], p[1], mx, my) : ctx.moveTo(mx, my); } ctx.closePath(); ctx.fill(); break;
    }
    case "helix": {
      const base = v.pos === "bottom" ? H * 0.84 : anchorY, amp = maxH * 0.35 * (0.4 + lv);
      for (let i = 0; i < n; i++) { const u = i / (n - 1), x = x0 + u * wide, ph = u * Math.PI * 4 + t * 2.4, y1 = base + Math.sin(ph) * amp, y2 = base - Math.sin(ph) * amp, z = Math.cos(ph), c = vizColor(v, i, n, b[i], t);
        ctx.strokeStyle = rgba("#ffffff", 0.15); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); ctx.fillStyle = c; sc(c);
        ctx.beginPath(); ctx.arc(x, y1, bw * 0.4 * (1.1 + z * 0.4) * (0.7 + b[i]), 0, 7); ctx.fill(); ctx.fillStyle = v.c2; ctx.beginPath(); ctx.arc(x, y2, bw * 0.4 * (1.1 - z * 0.4) * (0.7 + b[i]), 0, 7); ctx.fill(); }
      break;
    }
    case "spectrogram": {
      const cols = 48, rows = 20, cw = wide / cols, chh = maxH / rows; ctx.shadowBlur = 0;
      for (let c = 0; c < cols; c++) { const bb = bands(Math.max(0, t - (cols - 1 - c) / 15), rows); for (let r = 0; r < rows; r++) { const val = bb[r]; if (val < 0.05) continue; ctx.fillStyle = `hsla(${Math.round(260 - val * 260)},90%,${35 + val * 30}%,${0.3 + val * 0.7})`; ctx.fillRect(x0 + c * cw, (dir < 0 ? anchorY - (r + 1) * chh : anchorY + r * chh), cw + 0.5, chh + 0.5); } }
      break;
    }
    case "particles": {
      const cnt = n * 2, base = v.pos === "top" ? H * 0.05 : v.pos === "bottom" ? H * 0.98 : H * 0.6;
      for (let i = 0; i < cnt; i++) { const life = 2.2, ph = ((t + rnd(i, 1) * life) % life) / life, val = b[i % n], x = cx + (rnd(i, 2) - 0.5) * wide * (0.3 + ph * 0.7), y = base + dir * ph * maxH * 2 * (0.5 + val), c = vizColor(v, i % n, n, val, t);
        ctx.globalAlpha = v.opacity * (1 - ph) * (0.3 + val); ctx.fillStyle = c; sc(c); ctx.beginPath(); ctx.arc(x, y, Math.max(1, bw * 0.35 * (0.5 + val * 1.5)), 0, 7); ctx.fill(); }
      break;
    }
    case "stars": {
      const cnt = n * 3, sp = 0.15 + lv * 0.5 + beat * 0.4, ccy = H * 0.5;
      for (let i = 0; i < cnt; i++) { const z = 1 - ((rnd(i, 1) + t * sp * 0.4 * (0.6 + rnd(i, 4) * 0.8)) % 1), sx = (rnd(i, 2) - 0.5) * W * 1.4, sy = (rnd(i, 3) - 0.5) * H * 1.4, x = cx + sx / (z * 2 + 0.1), y = ccy + sy / (z * 2 + 0.1);
        if (x < 0 || x > W || y < 0 || y > H) continue; const c = vizColor(v, i % n, n, 1 - z, t); ctx.globalAlpha = v.opacity * (1 - z); ctx.fillStyle = c; sc(c); ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, (1 - z) * m * 0.006), 0, 7); ctx.fill(); }
      break;
    }
    case "laser": {
      const ox = cx, oy = v.pos === "top" ? 0 : H, k = Math.min(n, 24);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < k; i++) { const val = b[Math.floor(i / k * n)], a = (v.pos === "top" ? Math.PI / 2 : -Math.PI / 2) + (i / (k - 1) - 0.5) * 1.6 + Math.sin(t * 0.8 + i) * 0.08, L = H * (0.2 + val * 0.9), c = vizColor(v, i, k, val, t);
        ctx.strokeStyle = c; sc(c); ctx.lineWidth = lw * (0.6 + val * 1.4); ctx.globalAlpha = v.opacity * (0.25 + val * 0.75); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * L, oy + Math.sin(a) * L); ctx.stroke(); }
      break;
    }
    case "fire": {
      ctx.globalCompositeOperation = "lighter"; ctx.shadowBlur = 0; const base = v.pos === "top" ? 0 : H;
      for (let i = 0; i < n; i++) { const val = b[i], x = x0 + i * gap + gap / 2, fl = 0.75 + 0.25 * Math.sin(t * 13 + i * 2.7) * Math.sin(t * 7.3 + i), h = maxH * 1.4 * val * fl + maxH * 0.08;
        const g = ctx.createLinearGradient(0, base, 0, base + dir * h); g.addColorStop(0, rgba(v.c2 || "#ffd400", 0.9)); g.addColorStop(0.45, rgba(v.c1 || "#ff3d00", 0.7)); g.addColorStop(1, "rgba(255,40,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, base + dir * h * 0.45, gap * 0.9, h * 0.55, 0, 0, 7); ctx.fill(); }
      break;
    }
  }
  ctx.restore();
}
