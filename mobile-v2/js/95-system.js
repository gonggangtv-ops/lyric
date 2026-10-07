/* =====================================================================
   system: undo/redo, command menu (search), guide + privacy + shortcuts,
   light/dark UI theme, live-recording export fallback
   ===================================================================== */
/* ---------- undo / redo (project snapshots, debounced) ---------- */
const HIST = { past: [], future: [], cur: null, t: 0, mute: false };
function histInit() { HIST.cur = JSON.stringify(P); }
function histTouch(what) {
  if (HIST.mute || what === "audio" || what === "media") return;
  clearTimeout(HIST.t);
  HIST.t = setTimeout(() => { const s = JSON.stringify(P); if (s === HIST.cur) return; HIST.past.push(HIST.cur); if (HIST.past.length > 80) HIST.past.shift(); HIST.cur = s; HIST.future = []; histBtns(); }, 450);
}
function histApply(s) {
  HIST.mute = true; const j = JSON.parse(s); P = deepMerge(DEF(), j); P.lines = (j.lines || []).map(normLine); HIST.cur = s;
  $("#txt").value = P.lines.map(l => l.text).join("\n"); changed("all"); if (UI.tab === "style") showSub(UI.sub); if (UI.tab === "edit") buildTimeline(); if (!$("#lineSheet").hidden) renderLineEditor();
  HIST.mute = false; histBtns();
}
function undo() { clearTimeout(HIST.t); const s = JSON.stringify(P); if (s !== HIST.cur) { HIST.past.push(HIST.cur); HIST.cur = s; } if (!HIST.past.length) return toast("ไม่มีขั้นตอนให้ย้อนแล้ว"); HIST.future.push(HIST.cur); histApply(HIST.past.pop()); toast("↶ ย้อนกลับ"); }
function redo() { if (!HIST.future.length) return toast("ไม่มีขั้นตอนให้ทำซ้ำ"); HIST.past.push(HIST.cur); histApply(HIST.future.pop()); toast("↷ ทำซ้ำ"); }
function histBtns() { $("#btnUndoH").disabled = !HIST.past.length && JSON.stringify(P) === HIST.cur; $("#btnRedoH").disabled = !HIST.future.length; }
$("#btnUndoH").onclick = undo; $("#btnRedoH").onclick = redo;

