/* =====================================================================
   TIMELINE tab: lyrics / media / audio tracks, drag to move, drag edges to
   trim, split at playhead, duplicate, copy/paste, markers, snapping, zoom
   ===================================================================== */
const TL = { pps: 40, sel: null, clip: null, dragging: null };   // sel: {kind:'line'|'clip', id}
const TRACKS = [["line", "เนื้อเพลง"], ["media", "รูป/วิดีโอ"], ["audio", "เสียงเพิ่ม"]];
const tlDur = () => Math.max(duration(), ...(P.clips || []).map(c => c.out + 1), 10);
function lineById(id) { return P.lines.find(l => l.id === id); }
function clipById(id) { return (P.clips || []).find(c => c.id === id); }
function lineEnd(l) { const x = timed().find(q => q.l === l); return x ? x.end : (l.start ?? 0) + 3; }

function buildTimeline() {
  const box = $("#tlInner"); if (!box) return;
  const W = Math.ceil(tlDur() * TL.pps) + 80; box.style.width = W + "px";
  // ruler
  const ru = $("#tlRuler"); ru.innerHTML = ""; const step = TL.pps >= 80 ? 1 : TL.pps >= 30 ? 2 : TL.pps >= 15 ? 5 : 10;
  for (let s = 0; s <= tlDur(); s += step) { const d = el("span", "tick", fmt(s, 0)); d.style.left = s * TL.pps + "px"; ru.appendChild(d); }
  (P.markers || []).forEach((m, i) => { const d = el("button", "mk", "🚩"); d.style.left = m * TL.pps + "px"; d.title = "มาร์กเกอร์ " + (i + 1); d.onclick = e => { e.stopPropagation(); seek(m); }; ru.appendChild(d); });
  // tracks
  TRACKS.forEach(([k]) => { const tr = $("#tr-" + k); tr.innerHTML = ""; tr.style.width = W + "px"; });
  timed().forEach(x => addBlock("line", x.l.id, x.start, x.end, x.l.text || "♪", $("#tr-line"), !!(x.l.o || x.l.a)));
  (P.clips || []).forEach(c => addBlock("clip", c.id, c.in, c.out, (c.kind === "audio" ? "🔊 " : (MEDIA.get(c.mid)?.type === "video" ? "🎞 " : "🖼 ")) + c.name, $(c.kind === "audio" ? "#tr-audio" : "#tr-media"), false, c.kind));
  if (!(P.clips || []).some(c => c.kind === "media")) $("#tr-media").appendChild(el("span", "tl-hint", "แตะ ➕ รูป/วิดีโอ เพื่อวางที่หัวอ่าน"));
  if (!(P.clips || []).some(c => c.kind === "audio")) $("#tr-audio").appendChild(el("span", "tl-hint", "แตะ ➕ เสียง เพื่อใส่เสียงเอฟเฟกต์/พากย์/เพลงรอง"));
  $("#tlSnap").setAttribute("aria-pressed", String(P.snap !== false));
  placePlayhead(now(), true); renderSel();
}
function addBlock(kind, id, s, e, label, track, styled, ck) {
  const b = el("div", "blk " + (kind === "clip" ? "c-" + ck : "c-line") + (TL.sel && TL.sel.id === id ? " on" : ""));
  b.style.left = s * TL.pps + "px"; b.style.width = Math.max(14, (e - s) * TL.pps) + "px"; b.dataset.id = id; b.dataset.kind = kind;
  b.innerHTML = `<i class="hl"></i><span>${styled ? "🎨 " : ""}${esc(label)}</span><i class="hr"></i>`;
  b.addEventListener("pointerdown", ev => startDrag(ev, b, kind, id));
  track.appendChild(b);
}
/* ---- snapping ---- */
function snapT(t, exclude) {
  if (P.snap === false) return Math.round(t * 20) / 20;
  const cands = [0, now(), ...(P.markers || [])];
  timed().forEach(x => { if (x.l.id !== exclude) cands.push(x.start, x.end); });
  (P.clips || []).forEach(c => { if (c.id !== exclude) cands.push(c.in, c.out); });
  const tol = 10 / TL.pps; let best = t, bd = tol; cands.forEach(c => { const d = Math.abs(c - t); if (d < bd) { bd = d; best = c; } });
  return best === t ? Math.round(t * 20) / 20 : best;
}
/* ---- drag (move / trim) ---- */
function startDrag(ev, b, kind, id) {
  ev.stopPropagation();
  const mode = ev.target.classList.contains("hl") ? "l" : ev.target.classList.contains("hr") ? "r" : "m";
  const obj = kind === "line" ? lineById(id) : clipById(id); if (!obj) return;
  const s0 = kind === "line" ? obj.start : obj.in, e0 = kind === "line" ? lineEnd(obj) : obj.out;
  TL.dragging = { kind, id, mode, x0: ev.clientX, s0, e0, moved: false, b };
  b.setPointerCapture(ev.pointerId);
  select(kind, id, false);
}
function onDragMove(ev) {
  const d = TL.dragging; if (!d) return; const dx = ev.clientX - d.x0; if (!d.moved && Math.abs(dx) < 6) return;
  if (!d.moved) { d.moved = true; if (isPlaying()) pause(); }
  const dt = dx / TL.pps, obj = d.kind === "line" ? lineById(d.id) : clipById(d.id); if (!obj) return;
  let s = d.s0, e = d.e0;
  if (d.mode === "m") { s = snapT(Math.max(0, d.s0 + dt), d.id); e = s + (d.e0 - d.s0); }
  else if (d.mode === "l") { s = clamp(snapT(d.s0 + dt, d.id), 0, d.e0 - 0.2); }
  else e = Math.max(d.s0 + 0.2, snapT(d.e0 + dt, d.id));
  if (d.kind === "line") { obj.start = +s.toFixed(3); if (d.mode !== "m" || obj.end != null) obj.end = +e.toFixed(3); }
  else { if (d.mode === "l") obj.off = Math.max(0, (obj.off || 0) + (s - obj.in)); obj.in = +s.toFixed(3); obj.out = +e.toFixed(3); }
  timedCache = null;
  d.b.style.left = s * TL.pps + "px"; d.b.style.width = Math.max(14, (e - s) * TL.pps) + "px";
  if (d.mode !== "r") seek(s); else seek(Math.max(s, e - 0.05));
  $("#tlInfo").textContent = `${fmt(s, 2)} → ${fmt(e, 2)}`;
}
function onDragEnd() { const d = TL.dragging; TL.dragging = null; if (d && d.moved) { changed("lines"); buildTimeline(); } }
addEventListener("pointermove", onDragMove); addEventListener("pointerup", onDragEnd); addEventListener("pointercancel", onDragEnd);

