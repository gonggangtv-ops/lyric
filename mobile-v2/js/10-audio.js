/* =====================================================================
   audio: playback clock + offline analysis (RMS envelope, log spectrum, beats)
   Everything the renderer reads is precomputed, so preview == export.
   ===================================================================== */
const M = { audio: null, name: "", url: "", buf: null, env: null, spec: null, beats: null, peaks: null,
  bgImg: null, bgVid: null, bgName: "", bgUrl: "" };
const A = new Audio(); A.preload = "auto"; A.playsInline = true;
const clock = { t: 0, playing: false, last: 0 };
const AFPS = 30, NB = 64;                       // analysis frame rate & spectrum bands

function duration() {
  if (M.audio) return A.duration && isFinite(A.duration) ? A.duration : (M.buf ? M.buf.duration : 0);
  const tl = timed(); return Math.max(10, tl.length ? tl[tl.length - 1].end + 1 : 10);
}
const now = () => M.audio ? A.currentTime : clock.t;
const isPlaying = () => M.audio ? !A.paused && !A.ended : clock.playing;

/* ---------- radix-2 FFT (in place) ---------- */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j], k = i + j + len / 2, vr = re[k] * cr - im[k] * ci, vi = re[k] * ci + im[k] * cr;
        re[i + j] = ur + vr; im[i + j] = ui + vi; re[k] = ur - vr; im[k] = ui - vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

async function analyse(buf, onProgress) {
  const sr = buf.sampleRate, hop = sr / AFPS, n = Math.ceil(buf.length / hop), N = 2048;
  const d0 = buf.getChannelData(0), d1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : d0;
  const env = new Float32Array(n), spec = new Float32Array(n * NB), win = new Float32Array(N), re = new Float32Array(N), im = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  // log-spaced band edges 35 Hz … 16 kHz
  const edges = []; for (let b = 0; b <= NB; b++) edges.push(Math.round(35 * Math.pow(16000 / 35, b / NB) / (sr / N)));
  let t0 = performance.now();
  for (let f = 0; f < n; f++) {
    const c = Math.floor(f * hop); let s = 0;
    for (let i = 0; i < N; i++) { const j = c - N / 2 + i; const v = j >= 0 && j < buf.length ? (d0[j] + d1[j]) * 0.5 : 0; re[i] = v * win[i]; im[i] = 0; if (i % 2 === 0) s += v * v; }
    env[f] = Math.sqrt(s / (N / 2));
    fft(re, im);
    for (let b = 0; b < NB; b++) {
      const lo = Math.max(1, edges[b]), hi = Math.max(lo + 1, edges[b + 1]); let m = 0;
      for (let k = lo; k < hi && k < N / 2; k++) m = Math.max(m, Math.hypot(re[k], im[k]));
      spec[f * NB + b] = m;
    }
    if (performance.now() - t0 > 30) { onProgress && onProgress(f / n); await new Promise(r => setTimeout(r, 0)); t0 = performance.now(); }
  }
  // normalise: envelope by 95th pct, spectrum to dB per band
  const srt = Float32Array.from(env).sort(), p95 = srt[Math.floor(srt.length * 0.95)] || 1;
  for (let i = 0; i < n; i++) env[i] = clamp(env[i] / p95, 0, 1);
  let gmax = 1e-9; for (let i = 0; i < spec.length; i++) gmax = Math.max(gmax, spec[i]);
  for (let i = 0; i < spec.length; i++) { const db = 20 * Math.log10(spec[i] / gmax + 1e-9); spec[i] = clamp((db + 62) / 56, 0, 1); }
  // tilt: lift highs a bit so bars aren't all bass
  for (let f = 0; f < n; f++) for (let b = 0; b < NB; b++) spec[f * NB + b] = clamp(spec[f * NB + b] * (0.82 + 0.4 * b / NB), 0, 1);
  // onset/beat strength from low-band flux
  const beats = new Float32Array(n); let avg = 0;
  for (let f = 1; f < n; f++) { let fl = 0; for (let b = 0; b < 12; b++) fl += Math.max(0, spec[f * NB + b] - spec[(f - 1) * NB + b]); avg = avg * 0.92 + fl * 0.08; beats[f] = clamp((fl - avg * 1.4) * 4, 0, 1); }
  const P2 = 140, peaks = new Float32Array(P2); for (let i = 0; i < P2; i++) { let m = 0; for (let j = Math.floor(i / P2 * n); j < Math.floor((i + 1) / P2 * n); j++) m = Math.max(m, env[j]); peaks[i] = m; }
  M.env = env; M.spec = spec; M.beats = beats; M.peaks = peaks; vizCache.key = "";
}

