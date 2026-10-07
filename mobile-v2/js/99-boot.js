/* =====================================================================
   boot
   ===================================================================== */
loadProject();
(P.gfonts || []).forEach(n => addGoogleFont(n, true));
buildSubnav();
$("#txt").value = P.lines.map(l => l.text).join("\n");
$("#off").value = Math.round(UI.tapOff * 1000); $("#offV").textContent = UI.tapOff.toFixed(2) + "s";
listeners.add(what => {
  refreshProgress();
  if (what === "lines" || what === "audio" || what === "all") { refreshLyricsStat(); if (UI.tab === "sync" && !UI.wt) { buildLines(); updateNow(); } }
  if (what === "audio" || what === "all") refreshSong();
  if (what === "all" && UI.tab === "style") showSub(UI.sub);
  if (what === "style") fitStage();
});
updatePlayBtn(); refreshSong();
$("#btnPlay").onclick = () => isPlaying() ? pause() : play();
const scrubEl = $("#scrub");
scrubEl.addEventListener("pointerdown", () => scrubbing = true);
addEventListener("pointerup", () => scrubbing = false);
scrubEl.addEventListener("input", () => { const d = duration(); seek(scrubEl.value / 1000 * d); scrubEl.style.setProperty("--p", scrubEl.value / 10 + "%"); });
const startTab = (location.hash || "").slice(1);
setTab(["song", "lyrics", "sync", "style"].includes(startTab) ? startTab : (P.lines.length ? "sync" : "song"));
fitStage(); requestAnimationFrame(frame);
addEventListener("keydown", e => {
  if (/input|textarea|select/i.test(e.target.tagName)) return;
  if (e.code === "Space") { e.preventDefault(); if (UI.tab === "sync") tap(); else isPlaying() ? pause() : play(); }
  else if (e.code === "ArrowLeft") seek(now() - (e.shiftKey ? 5 : 1)); else if (e.code === "ArrowRight") seek(now() + (e.shiftKey ? 5 : 1));
  else if (e.code === "Escape") { if (!$("#lineSheet").hidden) closeLineEditor(); else if (!$("#exportSheet").hidden && !EX.running) $("#exportSheet").hidden = true; }
});
document.addEventListener("visibilitychange", () => { if (document.hidden && !EX.running) pause(); });
document.fonts && document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", () => layoutCache.clear());