function select(kind, id, seekTo = true) {
  TL.sel = id ? { kind, id } : null;
  $$("#tlInner .blk").forEach(b => b.classList.toggle("on", !!id && b.dataset.id === id));
  if (seekTo && id) { const o = kind === "line" ? lineById(id) : clipById(id); if (o) seek(kind === "line" ? o.start : o.in); }
  renderSel();
}
/* tap on empty track/ruler → seek */
function tlTap(ev) { if (ev.target.closest(".blk") || ev.target.closest(".mk")) return; const r = $("#tlInner").getBoundingClientRect(); seek(clamp((ev.clientX - r.left) / TL.pps, 0, tlDur())); select(null, null, false); }

/* ---- playhead ---- */
let phLast = -1;
function placePlayhead(t, force) {
  const ph = $("#tlPh"); if (!ph || (UI.tab !== "edit" && !force)) return;
  ph.style.left = t * TL.pps + "px";
  const sc = $("#tlScroll"), x = t * TL.pps;
  if (isPlaying() && (x < sc.scrollLeft + 40 || x > sc.scrollLeft + sc.clientWidth - 60)) sc.scrollLeft = x - 60;
  if (Math.abs(t - phLast) > 0.04) { phLast = t; $("#tlTime").textContent = fmt(t, 2); }
}

