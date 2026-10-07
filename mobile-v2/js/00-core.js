"use strict";
/* =====================================================================
   LyricVerse Mobile — core: utils, defaults, project state, persistence
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const even = n => Math.max(2, Math.round(n / 2) * 2);
const fmt = (t, d = 1) => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(d); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const clone = o => JSON.parse(JSON.stringify(o));
const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null || typeof a[ks[i]] !== "object") a[ks[i]] = {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; };
function deepMerge(base, over) {
  if (!over || typeof over !== "object") return base;
  for (const k of Object.keys(over)) {
    const v = over[k];
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) deepMerge(base[k], v);
    else base[k] = v;
  }
  return base;
}
/* deterministic pseudo-random (export must be a pure function of time) */
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }
const rnd = (i, k = 0) => hash(i * 7919 + k * 104729 + 13);
function hexRgb(h) { h = (h || "#fff").replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const rgba = (hex, a) => { const c = hexRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
function mixHex(a, b, t) { const x = hexRgb(a), y = hexRgb(b); return "#" + x.map((v, i) => Math.round(lerp(v, y[i], t)).toString(16).padStart(2, "0")).join(""); }

const RATIOS = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] };
const FONTS = ["Kanit", "Prompt", "Sarabun", "Mitr", "Pridi", "Chakra Petch", "Itim", "Bai Jamjuree", "Inter", "Pacifico"];

/* ---------------- defaults (one place, used by migrations & reset) ---------------- */
const DEF = () => ({
  v: 3,
  title: "", artist: "",
  ratio: "9:16",
  mode: "normal",            // normal | karaoke | stream
  mood: null,
  lines: [],
  text: {
    font: "Kanit", size: 9, weight: 800, italic: false, color: "#ffffff",
    stroke: "#000000", strokeW: 0, glow: true, glowColor: "#ff2d7b", glowStr: 0.55, shadow: true,
    letterSpacing: 0, lineHeight: 1.3, align: "center", x: 50, y: 46, rot: 0, scale: 1,
    fx: "none", c2: "#ff2d7b", angle: 90, depthColor: "#7c3aed", depth: 6,
    vertical: false, hold: false, holdMax: 5, holdInf: false, showNext: true,
  },
  anim: { type: "slideUp", dur: 0.6, delay: 0, ease: "easeOut", loop: "none", exit: "fade", exitDur: 0.3, random: false, pool: [] },
  kar: {
    on: false, sung: "#ff2d7b", style: "smooth", wfx: "none", wmotion: "none", wfxColor: "pastel", wfxAmt: 0.6, wfxSize: 1,
    reveal: false, revealAnim: "float", revealDur: 0.35, ghost: true,
  },
  tv: { set: "tvthai", size: 7, romSize: 55, strokeW: 6, rom: true, romCase: "lower", showNext: true, split: true, dots: true, bottom: 84,
        colors: { pre: "#ffffff", preStroke: "#1e3a8a", post: "#1d4ed8", postStroke: "#ffffff", rom: "#fde68a" } },
  stream: { align: "center", size: 6.5, top: 46, dim: 35, card: "#000000", glow: "#ff2d7b", blur: true, rom: false, fill: true },
  bg: {
    type: "gradient", colors: ["#0f0c29", "#302b63", "#24243e"], angle: 160, solid: "#000000", dim: 15, fit: "cover",
    filter: "none", blur: 0, bright: 100, contrast: 100, sat: 100, kbAmt: 0.12, beat: 0,
  },
  fx: {
    aurora: false, blobs: false, synth: false, stars: false, rays: false, beams: false, flare: false, leak: false, spark: false, firefly: false,
    snow: false, rain: false, fog: false, particles: false, petals: false, bubbles: false, confetti: false, hrt: false, bokeh: true,
    vhs: false, grain: false, vignette: false, kenBurns: false,
    amt: 1, vigAmt: 0.55, grainAmt: 0.35,
    bokehCfg: { c1: "#ff2d7b", c2: "#7c3aed", shape: "circle", count: 14, size: 80, blur: 50, opacity: 0.28, speed: 10 },
  },
  viz: {
    on: true, mode: "bars", pos: "bottom", size: 0.5, count: 48, x: 50, height: 0.5, thick: 0.6, round: 0.6, line: 3, peaks: true, reflect: false,
    sens: 1, smooth: 0.55, attack: 0.65, decay: 0.25, beat: 0.5, low: 0, spin: 0.15,
    colorMode: "grad", c1: "#ff2d7b", c2: "#00d4ff", opacity: 0.85, glow: true, glowStr: 0.6,
  },
});

