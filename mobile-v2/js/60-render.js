/* =====================================================================
   compositor (shared by preview + export) and live stage
   ===================================================================== */
let TXA = 1; // lyric opacity multiplier (opening / credits fade the lyrics)
function render(ctx, W, H, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; if (CAN_FILTER) ctx.filter = "none"; ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
  drawBackground(ctx, W, H, t);
  drawClips(ctx, W, H, t, "pip");
  drawPlayer(ctx, W, H, t);
  if (P.viz.on && P.viz.pos !== "front") drawViz(ctx, W, H, t);
  HIT.clear(); TXA = 1 - coverAmount(t) * 0.92;
  if (P.mode === "karaoke") drawTV(ctx, W, H, t);
  else if (P.mode === "stream") drawStream(ctx, W, H, t);
  else {
    const act = activeLines(t);
    act.forEach(x => drawLyricLine(ctx, W, H, t, x));
    if (act.length) { const main = act[act.length - 1], nx = nextAfter(main); if (nx && lineStyle(main.l).showNext && nx.start > t) drawLyricLine(ctx, W, H, t, nx, true, main); }
  }
  if (P.viz.on && P.viz.pos === "front") drawViz(ctx, W, H, t);
  drawTitleCard(ctx, W, H, t); drawOpening(ctx, W, H, t); drawCredits(ctx, W, H, t);
  drawOverlays(ctx, W, H, t);
  if (!timed().length) {
    ctx.save(); ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = fontStr({ font: P.text.font, weight: 700 }, Math.min(W, H) * 0.045);
    ctx.fillText(P.lines.length ? "ไปขั้น “ซิงค์” เพื่อใส่เวลา" : "วางเนื้อเพลงที่แท็บ “เนื้อ”", W / 2, H * 0.45); ctx.restore();
  }
}

/* ---------------- stage ---------------- */
const stage = $("#stage"), sctx = stage.getContext("2d"), stageWrap = $("#stageWrap");
let stageDims = [0, 0];
function fitStage() {
  const [rw, rh] = RATIOS[P.ratio];
  const bw = stageWrap.clientWidth - 16, bh = stageWrap.clientHeight - 14; if (bw <= 0 || bh <= 0) return;
  const k = Math.min(bw / rw, bh / rh), dw = Math.floor(rw * k), dh = Math.floor(rh * k), dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (stageDims[0] === dw && stageDims[1] === dh && stage.width === Math.round(dw * dpr)) return;
  stageDims = [dw, dh]; stage.style.width = dw + "px"; stage.style.height = dh + "px"; stage.width = Math.round(dw * dpr); stage.height = Math.round(dh * dpr);
}
new ResizeObserver(fitStage).observe(stageWrap);
addEventListener("orientationchange", () => setTimeout(fitStage, 200));

/* drag text on the preview to move it; tap it to open the line editor */
let drag = null;
stage.addEventListener("pointerdown", e => {
  if (P.mode !== "normal") return;
  const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * stage.width, y = (e.clientY - r.top) / r.height * stage.height;
  let hit = -1; HIT.forEach((b, i) => { const pad = Math.min(stage.width, stage.height) * 0.03; if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) hit = i; });
  if (hit < 0) return;
  const l = P.lines[hit], st = lineStyle(l);
  drag = { i: hit, sx: e.clientX, sy: e.clientY, ox: st.x, oy: st.y, moved: false, rw: r.width, rh: r.height };
  stage.setPointerCapture(e.pointerId); e.preventDefault();
});
stage.addEventListener("pointermove", e => {
  if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  if (!drag.moved) { drag.moved = true; if (isPlaying()) pause(); }
  const l = P.lines[drag.i]; l.o = l.o || {};
  l.o.x = Math.round(clamp(drag.ox + dx / drag.rw * 100, 2, 98) * 10) / 10; l.o.y = Math.round(clamp(drag.oy + dy / drag.rh * 100, 3, 97) * 10) / 10;
  layoutCache.clear();
});
stage.addEventListener("pointerup", () => {
  if (!drag) return; const d = drag; drag = null;
  if (d.moved) { changed("line"); toast("ย้ายท่อนที่ " + (d.i + 1) + " แล้ว (เฉพาะท่อนนี้)"); }
  else openLineEditor(d.i);
});
stage.addEventListener("pointercancel", () => { drag = null; });

/* ---------------- main loop ---------------- */
let lastUiT = -1, lastActive = -2, lastDur = -1, scrubbing = false;
function frame(ts) {
  requestAnimationFrame(frame);
  if (!M.audio && clock.playing) { const dt = clock.last ? (ts - clock.last) / 1000 : 0; clock.last = ts; clock.t += dt * A.playbackRate; if (clock.t >= duration()) { clock.t = duration(); clock.playing = false; updatePlayBtn(); } } else clock.last = ts;
  const t = now();
  if (M.bgVid && P.bg.type === "video") { const v = M.bgVid; if (isPlaying() && v.paused) v.play().catch(() => { }); if (!isPlaying() && !v.paused) v.pause(); if (v.duration && Math.abs(v.currentTime - (t % v.duration)) > 0.6 && isPlaying()) v.currentTime = t % v.duration; }
  if (!EX.running) { syncClips(t, isPlaying()); render(sctx, stage.width, stage.height, t); }
  if (UI.tab === "edit") placePlayhead(t);
  const d = duration();
  if (Math.abs(t - lastUiT) > 0.04 || d !== lastDur) {
    lastUiT = t; lastDur = d; $("#time").textContent = fmt(t, 1) + " / " + fmt(d, 0);
    const sc = $("#scrub"); if (!scrubbing) { sc.value = d ? Math.round(t / d * 1000) : 0; sc.style.setProperty("--p", (d ? t / d * 100 : 0) + "%"); }
  }
  if (UI.tab === "sync") { const a = activeAt(t), ai = a ? a.i : -1; if (ai !== lastActive) { lastActive = ai; markActive(ai); } }
}
