/* =====================================================================
   timeline clips: image/video on the media track, extra audio on the
   audio track. Drawing (shared with export), preview playback sync.
   ===================================================================== */
const FITS = [["cover", "เต็มขอบ (ครอป)"], ["contain", "พอดีภาพ (ขอบดำ)"], ["pip", "กรอบซ้อน"]];
function newClip(kind, mid, name, at, len) {
  return { id: uid(), kind, mid, name, in: +at.toFixed(2), out: +(at + len).toFixed(2), off: 0, loop: kind === "audio" ? false : true, vol: 1, fadeIn: 0.2, fadeOut: 0.3,
    fit: "cover", px: 50, py: 30, pw: 46, rad: 4 };
}
const clipFade = (c, t) => { const d = c.out - c.in, fi = Math.min(c.fadeIn ?? 0.2, d / 2), fo = Math.min(c.fadeOut ?? 0.3, d / 2); return clamp(Math.min(fi > 0 ? (t - c.in) / fi : 1, fo > 0 ? (c.out - t) / fo : 1), 0, 1); };
function clipSrcTime(c, t, dur) { let s = (c.off || 0) + (t - c.in); if (c.loop && dur > 0) s = s % dur; return s; }
function drawClips(ctx, W, H, t, layer) {
  for (const c of P.clips || []) {
    if (c.kind !== "media" || t < c.in || t >= c.out) continue;
    const isPip = c.fit === "pip"; if ((layer === "full") === isPip) continue;
    const m = MEDIA.get(c.mid); if (!m || !m.el) continue;
    const el = m.el, sw = m.type === "video" ? el.videoWidth : el.naturalWidth, sh = m.type === "video" ? el.videoHeight : el.naturalHeight;
    if (!sw || (m.type === "video" && el.readyState < 2)) continue;
    ctx.save(); ctx.globalAlpha = clipFade(c, t);
    if (!isPip) { if (c.fit === "contain") { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); } drawMedia(ctx, el, sw, sh, W, H, c.fit); }
    else {
      const w = W * c.pw / 100, h = w * sh / sw, x = W * c.px / 100 - w / 2, y = H * c.py / 100 - h / 2, r = Math.min(W, H) * (c.rad || 0) / 100;
      ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = Math.min(W, H) * 0.03; ctx.fillStyle = "#000"; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.shadowBlur = 0;
      ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip(); ctx.drawImage(el, x, y, w, h); ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.004); rr(ctx, x, y, w, h, r); ctx.stroke();
    }
    ctx.restore();
  }
}
/* preview: keep <video>/<audio> elements in step with the clock */
function syncClips(t, playing) {
  A.volume = clamp(P.mainVol ?? 1, 0, 1);
  for (const c of P.clips || []) {
    const m = MEDIA.get(c.mid); if (!m || !m.el || m.type === "image") continue;
    const el = m.el, on = t >= c.in && t < c.out, dur = el.duration || 0;
    if (!on) { if (!el.paused) el.pause(); continue; }
    const want = clipSrcTime(c, t, dur);
    if (c.kind === "audio") el.volume = clamp((c.vol ?? 1) * clipFade(c, t), 0, 1);
    if (playing) { if (el.paused) { try { el.currentTime = want; } catch { } el.play().catch(() => { }); } else if (Math.abs(el.currentTime - want) > 0.3) el.currentTime = want; }
    else { if (!el.paused) el.pause(); if (Math.abs(el.currentTime - want) > 0.08 && !el.seeking) try { el.currentTime = want; } catch { } }
  }
}
/* export: seek every visible video clip to the frame time */
async function seekClipsForExport(t) {
  for (const c of P.clips || []) { if (c.kind !== "media" || t < c.in || t >= c.out) continue; const m = MEDIA.get(c.mid); if (m && m.type === "video") await seekVideoTo(m.el, clipSrcTime(c, t, m.el.duration || 0)); }
}
async function seekVideoTo(v, s) {
  if (!v || !(v.duration > 0)) return; s = clamp(s, 0, v.duration - 0.01); if (Math.abs(v.currentTime - s) < 0.001) return;
  await new Promise(res => { const done = () => { v.removeEventListener("seeked", done); res(); }; v.addEventListener("seeked", done); v.currentTime = s; setTimeout(done, 400); });
}
/* export: mix song + audio clips into the offline context (mirrors index.html) */
async function mixClipsInto(oc) {
  for (const c of P.clips || []) {
    if (c.kind !== "audio") continue; const cb = await decodeMedia(c.mid); if (!cb) continue;
    const sc = oc.createBufferSource(), gc = oc.createGain(), dl = Math.max(0.05, c.out - c.in), v0 = c.vol ?? 1, fi = Math.min(c.fadeIn ?? 0.2, dl / 2), fo = Math.min(c.fadeOut ?? 0.3, dl / 2);
    sc.buffer = cb; sc.loop = !!c.loop; if (sc.loop) { sc.loopStart = 0; sc.loopEnd = cb.duration; }
    sc.connect(gc); gc.connect(oc.destination);
    gc.gain.setValueAtTime(0, c.in); gc.gain.linearRampToValueAtTime(v0, c.in + Math.max(0.005, fi)); gc.gain.setValueAtTime(v0, Math.max(c.in + fi + 0.006, c.out - fo)); gc.gain.linearRampToValueAtTime(0, c.out);
    const off = c.loop ? (c.off || 0) % Math.max(0.01, cb.duration) : c.off || 0; if (off < cb.duration || c.loop) sc.start(c.in, off); sc.stop(c.out);
  }
}
