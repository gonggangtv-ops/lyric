/* =====================================================================
   UI: helpers, schema-driven controls, tabs, song / lyrics / sync
   ===================================================================== */
const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
let toastT = 0;
function toast(msg) {
  $$(".toast").forEach(e => e.remove());
  const e = document.createElement("div"); e.className = "toast"; e.textContent = msg; e.setAttribute("role", "status");
  document.body.appendChild(e); clearTimeout(toastT); toastT = setTimeout(() => e.remove(), 2400);
}
const buzz = (n = 12) => { try { navigator.vibrate && navigator.vibrate(n); } catch { } };
function updatePlayBtn() { const p = isPlaying(); $("#btnPlay").innerHTML = p ? ICON_PAUSE : ICON_PLAY; $("#btnPlay").setAttribute("aria-label", p ? "หยุด" : "เล่น"); }
["play", "pause", "ended", "loadedmetadata"].forEach(ev => A.addEventListener(ev, updatePlayBtn));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

/* ---------------- schema-driven controls ----------------
   spec: { t:type, k:path, l:label, ...opts, show:()=>bool }
   types: h, note, range, color, seg, switch, chips, grid, btn, row(btns), text, custom */
const projTarget = { get: k => getPath(P, k), set: (k, v) => setPath(P, k, v) };
function buildControls(box, specs, target = projTarget, onChange = () => changed("style")) {
  box.innerHTML = ""; const upd = [];
  const fire = () => { onChange(); upd.forEach(f => f()); };
  for (const s of specs) {
    let node = null, refresh = null;
    switch (s.t) {
      case "h": node = el("div", "h", esc(s.l) + (s.sub ? ` <small>${esc(s.sub)}</small>` : "")); break;
      case "note": node = el("p", "mute sm note", s.l); break;
      case "range": {
        node = el("div", "ctl"); node.innerHTML = `<label>${esc(s.l)}</label><input type="range" class="grow" min="${s.min}" max="${s.max}" step="${s.step || 1}" aria-label="${esc(s.l)}"><span class="val"></span>`;
        const i = $("input", node), v = $(".val", node), f = s.fmt || (x => x);
        i.oninput = () => { target.set(s.k, +i.value); v.textContent = f(+i.value); fire(); };
        refresh = () => { const x = target.get(s.k); i.value = x; v.textContent = f(+x); }; break;
      }
      case "color": {
        node = el("div", "ctl"); node.innerHTML = `<label>${esc(s.l)}</label><div class="swatches grow"></div>`;
        const box2 = $(".swatches", node), list = s.sw || SWATCHES;
        list.forEach(c => { const b = el("button", "swatch"); b.style.background = c; b.dataset.c = c; b.setAttribute("aria-label", c); b.onclick = () => { target.set(s.k, c); fire(); }; box2.appendChild(b); });
        const cu = el("label", "swatch custom"); cu.setAttribute("aria-label", "เลือกสีเอง"); const inp = document.createElement("input"); inp.type = "color"; inp.oninput = () => { target.set(s.k, inp.value); fire(); }; cu.appendChild(inp); box2.appendChild(cu);
        refresh = () => { const x = String(target.get(s.k) || "").toLowerCase(); $$(".swatch[data-c]", box2).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.c.toLowerCase() === x))); try { inp.value = x; } catch { } cu.style.boxShadow = list.map(c => c.toLowerCase()).includes(x) ? "" : `inset 0 0 0 14px ${x}`; }; break;
      }
      case "seg": {
        node = el("div", s.l ? "ctl" : ""); node.innerHTML = (s.l ? `<label>${esc(s.l)}</label>` : "") + `<div class="seg grow"></div>`;
        const sg = $(".seg", node); s.o.forEach(([v, lab]) => { const b = el("button", "", esc(lab)); b.dataset.v = v; b.onclick = () => { target.set(s.k, s.num ? +v : v); fire(); }; sg.appendChild(b); });
        refresh = () => { const x = String(target.get(s.k)); $$("button", sg).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === x))); }; break;
      }
      case "switch": {
        node = el("button", "tog"); node.setAttribute("role", "switch"); node.innerHTML = `<span>${esc(s.l)}${s.sub ? ` <small class="mute">${esc(s.sub)}</small>` : ""}</span><span class="sw"></span>`;
        node.onclick = () => { target.set(s.k, !target.get(s.k)); fire(); };
        refresh = () => { const on = !!target.get(s.k); node.setAttribute("aria-checked", String(on)); $(".sw", node).setAttribute("aria-checked", String(on)); }; break;
      }
      case "chips": case "grid": {
        node = el("div", s.t === "grid" ? "tiles" : "chips"); if (s.l) { const w = el("div", ""); w.appendChild(el("div", "lbl", esc(s.l))); w.appendChild(node); node = w; }
        const cont = s.l ? node.lastChild : node;
        s.o.forEach(o => { const [v, lab, em] = o; const b = el("button", s.t === "grid" ? "tile" : "chip", s.t === "grid" ? `<i>${em || ""}</i><span>${esc(lab)}</span>` : esc((em ? em + " " : "") + lab)); b.dataset.v = v; if (s.style) Object.assign(b.style, s.style(o));
          b.onclick = () => { if (s.multi) { const cur = target.get(s.k); target.set(s.k, !cur[v] ? true : false); } else target.set(s.k, s.num ? +v : v); if (s.after) s.after(v); fire(); }; cont.appendChild(b); });
        refresh = () => { $$("button", cont).forEach(b => { const v = b.dataset.v; const on = s.isOn ? s.isOn(v) : String(target.get(s.k)) === v; b.setAttribute("aria-pressed", String(!!on)); }); }; break;
      }
      case "btn": node = el("button", "btn sm " + (s.cls || "ghost") + (s.block ? " block" : ""), s.l); node.onclick = () => { s.do(); fire(); }; break;
      case "row": node = el("div", "row wrap"); s.b.forEach(bb => { const b = el("button", "btn sm grow " + (bb.cls || "ghost"), bb.l); b.onclick = () => { bb.do(); fire(); }; node.appendChild(b); }); break;
      case "text": { node = el("div", "ctl"); node.innerHTML = `<label>${esc(s.l)}</label><input class="inp grow" type="text" placeholder="${esc(s.ph || "")}">`; const i = $("input", node); i.oninput = () => { target.set(s.k, i.value); onChange(); }; refresh = () => { if (document.activeElement !== i) i.value = target.get(s.k) ?? ""; }; break; }
      case "custom": node = s.make(fire); refresh = node._refresh || null; break;
    }
    if (!node) continue;
    box.appendChild(node);
    const vis = s.show ? () => { node.hidden = !s.show(); } : null;
    upd.push(() => { vis && vis(); refresh && refresh(); });
  }
  upd.forEach(f => f());
  box._refresh = () => upd.forEach(f => f());
  return box;
}
const SWATCHES = ["#ffffff", "#000000", "#ffe66d", "#ff2d7b", "#00e5ff", "#a78bfa", "#22c55e", "#f97316"];
const pct = x => Math.round(x * 100) + "%", sec = x => (+x).toFixed(2) + "s", deg = x => Math.round(x) + "°", px1 = x => (+x).toFixed(1);

