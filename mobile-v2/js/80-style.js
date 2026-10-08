/* =====================================================================
   STYLE tab — 7 sub-sections built from control schemas
   ===================================================================== */
const SUBS = [["theme", "ธีม"], ["text", "ข้อความ"], ["anim", "แอนิเมชัน"], ["bg", "ฉากหลัง"], ["fx", "เอฟเฟกต์"], ["viz", "วิชวล"], ["kar", "คาราโอเกะ"], ["cards", "การ์ด/เครดิต"]];
const touched = () => { P._touched = true; };

/* ---------- fonts (Google by name, or upload) ---------- */
const loadedG = new Set();
function addGoogleFont(name, quiet) {
  name = name.trim(); if (!name) return;
  if (!loadedG.has(name)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;700;900&display=swap`; document.head.appendChild(l); loadedG.add(name); }
  return document.fonts.load(`700 40px "${name}"`, "กขคabc").then(f => {
    if (!f.length) { if (!quiet) toast(`ไม่พบฟอนต์ “${name}” ใน Google Fonts (ต้องออนไลน์และสะกดให้ตรง)`); return false; }
    if (!FONTS.includes(name)) FONTS.push(name); P.gfonts = [...new Set([...(P.gfonts || []), name])]; if (!quiet) toast(`🔤 เพิ่มฟอนต์ ${name} แล้ว`); layoutCache.clear(); return true;
  }).catch(() => false);
}
async function addFontFile(f) {
  try { const name = f.name.replace(/\.(ttf|otf|woff2?)$/i, ""), ff = new FontFace(name, await f.arrayBuffer()); await ff.load(); document.fonts.add(ff); idbPut("font:" + name, { blob: f, name: f.name }); if (!FONTS.includes(name)) FONTS.push(name); P.text.font = name; changed("style"); toast(`🔤 เพิ่มฟอนต์ ${name} แล้ว (จำไว้ในเครื่องนี้)`); showSub("text"); }
  catch { toast("ไฟล์ฟอนต์ใช้ไม่ได้ (รองรับ .ttf .otf .woff .woff2)"); }
}

/* ---------- shared spec builders (also used by the per-line editor) ---------- */
const fontChips = (k = "text.font") => ({ t: "chips", k, o: FONTS.map(f => [f, f + " ไทย"]), style: o => ({ fontFamily: `'${o[0]}',sans-serif` }), after: f => document.fonts.load(`700 40px "${f}"`, "กขค").then(() => layoutCache.clear()) });
function textSpecs(pre = "text.", { perLine = false, get = null } = {}) {
  const k = x => pre + x, g = x => get ? get(x) : P.text[x];
  return [
    { t: "h", l: "ฟอนต์" }, fontChips(k("font")),
    { t: "range", k: k("size"), l: "ขนาด", min: 3, max: 20, step: 0.5, fmt: px1 },
    { t: "range", k: k("weight"), l: "ความหนา", min: 100, max: 900, step: 100 },
    { t: "switch", k: k("italic"), l: "ตัวเอียง" },
    { t: "seg", k: k("align"), l: "จัดวาง", o: [["left", "ซ้าย"], ["center", "กลาง"], ["right", "ขวา"]] },
    { t: "range", k: k("letterSpacing"), l: "ระยะอักษร", min: -4, max: 20, step: 0.5, fmt: px1 },
    { t: "range", k: k("lineHeight"), l: "ระยะบรรทัด", min: 0.9, max: 2, step: 0.05, fmt: x => (+x).toFixed(2) },
    { t: "h", l: "สีและเอฟเฟกต์ตัวอักษร" },
    { t: "color", k: k("color"), l: "สีข้อความ" },
    { t: "grid", k: k("fx"), o: TEXTFX },
    { t: "color", k: k("c2"), l: "สีที่ 2", show: () => ["gradient", "sparkle", "retro"].includes(g("fx")) },
    { t: "range", k: k("angle"), l: "ทิศไล่สี", min: 0, max: 360, step: 5, fmt: deg, show: () => ["gradient", "sparkle", "rainbow"].includes(g("fx")) },
    { t: "color", k: k("depthColor"), l: "สีความลึก", show: () => ["longShadow", "retro"].includes(g("fx")) },
    { t: "range", k: k("depth"), l: "ความลึก", min: 1, max: 20, step: 1, show: () => ["longShadow", "retro"].includes(g("fx")) },
    { t: "color", k: k("stroke"), l: "สีขอบ" },
    { t: "range", k: k("strokeW"), l: "ขอบหนา", min: 0, max: 20, step: 1 },
    { t: "switch", k: k("glow"), l: "เรืองแสง" },
    { t: "color", k: k("glowColor"), l: "สีเรือง", show: () => g("glow") || g("fx") === "neon" },
    { t: "range", k: k("glowStr"), l: "แรงเรือง", min: 0.1, max: 1.5, step: 0.05, fmt: pct, show: () => g("glow") },
    { t: "switch", k: k("shadow"), l: "เงาตกกระทบ" },
    { t: "h", l: "ตำแหน่ง", sub: "ลากข้อความบนพรีวิวได้เลย" },
    { t: "range", k: k("x"), l: "แนวนอน", min: 2, max: 98, step: 0.5, fmt: x => Math.round(x) + "%" },
    { t: "range", k: k("y"), l: "แนวตั้ง", min: 3, max: 97, step: 0.5, fmt: x => Math.round(x) + "%" },
    { t: "range", k: k("rot"), l: "หมุน", min: -180, max: 180, step: 1, fmt: deg },
    { t: "range", k: k("scale"), l: "ย่อ/ขยาย", min: 0.3, max: 2.5, step: 0.05, fmt: pct },
    { t: "switch", k: k("vertical"), l: "เรียงตัวอักษรแนวตั้ง" },
    { t: "h", l: "ค้างท่อน" },
    { t: "switch", k: k("hold"), l: "ค้างท่อนไว้จนท่อนถัดไปขึ้น", sub: "กันจอว่างช่วงดนตรี" },
    { t: "switch", k: k("holdInf"), l: "ไม่จำกัดเวลา", show: () => g("hold") },
    { t: "range", k: k("holdMax"), l: "ค้างนานสุด", min: 1, max: 30, step: 1, fmt: x => x + " วิ", show: () => g("hold") && !g("holdInf") },
    ...(perLine ? [] : [{ t: "switch", k: k("showNext"), l: "แสดงบรรทัดถัดไปจาง ๆ" }]),
  ];
}
function animSpecs(pre = "anim.", { perLine = false } = {}) {
  const k = x => pre + x;
  return [
    { t: "grid", k: k("type"), o: ANIMS },
    ...(perLine ? [] : [{ t: "switch", k: "anim.random", l: "สุ่มแอนิเมชันให้แต่ละท่อน", sub: P.anim.pool && P.anim.pool.length ? "จาก Mood: " + P.anim.pool.join(", ") : "" }]),
    { t: "range", k: k("dur"), l: "ระยะเวลา", min: 0.1, max: 3, step: 0.05, fmt: sec },
    { t: "range", k: k("delay"), l: "ดีเลย์", min: 0, max: 2, step: 0.05, fmt: sec },
    { t: "seg", k: k("ease"), l: "ความนุ่ม", o: EASES },
    { t: "seg", k: k("loop"), l: "ขณะแสดง", o: LOOPS },
    { t: "chips", k: k("exit"), l: "ตอนออก", o: EXITS },
    { t: "range", k: k("exitDur"), l: "ระยะออก", min: 0.1, max: 1.5, step: 0.05, fmt: sec },
  ];
}
function replayCurrent() { const a = activeAt(now()); if (a) { seek(a.start - 0.05); if (!isPlaying()) play(); } else toast("เลื่อนไปช่วงที่มีเนื้อเพลงก่อน"); }

const SUB_SPECS = {
  cards: () => [
    { t: "h", l: "🏷 ชื่อเพลง / ศิลปิน" },
    { t: "switch", k: "card.on", l: "แสดงการ์ดชื่อเพลง" },
    { t: "custom", show: () => P.card.on, make: () => { const d = el("div", ""); d.innerHTML = `<div class="field"><label>ชื่อเพลง</label><input class="inp" data-k="title"></div><div class="field"><label>ชื่อศิลปิน</label><input class="inp" data-k="artist"></div>`;
      $$("input", d).forEach(i => { i.oninput = () => { P[i.dataset.k] = i.value; save(); }; }); d._refresh = () => $$("input", d).forEach(i => { if (document.activeElement !== i) i.value = P[i.dataset.k] || ""; }); return d; } },
    { t: "btn", l: "📄 ใช้ชื่อจากไฟล์เพลง (ศิลปิน - ชื่อเพลง)", show: () => P.card.on, do: () => { const n = M.name || ""; const m = n.split(/\s+-\s+/); if (m.length >= 2) { P.artist = m[0].trim(); P.title = m.slice(1).join(" - ").trim(); } else P.title = n; toast("ใส่ชื่อจากไฟล์เพลงแล้ว • ตรวจแก้ได้"); showSub("cards"); } },
    { t: "grid", k: "card.style", o: CARD_STYLES, show: () => P.card.on },
    { t: "chips", k: "card.pos", l: "ตำแหน่ง", o: CARD_POS, show: () => P.card.on },
    { t: "chips", k: "card.show", l: "แสดงเมื่อไหร่", o: CARD_SHOW, show: () => P.card.on },
    { t: "range", k: "card.start", l: "เริ่มที่", min: 0, max: 600, step: 0.5, fmt: x => fmt(x, 1), show: () => P.card.on && P.card.show !== "ranges" },
    { t: "range", k: "card.end", l: "แสดงถึง", min: 0, max: 600, step: 0.5, fmt: x => x > 0 ? fmt(x, 1) : "จบเพลง", show: () => P.card.on && ["always", "intro"].includes(P.card.show) },
    { t: "range", k: "card.hold", l: "ค้างกลางจอ", min: 1, max: 15, step: 0.5, fmt: x => x + " วิ", show: () => P.card.on && P.card.show === "intro" },
    { t: "range", k: "card.dur", l: "แสดงครั้งละ", min: 2, max: 30, step: 0.5, fmt: x => x + " วิ", show: () => P.card.on && ["once", "repeat"].includes(P.card.show) },
    { t: "range", k: "card.every", l: "แสดงซ้ำทุก", min: 0.5, max: 5, step: 0.5, fmt: x => x + " นาที", show: () => P.card.on && P.card.show === "repeat" },
    { t: "custom", show: () => P.card.on && P.card.show === "ranges", make: fire => { const d = el("div", ""); d._refresh = () => { d.innerHTML = ""; (P.card.ranges || []).forEach((r, i) => { const row = el("div", "trow", `<b>ช่วง ${i + 1}</b><span class="mono">${fmt(r[0], 1)} → ${fmt(r[1], 1)}</span>`); const del = el("button", "btn sm ghost", "ลบ"); del.onclick = () => { P.card.ranges.splice(i, 1); fire(); d._refresh(); }; row.appendChild(del); d.appendChild(row); });
        const add = el("button", "btn sm block", `➕ เพิ่มช่วงที่หัวอ่าน (${fmt(now(), 1)})`); add.onclick = () => { const t = now(); (P.card.ranges = P.card.ranges || []).push([+t.toFixed(1), +(t + 6).toFixed(1)]); fire(); d._refresh(); }; d.appendChild(add); if (!(P.card.ranges || []).length) d.appendChild(el("p", "mute sm note", "ยังไม่มีช่วง • เลื่อนหัวอ่านไปเวลาที่ต้องการแล้วกดเพิ่ม")); }; return d; } },
    { t: "range", k: "card.size", l: "ขนาด", min: 0.5, max: 2.5, step: 0.05, fmt: pct, show: () => P.card.on },
    { t: "color", k: "card.color", l: "สีข้อความ", show: () => P.card.on }, { t: "color", k: "card.accent", l: "สีเน้น", show: () => P.card.on },
    { t: "btn", l: "▶ ดูเอฟเฟกต์เปิดตัวอีกครั้ง", show: () => P.card.on, do: () => { seek(P.card.show === "ranges" ? ((P.card.ranges || [])[0] || [0])[0] : P.card.start); play(); } },
    { t: "h", l: "🎧 เครื่องเล่นเพลง / แผ่นเสียง" },
    { t: "switch", k: "player.on", l: "แสดงเครื่องเล่น" },
    { t: "grid", k: "player.style", o: PLAYERS, show: () => P.player.on },
    { t: "custom", show: () => P.player.on, make: fire => { const d = el("div", "row wrap"); d._refresh = () => { d.innerHTML = `<button class="btn sm grow">⬆ อัพโหลดรูปปก</button>${MEDIA.has("cover") ? '<button class="btn sm ghost">เอารูปปกออก</button>' : '<span class="mute sm">ยังไม่มีรูป ใช้ภาพตัวอย่างจากสีฉากหลัง</span>'}`; const b = $$("button", d); b[0].onclick = () => $("#fileCover").click(); if (b[1]) b[1].onclick = () => { const m = MEDIA.get("cover"); if (m) URL.revokeObjectURL(m.url); MEDIA.delete("cover"); idbDel("cover"); fire(); d._refresh(); }; }; return d; } },
    { t: "range", k: "player.size", l: "ขนาด", min: 0.3, max: 1.8, step: 0.05, fmt: pct, show: () => P.player.on },
    { t: "range", k: "player.x", l: "แนวนอน", min: 5, max: 95, step: 1, fmt: x => x + "%", show: () => P.player.on },
    { t: "range", k: "player.y", l: "แนวตั้ง", min: 5, max: 95, step: 1, fmt: x => x + "%", show: () => P.player.on },
    { t: "switch", k: "player.spin", l: "หมุน", show: () => P.player.on && P.player.style !== "card" },
    { t: "switch", k: "player.arm", l: "แขนเข็ม", show: () => P.player.on && P.player.style === "vinyl" },
    { t: "switch", k: "player.blurBg", l: "พื้นหลังเบลอจากปก", show: () => P.player.on },
    { t: "btn", l: "📍 ย้ายเนื้อเพลงไปอยู่ใต้เครื่องเล่น", show: () => P.player.on, do: () => { const h = Math.min(...RATIOS[P.ratio]) * 0.5 * P.player.size * (P.player.style === "card" ? 1.65 : P.player.style === "cassette" ? 0.96 : 1) / RATIOS[P.ratio][1] * 100; P.text.y = clamp(P.player.y + h / 2 + 10, 10, 92); P.lines.forEach(l => { if (l.o) delete l.o.y; }); toast("ย้ายเนื้อเพลงไปใต้เครื่องเล่นแล้ว"); } },
    { t: "h", l: "🎬 ข้อความเปิด (ต้นวิดีโอ)" },
    { t: "switch", k: "open.on", l: "แสดงข้อความใหญ่กลางจอช่วงต้น" },
    { t: "custom", show: () => P.open.on, make: () => { const d = el("div", "field"); d.innerHTML = `<label>ข้อความ (บรรทัดแรกเป็นหัวเรื่อง • เว้นว่าง = ชื่อเพลงและศิลปิน)</label><textarea class="le-txt" rows="3"></textarea>`; const ta = $("textarea", d); ta.oninput = () => { P.open.text = ta.value; save(); }; d._refresh = () => { if (document.activeElement !== ta) ta.value = P.open.text; }; return d; } },
    { t: "chips", k: "open.anim", l: "เอฟเฟกต์", o: OPEN_ANIMS, show: () => P.open.on },
    { t: "range", k: "open.start", l: "เวลาเริ่ม", min: 0, max: 60, step: 0.5, fmt: x => fmt(x, 1), show: () => P.open.on },
    { t: "range", k: "open.dur", l: "นาน", min: 1.5, max: 15, step: 0.5, fmt: x => x + " วิ", show: () => P.open.on },
    { t: "range", k: "open.size", l: "ขนาด", min: 0.4, max: 2, step: 0.05, fmt: pct, show: () => P.open.on },
    { t: "range", k: "open.dim", l: "ฉากหลังมืดลง", min: 0, max: 90, step: 1, fmt: x => x + "%", show: () => P.open.on },
    { t: "btn", l: "▶ ดูอีกครั้ง", show: () => P.open.on, do: () => { seek(P.open.start); play(); } },
    { t: "h", l: "🎞 เครดิตท้ายเพลง" },
    { t: "switch", k: "credits.on", l: "แสดงเครดิตตอนจบ" },
    { t: "custom", show: () => P.credits.on, make: () => { const d = el("div", "field"); d.innerHTML = `<label>รายชื่อ • เขียนแบบ หัวข้อ: ชื่อ จะจัดเป็นสองฝั่งแบบเครดิตหนัง</label><textarea class="le-txt" rows="6"></textarea>`; const ta = $("textarea", d); ta.oninput = () => { P.credits.text = ta.value; save(); }; d._refresh = () => { if (document.activeElement !== ta) ta.value = P.credits.text; }; return d; } },
    { t: "chips", k: "credits.mode", l: "รูปแบบ", o: CREDIT_MODES, show: () => P.credits.on },
    { t: "range", k: "credits.start", l: "เวลาเริ่ม", min: 0, max: 900, step: 0.5, fmt: x => x > 0 ? fmt(x, 1) : "อัตโนมัติ", show: () => P.credits.on },
    { t: "range", k: "credits.dur", l: "นาน", min: 3, max: 60, step: 0.5, fmt: x => x + " วิ", show: () => P.credits.on },
    { t: "range", k: "credits.size", l: "ขนาด", min: 0.5, max: 2, step: 0.05, fmt: pct, show: () => P.credits.on },
    { t: "range", k: "credits.dim", l: "ฉากหลังมืดลง", min: 0, max: 95, step: 1, fmt: x => x + "%", show: () => P.credits.on },
    { t: "btn", l: "▶ ดูเครดิต", show: () => P.credits.on, do: () => { const d = duration(); seek(P.credits.start > 0 ? P.credits.start : Math.max(0, d - P.credits.dur)); play(); } },
  ],
  theme: () => [
    { t: "h", l: "Mood Styles", sub: "ธีมเดียวทั้งโปรเจกต์ แตะเพื่อใช้" },
    { t: "custom", make: fire => { const g = el("div", "moods"); MOODS.forEach(m => { const b = el("button", "mood", `<i style="background:linear-gradient(160deg,${m.bg.join(",")})"><b>${m.e}</b></i><span>${esc(m.n)}</span>`); b.onclick = () => { applyMood(m); touched(); fire(); toast("🎨 ใช้ธีม " + m.n + " กับทุกท่อนแล้ว"); }; b.dataset.n = m.n; g.appendChild(b); }); g._refresh = () => $$(".mood", g).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.n === P.mood))); return g; } },
    { t: "btn", l: "🚫 ปิดธีม (ปิดเอฟเฟกต์ วิชวลไลเซอร์ และเอฟเฟกต์ตัวอักษร)", do: () => { moodOff(); toast("ปิดธีมแล้ว"); } },
    { t: "h", l: "โหมดการแสดงเนื้อเพลง" },
    { t: "seg", k: "mode", o: [["normal", "ปกติ"], ["karaoke", "คาราโอเกะ"], ["stream", "สตรีมมิ่ง"]] },
    { t: "note", l: "ปกติ: ข้อความลอยพร้อมแอนิเมชัน • คาราโอเกะ: สองบรรทัดแบบทีวี ไล่สีตามเสียงร้อง + คำอ่าน • สตรีมมิ่ง: เนื้อเลื่อนแบบแอปฟังเพลง" },
    { t: "h", l: "สัดส่วนภาพ" },
    { t: "seg", k: "ratio", o: [["9:16", "9:16 แนวตั้ง"], ["1:1", "1:1"], ["16:9", "16:9 แนวนอน"]] },
  ],
  text: () => [
    ...textSpecs(),
    { t: "h", l: "เพิ่มฟอนต์ของคุณเอง" },
    { t: "custom", make: fire => { const d = el("div", "row wrap"); d.innerHTML = `<input class="inp grow" id="gfName" placeholder="ชื่อ Google Font เช่น Mitr, Pacifico"><button class="btn sm">เพิ่ม</button><button class="btn sm ghost">⬆ อัปโหลดไฟล์ฟอนต์</button>`;
      const [add, up] = $$("button", d); add.onclick = async () => { const n = $("#gfName").value; if (await addGoogleFont(n)) { P.text.font = n.trim(); fire(); showSub("text"); } }; up.onclick = () => $("#fileFont").click(); return d; } },
    { t: "btn", l: "ใช้สไตล์ข้อความนี้กับทุกท่อน (ล้างสไตล์รายท่อน)", block: true, do: () => { P.lines.forEach(l => l.o = null); toast("ใช้กับทุกท่อนแล้ว"); } },
  ],
  anim: () => [
    { t: "h", l: "แอนิเมชันตอนข้อความขึ้น", sub: "21 แบบ" }, ...animSpecs(),
    { t: "row", b: [{ l: "▶ ดูอีกครั้ง", cls: "pri", do: replayCurrent }, { l: "ใช้กับทุกท่อน", do: () => { P.lines.forEach(l => l.a = null); toast("ใช้แอนิเมชันนี้กับทุกท่อนแล้ว"); } }] },
  ],
  bg: () => [
    { t: "seg", k: "bg.type", o: [["gradient", "ไล่สี"], ["solid", "สีเดียว"], ["image", "รูป"], ["video", "วิดีโอ"]], },
    { t: "custom", show: () => P.bg.type === "gradient", make: fire => { const d = el("div", ""); d._refresh = () => { d.innerHTML = ""; const names = P.bg.colors.length === 3 ? ["สีบน", "สีกลาง", "สีล่าง"] : ["สีบน", "สีล่าง"];
        buildControls(d, [...P.bg.colors.map((c, i) => ({ t: "color", k: "bg.colors." + i, l: names[i] })), { t: "btn", l: P.bg.colors.length === 3 ? "− เอาสีกลางออก" : "+ เพิ่มสีกลาง (3 สี)", do: () => { if (P.bg.colors.length === 3) P.bg.colors.splice(1, 1); else P.bg.colors.splice(1, 0, mixHex(P.bg.colors[0], P.bg.colors[1], 0.5)); setTimeout(() => d._refresh(), 0); } }], projTarget, fire); }; return d; } },
    { t: "range", k: "bg.angle", l: "ทิศไล่สี", min: 0, max: 360, step: 5, fmt: deg, show: () => P.bg.type === "gradient" },
    { t: "color", k: "bg.solid", l: "สีพื้น", show: () => P.bg.type === "solid" },
    { t: "custom", show: () => P.bg.type === "image" || P.bg.type === "video", make: () => { const d = el("div", "row"); d.innerHTML = `<button class="btn sm ghost grow">เลือกไฟล์…</button><span class="mute sm grow"></span>`; $("button", d).onclick = () => { const f = $("#fileBg"); f.accept = P.bg.type === "video" ? "video/*" : "image/*"; f.click(); }; d._refresh = () => { $("span", d).textContent = M.bgName || "ยังไม่ได้เลือกไฟล์"; }; return d; } },
    { t: "seg", k: "bg.fit", l: "การวางภาพ", o: [["cover", "เต็มขอบ"], ["contain", "พอดีภาพ"]], show: () => P.bg.type === "image" || P.bg.type === "video" },
    { t: "h", l: "โทนสี / ฟิลเตอร์" },
    { t: "chips", k: "bg.filter", o: FILTERS },
    { t: "range", k: "bg.blur", l: "เบลอ", min: 0, max: 30, step: 1 },
    { t: "range", k: "bg.bright", l: "ความสว่าง", min: 40, max: 160, step: 1, fmt: x => x + "%" },
    { t: "range", k: "bg.contrast", l: "คอนทราสต์", min: 40, max: 160, step: 1, fmt: x => x + "%" },
    { t: "range", k: "bg.sat", l: "ความอิ่มสี", min: 0, max: 200, step: 1, fmt: x => x + "%" },
    { t: "range", k: "bg.dim", l: "ชั้นมืด", min: 0, max: 85, step: 1, fmt: x => x + "%" },
    { t: "note", l: "ชั้นมืดช่วยให้ตัวหนังสืออ่านง่ายขึ้นบนรูป/วิดีโอ" },
    { t: "h", l: "💓 ฉากหลังตอบสนองเสียง" },
    { t: "range", k: "bg.beat", l: "เต้นตามจังหวะ", min: 0, max: 1, step: 0.05, fmt: pct },
    { t: "note", l: "ซูม + สว่างวูบตามจังหวะกลอง ใช้ตัวจับจังหวะเดียวกับวิชวลไลเซอร์" },
  ],
  fx: () => [
    { t: "h", l: "🎬 Looks สำเร็จรูป" },
    { t: "chips", k: "_look", o: LOOKS.map(([n]) => [n, n]), isOn: v => { const lk = LOOKS.find(x => x[0] === v)[1]; return FX_IDS.every(k => !!P.fx[k] === !!lk[k]); },
      after: v => { const lk = LOOKS.find(x => x[0] === v)[1]; FX_IDS.forEach(k => P.fx[k] = !!lk[k]); delete P._look; toast("ใช้ Look: " + v); } },
    ...FXCAT.flatMap(([cat, items]) => [{ t: "h", l: cat }, { t: "grid", k: "fx", o: items.map(([id, e, n]) => [id, n, e]), isOn: v => !!P.fx[v], multi: true, after: () => { } }]).map(s => s.t === "grid" ? { ...s, k: "fx" , multi: false, isOn: v => !!P.fx[v], after: null, custom: true } : s),
    { t: "h", l: "ปรับค่า" },
    { t: "range", k: "fx.amt", l: "ความแรงรวม", min: 0.3, max: 2, step: 0.05, fmt: pct },
    { t: "range", k: "fx.vigAmt", l: "ขอบมืด", min: 0.1, max: 1, step: 0.05, fmt: pct, show: () => P.fx.vignette },
    { t: "range", k: "fx.grainAmt", l: "เกรนฟิล์ม", min: 0.05, max: 1, step: 0.05, fmt: pct, show: () => P.fx.grain },
    { t: "range", k: "fx.kbAmt", l: "Ken Burns ซูม", min: 0.02, max: 0.4, step: 0.01, fmt: pct, show: () => P.fx.kenBurns },
    { t: "h", l: "🔮 โบเก้", show: () => P.fx.bokeh },
    { t: "color", k: "fx.bokehCfg.c1", l: "สี 1", show: () => P.fx.bokeh }, { t: "color", k: "fx.bokehCfg.c2", l: "สี 2", show: () => P.fx.bokeh },
    { t: "seg", k: "fx.bokehCfg.shape", l: "รูปทรง", o: [["circle", "วงกลม"], ["heart", "หัวใจ"], ["star", "ดาว"]], show: () => P.fx.bokeh },
    { t: "range", k: "fx.bokehCfg.count", l: "จำนวน", min: 3, max: 40, step: 1, show: () => P.fx.bokeh },
    { t: "range", k: "fx.bokehCfg.size", l: "ขนาด", min: 20, max: 200, step: 1, show: () => P.fx.bokeh },
    { t: "range", k: "fx.bokehCfg.blur", l: "เบลอ", min: 5, max: 95, step: 1, show: () => P.fx.bokeh },
    { t: "range", k: "fx.bokehCfg.opacity", l: "โปร่งใส", min: 0.05, max: 1, step: 0.01, fmt: pct, show: () => P.fx.bokeh },
    { t: "range", k: "fx.bokehCfg.speed", l: "ความเร็วลอย", min: 1, max: 40, step: 1, show: () => P.fx.bokeh },
    { t: "btn", l: "ปิดเอฟเฟกต์ทั้งหมด", block: true, do: () => FX_IDS.forEach(k => P.fx[k] = false) },
  ],
  viz: () => [
    { t: "switch", k: "viz.on", l: "เปิดวิชวลไลเซอร์", sub: "19 รูปแบบ • พรีวิวและส่งออกใช้ค่าชุดเดียวกัน" },
    { t: "grid", k: "viz.mode", o: VIZ.map(([id, e, n]) => [id, n, e]), show: () => P.viz.on },
    { t: "chips", k: "viz.pos", l: "ตำแหน่ง", o: VIZ_POS, show: () => P.viz.on },
    { t: "h", l: "🌈 สีและแสง", show: () => P.viz.on },
    { t: "seg", k: "viz.colorMode", o: VIZ_COLOR, show: () => P.viz.on },
    { t: "color", k: "viz.c1", l: "สี 1", show: () => P.viz.on }, { t: "color", k: "viz.c2", l: "สี 2", show: () => P.viz.on && P.viz.colorMode !== "solid" },
    { t: "range", k: "viz.opacity", l: "ความทึบ", min: 0.1, max: 1, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "switch", k: "viz.glow", l: "เรืองแสง Glow", show: () => P.viz.on },
    { t: "range", k: "viz.glowStr", l: "แรงเรือง", min: 0.1, max: 1.5, step: 0.05, fmt: pct, show: () => P.viz.on && P.viz.glow },
    { t: "h", l: "🧩 รูปทรง", show: () => P.viz.on },
    { t: "range", k: "viz.height", l: "ความสูง", min: 0.1, max: 1.2, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "range", k: "viz.size", l: "ขนาดวง", min: 0.1, max: 1, step: 0.05, fmt: pct, show: () => P.viz.on && ROUND_MODES.includes(P.viz.mode) },
    { t: "range", k: "viz.count", l: "จำนวนแท่ง", min: 8, max: 128, step: 1, show: () => P.viz.on },
    { t: "range", k: "viz.x", l: "แนวนอน", min: 10, max: 90, step: 1, fmt: x => x + "%", show: () => P.viz.on },
    { t: "range", k: "viz.thick", l: "ความหนาแท่ง", min: 0.1, max: 1, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "range", k: "viz.round", l: "ความโค้งมน", min: 0, max: 1, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "range", k: "viz.line", l: "ความหนาเส้น", min: 1, max: 10, step: 0.5, show: () => P.viz.on },
    { t: "switch", k: "viz.peaks", l: "ปลายยอด (Peak)", show: () => P.viz.on && P.viz.mode === "bars" },
    { t: "switch", k: "viz.reflect", l: "เงาสะท้อน", sub: "Bars ชิดล่าง", show: () => P.viz.on && P.viz.mode === "bars" },
    { t: "range", k: "viz.spin", l: "ความเร็วหมุน", min: -1, max: 1, step: 0.05, show: () => P.viz.on && ROUND_MODES.includes(P.viz.mode) },
    { t: "h", l: "🎧 การตอบสนองต่อเสียง", show: () => P.viz.on },
    { t: "range", k: "viz.sens", l: "ความไว", min: 0.3, max: 2.5, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "range", k: "viz.smooth", l: "Smoothing", min: 0, max: 1, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "range", k: "viz.attack", l: "ขาขึ้นเร็ว", min: 0, max: 1, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "range", k: "viz.decay", l: "ขาลงช้า", min: 0, max: 1, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "range", k: "viz.beat", l: "แรงตามจังหวะ", min: 0, max: 1.5, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "range", k: "viz.low", l: "ตัดเสียงต่ำ", min: 0, max: 0.8, step: 0.05, fmt: pct, show: () => P.viz.on },
    { t: "btn", l: "↺ รีเซ็ตค่าละเอียด (คงโหมดและสีไว้)", block: true, show: () => P.viz.on, do: () => { const d = DEF().viz; Object.assign(P.viz, { ...d, on: true, mode: P.viz.mode, c1: P.viz.c1, c2: P.viz.c2, colorMode: P.viz.colorMode }); } },
  ],
  kar: () => [
    { t: "seg", k: "mode", o: [["normal", "ปกติ"], ["karaoke", "คาราโอเกะ"], ["stream", "สตรีมมิ่ง"]] },
    // ---- normal mode: word highlight ----
    { t: "switch", k: "kar.on", l: "🎤 ไฮไลต์ทีละคำ (คาราโอเกะ)", sub: "ไล่สีตามจังหวะร้อง", show: () => P.mode === "normal" },
    { t: "color", k: "kar.sung", l: "สีที่ร้องแล้ว", show: () => P.mode === "normal" && P.kar.on },
    { t: "seg", k: "kar.style", l: "การไล่สี", o: [["smooth", "ไล่สีลื่น"], ["letter", "ทีละตัวอักษร"]], show: () => P.mode === "normal" && P.kar.on },
    { t: "h", l: "✨ เอฟเฟกต์คำที่กำลังร้อง", show: () => P.mode === "normal" && P.kar.on },
    { t: "grid", k: "kar.wfx", o: [["none", "ไม่มี", "⏹"], ["glow", "แสงเรือง", "💫"], ["sparkle", "ประกาย", "✨"], ["flowers", "ดอกไม้", "🌸"], ["hearts", "หัวใจ", "💖"], ["notes", "โน้ตเพลง", "🎶"], ["bubbles", "ฟองสบู่", "🫧"], ["stars", "ดาว", "⭐"]], show: () => P.mode === "normal" && P.kar.on },
    { t: "seg", k: "kar.wmotion", l: "คำเคลื่อนไหว", o: [["none", "ไม่มี"], ["bounce", "เด้ง"], ["pop", "ป๊อป"], ["wave", "คลื่น"]], show: () => P.mode === "normal" && P.kar.on },
    { t: "seg", k: "kar.wfxColor", l: "สีลูกเล่น", o: [["pastel", "พาสเทล"], ["grad", "ตามสีไล่"], ["white", "ขาว"]], show: () => P.mode === "normal" && P.kar.on && !["none", "glow"].includes(P.kar.wfx) },
    { t: "range", k: "kar.wfxAmt", l: "ความแรง", min: 0.1, max: 1.5, step: 0.05, fmt: pct, show: () => P.mode === "normal" && P.kar.on && P.kar.wfx !== "none" },
    { t: "range", k: "kar.wfxSize", l: "ขนาดลูกเล่น", min: 0.4, max: 2.5, step: 0.05, fmt: pct, show: () => P.mode === "normal" && P.kar.on && !["none", "glow"].includes(P.kar.wfx) },
    { t: "h", l: "🔤 ขึ้นทีละคำตามคำร้อง", show: () => P.mode === "normal" },
    { t: "switch", k: "kar.reveal", l: "เปิดการขึ้นทีละคำ", show: () => P.mode === "normal" },
    { t: "seg", k: "kar.revealAnim", l: "ท่าขึ้น", o: [["float", "ลอยขึ้น"], ["pop", "ป๊อป"], ["blur", "เบลอชัด"], ["drop", "หล่นลง"], ["fade", "จางเข้า"]], show: () => P.mode === "normal" && P.kar.reveal },
    { t: "range", k: "kar.revealDur", l: "ความยาวต่อคำ", min: 0.1, max: 1.2, step: 0.05, fmt: sec, show: () => P.mode === "normal" && P.kar.reveal },
    { t: "switch", k: "kar.ghost", l: "👻 แสดงคำที่ยังไม่ถึงแบบจาง ๆ", show: () => P.mode === "normal" && P.kar.reveal },
    // ---- karaoke (TV) ----
    { t: "h", l: "🎨 ชุดสีตัวหนังสือ", show: () => P.mode === "karaoke" },
    { t: "custom", show: () => P.mode === "karaoke", make: fire => { const g = el("div", "chips"); Object.entries(KR_SETS).forEach(([id, s]) => { const b = el("button", "chip", `<span class="ksw" style="background:linear-gradient(90deg,${s.post} 55%,${s.pre} 55%);box-shadow:0 0 0 2px ${s.postStroke}"></span>${s.n}`); b.dataset.v = id; b.onclick = () => { P.tv.set = id; P.tv.custom = false; Object.assign(P.tv.colors, { pre: s.pre, preStroke: s.preStroke, post: s.post, postStroke: s.postStroke, rom: s.rom }); fire(); }; g.appendChild(b); }); g._refresh = () => $$("button", g).forEach(b => b.setAttribute("aria-pressed", String(!P.tv.custom && b.dataset.v === P.tv.set))); return g; } },
    { t: "switch", k: "tv.custom", l: "กำหนดสีเอง", show: () => P.mode === "karaoke" },
    ...[["pre", "ตัวอักษรก่อนร้อง"], ["preStroke", "ขอบก่อนร้อง"], ["post", "ตัวอักษรที่ร้องแล้ว"], ["postStroke", "ขอบที่ร้องแล้ว"], ["rom", "สีคำอ่าน"]].map(([k, l]) => ({ t: "color", k: "tv.colors." + k, l, show: () => P.mode === "karaoke" && P.tv.custom })),
    { t: "range", k: "tv.size", l: "ขนาดตัวไทย", min: 3, max: 14, step: 0.25, fmt: px1, show: () => P.mode === "karaoke" },
    { t: "range", k: "tv.strokeW", l: "ขอบหนา", min: 0, max: 22, step: 1, show: () => P.mode === "karaoke" },
    { t: "range", k: "tv.bottom", l: "ตำแหน่งแนวตั้ง", min: 30, max: 95, step: 1, fmt: x => x + "%", show: () => P.mode === "karaoke" },
    { t: "switch", k: "tv.rom", l: "🔤 แสดงคำอ่านอังกฤษ", show: () => P.mode === "karaoke" },
    { t: "range", k: "tv.romSize", l: "ขนาดคำอ่าน", min: 25, max: 120, step: 1, fmt: x => x + "% ของตัวไทย", show: () => P.mode === "karaoke" && P.tv.rom },
    { t: "seg", k: "tv.romCase", l: "ตัวพิมพ์", o: [["lower", "เล็ก"], ["title", "ขึ้นต้นใหญ่"], ["upper", "ใหญ่ทั้งหมด"]], show: () => P.mode === "karaoke" && P.tv.rom },
    { t: "switch", k: "tv.showNext", l: "แสดงบรรทัดถัดไป", show: () => P.mode === "karaoke" },
    { t: "switch", k: "tv.split", l: "บรรทัดยาวตัดเป็น 2 แถว", show: () => P.mode === "karaoke" },
    { t: "switch", k: "tv.dots", l: "จุดนับถอยหลัง", show: () => P.mode === "karaoke" },
    // ---- streaming ----
    { t: "chips", k: "stream.style", l: "สไตล์สตรีมมิ่ง", o: [["classic", "คลาสสิก", "✨"], ["pear", "Pear Music", "🍐"], ["spot", "SpotLyric", "🟢"]],
      after: v => { const S = P.stream; if (v === "spot" && String(S.card).toLowerCase() === "#000000") S.card = "#7a2945"; if (v === "classic" && String(S.card).toLowerCase() === "#7a2945") S.card = "#000000"; }, show: () => P.mode === "stream" },
    { t: "seg", k: "stream.align", l: "จัดวาง", o: [["center", "กึ่งกลาง"], ["left", "ชิดซ้าย"]], show: () => P.mode === "stream" },
    { t: "range", k: "stream.size", l: "ขนาดตัวอักษร", min: 3, max: 12, step: 0.25, fmt: px1, show: () => P.mode === "stream" },
    { t: "range", k: "stream.top", l: "บรรทัดปัจจุบันที่", min: 20, max: 80, step: 1, fmt: x => x + "% จากบน", show: () => P.mode === "stream" },
    { t: "switch", k: "stream.fill", l: "🎤 ไล่สีตามเสียงร้อง", show: () => P.mode === "stream" },
    { t: "switch", k: "stream.blur", l: "🌫 เบลอบรรทัดไกล", show: () => P.mode === "stream" && P.stream.style !== "spot" },
    { t: "switch", k: "stream.rom", l: "🔤 แสดงคำอ่าน", show: () => P.mode === "stream" },
    { t: "range", k: "stream.dim", l: "การ์ดพื้นหลัง", min: 0, max: 90, step: 1, fmt: x => x + "%", show: () => P.mode === "stream" && (P.stream.style || "classic") === "classic" },
    { t: "range", k: "stream.dim", l: "ฉากหลังมืดลง", min: 0, max: 90, step: 1, fmt: x => x + "%", show: () => P.mode === "stream" && P.stream.style === "pear" },
    { t: "range", k: "stream.cardA", l: "ความทึบการ์ด", min: 0.1, max: 1, step: 0.02, fmt: x => Math.round(x * 100) + "%", show: () => P.mode === "stream" && P.stream.style === "spot" },
    { t: "color", k: "stream.card", l: "สีการ์ด", show: () => P.mode === "stream" && (P.stream.style === "spot" || (P.stream.style !== "pear" && P.stream.dim > 0)) },
    { t: "color", k: "stream.glow", l: "สีเรือง", show: () => P.mode === "stream" && (P.stream.style || "classic") === "classic" },
    // ---- shared word-timing tools ----
    { t: "h", l: "⏱ จังหวะรายคำ", sub: "ใช้กับไฮไลต์/คาราโอเกะ/สตรีมมิ่ง" },
    { t: "note", l: "ถ้ายังไม่ตั้ง ระบบจะประมาณจากความยาวข้อความให้ • LRC แบบมี &lt;เวลา&gt; รายคำใช้ได้ทันที" },
    { t: "row", b: [{ l: "⚡ จัดอัตโนมัติจากเสียง", cls: "pri", do: autoWordTiming }, { l: "🎯 แตะตั้งจังหวะทั้งเพลง", do: () => startWordTap(0) }] },
    { t: "row", b: [{ l: "ล้างจังหวะคำ", do: () => { P.lines.forEach(l => l.kt = null); toast("ล้างจังหวะคำทั้งหมดแล้ว"); } }, { l: "✨ แก้คำอ่านรายท่อน", do: () => { const a = activeAt(now()); openLineEditor(a ? a.i : 0); } }] },
  ],
};
/* FX grid toggles: the generic grid sets a single value, so wire multi-toggle here */
function showSub(id) {
  UI.sub = id;
  $$("#subnav button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === id)));
  const box = $("#subbody"), specs = SUB_SPECS[id]().map(s => s.custom ? { ...s, t: "custom", make: fire => { const g = el("div", "tiles"); s.o.forEach(([v, lab, em]) => { const b = el("button", "tile", `<i>${em}</i><span>${esc(lab)}</span>`); b.dataset.v = v; b.onclick = () => { P.fx[v] = !P.fx[v]; fire(); }; g.appendChild(b); }); g._refresh = () => $$("button", g).forEach(b => b.setAttribute("aria-pressed", String(!!P.fx[b.dataset.v]))); return g; } } : s);
  buildControls(box, specs, projTarget, () => { touched(); changed("style"); if (id === "theme") fitStage(); });
  box.scrollTop = 0; $("#p-style").scrollTop = 0;
}
function buildSubnav() {
  $("#subnav").innerHTML = SUBS.map(([v, l]) => `<button class="chip" data-v="${v}">${l}</button>`).join("");
  $$("#subnav button").forEach(b => b.onclick = () => showSub(b.dataset.v));
}
$("#fileCover").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; mountMedia("cover", f, f.name); coverPh = null; toast("🖼 ตั้งรูปปกแล้ว"); if (UI.tab === "style") showSub(UI.sub); };
$("#fileFont").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) addFontFile(f); };
function setBgMedia(f, persist = true) {
  if (M.bgUrl) URL.revokeObjectURL(M.bgUrl); M.bgUrl = URL.createObjectURL(f); M.bgName = f.name; if (persist) idbPut("bg", { blob: f, name: f.name, type: f.type });
  if (f.type.startsWith("video")) { const v = document.createElement("video"); v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto"; v.src = M.bgUrl; v.load(); M.bgVid = v; P.bg.type = "video"; }
  else { const im = new Image(); im.src = M.bgUrl; M.bgImg = im; P.bg.type = "image"; }
  if (!persist) return; touched(); changed("style"); if (UI.tab === "style") showSub(UI.sub);
}
$("#fileBg").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) setBgMedia(f); };
