/* =====================================================================
   Auto-Sync: (1) vocal-gap detection on device, (2) AI Whisper via
   transformers.js with word timestamps + character alignment to the lyrics
   ===================================================================== */
const SYNC = { engine: "vocal", sens: 1, model: "base", lang: "auto", karOn: false, busy: false, raw: "" };

/* voice-band energy (≈250–3500 Hz) from the precomputed spectrum, 30 fps */
function voiceEnv() {
  if (!M.spec) return null;
  const n = M.spec.length / NB, out = new Float32Array(n), vb = [], ob = [];
  for (let b = 0; b < NB; b++) { const f = 35 * Math.pow(16000 / 35, (b + 0.5) / NB); (f > 250 && f < 3500 ? vb : ob).push(b); }
  for (let i = 0; i < n; i++) { let v = 0, o = 0; vb.forEach(b => v += M.spec[i * NB + b]); ob.forEach(b => o += M.spec[i * NB + b]); out[i] = Math.max(0, v / vb.length - 0.35 * o / ob.length); }
  return out;
}
/* port of index.html's __stdT: choose N-1 silent gaps closest to text-length targets (DP) */
function vocalPlan(weights, sens = 1) {
  const env = voiceEnv(); if (!env) return null;
  const dt = 1 / AFPS, n = env.length, box = w => { const o = new Float32Array(n); let a = 0; for (let i = 0; i < n; i++) { a += env[i]; if (i >= w) a -= env[i - w]; o[i] = a / Math.min(i + 1, w); } return o; };
  const sm = box(9), sg = box(3), srt = Float32Array.from(sm).sort(), p90 = srt[Math.floor(n * 0.9)] || 1, th = p90 * 0.3;
  let a0 = 0; while (a0 < n && sm[a0] < th) a0++; let a1 = n - 1; while (a1 > a0 && sm[a1] < th) a1--;
  const N = weights.length, t0 = a0 * dt, t1 = Math.max(t0 + N * 1.5, a1 * dt), tw = weights.reduce((p, c) => p + c, 0), tgt = []; let cum = 0;
  for (let k = 1; k < N; k++) { cum += weights[k - 1]; tgt.push(t0 + (t1 - t0) * cum / tw); }
  const th2 = p90 * (0.12 + 0.08 * sens), minGap = 0.3 - 0.06 * sens, gaps = [];
  for (let j = a0; j < a1;) { if (sg[j] < th2) { let e = j; while (e < a1 && sg[e] < th2) e++; if ((e - j) * dt >= minGap) gaps.push([j * dt, e * dt]); j = e; } else j++; }
  const G = gaps.length, inT = [t0], outT = []; let used = false;
  if (N > 1 && G >= N - 1) {
    const INF = 1e12, dp = [], pv = [];
    for (let k = 0; k < N - 1; k++) { dp.push(new Float64Array(G).fill(INF)); pv.push(new Int32Array(G).fill(-1));
      let best = INF, bi = -1;
      for (let g = 0; g < G; g++) { const c = Math.abs((gaps[g][0] + gaps[g][1]) / 2 - tgt[k]);
        if (k === 0) dp[k][g] = c; else { if (g > 0 && dp[k - 1][g - 1] < best) { best = dp[k - 1][g - 1]; bi = g - 1; } if (bi >= 0) { dp[k][g] = best + c; pv[k][g] = bi; } } } }
    let bg = -1, bv = 1e12; for (let g = 0; g < G; g++) if (dp[N - 2][g] < bv) { bv = dp[N - 2][g]; bg = g; }
    if (bg >= 0) { const ch = []; for (let k = N - 2; k >= 0; k--) { ch[k] = bg; bg = pv[k][bg]; } for (let k = 0; k < N - 1; k++) { outT.push(gaps[ch[k]][0] + 0.05); inT.push(gaps[ch[k]][1] - 0.02); } used = true; }
  }
  if (!used) { inT.length = 1; for (let k = 1; k < N; k++) { const bi = Math.round(tgt[k - 1] / dt); let best = bi, bv2 = 1e12; for (let j = Math.max(0, bi - 21); j <= Math.min(n - 1, bi + 21); j++) { const sc = sm[j] + Math.abs(j - bi) * p90 * 0.007; if (sc < bv2) { bv2 = sc; best = j; } } outT.push(best * dt - 0.04); inT.push(best * dt + 0.04); } }
  outT.push(t1);
  return { lines: inT.map((s, i) => ({ s: Math.max(0, s), e: Math.max(s + 0.3, outT[i] - 0.2) })), used, gaps: G };
}