/* ---------------- tabs ---------------- */
const STAGE_H = { song: "32dvh", lyrics: "22dvh", sync: "25dvh", style: "34dvh" };
function setTab(tab) {
  UI.tab = tab;
  $$(".panel").forEach(p => p.hidden = p.id !== "p-" + tab);
  $$(".nav button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  document.documentElement.style.setProperty("--stage-h", STAGE_H[tab]);
  requestAnimationFrame(fitStage); setTimeout(fitStage, 280);
  if (tab === "sync") { buildLines(); updateNow(); lastActive = -2; }
  if (tab === "song") refreshSong();
  if (tab === "lyrics") refreshLyricsStat();
  if (tab === "style") showSub(UI.sub);
  try { history.replaceState(null, "", "#" + tab); } catch { }
}
$$(".nav button").forEach(b => b.onclick = () => setTab(b.dataset.tab));

/* ---------------- SONG ---------------- */
function refreshProgress() {
  const hasAudio = !!M.audio, hasText = P.lines.length > 0, nT = timed().length, synced = hasText && nT === P.lines.length;
  $("#d-song").classList.toggle("on", hasAudio); $("#d-lyrics").classList.toggle("on", hasText); $("#d-sync").classList.toggle("on", synced); $("#d-style").classList.toggle("on", !!P.mood || !!P._touched);
  $("#btnExport").disabled = !nT;
  $("#subtitle").textContent = M.audio ? M.name : (hasText ? `${P.lines.length} บรรทัด` : "ทำวิดีโอเนื้อเพลงบนมือถือ");
  return { hasAudio, hasText, synced };
}
function refreshSong() {
  const { hasAudio, hasText, synced } = refreshProgress();
  const steps = [["song", "เลือกไฟล์เพลง", hasAudio ? M.name : "แตะการ์ดด้านล่าง (ข้ามได้ถ้าจะลองก่อน)", hasAudio],
    ["lyrics", "วางเนื้อเพลง", hasText ? P.lines.length + " บรรทัด" : "บรรทัดละหนึ่งท่อน หรือนำเข้า .lrc", hasText],
    ["sync", "ซิงค์ด้วยการแตะ", synced ? "ซิงค์ครบแล้ว" : `แตะตามจังหวะ • ซิงค์แล้ว ${timed().length}/${P.lines.length}`, synced],
    ["style", "แต่งหน้าตา แล้วส่งออก", P.mood ? "ธีม: " + P.mood : "Mood Styles, ข้อความ, แอนิเมชัน, ฉากหลัง, เอฟเฟกต์", !!P.mood]];
  const nextI = steps.findIndex(s => !s[3]);
  $("#steps").innerHTML = steps.map((s, i) => `<button class="step ${s[3] ? "done" : ""} ${i === nextI ? "next" : ""}" data-go="${s[0]}"><span class="n">${s[3] ? "✓" : i + 1}</span><span class="grow"><b>${s[1]}</b><span>${esc(s[2])}</span></span><span class="mute">›</span></button>`).join("");
  $$("#steps .step").forEach(b => b.onclick = () => { if (b.dataset.go === "song") $("#fileAudio").click(); else setTab(b.dataset.go); });
  $("#songName").textContent = hasAudio ? M.name : "แตะเพื่อเลือกไฟล์เพลง";
  if (!M.audio || M.buf || !M.audio) $("#songMeta").textContent = hasAudio ? `ความยาว ${fmt(duration(), 0)} • แตะเพื่อเปลี่ยนไฟล์` : "mp3, wav, m4a, aac, ogg • ไม่อัปโหลดขึ้นเซิร์ฟเวอร์";
  $("#waveBox").hidden = !(hasAudio && M.peaks); if (M.peaks) drawWave();
  if (document.activeElement !== $("#inTitle")) $("#inTitle").value = P.title || "";
  if (document.activeElement !== $("#inArtist")) $("#inArtist").value = P.artist || "";
}
function drawWave() {
  const c = $("#wave"), dpr = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight; if (!w) return;
  c.width = w * dpr; c.height = h * dpr; const x = c.getContext("2d"); x.scale(dpr, dpr);
  const n = M.peaks.length, bw = w / n; x.fillStyle = "#ff2d7b";
  M.peaks.forEach((p, i) => { const bh = Math.max(2, p * (h - 8)); x.fillRect(i * bw + 1, (h - bh) / 2, Math.max(1, bw - 2), bh); });
  timed().forEach(tl => { const d = duration(); if (!d) return; x.fillStyle = "rgba(0,212,255,.8)"; x.fillRect(tl.start / d * w, 0, 1.5, h); });
}
$("#btnPick").onclick = () => $("#fileAudio").click();
$("#fileAudio").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) loadAudioFile(f); };
$("#inTitle").oninput = e => { P.title = e.target.value; save(); };
$("#inArtist").oninput = e => { P.artist = e.target.value; save(); };
const DEMO = ["ฉันเดินผ่านแสงไฟ", "ในคืนที่เธอจากไป", "เสียงเพลงยังก้องอยู่", "เหมือนเธอยังอยู่ตรงนี้", "ถ้าเวลาย้อนกลับได้", "จะไม่ปล่อยให้เธอไป"];
$("#btnDemo").onclick = () => { setLines(DEMO.map(t => normLine({ text: t }))); $("#txt").value = DEMO.join("\n"); toast("ใส่เนื้อตัวอย่างแล้ว"); setTab("sync"); };
$("#btnReset").onclick = () => {
  if (!confirm("เริ่มโปรเจกต์ใหม่? เนื้อเพลง เวลา และสไตล์จะถูกล้าง")) return;
  pause(); P = DEF(); UI.sel = -1; $("#txt").value = ""; changed("all"); refreshSong(); toast("รีเซ็ตแล้ว");
};
$("#btnResetStyle").onclick = () => {
  if (!confirm("ล้างค่าพื้นหลัง/เอฟเฟกต์/สไตล์ตัวหนังสือ กลับเป็นค่าเริ่มต้น แต่เก็บเนื้อเพลงและเวลาไว้?")) return;
  const keep = { lines: P.lines, title: P.title, artist: P.artist, ratio: P.ratio }; P = Object.assign(DEF(), keep); P.lines.forEach(l => { l.o = null; l.a = null; }); changed("all"); toast("รีเซ็ตการตั้งค่าแล้ว");
};
$("#btnSaveProj").onclick = () => {
  const blob = new Blob([JSON.stringify({ app: "LyricVerseMobile", ...P }, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = (P.title || M.name || "lyricverse") + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
$("#btnLoadProj").onclick = () => $("#fileProj").click();
$("#fileProj").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.lines)) throw 0; P = deepMerge(DEF(), j); P.lines = j.lines.map(normLine); $("#txt").value = P.lines.map(l => l.text).join("\n"); changed("all"); refreshSong(); toast("📂 โหลดโปรเจกต์แล้ว"); }
  catch { toast("ไฟล์โปรเจกต์ไม่ถูกต้อง"); }
};