/* ---------------- project state ---------------- */
const KEY = "lyricverse_mobile_v3", OLD_KEY = "lyricverse_mobile_v2";
let P = DEF();
const UI = { tab: "song", sub: "theme", sel: -1, tapOff: 0.12 };
function normLine(l) {
  return { id: l.id || uid(), text: String(l.text || ""), start: typeof l.start === "number" ? l.start : null, end: typeof l.end === "number" ? l.end : null,
    o: l.o && typeof l.o === "object" ? l.o : null, a: l.a && typeof l.a === "object" ? l.a : null, kt: Array.isArray(l.kt) ? l.kt : null, rom: typeof l.rom === "string" ? l.rom : null };
}
function loadProject() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "null");
    if (j) { P = deepMerge(DEF(), j); P.lines = (j.lines || []).map(normLine); UI.tapOff = j._tapOff ?? 0.12; return; }
    const o = JSON.parse(localStorage.getItem(OLD_KEY) || "null"); // v2 → v3
    if (o && Array.isArray(o.lines)) {
      P.lines = o.lines.map(normLine);
      if (o.style) { const s = o.style; Object.assign(P.text, { font: s.font || "Kanit", size: s.size || 9, weight: s.weight || 800, color: s.text || "#fff", align: s.align || "center", showNext: s.showNext !== false });
        if (s.g) P.bg.colors = s.g; if (s.ratio) P.ratio = s.ratio; if (s.karaoke) P.kar.on = true; if (s.accent) P.kar.sung = s.accent; }
    }
  } catch (e) { console.warn(e); }
}
let saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify({ ...P, _tapOff: UI.tapOff })); } catch (e) { console.warn(e); } }, 350);
}
const listeners = new Set();
let timedCache = null;
/* call after any project change */
function changed(what = "all") { timedCache = null; layoutCache.clear(); save(); listeners.forEach(f => f(what)); }

/* effective per-line style / anim = project defaults + per-line overrides */
function lineStyle(l) { return l && l.o ? { ...P.text, ...l.o } : P.text; }
function lineAnim(l, idx) {
  let a = l && l.a ? { ...P.anim, ...l.a } : P.anim;
  if (P.anim.random && !(l && l.a && l.a.type)) { const pool = P.anim.pool && P.anim.pool.length ? P.anim.pool : ANIM_IDS.filter(x => x !== "none" && x !== "typewriter"); a = { ...a, type: pool[Math.floor(rnd(idx, 3) * pool.length)] }; }
  return a;
}

/* ---------------- timing ---------------- */
function timed() {
  if (!timedCache) {
    const tl = P.lines.map((l, i) => ({ i, l, start: l.start })).filter(x => x.start != null).sort((a, b) => a.start - b.start);
    tl.forEach((x, k) => {
      const nx = tl[k + 1], st = lineStyle(x.l);
      let end = x.l.end != null ? x.l.end : (nx ? nx.start : x.start + 4.5);
      if (x.l.end == null) end = Math.min(end, x.start + 12);
      if (st.hold) { const tgt = nx ? nx.start - 0.01 : 1e6; end = st.holdInf ? tgt : Math.max(end, Math.min(tgt, end + st.holdMax)); }
      x.end = Math.max(x.start + 0.2, end); x.k = k;
    });
    timedCache = tl;
  }
  return timedCache;
}
/* all lines visible at t (overlaps allowed when lines have explicit OUT) */
function activeLines(t) { return timed().filter(x => x.start - (lineAnim(x.l, x.i).delay || 0) <= t + 1e-6 && t < x.end); }
function activeAt(t) { const tl = timed(); let k = -1; for (let j = 0; j < tl.length; j++) { if (tl[j].start <= t + 1e-6) k = j; else break; } return k < 0 ? null : tl[k]; }
function nextAfter(x) { const tl = timed(); return tl[x.k + 1] || null; }
