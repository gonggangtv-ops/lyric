/* =====================================================================
   background: base layer, filters, Ken Burns, beat pulse, 23 effects, Looks
   every effect is a pure function of t (deterministic for export)
   ===================================================================== */
const FXCAT = [
  ["🌌 ฉากเคลื่อนไหว", [["aurora", "🌌", "ออโรร่า"], ["blobs", "🫧", "ลิควิดไล่สี"], ["synth", "🌆", "ซินธ์เวฟ 80s"], ["stars", "🌠", "ท้องฟ้าดาว"]]],
  ["💡 แสง", [["rays", "🔦", "ลำแสงเทพ"], ["beams", "🎆", "ไฟเวที"], ["flare", "🌟", "เลนส์แฟลร์"], ["leak", "🌅", "Light Leak"], ["spark", "✨", "ประกายดาว"], ["firefly", "🪲", "หิ่งห้อย"]]],
  ["🌤 บรรยากาศ", [["snow", "❄️", "หิมะ"], ["rain", "🌧", "ฝน"], ["fog", "🌫", "หมอก"], ["particles", "✦", "ฝุ่นละออง"], ["petals", "🌸", "กลีบซากุระ"], ["bubbles", "🫧", "ฟองลอย"]]],
  ["🎉 สนุก & น่ารัก", [["confetti", "🎉", "คอนเฟตติ"], ["hrt", "💗", "หัวใจลอย"], ["bokeh", "🔮", "โบเก้"]]],
  ["🎞 ฟิล์ม & เรโทร", [["vhs", "📼", "VHS เรโทร"], ["grain", "🎞", "เกรนฟิล์ม"], ["vignette", "◐", "ขอบมืด"], ["kenBurns", "🎥", "Ken Burns"]]],
];
const FX_IDS = FXCAT.flatMap(c => c[1].map(x => x[0]));
const LOOKS = [["✨ คลีน", {}], ["🌸 Sakura Dream", { petals: 1, leak: 1, bokeh: 1 }], ["🌌 Cosmic Night", { stars: 1, aurora: 1, vignette: 1 }], ["🌧 Rainy Mood", { rain: 1, fog: 1, vignette: 1, grain: 1 }],
  ["🎆 Concert Live", { beams: 1, flare: 1, spark: 1 }], ["📼 Retro 80s", { synth: 1, vhs: 1, grain: 1 }], ["🪲 Fairy Forest", { firefly: 1, fog: 1, bokeh: 1 }], ["🎉 Party", { confetti: 1, beams: 1, blobs: 1 }],
  ["❄️ Winter Light", { snow: 1, fog: 1, rays: 1 }], ["💗 Sweet Love", { hrt: 1, blobs: 1, bokeh: 1 }]];
const FILTERS = [["none", "ปกติ"], ["bw", "ขาวดำ"], ["sepia", "ซีเปีย"], ["old", "หนังเก่า"], ["warm", "โทนอุ่น"], ["cool", "โทนเย็น"]];