/* ---------------- LYRICS ---------------- */
function lcsCarry(oldL, newT) { // keep timing/style of lines whose text is unchanged
  const a = oldL.map(l => l.text.trim()), b = newT.map(s => s.trim()), n = a.length, m = b.length;
  const out = newT.map(t => normLine({ text: t }));
  const carry = (o, l) => { o.start = l.start; o.end = l.end; o.o = l.o; o.a = l.a; o.id = l.id; if (l.text.trim() === o.text.trim()) { o.kt = l.kt; o.rom = l.rom; } };
  if (n * m > 250000) { out.forEach((o, i) => oldL[i] && carry(o, oldL[i])); return out; }
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0; const used = new Set();
  while (i < n && j < m) { if (a[i] === b[j]) { carry(out[j], oldL[i]); used.add(j); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  if (n === m) out.forEach((o, k) => { if (!used.has(k) && oldL[k]) carry(o, oldL[k]); });
  return out;
}
function setLines(arr) { P.lines = arr; UI.sel = -1; changed("lines"); refreshLyricsStat(); refreshProgress(); if (UI.tab === "sync") { buildLines(); updateNow(); } }
$("#txt").addEventListener("input", () => {
  const t = $("#txt").value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  P.lines = lcsCarry(P.lines, t); UI.sel = -1; changed("lines"); refreshLyricsStat(); refreshProgress();
});
function refreshLyricsStat() {
  const n = P.lines.length, k = timed().length; $("#statLines").textContent = n + " บรรทัด";
  const p = $("#statTimed"); p.textContent = "ซิงค์แล้ว " + k + "/" + n; p.classList.toggle("ok", n > 0 && k === n);
}
$("#btnPaste").onclick = async () => {
  try { const t = await navigator.clipboard.readText(); if (!t.trim()) return toast("คลิปบอร์ดว่างเปล่า"); $("#txt").value = t; $("#txt").dispatchEvent(new Event("input")); toast("วางแล้ว"); }
  catch { toast("เบราว์เซอร์ไม่อนุญาต ลองกดค้างที่ช่องแล้ววางเอง"); $("#txt").focus(); }
};
$("#btnClearText").onclick = () => { if (P.lines.length && !confirm("ล้างเนื้อเพลงทั้งหมด?")) return; $("#txt").value = ""; setLines([]); };
$("#btnLrc").onclick = () => $("#fileLrc").click();
const TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g, WTAG = /<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>/g;
const tagSec = m => (+m[1]) * 60 + (+m[2]) + (m[3] ? +("0." + m[3]) : 0);
function parseLrc(text) {
  const out = []; let any = false;
  for (const raw of text.split(/\r?\n/)) {
    const tags = [...raw.matchAll(TAG)]; let body = raw.replace(/\[[^\]]*\]/g, "");
    // enhanced LRC: <mm:ss.xx>word timing
    const wt = [...body.matchAll(WTAG)]; let kt = null;
    if (wt.length) { const parts = body.split(WTAG); const segs = []; for (let i = 0; i < wt.length; i++) segs.push({ t: tagSec(wt[i]), s: parts[(i + 1) * 4] || "" }); body = segs.map(s => s.s).join(""); kt = segs.filter(s => s.s.trim()).map(s => s.t); }
    body = body.trim();
    if (tags.length) { any = true; if (!body) continue; for (const m of tags) { const st = tagSec(m), l = normLine({ text: body, start: st }); if (kt && kt.length) { const rel = kt.map(x => Math.max(0, x - st)); const n = words(body).filter(w => w.trim()).length; if (rel.length === n) l.kt = [...rel, rel[rel.length - 1] + 0.6]; } out.push(l); } }
    else if (body && !/^\[?(ti|ar|al|by|offset|length|re|ve):/i.test(raw.trim())) out.push(normLine({ text: body }));
  }
  if (any) out.sort((a, b) => (a.start ?? 1e9) - (b.start ?? 1e9));
  const ti = text.match(/\[ti:([^\]]*)\]/i), ar = text.match(/\[ar:([^\]]*)\]/i);
  return { lines: out, timed: any, title: ti && ti[1].trim(), artist: ar && ar[1].trim() };
}
$("#fileLrc").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  const r = parseLrc(await f.text()); if (!r.lines.length) return toast("ไม่พบเนื้อเพลงในไฟล์");
  if (r.title) P.title = r.title; if (r.artist) P.artist = r.artist;
  setLines(r.lines); $("#txt").value = r.lines.map(l => l.text).join("\n"); toast(r.timed ? "นำเข้าเวลาแล้ว " + r.lines.length + " บรรทัด" : "นำเข้าแล้ว " + r.lines.length + " บรรทัด");
};
$("#toSync").onclick = () => setTab("sync");