/* ---------- readers (pure functions of t) ---------- */
function sampleArr(arr, t) { if (!arr) return 0; const x = t * AFPS, i = Math.floor(x), f = x - i, a = arr[clamp(i, 0, arr.length - 1)], b = arr[clamp(i + 1, 0, arr.length - 1)]; return a + (b - a) * f; }
function level(t) { return M.env ? sampleArr(M.env, t) : 0.38 + 0.22 * Math.sin(t * 2.9) * Math.sin(t * 1.27); }
function beatAt(t) {
  if (M.beats) { let m = 0; const i = Math.floor(t * AFPS); for (let k = 0; k < 6; k++) { const j = i - k; if (j >= 0 && j < M.beats.length) m = Math.max(m, M.beats[j] * Math.exp(-k / 2.2)); } return m; }
  const ph = (t * 2) % 1; return Math.exp(-ph * 6);   // demo: 120bpm pulse
}
/* smoothed spectrum honouring attack/decay/smoothing — recomputed only when params change */
const vizCache = { key: "", data: null };
function vizSpec() {
  if (!M.spec) return null;
  const v = P.viz, key = [v.attack, v.decay, v.smooth, M.spec.length].join("|");
  if (vizCache.key === key) return vizCache.data;
  const n = M.spec.length / NB, out = new Float32Array(M.spec.length), att = 0.2 + v.attack * 0.8, dec = 0.04 + v.decay * 0.5;
  const prev = new Float32Array(NB);
  for (let f = 0; f < n; f++) for (let b = 0; b < NB; b++) {
    const x = M.spec[f * NB + b], p = prev[b], y = x > p ? p + (x - p) * att : p + (x - p) * dec; prev[b] = y;
    out[f * NB + b] = y;
  }
  if (v.smooth > 0) { const tmp = new Float32Array(NB), r = Math.round(v.smooth * 2); for (let f = 0; f < n; f++) { for (let b = 0; b < NB; b++) { let s = 0, c = 0; for (let d = -r; d <= r; d++) { const bb = b + d; if (bb >= 0 && bb < NB) { s += out[f * NB + bb]; c++; } } tmp[b] = s / c; } out.set(tmp, f * NB); } }
  vizCache.key = key; vizCache.data = out; return out;
}
/* n bands at time t, 0..1, after sensitivity & low-cut */
function bands(t, n) {
  const v = P.viz, res = new Float32Array(n), d = vizSpec(), lo = Math.floor(v.low * NB * 0.5);
  if (!d) { for (let i = 0; i < n; i++) { const u = i / n; res[i] = clamp((0.25 + 0.55 * Math.abs(Math.sin(t * (1.6 + u * 3.1) + i * 1.7)) * (1 - u * 0.5)) * (0.6 + 0.4 * Math.sin(t * 2.3)) * v.sens, 0, 1); } return res; }
  const fr = clamp(t * AFPS, 0, d.length / NB - 1), f0 = Math.floor(fr), f1 = Math.min(f0 + 1, d.length / NB - 1), ff = fr - f0;
  for (let i = 0; i < n; i++) {
    const b = lo + (i / n) * (NB - lo), b0 = Math.floor(b), bf = b - b0, b1 = Math.min(b0 + 1, NB - 1);
    const a = lerp(d[f0 * NB + b0], d[f0 * NB + b1], bf), c = lerp(d[f1 * NB + b0], d[f1 * NB + b1], bf);
    res[i] = clamp(Math.pow(lerp(a, c, ff), 1.35) * v.sens * 1.15, 0, 1);
  }
  return res;
}

/* ---------- playback ---------- */
function play() {
  if (M.audio) { if (A.ended) A.currentTime = 0; A.play().catch(() => toast("เล่นเสียงไม่ได้ ลองแตะอีกครั้ง")); }
  else { if (clock.t >= duration()) clock.t = 0; clock.playing = true; clock.last = 0; }
  updatePlayBtn();
}
function pause() { if (M.audio) A.pause(); else clock.playing = false; updatePlayBtn(); }
function seek(t) { t = clamp(t, 0, Math.max(0, duration())); if (M.audio) A.currentTime = t; else clock.t = t; }
async function loadAudioFile(f, restore = false) {
  pause(); if (M.url) URL.revokeObjectURL(M.url);
  M.audio = f; M.name = f.name.replace(/\.[^.]+$/, ""); M.url = URL.createObjectURL(f); M.buf = M.env = M.spec = M.beats = M.peaks = null;
  A.src = M.url; A.load(); seek(0);
  if (!restore) idbPut("song", { blob: f, name: f.name, type: f.type });
  if (!restore && !P.title && !P.artist) { const m = M.name.split(/\s+-\s+/); if (m.length >= 2) { P.artist = m[0].trim(); P.title = m.slice(1).join(" - ").trim(); } else P.title = M.name; save(); }
  changed("audio"); if (!restore) toast("กำลังวิเคราะห์เสียง…");
  try {
    const ab = await f.arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
    M.buf = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)); try { ctx.close(); } catch { }
    await analyse(M.buf, p => { const e = $("#songMeta"); if (e) e.textContent = "วิเคราะห์เสียง " + Math.round(p * 100) + "%"; });
    changed("audio"); toast((restore ? "🎵 เปิดเพลงเดิมแล้ว • " : "พร้อมแล้ว • ") + fmt(M.buf.duration, 0));
  } catch (err) { console.warn(err); changed("audio"); toast("เล่นได้ แต่วิเคราะห์เสียงไม่ได้ (ส่งออกอาจไม่มีเสียง)"); }
}