function bgFilter(b) {
  const f = [];
  if (b.filter === "bw") f.push("grayscale(1)"); else if (b.filter === "sepia") f.push("sepia(.85)"); else if (b.filter === "old") f.push("sepia(.5) contrast(1.1) brightness(.92)");
  else if (b.filter === "warm") f.push("sepia(.25) saturate(1.25) hue-rotate(-8deg)"); else if (b.filter === "cool") f.push("saturate(.9) hue-rotate(14deg) brightness(1.02)");
  if (b.blur > 0) f.push(`blur(${b.blur}px)`); if (b.bright !== 100) f.push(`brightness(${b.bright / 100})`); if (b.contrast !== 100) f.push(`contrast(${b.contrast / 100})`); if (b.sat !== 100) f.push(`saturate(${b.sat / 100})`);
  return f.join(" ");
}
function drawMedia(ctx, src, sw, sh, W, H, fit) {
  if (!sw || !sh) return; const k = fit === "contain" ? Math.min(W / sw, H / sh) : Math.max(W / sw, H / sh), w = sw * k, h = sh * k;
  ctx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
}
function drawBase(ctx, W, H, t) {
  const b = P.bg, fx = P.fx;
  ctx.save();
  let z = 1, px = 0, py = 0;
  if (fx.kenBurns) { const k = 0.5 - 0.5 * Math.cos(t / 20 * Math.PI); z += (fx.kbAmt ?? b.kbAmt ?? 0.12) * k; px = Math.sin(t / 23) * W * 0.02; py = Math.cos(t / 29) * H * 0.015; }
  if (b.beat > 0) z += beatAt(t) * 0.045 * b.beat;
  if (z !== 1 || px || py) { ctx.translate(W / 2 + px, H / 2 + py); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); }
  if (b.type === "solid") { ctx.fillStyle = b.solid; ctx.fillRect(-W, -H, W * 3, H * 3); }
  else if (b.type === "image" && M.bgImg && M.bgImg.naturalWidth) { ctx.fillStyle = "#000"; ctx.fillRect(-W, -H, W * 3, H * 3); drawMedia(ctx, M.bgImg, M.bgImg.naturalWidth, M.bgImg.naturalHeight, W, H, b.fit); }
  else if (b.type === "video" && M.bgVid && M.bgVid.readyState >= 2) { ctx.fillStyle = "#000"; ctx.fillRect(-W, -H, W * 3, H * 3); drawMedia(ctx, M.bgVid, M.bgVid.videoWidth, M.bgVid.videoHeight, W, H, b.fit); }
  else {
    const a = (b.angle ?? 160) * Math.PI / 180, dx = Math.cos(a) * W * 0.6, dy = Math.sin(a) * H * 0.6, g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
    b.colors.forEach((c, i) => g.addColorStop(b.colors.length === 1 ? 0 : i / (b.colors.length - 1), c)); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
  }
  ctx.restore();
  if (!CAN_FILTER && (b.filter === "warm" || b.filter === "cool")) { ctx.fillStyle = b.filter === "warm" ? "rgba(255,140,40,.12)" : "rgba(40,140,255,.12)"; ctx.fillRect(0, 0, W, H); }
}
const pal = () => [P.fx.bokehCfg.c1, P.fx.bokehCfg.c2];