/* ---------- AI (Whisper, on device via transformers.js) ---------- */
async function pcm16k() {
  const b = M.buf, oc = new OfflineAudioContext(1, Math.ceil(b.duration * 16000), 16000), s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start(0);
  return (await oc.startRendering()).getChannelData(0);
}
async function whisper(model, lang, onStatus) {
  onStatus("กำลังโหลดไลบรารี AI…");
  const tf = window.__tf || (window.__tf = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1"));
  window.__asr = window.__asr || {}; let pipe = window.__asr[model];
  if (!pipe) {
    const files = {}, prog = q => { if (q && q.status === "progress" && q.total) { files[q.file] = [q.loaded, q.total]; const v = Object.values(files), l = v.reduce((a, x) => a + x[0], 0), t = v.reduce((a, x) => a + x[1], 0); onStatus(`⬇ ดาวน์โหลดโมเดล ${Math.round(l / 1048576)}/${Math.round(t / 1048576)} MB (ครั้งแรกเท่านั้น)`); } };
    const tries = [...(navigator.gpu ? [{ device: "webgpu", dtype: { encoder_model: "fp32", decoder_model_merged: "q4" } }, { device: "webgpu", dtype: "fp32" }] : []), { device: "wasm", dtype: "q8" }, { device: "wasm", dtype: "fp32" }];
    let last; for (const o of tries) { try { pipe = await tf.pipeline("automatic-speech-recognition", "onnx-community/whisper-" + model + "_timestamped", { ...o, progress_callback: prog }); break; } catch (e) { last = e; } }
    if (!pipe) throw last; window.__asr[model] = pipe;
  }
  onStatus("🧠 กำลังฟังเสียงร้อง… (เพลงยาวอาจใช้เวลาหลายนาที)");
  const pcm = await pcm16k(), opt = { chunk_length_s: 30, stride_length_s: 5, task: "transcribe", return_timestamps: "word" }; if (lang !== "auto") opt.language = lang;
  let out; try { out = await pipe(pcm, opt); } catch { opt.return_timestamps = true; out = await pipe(pcm, opt); }
  const ch = (out && out.chunks) || []; SYNC.raw = (out && out.text) || ch.map(c => c.text || "").join("");
  return ch.filter(c => c.timestamp && c.timestamp[0] != null && !/^\s*[\[(♪].*[\])♪]\s*$/.test(c.text || "")).map(c => ({ t: c.text || "", s: c.timestamp[0], e: c.timestamp[1] != null ? c.timestamp[1] : c.timestamp[0] + 0.3 }));
}
/* group recognised words into lines when no lyrics were given */
function wordsToLines(ws) {
  const out = []; let cur = null;
  ws.forEach(w => { if (!cur || w.s - cur.e > 0.5 || cur.text.trim().length > 40 || cur.n >= 28) { cur = { text: "", s: w.s, e: w.e, n: 0, ws: [] }; out.push(cur); } cur.ws.push(w); cur.text += w.t; cur.e = w.e; cur.n++; });
  return out.filter(x => x.text.trim()).map(x => { const l = normLine({ text: x.text.trim().replace(/\s+/g, " "), start: x.s }); l.end = x.e + 0.3;
    const us = unitsOf(l.text); if (us.length === x.ws.length) l.kt = [...x.ws.map(w => Math.max(0, w.s - x.s)), x.e - x.s]; return l; });
}
/* global char alignment (Needleman–Wunsch) between lyrics and recognised text → time per lyric char */
const normCh = c => c.toLowerCase().replace(/[่-์็\s.,!?'"“”‘’\-–—…()[\]{}:;~]/g, "");
function alignLyrics(lines, ws) {
  const L = [], R = [];
  lines.forEach((l, li) => { [...l.text].forEach((c, ci) => { const n = normCh(c); if (n) L.push({ c: n, li, ci }); }); });
  ws.forEach(w => { const cs = [...w.t].map(normCh).filter(Boolean); cs.forEach((c, k) => R.push({ c, t: w.s + (w.e - w.s) * k / Math.max(1, cs.length) })); });
  const n = L.length, m = R.length; if (!n || !m) return null;
  if (n * m > 30e6) return null;
  const tb = new Uint8Array((n + 1) * (m + 1)); let prev = new Int32Array(m + 1), cur = new Int32Array(m + 1);
  for (let j = 0; j <= m; j++) { prev[j] = -j; tb[j] = 2; }
  for (let i = 1; i <= n; i++) {
    cur[0] = -i; tb[i * (m + 1)] = 1;
    for (let j = 1; j <= m; j++) {
      const d = prev[j - 1] + (L[i - 1].c === R[j - 1].c ? 2 : -1), u = prev[j] - 1, l = cur[j - 1] - 1;
      if (d >= u && d >= l) { cur[j] = d; tb[i * (m + 1) + j] = 0; } else if (u >= l) { cur[j] = u; tb[i * (m + 1) + j] = 1; } else { cur[j] = l; tb[i * (m + 1) + j] = 2; }
    }
    [prev, cur] = [cur, prev];
  }
  const tm = new Float64Array(n).fill(NaN), hit = new Uint8Array(n); let i = n, j = m;
  while (i > 0 && j > 0) { const k = tb[i * (m + 1) + j]; if (k === 0) { tm[i - 1] = R[j - 1].t; hit[i - 1] = L[i - 1].c === R[j - 1].c ? 1 : 0; i--; j--; } else if (k === 1) i--; else j--; }
  // interpolate unmatched chars
  let last = -1; for (let k = 0; k < n; k++) { if (!isNaN(tm[k])) { if (last >= 0 && k - last > 1) for (let q = last + 1; q < k; q++) tm[q] = tm[last] + (tm[k] - tm[last]) * (q - last) / (k - last); last = k; } }
  const first = tm.findIndex(x => !isNaN(x)); for (let k = 0; k < first; k++) tm[k] = tm[first]; for (let k = last + 1; k < n; k++) tm[k] = tm[last];
  return { L, tm, hit };
}
function applyAlignment(lines, al) {
  const { L, tm, hit } = al; let ok = 0;
  lines.forEach((l, li) => {
    const idx = L.map((x, k) => x.li === li ? k : -1).filter(k => k >= 0); if (!idx.length) return;
    const rate = idx.reduce((a, k) => a + hit[k], 0) / idx.length; if (rate < 0.25) return;
    l.start = Math.max(0, tm[idx[0]] - 0.05); l.end = tm[idx[idx.length - 1]] + 0.35; ok++;
    // word timing from the char times
    let pos = 0; const starts = [];
    for (const u of words(l.text)) { if (u.trim()) { const k = idx.find(q => L[q].ci >= pos); starts.push(k != null ? tm[k] - l.start : null); } pos += u.length; }
    if (starts.every(x => x != null)) { for (let q = 1; q < starts.length; q++) starts[q] = Math.max(starts[q], starts[q - 1] + 0.04); l.kt = [...starts, Math.max(starts[starts.length - 1] + 0.2, l.end - l.start)]; }
  });
  // lines that failed: place between neighbours
  lines.forEach((l, li) => { if (l.start != null) return; let a = li - 1; while (a >= 0 && lines[a].start == null) a--; let b = li + 1; while (b < lines.length && lines[b].start == null) b++;
    const s = a >= 0 ? lines[a].end || lines[a].start + 2 : 0, e = b < lines.length ? lines[b].start : s + 3 * (b - a); l.start = s + (e - s) * (li - a) / (b - a); l.end = null; });
  return ok;
}

async function runAutoSync() {
  if (SYNC.busy) return;
  const texts = P.lines.map(l => l.text), st = $("#asStatus");
  if (!M.buf) return toast("อัพโหลดเพลงก่อน (ต้องวิเคราะห์เสียงได้)");
  if (!texts.length && SYNC.engine !== "ai") return toast("วางเนื้อเพลงก่อน หรือเลือกโหมด AI เพื่อถอดเนื้อเพลงจากเสียง");
  SYNC.busy = true; $("#asGo").disabled = true; const set = s => st.textContent = s;
  try {
    if (SYNC.engine === "vocal") {
      set("🎯 กำลังหาช่วงที่มีเสียงร้อง…"); await wait(30);
      const plan = vocalPlan(P.lines.map(l => 2 + graphemes(l.text).length), SYNC.sens);
      plan.lines.forEach((x, i) => { P.lines[i].start = +x.s.toFixed(2); P.lines[i].end = +x.e.toFixed(2); P.lines[i].kt = null; });
      set(plan.used ? `✅ พบช่วงเงียบ ${plan.gaps} ช่วง จัด ${P.lines.length} ท่อนตรงช่วงที่เสียงขาดตอน` : `≈ ช่วงเงียบไม่พอ (${plan.gaps}) จึงประมาณจากความยาวข้อความ • ลองปรับความไว`);
    } else {
      const ws = await whisper(SYNC.model, SYNC.lang, set);
      if (!ws.length) throw new Error("ไม่พบเสียงร้องที่ถอดได้");
      if (!texts.length) { const ls = wordsToLines(ws); setLines(ls); $("#txt").value = ls.map(l => l.text).join("\n"); set(`✅ ถอดเนื้อเพลงได้ ${ls.length} ท่อน • ตรวจแก้คำผิดที่แท็บ “เนื้อ”`); }
      else {
        P.lines.forEach(l => { l.start = null; l.end = null; l.kt = null; });
        const al = alignLyrics(P.lines, ws); if (!al) throw new Error("จับคู่เนื้อเพลงไม่ได้");
        const ok = applyAlignment(P.lines, al); set(`✅ AI จับคู่ได้ ${ok}/${P.lines.length} ท่อน (มีเวลารายคำ) • ที่เหลือประมาณให้`);
      }
    }
    if (SYNC.karOn) P.kar.on = true;
    changed("lines"); buildLines(); updateNow(); refreshProgress(); refreshLyricsStat();
    $("#asRaw").textContent = SYNC.raw ? "ผลที่ AI ถอดได้: " + SYNC.raw : "";
  } catch (e) {
    console.error(e); set((SYNC.engine === "ai" ? "โหลด/ใช้โมเดล AI ไม่สำเร็จ (ต้องออนไลน์ครั้งแรก): " : "Auto-Sync ไม่สำเร็จ: ") + (e && e.message || e));
  } finally { SYNC.busy = false; $("#asGo").disabled = false; }
}
function openAutoSync() {
  $("#autoSheet").hidden = false;
  buildControls($("#asBody"), [
    { t: "seg", k: "engine", o: [["vocal", "จับช่วงเสียงร้อง (ในเครื่อง)"], ["ai", "AI ฟังเสียงร้อง"]] },
    { t: "note", l: "ในเครื่อง: เร็ว ใช้ช่วงที่เสียงขาดตอนเป็นจุดแบ่งท่อน • AI (Whisper): แม่นกว่าและได้เวลารายคำ ต้องดาวน์โหลดโมเดลครั้งแรก (ต้องออนไลน์) และใช้เวลาประมวลผลนาน • ถ้าเนื้อเพลงว่าง AI จะถอดเนื้อให้" },
    { t: "seg", k: "sens", l: "ความไว", num: true, o: [[0.2, "รวมมาก"], [0.6, "รวม"], [1, "ปกติ"], [1.6, "แยก"], [2.2, "แยกมาก"]], show: () => SYNC.engine === "vocal" },
    { t: "seg", k: "model", l: "โมเดล", o: [["tiny", "เล็ก ~40MB"], ["base", "กลาง ~80MB"], ["small", "ใหญ่ ~250MB"]], show: () => SYNC.engine === "ai" },
    { t: "chips", k: "lang", l: "ภาษา", o: [["auto", "อัตโนมัติ"], ["th", "ไทย"], ["en", "English"], ["ja", "日本語"], ["ko", "한국어"], ["zh", "中文"]], show: () => SYNC.engine === "ai" },
    { t: "switch", k: "karOn", l: "🎤 เปิดไฮไลต์ทีละคำหลังซิงค์" },
  ], { get: k => SYNC[k], set: (k, v) => SYNC[k] = v }, () => { });
  $("#asStatus").textContent = M.buf ? `${P.lines.length} บรรทัด • เพลงยาว ${fmt(M.buf.duration, 0)}` : "ยังไม่มีเพลง"; $("#asRaw").textContent = "";
}
$("#btnAuto").onclick = openAutoSync;
$("#asGo").onclick = runAutoSync;
$("#asClose").onclick = () => { if (SYNC.busy) return toast("กำลังทำงาน รอสักครู่"); $("#autoSheet").hidden = true; };