/* ---- selection panel ---- */
function renderSel() {
  const box = $("#tlSel"); if (!box) return; const s = TL.sel;
  if (!s) { box.innerHTML = `<p class="mute sm">แตะบล็อกเพื่อเลือก • ลากเพื่อย้าย • ลากขอบเพื่อปรับเวลาเริ่ม/จบ • แตะพื้นที่ว่างเพื่อย้ายหัวอ่าน</p>`;
    const v = el("div"); box.appendChild(v);
    buildControls(v, [{ t: "range", k: "mainVol", l: "ความดังเพลงหลัก", min: 0, max: 1, step: 0.05, fmt: pct }]); return; }
  if (s.kind === "line") {
    const l = lineById(s.id); if (!l) return; const i = P.lines.indexOf(l);
    box.innerHTML = `<div class="row"><b class="grow">ท่อนที่ ${i + 1}: ${esc(l.text)}</b></div><p class="mono">${fmt(l.start, 2)} → ${fmt(lineEnd(l), 2)}</p>`;
    const bt = el("button", "btn sm pri block", "✏️ แก้ไขข้อความ / สไตล์ท่อนนี้"); bt.onclick = () => openLineEditor(i); box.appendChild(bt); return;
  }
  const c = clipById(s.id); if (!c) return; const m = MEDIA.get(c.mid);
  box.innerHTML = `<div class="row"><b class="grow">${c.kind === "audio" ? "🔊" : m?.type === "video" ? "🎞" : "🖼"} ${esc(c.name)}</b></div>`;
  const v = el("div"); box.appendChild(v);
  const tg = { get: k => c[k], set: (k, val) => { c[k] = val; } };
  const specs = [
    { t: "range", k: "in", l: "เริ่ม (วิ)", min: 0, max: Math.ceil(tlDur()), step: 0.05, fmt: x => fmt(x, 2) },
    { t: "range", k: "out", l: "จบ (วิ)", min: 0.2, max: Math.ceil(tlDur()), step: 0.05, fmt: x => fmt(x, 2) },
    { t: "range", k: "off", l: "เริ่มไฟล์ที่", min: 0, max: Math.max(1, Math.ceil(m?.el?.duration || 60)), step: 0.1, fmt: x => fmt(x, 1), show: () => m?.type !== "image" },
    { t: "switch", k: "loop", l: "วนซ้ำ", show: () => m?.type !== "image" },
  ];
  if (c.kind === "media") specs.push(
    { t: "chips", k: "fit", l: "การแสดง", o: FITS },
    { t: "range", k: "pw", l: "ขนาดกรอบ", min: 15, max: 100, step: 1, fmt: x => x + "%", show: () => c.fit === "pip" },
    { t: "range", k: "px", l: "แนวนอน", min: 0, max: 100, step: 1, fmt: x => x + "%", show: () => c.fit === "pip" },
    { t: "range", k: "py", l: "แนวตั้ง", min: 0, max: 100, step: 1, fmt: x => x + "%", show: () => c.fit === "pip" },
    { t: "range", k: "rad", l: "มุมโค้ง", min: 0, max: 20, step: 1, show: () => c.fit === "pip" },
    { t: "note", l: "วิดีโอในไทม์ไลน์ไม่มีเสียง (ใช้เสียงจากเพลงหลัก)", show: () => m?.type === "video" });
  else specs.push({ t: "range", k: "vol", l: "ความดัง", min: 0, max: 1.5, step: 0.05, fmt: pct });
  specs.push({ t: "range", k: "fadeIn", l: "เฟดเข้า", min: 0, max: 3, step: 0.1, fmt: sec }, { t: "range", k: "fadeOut", l: "เฟดออก", min: 0, max: 3, step: 0.1, fmt: sec },
    { t: "row", b: [{ l: "⏮ ไปที่คลิปนี้", do: () => seek(c.in) }, { l: "🗑 ลบคลิป", do: () => delSel() }] });
  buildControls(v, specs, tg, () => { if (c.out < c.in + 0.2) c.out = c.in + 0.2; changed("clips"); const b = $(`#tlInner .blk[data-id="${c.id}"]`); if (b) { b.style.left = c.in * TL.pps + "px"; b.style.width = Math.max(14, (c.out - c.in) * TL.pps) + "px"; } });
}