/* ---------- scene effects (behind dim layer) ---------- */
function fxAurora(ctx, W, H, t) {
  const cols = [pal()[0], pal()[1], "#00ff87"];
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let k = 0; k < 3; k++) {
    const yb = H * (0.18 + k * 0.1), amp = H * 0.06, g = ctx.createLinearGradient(0, yb - amp, 0, yb + H * 0.35);
    g.addColorStop(0, rgba(cols[k], 0)); g.addColorStop(0.2, rgba(cols[k], 0.32 * P.fx.amt)); g.addColorStop(1, rgba(cols[k], 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i <= 40; i++) { const x = i / 40 * W, y = yb + Math.sin(i * 0.35 + t * (0.4 + k * 0.15) + k * 2) * amp + Math.sin(i * 0.9 - t * 0.7) * amp * 0.35; ctx.lineTo(x, y); }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function fxBlobs(ctx, W, H, t) {
  const cols = [...P.bg.colors.slice(1), ...pal()], m = Math.max(W, H);
  ctx.save(); ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 5; i++) {
    const x = W * (0.5 + 0.38 * Math.sin(t * (0.11 + i * 0.03) + i * 2.1)), y = H * (0.5 + 0.38 * Math.cos(t * (0.09 + i * 0.025) + i * 1.3)), r = m * (0.32 + 0.1 * Math.sin(t * 0.3 + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r), c = cols[i % cols.length]; g.addColorStop(0, rgba(c, 0.55 * P.fx.amt)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
function fxSynth(ctx, W, H, t) {
  const hz = H * 0.62, cx = W / 2, R = Math.min(W, H) * 0.26;
  ctx.save();
  const sg = ctx.createLinearGradient(0, hz - R * 2, 0, hz); sg.addColorStop(0, "#ffe66d"); sg.addColorStop(1, "#ff2a6d");
  ctx.beginPath(); ctx.arc(cx, hz - R * 0.25, R, Math.PI, 0); ctx.closePath(); ctx.fillStyle = sg; ctx.shadowColor = "#ff2a6d"; ctx.shadowBlur = R * 0.5; ctx.fill(); ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 6; i++) { const y = hz - R * 0.25 - R * (0.08 + i * 0.13), h = R * (0.02 + i * 0.012); ctx.fillRect(cx - R, y, R * 2, h); }
  ctx.globalCompositeOperation = "source-over";
  const gg = ctx.createLinearGradient(0, hz, 0, H); gg.addColorStop(0, "rgba(20,0,40,.9)"); gg.addColorStop(1, "rgba(5,0,15,1)"); ctx.fillStyle = gg; ctx.fillRect(0, hz, W, H - hz);
  ctx.strokeStyle = "#ff2bd6"; ctx.lineWidth = Math.max(1, W * 0.003); ctx.shadowColor = "#ff2bd6"; ctx.shadowBlur = W * 0.01;
  for (let i = 0; i < 14; i++) { const z = ((i / 14) + t * 0.18) % 1, y = hz + (H - hz) * z * z; ctx.globalAlpha = 0.25 + 0.75 * z; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 0.85;
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(cx + i * W * 0.02, hz); ctx.lineTo(cx + i * W * 0.22, H); ctx.stroke(); }
  ctx.restore();
}
function fxStars(ctx, W, H, t) {
  ctx.save(); const n = Math.round(150 * P.fx.amt);
  for (let i = 0; i < n; i++) { const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + rnd(i, 1) * 2) + rnd(i, 2) * 9)), r = Math.max(0.6, Math.min(W, H) * 0.0025 * (0.5 + rnd(i, 3) * 1.5));
    ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(rnd(i, 4) * W, rnd(i, 5) * H * 0.85, r, 0, 7); ctx.fill(); }
  const cyc = 4.5, k = Math.floor(t / cyc), ph = (t % cyc) / 1.1;
  if (ph < 1) { const x0 = W * (0.2 + rnd(k, 6) * 0.7), y0 = H * (0.05 + rnd(k, 7) * 0.3), L = W * 0.35, x = x0 - L * ph, y = y0 + L * 0.45 * ph;
    const g = ctx.createLinearGradient(x, y, x + L * 0.25, y - L * 0.11); g.addColorStop(0, `rgba(255,255,255,${1 - ph})`); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, W * 0.003); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + L * 0.25, y - L * 0.11); ctx.stroke(); }
  ctx.restore();
}
/* ---------- light / atmosphere / particles ---------- */
function fxRays(ctx, W, H, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; const ox = W * 0.5 + Math.sin(t * 0.2) * W * 0.1, oy = -H * 0.12, L = Math.hypot(W, H) * 1.2;
  for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + (i - 4) * 0.16 + Math.sin(t * 0.25 + i) * 0.05, w = 0.035 + rnd(i, 1) * 0.04;
    const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * L, oy + Math.sin(a) * L); g.addColorStop(0, `rgba(255,248,220,${0.22 * P.fx.amt * (0.6 + 0.4 * Math.sin(t * 0.8 + i * 2))})`); g.addColorStop(1, "rgba(255,248,220,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a - w) * L, oy + Math.sin(a - w) * L); ctx.lineTo(ox + Math.cos(a + w) * L, oy + Math.sin(a + w) * L); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function fxBeams(ctx, W, H, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; const cols = pal(), L = H * 1.2, lv = level(t);
  for (let i = 0; i < 4; i++) { const ox = W * (0.12 + i * 0.25), oy = H * 1.02, a = -Math.PI / 2 + Math.sin(t * (0.6 + i * 0.13) + i * 1.7) * 0.5, w = 0.09, c = cols[i % 2];
    const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * L, oy + Math.sin(a) * L); g.addColorStop(0, rgba(c, (0.32 + lv * 0.25) * P.fx.amt)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a - w) * L, oy + Math.sin(a - w) * L); ctx.lineTo(ox + Math.cos(a + w) * L, oy + Math.sin(a + w) * L); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function fxFlare(ctx, W, H, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; const sx = W * (0.2 + 0.1 * Math.sin(t * 0.15)), sy = H * (0.15 + 0.05 * Math.cos(t * 0.2)), m = Math.min(W, H);
  let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, m * 0.35); g.addColorStop(0, `rgba(255,250,230,${0.75 * P.fx.amt})`); g.addColorStop(0.15, "rgba(255,200,120,.25)"); g.addColorStop(1, "rgba(255,200,120,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, cols = ["#7cf", "#f8c", "#9f8", "#fc6", "#c9f", "#8ef"];
  for (let i = 0; i < 6; i++) { const k = -0.4 + i * 0.45, x = cx + (cx - sx) * k, y = cy + (cy - sy) * k, r = m * (0.03 + 0.05 * rnd(i, 1));
    g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(cols[i], 0.0)); g.addColorStop(0.7, rgba(cols[i], 0.12)); g.addColorStop(1, rgba(cols[i], 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.restore();
}
function fxLeak(ctx, W, H, t) {
  ctx.save(); ctx.globalCompositeOperation = "screen"; const m = Math.max(W, H), cols = ["#ff7a18", "#ff3d68", "#ffd166"];
  for (let i = 0; i < 3; i++) { const x = (i === 1 ? W : 0) + Math.sin(t * 0.21 + i * 2) * W * 0.15, y = H * (0.2 + i * 0.3) + Math.cos(t * 0.17 + i) * H * 0.1, r = m * (0.4 + 0.15 * Math.sin(t * 0.4 + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(cols[i], 0.42 * P.fx.amt * (0.7 + 0.3 * Math.sin(t * 0.9 + i)))); g.addColorStop(1, rgba(cols[i], 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
function fxSpark(ctx, W, H, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; const n = Math.round(28 * P.fx.amt), m = Math.min(W, H);
  for (let i = 0; i < n; i++) { const per = 1.6 + rnd(i, 1) * 2, ph = ((t + rnd(i, 2) * per) % per) / per, a = Math.sin(ph * Math.PI); const cyc = Math.floor((t + rnd(i, 2) * per) / per);
    drawSpark(ctx, rnd(i * 13 + cyc, 3) * W, rnd(i * 17 + cyc, 4) * H, m * 0.025 * a * (0.5 + rnd(i, 5)), `rgba(255,255,255,${a * 0.9})`); }
  ctx.restore();
}
function fxFirefly(ctx, W, H, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; const n = Math.round(26 * P.fx.amt), m = Math.min(W, H);
  for (let i = 0; i < n; i++) { const x = W * (rnd(i, 1) + 0.08 * Math.sin(t * (0.3 + rnd(i, 2) * 0.4) + i)), y = H * (rnd(i, 3) + 0.06 * Math.cos(t * (0.25 + rnd(i, 4) * 0.3) + i * 2)), a = 0.35 + 0.65 * Math.max(0, Math.sin(t * (1 + rnd(i, 5)) + i)), r = m * 0.022;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(230,255,140,${a})`); g.addColorStop(0.25, `rgba(190,255,90,${a * 0.5})`); g.addColorStop(1, "rgba(190,255,90,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.restore();
}
const fall = (i, t, sp, k = 1) => ((rnd(i, 7) + t * sp * (0.6 + rnd(i, 8) * 0.8)) % 1) * k;
function fxSnow(ctx, W, H, t) {
  ctx.save(); const n = Math.round(110 * P.fx.amt), m = Math.min(W, H); ctx.fillStyle = "rgba(255,255,255,.85)";
  for (let i = 0; i < n; i++) { const y = fall(i, t, 0.06) * H * 1.1 - H * 0.05, x = rnd(i, 1) * W + Math.sin(t * (0.5 + rnd(i, 2)) + i) * W * 0.03, r = m * 0.004 * (0.6 + rnd(i, 3) * 1.6);
    ctx.globalAlpha = 0.4 + rnd(i, 4) * 0.6; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.restore();
}
function fxRain(ctx, W, H, t) {
  ctx.save(); const n = Math.round(150 * P.fx.amt), L = H * 0.06; ctx.strokeStyle = "rgba(190,215,255,.45)"; ctx.lineWidth = Math.max(1, W * 0.0018); ctx.beginPath();
  for (let i = 0; i < n; i++) { const y = fall(i, t, 1.1) * H * 1.2 - H * 0.1, x = rnd(i, 1) * W * 1.1 - y * 0.12; ctx.moveTo(x, y); ctx.lineTo(x - L * 0.15, y + L * (0.6 + rnd(i, 2) * 0.6)); }
  ctx.stroke(); ctx.restore();
}
function fxFog(ctx, W, H, t) {
  ctx.save(); const m = Math.max(W, H);
  for (let i = 0; i < 6; i++) { const x = ((rnd(i, 1) + t * 0.012 * (0.5 + rnd(i, 2))) % 1.4 - 0.2) * W, y = H * (0.45 + rnd(i, 3) * 0.55), r = m * (0.3 + rnd(i, 4) * 0.25);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(220,225,235,${0.16 * P.fx.amt})`); g.addColorStop(1, "rgba(220,225,235,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
function fxDust(ctx, W, H, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; const n = Math.round(70 * P.fx.amt), m = Math.min(W, H);
  for (let i = 0; i < n; i++) { const y = (1 - fall(i, t, 0.02)) * H, x = rnd(i, 1) * W + Math.sin(t * 0.4 + i) * W * 0.02, a = 0.25 + 0.5 * Math.abs(Math.sin(t + i));
    ctx.fillStyle = `rgba(255,240,210,${a})`; ctx.beginPath(); ctx.arc(x, y, m * 0.0028 * (0.5 + rnd(i, 3)), 0, 7); ctx.fill(); }
  ctx.restore();
}
function fxPetals(ctx, W, H, t) {
  ctx.save(); const n = Math.round(36 * P.fx.amt), m = Math.min(W, H);
  for (let i = 0; i < n; i++) { const y = fall(i, t, 0.05) * H * 1.15 - H * 0.08, x = rnd(i, 1) * W + Math.sin(t * 0.8 + i) * W * 0.06, r = m * 0.016 * (0.7 + rnd(i, 2) * 0.6), rot = t * (1 + rnd(i, 3)) + i;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, 0.55 + 0.45 * Math.sin(t * 2 + i)); ctx.fillStyle = i % 3 ? "rgba(255,183,207,.9)" : "rgba(255,214,228,.9)";
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.6, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function fxBubbles(ctx, W, H, t) {
  ctx.save(); const n = Math.round(26 * P.fx.amt), m = Math.min(W, H); ctx.lineWidth = Math.max(1, m * 0.002);
  for (let i = 0; i < n; i++) { const y = (1 - fall(i, t, 0.05)) * H * 1.15 - H * 0.05, x = rnd(i, 1) * W + Math.sin(t * 0.9 + i) * W * 0.03, r = m * 0.02 * (0.5 + rnd(i, 2) * 1.2);
    ctx.strokeStyle = "rgba(220,240,255,.55)"; ctx.fillStyle = "rgba(220,240,255,.06)"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, 7); ctx.fill(); }
  ctx.restore();
}
function fxConfetti(ctx, W, H, t) {
  ctx.save(); const n = Math.round(90 * P.fx.amt), m = Math.min(W, H), cols = ["#ff2d7b", "#ffd166", "#06d6a0", "#118ab2", "#a78bfa", "#ff8c42"];
  for (let i = 0; i < n; i++) { const y = fall(i, t, 0.12) * H * 1.1 - H * 0.05, x = rnd(i, 1) * W + Math.sin(t * 1.3 + i) * W * 0.03, s = m * 0.012 * (0.7 + rnd(i, 2) * 0.6);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 * (rnd(i, 3) - 0.5) + i); ctx.scale(Math.cos(t * 4 + i), 1); ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-s / 2, -s * 0.3, s, s * 0.6); ctx.restore(); }
  ctx.restore();
}
function fxHearts(ctx, W, H, t) {
  ctx.save(); const n = Math.round(20 * P.fx.amt), m = Math.min(W, H);
  for (let i = 0; i < n; i++) { const q = fall(i, t, 0.06), y = (1 - q) * H * 1.15 - H * 0.05, x = rnd(i, 1) * W + Math.sin(t * 1.1 + i) * W * 0.04, r = m * 0.03 * (0.6 + rnd(i, 2) * 0.8);
    ctx.globalAlpha = Math.min(1, (1 - q) * 3) * 0.75; ctx.fillStyle = i % 2 ? "#ff5d8f" : "#ff9ecf"; shapePath(ctx, "heart", x, y, r); ctx.fill(); }
  ctx.restore();
}
function fxBokeh(ctx, W, H, t) {
  const c = P.fx.bokehCfg, n = clamp(Math.round(c.count), 3, 40), m = Math.min(W, H), e = level(t);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const x = rnd(i, 1) * W + Math.sin(t * c.speed * 0.012 * (0.5 + rnd(i, 2)) + i * 2) * W * 0.08, y = rnd(i, 3) * H + Math.cos(t * c.speed * 0.01 * (0.5 + rnd(i, 4)) + i) * H * 0.05;
    const r = m * (c.size / 900) * (0.6 + rnd(i, 5) * 0.9) * (1 + e * 0.35), a = c.opacity * (0.62 + 0.38 * Math.sin(t * 0.8 + i)), col = i % 2 ? c.c2 : c.c1, soft = clamp(c.blur / 100, 0.05, 0.95);
    ctx.globalAlpha = clamp(a, 0, 1);
    if (c.shape === "circle") { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, 0.55)); g.addColorStop(1 - soft * 0.6, rgba(col, 0.3)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    else { const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.7); g.addColorStop(0, rgba(col, 0.3)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.5 + i) * 0.35); ctx.fillStyle = rgba(col, 0.7); shapePath(ctx, c.shape, 0, 0, r * 0.9); ctx.fill(); ctx.restore(); }
  }
  ctx.restore();
}
/* ---------- front overlays ---------- */
let grainTiles = null;
function fxGrain(ctx, W, H, t) {
  if (!grainTiles) { grainTiles = []; for (let k = 0; k < 6; k++) { const c = document.createElement("canvas"); c.width = c.height = 160; const x = c.getContext("2d"), d = x.createImageData(160, 160); for (let i = 0; i < d.data.length; i += 4) { const v = Math.floor(hash(i * 3 + k * 99991) * 255); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); grainTiles.push(c); } }
  const tile = grainTiles[Math.floor(t * 24) % 6]; ctx.save(); ctx.globalAlpha = 0.06 + 0.16 * (P.fx.grainAmt ?? 0.35); ctx.globalCompositeOperation = "overlay";
  const pat = ctx.createPattern(tile, "repeat"); ctx.fillStyle = pat; const s = Math.max(1, Math.min(W, H) / 540); ctx.scale(s, s); ctx.fillRect(0, 0, W / s, H / s); ctx.restore();
}
function fxVhs(ctx, W, H, t) {
  ctx.save(); ctx.fillStyle = "rgba(0,0,0,.14)"; const step = Math.max(2, Math.round(H / 360)); for (let y = 0; y < H; y += step * 2) ctx.fillRect(0, y, W, step);
  const by = ((t * 0.17) % 1.3 - 0.15) * H; const g = ctx.createLinearGradient(0, by - H * 0.03, 0, by + H * 0.03); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.09)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, by - H * 0.03, W, H * 0.06);
  const fs = Math.round(Math.min(W, H) * 0.04); ctx.font = `700 ${fs}px ui-monospace,Menlo,monospace`; ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 4; ctx.textBaseline = "top";
  ctx.fillText("PLAY ▶", W * 0.05, H * 0.04); const s = Math.floor(t), tc = `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  ctx.textBaseline = "bottom"; ctx.fillText(tc, W * 0.05, H * 0.96); ctx.restore();
}
function fxVignette(ctx, W, H) {
  const m = Math.hypot(W, H) / 2, g = ctx.createRadialGradient(W / 2, H / 2, m * 0.35, W / 2, H / 2, m); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${P.fx.vigAmt ?? 0.55})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function drawBackground(ctx, W, H, t) {
  const fx = P.fx;
  // the colour filter covers the base and the scene effects, not the lyrics
  const flt = CAN_FILTER ? bgFilter(P.bg) : ""; ctx.save(); if (flt) ctx.filter = flt;
  drawBase(ctx, W, H, t);
  if (fx.aurora) fxAurora(ctx, W, H, t); if (fx.blobs) fxBlobs(ctx, W, H, t); if (fx.stars) fxStars(ctx, W, H, t); if (fx.synth) fxSynth(ctx, W, H, t);
  ctx.restore();
  if (P.bg.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${P.bg.dim / 100})`; ctx.fillRect(0, 0, W, H); }
  if (fx.rays) fxRays(ctx, W, H, t); if (fx.beams) fxBeams(ctx, W, H, t); if (fx.fog) fxFog(ctx, W, H, t);
  if (fx.bokeh) fxBokeh(ctx, W, H, t); if (fx.firefly) fxFirefly(ctx, W, H, t); if (fx.particles) fxDust(ctx, W, H, t);
  if (fx.snow) fxSnow(ctx, W, H, t); if (fx.rain) fxRain(ctx, W, H, t); if (fx.petals) fxPetals(ctx, W, H, t); if (fx.bubbles) fxBubbles(ctx, W, H, t);
  if (fx.confetti) fxConfetti(ctx, W, H, t); if (fx.hrt) fxHearts(ctx, W, H, t); if (fx.spark) fxSpark(ctx, W, H, t);
}
function drawOverlays(ctx, W, H, t) {
  const fx = P.fx;
  if (fx.flare) fxFlare(ctx, W, H, t); if (fx.leak) fxLeak(ctx, W, H, t);
  if (fx.vhs) fxVhs(ctx, W, H, t); if (fx.grain) fxGrain(ctx, W, H, t); if (fx.vignette) fxVignette(ctx, W, H, t);
  if (P.bg.beat > 0) { const b = beatAt(t) * P.bg.beat; if (b > 0.02) { ctx.fillStyle = `rgba(255,255,255,${b * 0.1})`; ctx.fillRect(0, 0, W, H); } }
}