/* ---------------- SYNC ---------------- */
const nextUnsynced = () => P.lines.findIndex(l => l.start == null);
const unitsOf = text => words(text).filter(w => w.trim());
function updateNow() {
  const L = P.lines, cur = $("#nCur");
  if (UI.wt) { // word-tap mode
    const w = UI.wt, l = L[w.li], us = unitsOf(l.text);
    $("#nPrev").textContent = `ตั้งจังหวะคำ • ท่อนที่ ${w.li + 1}/${L.length}`;
    cur.classList.remove("done"); cur.innerHTML = "<div>" + us.map((x, i) => `<span class="${i < w.n ? "wdone" : i === w.n ? "wnext" : ""}">${esc(x)}</span>`).join(" ") + "</div>";
    $("#nNext").textContent = "แตะ TAP ตอนเริ่มร้องคำที่ขีดเส้นใต้ • กด ย้อน เพื่อแก้คำก่อนหน้า"; $("#btnTap").firstChild.textContent = "TAP คำ"; $("#btnTap small").textContent = "แตะตอนเริ่มร้องคำนี้"; return;
  }
  $("#btnTap").firstChild.textContent = "TAP"; $("#btnTap small").textContent = "แตะตอนเริ่มร้องท่อนนี้";
  const n = nextUnsynced();
  if (!L.length) { cur.textContent = "ใส่เนื้อเพลงก่อน"; cur.classList.remove("done"); $("#nPrev").innerHTML = "&nbsp;"; $("#nNext").innerHTML = "&nbsp;"; return; }
  if (n < 0) { cur.textContent = "✓ ซิงค์ครบทุกบรรทัดแล้ว"; cur.classList.add("done"); $("#nPrev").textContent = L[L.length - 1].text; $("#nNext").innerHTML = "พร้อมแล้ว • แตะแถวด้านล่างเพื่อปรับละเอียด"; return; }
  cur.classList.remove("done"); cur.textContent = L[n].text;
  $("#nPrev").textContent = n > 0 ? L[n - 1].text : " "; $("#nNext").textContent = L[n + 1] ? L[n + 1].text : " ";
}
function buildLines() {
  const box = $("#lines"); box.innerHTML = "";
  if (!P.lines.length) { box.innerHTML = '<p class="mute sm">ยังไม่มีเนื้อเพลง ไปที่แท็บ “เนื้อ” ก่อน</p>'; return; }
  P.lines.forEach((l, i) => {
    const b = el("button", "ln"); b.dataset.i = i;
    const badge = (l.o || l.a ? '<em title="มีสไตล์เฉพาะท่อน">🎨</em>' : "") + (l.kt ? '<em title="มีจังหวะรายคำ">🎤</em>' : "");
    b.innerHTML = `<span class="i">${i + 1}</span><span class="t">${esc(l.text)} ${badge}</span><span class="ts ${l.start == null ? "none" : ""}">${l.start == null ? "—" : fmt(l.start, 2)}</span>`;
    b.onclick = () => { UI.sel = UI.sel === i ? -1 : i; if (l.start != null) seek(l.start); buildLines(); };
    box.appendChild(b);
    if (UI.sel === i) {
      const nu = el("div", "nudge");
      nu.innerHTML = `<button class="btn sm" data-d="-0.5">−0.5</button><button class="btn sm" data-d="-0.1">−0.1</button><button class="btn sm" data-d="0.1">+0.1</button><button class="btn sm" data-d="0.5">+0.5</button><button class="btn sm pri" data-now="1">ตั้งเป็นตอนนี้</button><button class="btn sm" data-edit="1">✏️ แก้ไข/สไตล์</button><button class="btn sm ghost" data-clr="1">ล้างเวลา</button>`;
      nu.onclick = e => {
        const t = e.target.closest("button"); if (!t) return;
        if (t.dataset.edit) return openLineEditor(i);
        if (t.dataset.d) { P.lines[i].start = Math.max(0, (P.lines[i].start ?? now()) + +t.dataset.d); seek(P.lines[i].start); }
        else if (t.dataset.now) P.lines[i].start = Math.max(0, now() - UI.tapOff);
        else if (t.dataset.clr) P.lines[i].start = null;
        changed("lines"); buildLines(); updateNow(); refreshProgress();
      };
      box.appendChild(nu);
    }
  });
  markActive(lastActive);
}
function markActive(ai) { $$("#lines .ln").forEach(e => e.classList.toggle("active", +e.dataset.i === ai)); }
function tap() {
  if (UI.wt) return tapWord();
  if (!P.lines.length) return toast("ใส่เนื้อเพลงก่อน");
  const n = nextUnsynced(); if (n < 0) return toast("ซิงค์ครบแล้ว");
  if (!isPlaying()) { play(); buzz(); return; }
  P.lines[n].start = Math.max(0, now() - UI.tapOff); buzz(10);
  changed("lines"); updateNow(); refreshProgress(); refreshLyricsStat();
  const row = $(`#lines .ln[data-i="${n}"]`);
  if (row) { const ts = $(".ts", row); ts.textContent = fmt(P.lines[n].start, 2); ts.classList.remove("none"); row.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
}
/* word-level tap timing (karaoke) */
function startWordTap(fromLine = 0, single = false) {
  const tl = timed(); if (!tl.length) return toast("ซิงค์เวลาท่อนก่อน แล้วค่อยตั้งจังหวะคำ");
  let li = fromLine; if (P.lines[li]?.start == null) li = tl[0].i;
  UI.wt = { li, n: 0, kt: [], single }; setTab("sync"); pause(); seek(Math.max(0, P.lines[li].start - 1.2)); updateNow(); toast("🎯 แตะ TAP ตอนเริ่มร้องแต่ละคำ");
}
function stopWordTap(msg) { UI.wt = null; updateNow(); buildLines(); if (msg) toast(msg); }
function tapWord() {
  const w = UI.wt, l = P.lines[w.li], us = unitsOf(l.text);
  if (!isPlaying()) { play(); buzz(); return; }
  w.kt[w.n] = Math.max(0, now() - UI.tapOff - l.start); w.n++; buzz(8);
  if (w.n >= us.length) {
    const x = timed().find(q => q.i === w.li), end = x ? x.end - x.start : w.kt[w.n - 1] + 0.8;
    for (let i = 1; i < w.kt.length; i++) w.kt[i] = Math.max(w.kt[i], w.kt[i - 1] + 0.04);
    l.kt = [...w.kt, Math.max(w.kt[w.kt.length - 1] + 0.15, end * 0.95)]; changed("lines");
    const tl = timed(), k = tl.findIndex(q => q.i === w.li), nx = tl[k + 1];
    if (w.single || !nx) return stopWordTap("✅ ตั้งจังหวะครบแล้ว • ลองกดเล่นพรีวิวดูการไล่สี");
    UI.wt = { li: nx.i, n: 0, kt: [], single: false };
  }
  updateNow();
}
/* automatic word timing: snap char-proportional boundaries to the nearest energy dip */
function autoWordTiming() {
  if (!M.env) return toast("อัพโหลดเพลงก่อน (ต้องวิเคราะห์เสียงได้)");
  let n = 0;
  timed().forEach(x => {
    const us = unitsOf(x.l.text); if (us.length < 2) return;
    const dur = x.end - x.start, lens = us.map(u => graphemes(u).length), tot = lens.reduce((a, b) => a + b, 0), span = dur * 0.9, kt = [0.03]; let acc = 0;
    for (let i = 0; i < us.length - 1; i++) {
      acc += lens[i]; const guess = 0.03 + span * acc / tot, win = Math.max(0.08, span / us.length * 0.35);
      let best = guess, bv = 1e9; for (let s = guess - win; s <= guess + win; s += 1 / AFPS) { const v = sampleArr(M.env, x.start + s); if (v < bv) { bv = v; best = s; } }
      kt.push(Math.max(kt[kt.length - 1] + 0.06, best));
    }
    kt.push(Math.max(kt[kt.length - 1] + 0.15, span)); x.l.kt = kt; n++;
  });
  changed("lines"); toast(n ? `✨ จัดจังหวะคำให้ ${n} ท่อนตามเสียงร้อง` : "ไม่มีท่อนที่ต้องจัด");
}
$("#btnTap").addEventListener("pointerdown", e => { e.preventDefault(); tap(); });
$("#btnTap").addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tap(); } });
$("#btnUndo").onclick = () => {
  if (UI.wt) { const w = UI.wt; if (w.n > 0) { w.n--; w.kt.length = w.n; seek(P.lines[w.li].start + (w.kt[w.n - 1] || 0) - 1); updateNow(); } else stopWordTap("หยุดตั้งจังหวะคำ"); return; }
  let k = -1; for (let i = P.lines.length - 1; i >= 0; i--) if (P.lines[i].start != null) { k = i; break; }
  if (k < 0) return toast("ยังไม่มีอะไรให้ย้อน");
  const tgt = P.lines[k].start; P.lines[k].start = null; changed("lines"); seek(Math.max(0, tgt - 2)); updateNow(); buildLines(); refreshProgress(); refreshLyricsStat(); buzz(8);
};
$("#btnRew").onclick = () => seek(now() - 3);
$$("#rate button").forEach(b => b.onclick = () => { A.playbackRate = +b.dataset.v; $$("#rate button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
$("#off").oninput = e => { UI.tapOff = e.target.value / 1000; $("#offV").textContent = UI.tapOff.toFixed(2) + "s"; save(); };
$("#btnSpread").onclick = () => {
  const n = P.lines.length; if (!n) return toast("ใส่เนื้อเพลงก่อน");
  const d = duration(), s0 = Math.min(1, d * 0.05), span = Math.max(1, d - s0 - 1);
  // weight by text length (closer to how people sing than equal slots)
  const w = P.lines.map(l => 2 + graphemes(l.text).length), tot = w.reduce((a, b) => a + b, 0); let acc = 0;
  P.lines.forEach((l, i) => { l.start = +(s0 + span * acc / tot).toFixed(2); acc += w[i]; });
  changed("lines"); buildLines(); updateNow(); refreshProgress(); refreshLyricsStat(); toast("กระจายเวลาตามความยาวข้อความแล้ว");
};
$("#btnClearTimes").onclick = () => { if (!timed().length || !confirm("ล้างเวลาที่ซิงค์ทั้งหมด?")) return; P.lines.forEach(l => { l.start = null; l.end = null; l.kt = null; }); changed("lines"); buildLines(); updateNow(); refreshProgress(); refreshLyricsStat(); };
$("#btnWordTap").onclick = () => startWordTap(0);
$("#btnWordAuto").onclick = () => { autoWordTiming(); buildLines(); };
$("#btnSaveLrc").onclick = () => {
  const tl = timed(); if (!tl.length) return toast("ยังไม่มีเวลาที่ซิงค์");
  const ts = t => { const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`; };
  const head = (P.title ? `[ti:${P.title}]\n` : "") + (P.artist ? `[ar:${P.artist}]\n` : "");
  const lrc = head + tl.map(x => { const us = unitsOf(x.l.text); const body = x.l.kt && x.l.kt.length === us.length + 1 ? us.map((u, i) => `<${ts(x.start + x.l.kt[i])}>${u}`).join(" ") : x.l.text; return `[${ts(x.start)}]${body}`; }).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lrc], { type: "text/plain;charset=utf-8" })); a.download = (P.title || M.name || "lyrics") + ".lrc"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