/* ---- actions ---- */
function addClipFiles(files, kind) {
  let at = now(); P.clips = P.clips || [];
  [...files].forEach(f => {
    const mid = "clip:" + uid(), m = mountMedia(mid, f, f.name);
    const c = newClip(kind === "audio" || m.type === "audio" ? "audio" : "media", mid, f.name.replace(/\.[^.]+$/, ""), at, m.type === "image" ? 4 : 5);
    P.clips.push(c);
    const fix = () => { const d = m.el.duration; if (d && isFinite(d)) { c.out = +(c.in + Math.min(d, Math.max(4, tlDur() - c.in))).toFixed(2); changed("clips"); buildTimeline(); } };
    if (m.type !== "image") m.el.addEventListener("loadedmetadata", fix, { once: true });
    at = c.out; TL.sel = { kind: "clip", id: c.id };
  });
  changed("clips"); buildTimeline(); toast(`🎞 เพิ่ม ${files.length} คลิปลงไทม์ไลน์แล้ว • ลากเพื่อย้าย ลากขอบเพื่อปรับเวลา`);
}
function splitSel() {
  const t = now(), s = TL.sel; if (!s) return toast("เลือกท่อนหรือคลิปก่อน");
  if (s.kind === "clip") { const c = clipById(s.id); if (!c || t <= c.in + 0.1 || t >= c.out - 0.1) return toast("✂ วางหัวอ่านไว้กลางคลิปที่ต้องการตัด");
    const c2 = { ...clone(c), id: uid(), in: t, off: (c.off || 0) + (t - c.in) }; c.out = t; P.clips.push(c2); changed("clips"); buildTimeline(); return toast("✂ ตัดที่ " + fmt(t, 2)); }
  const l = lineById(s.id), x = timed().find(q => q.l === l); if (!l || !x || t <= x.start + 0.1 || t >= x.end - 0.1) return toast("✂ วางหัวอ่านไว้กลางท่อนที่ต้องการตัด");
  const us = unitsOf(l.text); if (us.length < 2) return toast("ท่อนนี้มีคำเดียว ตัดไม่ได้");
  const kt = l.kt && l.kt.length === us.length + 1 ? l.kt : (() => { const lens = us.map(u => graphemes(u).length), tot = lens.reduce((a, b) => a + b, 0), span = (x.end - x.start) * 0.9; let acc = 0; const o = [0.05]; lens.forEach(n => { acc += n; o.push(0.05 + span * acc / tot); }); return o; })();
  let k = 1; for (let i = 1; i < us.length; i++) if (Math.abs(kt[i] - (t - x.start)) < Math.abs(kt[k] - (t - x.start))) k = i;
  // rebuild the two texts from the original word tokens so spacing is kept
  let n = 0, a = "", b = ""; for (const w of words(l.text)) { if (w.trim()) n++; (n <= k ? (a += w) : (b += w)); }
  const l2 = normLine({ text: b.trim(), start: x.start + kt[k], end: x.end }); l2.o = l.o ? clone(l.o) : null; l2.a = l.a ? clone(l.a) : null;
  if (l.kt) l2.kt = kt.slice(k).map(v => v - kt[k]);
  l.text = a.trim(); l.end = x.start + kt[k] - 0.02; l.kt = l.kt ? kt.slice(0, k + 1) : null;
  P.lines.splice(P.lines.indexOf(l) + 1, 0, l2); $("#txt").value = P.lines.map(q => q.text).join("\n");
  changed("lines"); buildTimeline(); toast("✂ ตัดท่อนแล้ว");
}
function dupSel() {
  const s = TL.sel; if (!s) return toast("เลือกท่อนหรือคลิปก่อน");
  if (s.kind === "clip") { const c = clipById(s.id), d = c.out - c.in, c2 = { ...clone(c), id: uid(), in: c.out, out: c.out + d }; P.clips.push(c2); TL.sel = { kind: "clip", id: c2.id }; }
  else { const l = lineById(s.id), e = lineEnd(l), l2 = normLine({ ...clone(l), id: uid(), start: e, end: l.end != null ? e + (l.end - l.start) : null }); P.lines.splice(P.lines.indexOf(l) + 1, 0, l2); TL.sel = { kind: "line", id: l2.id }; $("#txt").value = P.lines.map(q => q.text).join("\n"); }
  changed("lines"); buildTimeline(); toast("⧉ ทำซ้ำต่อท้ายแล้ว");
}
let TLclip = null;
function copySel() { const s = TL.sel; if (!s) return toast("เลือกท่อนหรือคลิปก่อน"); TLclip = { kind: s.kind, data: clone(s.kind === "line" ? lineById(s.id) : clipById(s.id)), len: s.kind === "line" ? lineEnd(lineById(s.id)) - lineById(s.id).start : clipById(s.id).out - clipById(s.id).in }; toast("📋 คัดลอกแล้ว • กด 📌 วาง เพื่อวางที่หัวอ่าน"); }
function pasteSel() {
  if (!TLclip) return toast("ยังไม่ได้คัดลอก"); const t = now();
  if (TLclip.kind === "clip") { const c = { ...clone(TLclip.data), id: uid(), in: t, out: t + TLclip.len }; P.clips.push(c); TL.sel = { kind: "clip", id: c.id }; }
  else { const l = normLine({ ...clone(TLclip.data), id: uid(), start: t, end: TLclip.data.end != null ? t + TLclip.len : null }); let k = P.lines.findIndex(q => q.start != null && q.start > t); if (k < 0) k = P.lines.length; P.lines.splice(k, 0, l); TL.sel = { kind: "line", id: l.id }; $("#txt").value = P.lines.map(q => q.text).join("\n"); }
  changed("lines"); buildTimeline(); toast("📌 วางที่ " + fmt(t, 2));
}
function delSel() {
  const s = TL.sel; if (!s) return toast("เลือกท่อนหรือคลิปก่อน");
  if (s.kind === "clip") { P.clips = P.clips.filter(c => c.id !== s.id); gcMedia(); toast("🗑 ลบคลิปแล้ว"); }
  else { if (!confirm("ลบท่อนนี้?")) return; P.lines = P.lines.filter(l => l.id !== s.id); $("#txt").value = P.lines.map(q => q.text).join("\n"); }
  TL.sel = null; changed("lines"); buildTimeline();
}
function toggleMarker() {
  const t = +now().toFixed(2); P.markers = P.markers || []; const i = P.markers.findIndex(m => Math.abs(m - t) < 0.15);
  if (i >= 0) { P.markers.splice(i, 1); toast("ลบมาร์กเกอร์แล้ว"); } else { P.markers.push(t); P.markers.sort((a, b) => a - b); toast("🚩 เพิ่มมาร์กเกอร์ที่ " + fmt(t, 2)); }
  changed("markers"); buildTimeline();
}
function zoomTl(k) { const sc = $("#tlScroll"), mid = (sc.scrollLeft + sc.clientWidth / 2) / TL.pps; TL.pps = clamp(TL.pps * k, 4, 240); buildTimeline(); sc.scrollLeft = mid * TL.pps - sc.clientWidth / 2; }
function fitTl() { const sc = $("#tlScroll"); TL.pps = clamp((sc.clientWidth - 80) / tlDur(), 4, 240); buildTimeline(); sc.scrollLeft = 0; }
$("#tlAddMedia").onclick = () => $("#fileClipMedia").click();
$("#tlAddAudio").onclick = () => $("#fileClipAudio").click();
$("#fileClipMedia").onchange = e => { const f = e.target.files; if (f.length) addClipFiles(f, "media"); e.target.value = ""; };
$("#fileClipAudio").onchange = e => { const f = e.target.files; if (f.length) addClipFiles(f, "audio"); e.target.value = ""; };
$("#tlSplit").onclick = splitSel; $("#tlDup").onclick = dupSel; $("#tlCopy").onclick = copySel; $("#tlPaste").onclick = pasteSel; $("#tlDel").onclick = delSel; $("#tlMark").onclick = toggleMarker;
$("#tlSnap").onclick = () => { P.snap = P.snap === false; save(); $("#tlSnap").setAttribute("aria-pressed", String(P.snap !== false)); toast(P.snap ? "🧲 ดูดติดขอบท่อน หัวอ่าน และมาร์กเกอร์" : "ปิดดูดติด"); };
$("#tlZin").onclick = () => zoomTl(1.5); $("#tlZout").onclick = () => zoomTl(1 / 1.5); $("#tlFit").onclick = fitTl;
$("#tlInner").addEventListener("click", tlTap);
// pinch to zoom on the timeline
(() => { const pts = new Map(); let d0 = 0, p0 = 0; const sc = $("#tlScroll");
  sc.addEventListener("pointerdown", e => { pts.set(e.pointerId, e.clientX); if (pts.size === 2) { const v = [...pts.values()]; d0 = Math.abs(v[0] - v[1]); p0 = TL.pps; } });
  sc.addEventListener("pointermove", e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e.clientX); if (pts.size === 2 && d0 > 20) { const v = [...pts.values()], d = Math.abs(v[0] - v[1]); const np = clamp(p0 * d / d0, 4, 240); if (Math.abs(np - TL.pps) > 0.5) { TL.pps = np; buildTimeline(); } } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) d0 = 0; }; sc.addEventListener("pointerup", up); sc.addEventListener("pointercancel", up); })();
