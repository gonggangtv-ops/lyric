/* =====================================================================
   per-line editor (bottom sheet): text, romanisation, IN/OUT, word timing,
   per-line style + animation overrides
   ===================================================================== */
let LE = { i: -1, part: "text" };
function lineTarget(l) {
  return {
    get: k => { const [g, x] = k.split(/\.(.+)/); if (g === "text") return l.o && l.o[x] !== undefined ? l.o[x] : getPath(P.text, x); if (g === "anim") return l.a && l.a[x] !== undefined ? l.a[x] : getPath(P.anim, x); return getPath(l, k); },
    set: (k, v) => { const [g, x] = k.split(/\.(.+)/); if (g === "text") { l.o = l.o || {}; l.o[x] = v; } else if (g === "anim") { l.a = l.a || {}; l.a[x] = v; } else setPath(l, k, v); },
  };
}
function openLineEditor(i) {
  if (!P.lines[i]) return;
  LE.i = i; $("#lineSheet").hidden = false; renderLineEditor();
}
function closeLineEditor() { $("#lineSheet").hidden = true; LE.i = -1; if (UI.tab === "sync") buildLines(); }
function renderLineEditor() {
  const i = LE.i, l = P.lines[i]; if (!l) return closeLineEditor();
  const x = timed().find(q => q.i === i), tg = lineTarget(l);
  $("#leTitle").textContent = `ท่อนที่ ${i + 1} / ${P.lines.length}`;
  const box = $("#leBody"); box.innerHTML = "";
  const on = !!(l.o || l.a);
  const specs = [
    { t: "custom", make: () => { const d = el("div", ""); d.innerHTML = `<textarea class="le-txt" rows="2" spellcheck="false"></textarea>`; const ta = $("textarea", d); ta.value = l.text;
      ta.oninput = () => { l.text = ta.value.replace(/\n/g, " "); l.kt = null; romCache.delete(l.text); changed("lines"); $("#txt").value = P.lines.map(q => q.text).join("\n"); }; return d; } },
    { t: "custom", make: () => { const d = el("div", "ctl"); d.innerHTML = `<label>คำอ่าน</label><input class="inp grow" placeholder="">`; const inp = $("input", d);
      d._refresh = () => { inp.placeholder = romanizeText(l.text) || "คำอ่านอังกฤษ"; if (document.activeElement !== inp) inp.value = l.rom ?? ""; };
      inp.oninput = () => { l.rom = inp.value.trim() ? inp.value : null; changed("lines"); }; return d; } },
    { t: "h", l: "เวลา" },
    { t: "custom", make: fire => { const d = el("div", "timebox");
      d._refresh = () => { const xx = timed().find(q => q.i === i);
        d.innerHTML = `<div class="trow"><b>IN</b><span class="mono">${l.start == null ? "—" : fmt(l.start, 2)}</span><button class="btn sm" data-a="in-0.1">−0.1</button><button class="btn sm" data-a="in+0.1">+0.1</button><button class="btn sm pri" data-a="in-now">ตอนนี้</button></div>
          <div class="trow"><b>OUT</b><span class="mono">${xx ? fmt(xx.end, 2) : "—"}${l.end == null ? ' <small class="mute">อัตโนมัติ</small>' : ""}</span><button class="btn sm" data-a="out-0.1">−0.1</button><button class="btn sm" data-a="out+0.1">+0.1</button><button class="btn sm pri" data-a="out-now">ตอนนี้</button>${l.end != null ? '<button class="btn sm ghost" data-a="out-auto">อัตโนมัติ</button>' : ""}</div>`;
        $$("button", d).forEach(b => b.onclick = () => { const a = b.dataset.a, xx2 = timed().find(q => q.i === i);
          if (a === "in-now") l.start = Math.max(0, now() - UI.tapOff); else if (a.startsWith("in")) l.start = Math.max(0, (l.start ?? now()) + parseFloat(a.slice(2)));
          else if (a === "out-now") l.end = Math.max((l.start ?? 0) + 0.2, now()); else if (a === "out-auto") l.end = null; else if (a.startsWith("out")) l.end = Math.max((l.start ?? 0) + 0.2, (l.end ?? (xx2 ? xx2.end : now())) + parseFloat(a.slice(3)));
          changed("lines"); fire(); }); };
      return d; } },
    { t: "custom", make: () => { const d = el("div", "row wrap"); d._refresh = () => { d.innerHTML = `<span class="pill ${l.kt ? "ok" : ""}">${l.kt ? "🎤 มีจังหวะรายคำ" : "จังหวะคำ: ประมาณอัตโนมัติ"}</span><button class="btn sm grow">🎯 ตั้งจังหวะคำท่อนนี้</button>${l.kt ? '<button class="btn sm ghost">ล้าง</button>' : ""}`;
      const bs = $$("button", d); bs[0].onclick = () => { closeLineEditor(); startWordTap(i, true); }; if (bs[1]) bs[1].onclick = () => { l.kt = null; changed("lines"); renderLineEditor(); }; }; return d; } },
    { t: "row", b: [{ l: "▶ เล่นท่อนนี้", cls: "pri", do: () => { if (l.start == null) return toast("ท่อนนี้ยังไม่มีเวลา"); seek(Math.max(0, l.start - 0.3)); play(); } },
      { l: "➕ เพิ่มบรรทัดต่อ", do: () => { P.lines.splice(i + 1, 0, normLine({ text: "บรรทัดใหม่" })); $("#txt").value = P.lines.map(q => q.text).join("\n"); changed("lines"); openLineEditor(i + 1); } },
      { l: "🗑 ลบ", do: () => { if (!confirm("ลบท่อนนี้?")) return; P.lines.splice(i, 1); $("#txt").value = P.lines.map(q => q.text).join("\n"); changed("lines"); closeLineEditor(); } }] },
    { t: "h", l: "สไตล์เฉพาะท่อนนี้" },
    { t: "custom", make: fire => { const b = el("button", "tog"); b.setAttribute("role", "switch"); b.innerHTML = `<span>ใช้สไตล์/แอนิเมชันแยกจากทั้งโปรเจกต์</span><span class="sw"></span>`;
      b.onclick = () => { if (l.o || l.a) { l.o = null; l.a = null; } else { l.o = {}; l.a = {}; } changed("line"); renderLineEditor(); };
      b._refresh = () => { b.setAttribute("aria-checked", String(on)); $(".sw", b).setAttribute("aria-checked", String(on)); }; return b; } },
  ];
  if (on) {
    specs.push({ t: "custom", make: () => { const s = el("div", "seg"); [["text", "ข้อความ"], ["anim", "แอนิเมชัน"]].forEach(([v, lab]) => { const b = el("button", "", lab); b.setAttribute("aria-pressed", String(LE.part === v)); b.onclick = () => { LE.part = v; renderLineEditor(); }; s.appendChild(b); }); return s; } });
    if (LE.part === "text") specs.push(...textSpecs("text.", { perLine: true, get: k => tg.get("text." + k) }));
    else specs.push(...animSpecs("anim.", { perLine: true }), { t: "btn", l: "▶ ดูแอนิเมชันท่อนนี้", cls: "pri", block: true, do: () => { if (l.start != null) { seek(l.start - 0.05); play(); } } });
    specs.push({ t: "row", b: [{ l: "ใช้สไตล์นี้กับทุกท่อน", do: () => { Object.assign(P.text, l.o || {}); Object.assign(P.anim, l.a || {}); P.lines.forEach(q => { q.o = null; q.a = null; }); toast("ใช้กับทุกท่อนแล้ว"); renderLineEditor(); } },
      { l: "ล้างสไตล์ท่อนนี้", do: () => { l.o = null; l.a = null; renderLineEditor(); } }] });
  }
  buildControls(box, specs, tg, () => { changed("line"); });
}
$("#leClose").onclick = closeLineEditor;
$("#lePrev").onclick = () => { if (LE.i > 0) openLineEditor(LE.i - 1); };
$("#leNext").onclick = () => { if (LE.i < P.lines.length - 1) openLineEditor(LE.i + 1); };
$("#lineSheet").addEventListener("click", e => { if (e.target.id === "lineSheet") closeLineEditor(); });
