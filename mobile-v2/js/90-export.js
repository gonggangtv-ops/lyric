/* =====================================================================
   EXPORT — WebCodecs → MP4 (H.264/AAC) or WebM (VP9/Opus), on device
   ===================================================================== */
const EX = { res: 1080, fps: 30, fmt: "mp4", method: "frame", cancel: false, running: false, url: "", file: null };
function openExport() {
  if (!timed().length) return toast("ซิงค์เวลาอย่างน้อย 1 บรรทัดก่อน");
  pause(); $("#exportSheet").hidden = false; showEx("config");
  [["#exRes", EX.res], ["#exFps", EX.fps], ["#exFmt", EX.fmt], ["#exMethod", EX.method]].forEach(([s, v]) => $$(s + " button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === String(v))))); infoEx();
  if (!("VideoEncoder" in window)) { EX.method = "live"; $$("#exMethod button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === "live"))); $("#exInfo").innerHTML += "<br>เครื่องนี้ไม่รองรับการเรนเดอร์ทีละเฟรม จึงใช้แบบ 🔴 อัดสดแทน"; }
}
function showEx(s) { $("#exConfig").hidden = s !== "config"; $("#exRun").hidden = s !== "run"; $("#exDone").hidden = s !== "done"; }
function exportDims() { const [bw, bh] = RATIOS[P.ratio], k = EX.res / 1080; return [even(bw * k), even(bh * k)]; }
function exportDuration() { const tl = timed(), last = tl.length ? tl[tl.length - 1].end + 1 : 5, clips = Math.max(0, ...(P.clips || []).map(c => c.out)); return Math.max(M.audio && (M.buf || A.duration) ? (M.buf ? M.buf.duration : A.duration) : last, clips); }
function infoEx() {
  const [w, h] = exportDims(), d = exportDuration(), mb = Math.round(clamp(w * h * EX.fps * 0.09, 2e6, 30e6) * d / 8 / 1048576);
  $("#exInfo").innerHTML = `${w}×${h} • ${EX.fps}fps • ยาว ${fmt(d, 0)} • ไฟล์ราว ${mb} MB${M.buf ? "" : (M.audio ? "<br>⚠ วิเคราะห์เสียงไม่สำเร็จ ไฟล์ที่ได้อาจไม่มีเสียง" : "<br>ไม่ได้เลือกเพลง ไฟล์จะไม่มีเสียง")}${EX.res >= 1440 ? "<br>⚠ ความละเอียดสูง ใช้เวลานานและต้องใช้เครื่องแรง" : ""}`;
}
$("#btnExport").onclick = openExport;
$("#exClose").onclick = () => { if (EX.running) return toast("กำลังเรนเดอร์ กด “ยกเลิก” ก่อน"); $("#exportSheet").hidden = true; };
$$("#exRes button").forEach(b => b.onclick = () => { EX.res = +b.dataset.v; openExport(); });
$$("#exFps button").forEach(b => b.onclick = () => { EX.fps = +b.dataset.v; openExport(); });
$$("#exFmt button").forEach(b => b.onclick = () => { EX.fmt = b.dataset.v; openExport(); });
$$("#exMethod button").forEach(b => b.onclick = () => { EX.method = b.dataset.v; openExport(); });
$("#exCancel").onclick = () => { EX.cancel = true; $("#exStatus").textContent = "กำลังยกเลิก…"; };

async function pickCodecs(W, H, fps, needAudio) {
  const vb = clamp(Math.round(W * H * fps * 0.09), 2e6, 40e6);
  const mp4 = { c: "mp4", v: ["avc1.640034", "avc1.4d0034", "avc1.42001f"], a: "mp4a.40.2", am: "aac", mime: "video/mp4", ext: "mp4" };
  const webm = { c: "webm", v: ["vp09.00.10.08", "vp8"], a: "opus", am: "A_OPUS", mime: "video/webm", ext: "webm" };
  for (const p of EX.fmt === "webm" ? [webm, mp4] : [mp4, webm]) {
    let vcodec = null;
    for (const v of p.v) { try { const r = await VideoEncoder.isConfigSupported({ codec: v, width: W, height: H, bitrate: vb, framerate: fps }); if (r.supported) { vcodec = v; break; } } catch { } }
    if (!vcodec) continue;
    if (needAudio) { try { if (!("AudioEncoder" in window)) continue; const r = await AudioEncoder.isConfigSupported({ codec: p.a, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }); if (!r.supported) continue; } catch { continue; } }
    return { ...p, vcodec, vb };
  }
  return null;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function seekVideo(v, t) {
  if (!v || !v.duration) return; const target = t % v.duration; if (Math.abs(v.currentTime - target) < 0.001) return;
  await new Promise(res => { const done = () => { v.removeEventListener("seeked", done); res(); }; v.addEventListener("seeked", done); v.currentTime = target; setTimeout(done, 400); });
}
async function runExport() {
  if (EX.method === "live" || !("VideoEncoder" in window)) return runLiveExport();
  const [W, H] = exportDims(), fps = EX.fps, total = exportDuration(), N = Math.ceil(total * fps), hasA = !!M.buf || (P.clips || []).some(c => c.kind === "audio");
  const plan = await pickCodecs(W, H, fps, hasA);
  if (!plan) { $("#exInfo").textContent = "อุปกรณ์นี้เข้ารหัสวิดีโอที่ความละเอียด/เสียงนี้ไม่ได้ ลองลดเป็น 720p หรือ 30fps"; return; }
  EX.cancel = false; EX.running = true; showEx("run"); const bar = $("#exBar"), status = $("#exStatus"); bar.style.width = "0%";
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d");
  let enc = null, aenc = null, wake = null;
  try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch { }
  const vidWasPlaying = M.bgVid && !M.bgVid.paused; if (M.bgVid) M.bgVid.pause();
  try {
    status.textContent = "กำลังโหลดฟอนต์…";
    const fonts = new Set([P.text.font, ...P.lines.filter(l => l.o && l.o.font).map(l => l.o.font)]);
    try { await Promise.all([...fonts].map(f => document.fonts.load(`700 48px "${f}"`, "กขคabcABC"))); } catch { } layoutCache.clear();
    const isMp4 = plan.c === "mp4", target = isMp4 ? new Mp4Muxer.ArrayBufferTarget() : new WebMMuxer.ArrayBufferTarget();
    const audioCfg = hasA ? { codec: plan.am, numberOfChannels: 2, sampleRate: 48000 } : undefined;
    const mux = isMp4 ? new Mp4Muxer.Muxer({ target, video: { codec: "avc", width: W, height: H, frameRate: fps }, audio: audioCfg, fastStart: "in-memory" })
      : new WebMMuxer.Muxer({ target, video: { codec: plan.vcodec.startsWith("vp09") ? "V_VP9" : "V_VP8", width: W, height: H, frameRate: fps }, audio: audioCfg });
    let verr = null;
    enc = new VideoEncoder({ output: (c, m) => mux.addVideoChunk(c, m), error: e => { verr = e; } });
    const vcfg = { codec: plan.vcodec, width: W, height: H, bitrate: plan.vb, framerate: fps }; if (isMp4) vcfg.avc = { format: "avc" };
    enc.configure(vcfg);
    const useVid = P.bg.type === "video" && M.bgVid; (P.clips || []).forEach(c => { const m = MEDIA.get(c.mid); if (m && m.el && !m.el.paused) m.el.pause(); });
    if (useVid) await new Promise(r => { if (M.bgVid.readyState >= 2) r(); else { M.bgVid.addEventListener("loadeddata", r, { once: true }); setTimeout(r, 1500); } });
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      if (EX.cancel) throw new Error("cancel"); if (verr) throw verr;
      const t = i / fps; if (useVid) await seekVideo(M.bgVid, t); await seekClipsForExport(t);
      render(cx, W, H, t);
      const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      enc.encode(vf, { keyFrame: i % (fps * 2) === 0 }); vf.close();
      while (enc.encodeQueueSize > 6) await wait(4);
      if (i % 4 === 0) { const p = i / N; bar.style.width = (p * 88).toFixed(1) + "%"; const el2 = (performance.now() - t0) / 1000, eta = p > 0.03 ? el2 / p - el2 : 0; status.textContent = `เรนเดอร์เฟรม ${i + 1}/${N}` + (eta ? ` • เหลือราว ${fmt(eta, 0)}` : ""); await wait(0); }
    }
    await enc.flush(); enc.close(); enc = null; if (verr) throw verr;
    if (hasA) {
      status.textContent = "กำลังมิกซ์เสียง…"; bar.style.width = "90%"; await wait(20);
      const oc = new OfflineAudioContext(2, Math.ceil(total * 48000), 48000);
      if (M.buf) { const src = oc.createBufferSource(), mv = clamp(P.mainVol ?? 1, 0, 1); src.buffer = M.buf;
        const g = oc.createGain(), dEnd = M.buf.duration; g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(mv, 0.01); g.gain.setValueAtTime(mv, Math.max(0.02, dEnd - 0.04)); g.gain.linearRampToValueAtTime(0, dEnd);
        src.connect(g); g.connect(oc.destination); src.start(0); }
      await mixClipsInto(oc);
      const rb = await oc.startRendering(); if (EX.cancel) throw new Error("cancel");
      let aerr = null; aenc = new AudioEncoder({ output: (c, m) => mux.addAudioChunk(c, m), error: e => { aerr = e; } });
      aenc.configure({ codec: plan.a, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
      const tot = rb.length, step = 4800, L0 = rb.getChannelData(0), R0 = rb.numberOfChannels > 1 ? rb.getChannelData(1) : L0;
      let pk = 0; for (let i = 0; i < tot; i++) { const a = Math.abs(L0[i]), b = Math.abs(R0[i]); if (a > pk) pk = a; if (b > pk) pk = b; }
      if (pk > 0.97) { const gn = 0.97 / pk; for (let i = 0; i < tot; i++) { L0[i] *= gn; if (R0 !== L0) R0[i] *= gn; } } // avoid clipping when clips are mixed in
      for (let p = 0; p < tot; p += step) {
        const n = Math.min(step, tot - p), bf = new Float32Array(n * 2); bf.set(L0.subarray(p, p + n), 0); bf.set(R0.subarray(p, p + n), n);
        const ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(p / 48000 * 1e6), data: bf });
        aenc.encode(ad); ad.close(); if (aerr) throw aerr; if ((p / step) % 40 === 0) { bar.style.width = (90 + p / tot * 8) + "%"; await wait(0); }
      }
      await aenc.flush(); aenc.close(); aenc = null; if (aerr) throw aerr;
    }
    status.textContent = "กำลังรวมไฟล์…"; bar.style.width = "99%"; await wait(20);
    mux.finalize(); const blob = new Blob([target.buffer], { type: plan.mime });
    if (EX.url) URL.revokeObjectURL(EX.url); EX.url = URL.createObjectURL(blob);
    const fname = (P.title || M.name || "lyric-video") + "." + plan.ext;
    $("#result").src = EX.url; const sv = $("#exSave"); sv.href = EX.url; sv.download = fname;
    EX.file = new File([blob], fname, { type: plan.mime });
    $("#exShare").hidden = !(navigator.canShare && navigator.canShare({ files: [EX.file] }));
    const secs = ((performance.now() - t0) / 1000).toFixed(0);
    $("#exDoneInfo").textContent = `${plan.ext.toUpperCase()} • ${W}×${H} • ${(blob.size / 1048576).toFixed(1)} MB • เรนเดอร์ ${secs} วินาที` + (hasA ? "" : " • ไม่มีเสียง") + (EX.fmt === "mp4" && plan.c === "webm" ? " • เครื่องนี้ไม่มี H.264 จึงใช้ WebM" : "");
    bar.style.width = "100%"; showEx("done");
  } catch (err) {
    if (err && err.message === "cancel") { showEx("config"); toast("ยกเลิก Export แล้ว"); }
    else { console.error(err); showEx("config"); $("#exInfo").textContent = "เรนเดอร์ไม่สำเร็จ: " + (err && err.message || err) + " — ลองลดความละเอียด/เฟรมเรต"; }
  } finally {
    try { enc && enc.state !== "closed" && enc.close(); } catch { } try { aenc && aenc.state !== "closed" && aenc.close(); } catch { }
    try { wake && wake.release(); } catch { } EX.running = false; if (vidWasPlaying && M.bgVid) M.bgVid.play().catch(() => { });
  }
}
$("#exGo").onclick = runExport;
$("#exShare").onclick = async () => { try { await navigator.share({ files: [EX.file], title: P.title || M.name || "LyricVerse" }); } catch { } };