/* ---------- UI theme ---------- */
function setTheme(th) { document.documentElement.dataset.theme = th; try { localStorage.setItem("lv_ui_theme", th); } catch { } $('meta[name="theme-color"]').content = th === "light" ? "#f4f3f1" : "#09090d"; }
function toggleTheme() { setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"); }
try { const th = localStorage.getItem("lv_ui_theme"); if (th) setTheme(th); } catch { }

/* ---------- command menu ---------- */
const CMDS = () => [
  ["🎵", "อัพโหลดเพลง", () => $("#fileAudio").click()], ["📝", "วาง/แก้เนื้อเพลง", () => setTab("lyrics")], ["📂", "นำเข้าไฟล์ LRC", () => $("#fileLrc").click()],
  ["✨", "ซิงค์อัตโนมัติ / AI ถอดเนื้อเพลง", () => { setTab("sync"); openAutoSync(); }], ["👆", "ซิงค์ด้วยการแตะ (TAP)", () => setTab("sync")], ["🎯", "ตั้งจังหวะคำด้วยการแตะ", () => startWordTap(0)], ["⚡", "จังหวะคำอัตโนมัติจากเสียง", autoWordTiming],
  ["⬇", "บันทึกเป็น .lrc", () => $("#btnSaveLrc").click()], ["🎞", "ไทม์ไลน์ / ตัดต่อ", () => setTab("edit")], ["➕", "เพิ่มรูป/วิดีโอลงไทม์ไลน์", () => { setTab("edit"); $("#fileClipMedia").click(); }], ["🔊", "เพิ่มเสียงลงไทม์ไลน์", () => { setTab("edit"); $("#fileClipAudio").click(); }],
  ["🎨", "เปลี่ยนธีมสำเร็จรูป (Mood Styles)", () => { setTab("style"); showSub("theme"); }], ["🔤", "สไตล์ข้อความ ฟอนต์ สี", () => { setTab("style"); showSub("text"); }], ["🎬", "แอนิเมชัน", () => { setTab("style"); showSub("anim"); }],
  ["🌄", "ฉากหลัง สี รูป วิดีโอ", () => { setTab("style"); showSub("bg"); }], ["🌌", "คลังเอฟเฟกต์ + Looks", () => { setTab("style"); showSub("fx"); }], ["🎚", "วิชวลไลเซอร์ 19 แบบ", () => { setTab("style"); showSub("viz"); }],
  ["🎤", "คาราโอเกะ / สตรีมมิ่ง / ไฮไลต์ทีละคำ", () => { setTab("style"); showSub("kar"); }], ["🏷", "การ์ดชื่อเพลง เครื่องเล่น เครดิต", () => { setTab("style"); showSub("cards"); }],
  ["⬇", "ส่งออกวิดีโอ", openExport], ["↶", "ย้อนกลับ", undo], ["↷", "ทำซ้ำ", redo],
  ["💾", "บันทึกโปรเจกต์เป็น .json", () => $("#btnSaveProj").click()], ["📂", "โหลดไฟล์โปรเจกต์", () => $("#btnLoadProj").click()],
  ["↺", "รีเซ็ตการตั้งค่า (เนื้อเพลงยังอยู่)", () => $("#btnResetStyle").click()], ["🧹", "เริ่มโปรเจกต์ใหม่ทั้งหมด", () => $("#btnReset").click()],
  ["🌓", "สลับธีมมืด / สว่าง", toggleTheme], ["❓", "วิธีการใช้งาน", () => openGuide("guide")], ["🔒", "ความเป็นส่วนตัว", () => openGuide("privacy")], ["⌨", "ปุ่มลัดคีย์บอร์ด", () => openGuide("keys")],
];
function openMenu() {
  $("#menuSheet").hidden = false; const q = $("#cmdQ"); q.value = ""; renderCmds(""); setTimeout(() => { if (matchMedia("(pointer:fine)").matches) q.focus(); }, 50);
}
function renderCmds(q) {
  const box = $("#cmdList"); box.innerHTML = ""; q = q.trim().toLowerCase();
  CMDS().filter(c => !q || c[1].toLowerCase().includes(q)).forEach(([e, n, f]) => { const b = el("button", "cmd", `<i>${e}</i><span>${esc(n)}</span>`); b.onclick = () => { $("#menuSheet").hidden = true; f(); }; box.appendChild(b); });
  if (!box.children.length) box.appendChild(el("p", "mute sm", "ไม่พบคำสั่ง"));
}
$("#btnMenu").onclick = openMenu; $("#cmdQ").oninput = e => renderCmds(e.target.value);
$("#menuClose").onclick = () => $("#menuSheet").hidden = true;
$("#cmdQ").addEventListener("keydown", e => { if (e.key === "Enter") { const b = $("#cmdList .cmd"); if (b) b.click(); } });

/* ---------- guide / privacy / shortcuts ---------- */
const GUIDE = {
  guide: `<h3>6 ขั้นตอนจากเพลงสู่วิดีโอ</h3><ol class="gl">
    <li><b>อัพโหลดเพลง</b> แท็บ “เพลง” แล้วเลือกไฟล์ (mp3, wav, m4a …) ระบบจำไฟล์ไว้ในเครื่องนี้</li>
    <li><b>วางเนื้อเพลง</b> บรรทัดละ 1 ท่อน หรือนำเข้าไฟล์ LRC ที่มีเวลาอยู่แล้ว</li>
    <li><b>ซิงค์</b> แตะปุ่ม TAP ตามจังหวะร้อง หรือกด “✨ ซิงค์อัตโนมัติ” (ในเครื่อง หรือ AI ฟังเสียงร้อง)</li>
    <li><b>แต่งหน้าตา</b> เลือก Mood Styles คลิกเดียวทั้งโปรเจกต์ แล้วปรับข้อความ แอนิเมชัน ฉากหลัง เอฟเฟกต์ วิชวลไลเซอร์</li>
    <li><b>ดูพรีวิว</b> กดเล่น แตะข้อความบนพรีวิวเพื่อแก้ท่อนนั้น ลากเพื่อย้ายตำแหน่ง</li>
    <li><b>ส่งออก</b> เลือกความละเอียด เฟรมเรต และรูปแบบไฟล์ แล้วเริ่มเรนเดอร์</li></ol>
    <h3>เคล็ดลับ</h3><ul class="gl"><li>ซิงค์ให้แม่น: เลือก AI ถ้าดนตรีหนัก แล้วไล่ดูเวลาที่แท็บ “ตัดต่อ” อีกรอบ</li><li>อยากอ่านง่าย: ปิดวิชวลไลเซอร์และโบเก้ แล้วใช้รูป/วิดีโอเป็นฉากหลังพร้อมชั้นมืด</li><li>โหมดคาราโอเกะ/สตรีมมิ่ง อยู่ที่ แต่ง → คาราโอเกะ</li><li>ทุกอย่างบันทึกอัตโนมัติ และบันทึกเป็น .json ได้ที่แท็บ “เพลง”</li></ul>`,
  privacy: `<h3>🔒 ความเป็นส่วนตัวและความปลอดภัยของข้อมูล</h3><ol class="gl">
    <li><b>ไม่มีการเก็บข้อมูล:</b> โปรแกรมไม่เก็บรวบรวมข้อมูลส่วนบุคคลใด ๆ ของผู้ใช้</li>
    <li><b>ไม่ส่งข้อมูลขึ้นเซิร์ฟเวอร์:</b> เสียง รูปภาพ และวิดีโอ ไม่ถูกอัปโหลดไปยังเซิร์ฟเวอร์ภายนอก</li>
    <li><b>ประมวลผลบนเครื่อง:</b> การทำงานทั้งหมดเกิดขึ้นบนอุปกรณ์ของคุณ</li>
    <li><b>ไม่แชร์ให้บุคคลที่สาม:</b> ไม่มีการส่งต่อหรือขายข้อมูล</li></ol>
    <p class="mute sm">หมายเหตุเพื่อความโปร่งใส: เบราว์เซอร์จะโหลดฟอนต์จาก Google Fonts และโหมด “AI ฟังเสียงร้อง” (เมื่อเลือกใช้) จะดาวน์โหลดโมเดลถอดเสียงจากอินเทอร์เน็ตในครั้งแรก ไฟล์เสียง รูป และวิดีโอของคุณไม่ถูกส่งไปในกระบวนการเหล่านี้ และงานของคุณถูกบันทึกในเบราว์เซอร์บนเครื่องนี้เท่านั้น</p>`,
  keys: `<h3>⌨ ปุ่มลัด (เมื่อต่อคีย์บอร์ด)</h3><table class="keys">
    <tr><td>Space</td><td>เล่น / หยุด (แท็บซิงค์ = TAP)</td></tr><tr><td>← / →</td><td>ถอย / เดินหน้า 1 วินาที (Shift = 5 วินาที)</td></tr>
    <tr><td>Ctrl+Z / Ctrl+Shift+Z</td><td>ย้อนกลับ / ทำซ้ำ</td></tr><tr><td>Ctrl+K</td><td>ค้นหาคำสั่ง</td></tr>
    <tr><td>S</td><td>ตัดท่อน/คลิปที่หัวอ่าน (แท็บตัดต่อ)</td></tr><tr><td>M</td><td>มาร์กเกอร์</td></tr><tr><td>Delete</td><td>ลบที่เลือก</td></tr>
    <tr><td>Ctrl+C / Ctrl+V</td><td>คัดลอก / วางที่หัวอ่าน</td></tr><tr><td>Ctrl+D</td><td>ทำซ้ำต่อท้าย</td></tr><tr><td>?</td><td>เปิดหน้านี้</td></tr><tr><td>Esc</td><td>ปิดหน้าต่าง</td></tr></table>`,
};
function openGuide(which = "guide") {
  $("#guideSheet").hidden = false; $$("#guideTabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === which))); $("#guideBody").innerHTML = GUIDE[which];
}
$$("#guideTabs button").forEach(b => b.onclick = () => openGuide(b.dataset.v));
$("#guideClose").onclick = () => { $("#guideSheet").hidden = true; if ($("#guideNoShow").checked) try { localStorage.setItem("lv_guide_seen", "1"); } catch { } };
$("#guideStart").onclick = () => { $("#guideClose").click(); setTab("song"); $("#fileAudio").click(); };
function firstRunGuide() { let seen = false; try { seen = !!localStorage.getItem("lv_guide_seen"); } catch { } if (!seen && !P.lines.length) { openGuide("guide"); $("#guideNoShow").checked = true; } }

/* ---------- export: live recording (MediaRecorder) ---------- */
function liveMime() {
  const c = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return window.MediaRecorder ? c.find(m => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) : null;
}
async function runLiveExport() {
  const mime = liveMime(); if (!mime) { $("#exInfo").textContent = "เบราว์เซอร์นี้อัดวิดีโอไม่ได้ (ไม่มี MediaRecorder)"; return; }
  const [W, H] = exportDims(), fps = EX.fps, total = exportDuration();
  EX.cancel = false; EX.running = true; showEx("run"); const bar = $("#exBar"), status = $("#exStatus"); bar.style.width = "0%";
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d");
  const AC = window.AudioContext || window.webkitAudioContext, ac = new AC(), dest = ac.createMediaStreamDestination();
  let wake = null; try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch { }
  try {
    try { await document.fonts.load(fontStr(P.text, 48), "กขค"); } catch { } layoutCache.clear(); pause();
    const t0 = ac.currentTime + 0.25;
    if (M.buf) { const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = M.buf; g.gain.value = clamp(P.mainVol ?? 1, 0, 1); s.connect(g); g.connect(dest); s.start(t0); }
    for (const c of P.clips || []) { if (c.kind !== "audio") continue; const b = await decodeMedia(c.mid); if (!b) continue; const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; s.loop = !!c.loop; g.gain.value = c.vol ?? 1; s.connect(g); g.connect(dest); s.start(t0 + c.in, c.off || 0); s.stop(t0 + c.out); }
    const stream = cv.captureStream(fps); dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: clamp(Math.round(W * H * fps * 0.09), 2e6, 25e6), audioBitsPerSecond: 192000 }), chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(r => rec.onstop = r); rec.start(500);
    if (M.bgVid) { M.bgVid.currentTime = 0; M.bgVid.play().catch(() => { }); }
    status.textContent = "🔴 กำลังอัดสด… ห้ามสลับแอปหรือล็อกจอ";
    await new Promise(res => { const step = () => { if (EX.cancel) return res(); const t = ac.currentTime - t0; if (t >= total) return res(); if (t >= 0) { syncClips(t, true); render(cx, W, H, t); bar.style.width = (t / total * 100).toFixed(1) + "%"; } requestAnimationFrame(step); }; requestAnimationFrame(step); });
    rec.stop(); await done; syncClips(0, false);
    if (EX.cancel) throw new Error("cancel");
    const ext = mime.startsWith("video/mp4") ? "mp4" : "webm", blob = new Blob(chunks, { type: mime.split(";")[0] });
    finishExport(blob, ext, W, H, "อัดสด");
  } catch (err) {
    if (err && err.message === "cancel") { showEx("config"); toast("ยกเลิก Export แล้ว"); } else { console.error(err); showEx("config"); $("#exInfo").textContent = "อัดไม่สำเร็จ: " + (err && err.message || err); }
  } finally { try { ac.close(); } catch { } try { wake && wake.release(); } catch { } EX.running = false; if (M.bgVid) M.bgVid.pause(); }
}
function finishExport(blob, ext, W, H, how) {
  if (EX.url) URL.revokeObjectURL(EX.url); EX.url = URL.createObjectURL(blob);
  const fname = (P.title || M.name || "lyric-video") + "." + ext; $("#result").src = EX.url; const sv = $("#exSave"); sv.href = EX.url; sv.download = fname;
  EX.file = new File([blob], fname, { type: blob.type }); $("#exShare").hidden = !(navigator.canShare && navigator.canShare({ files: [EX.file] }));
  $("#exDoneInfo").textContent = `${ext.toUpperCase()} • ${W}×${H} • ${(blob.size / 1048576).toFixed(1)} MB • ${how}`; $("#exBar").style.width = "100%"; showEx("done");
}

/* ---------- keyboard ---------- */
addEventListener("keydown", e => {
  if (/input|textarea|select/i.test(e.target.tagName)) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.code === "KeyZ") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && e.code === "KeyY") { e.preventDefault(); redo(); }
  else if (mod && e.code === "KeyK") { e.preventDefault(); openMenu(); }
  else if (e.key === "?") openGuide("guide");
  else if (e.code === "Escape") ["#menuSheet", "#guideSheet", "#autoSheet"].forEach(s => $(s).hidden = true);
});
