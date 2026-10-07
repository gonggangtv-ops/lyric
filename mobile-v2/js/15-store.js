/* =====================================================================
   media store: files (song, backgrounds, clips, cover, fonts) persist in
   IndexedDB so the project reopens complete. Runtime handles live in MEDIA.
   ===================================================================== */
const MEDIA = new Map();      // mid → { url, name, type, el, buf }
const IDB = { db: null };
function idbOpen() {
  if (IDB.db) return Promise.resolve(IDB.db);
  return new Promise((res, rej) => { try { const r = indexedDB.open("lyricverse-mobile", 1); r.onupgradeneeded = () => r.result.createObjectStore("media"); r.onsuccess = () => { IDB.db = r.result; res(IDB.db); }; r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
}
async function idbPut(key, val) { try { const db = await idbOpen(); await new Promise((res, rej) => { const tx = db.transaction("media", "readwrite"); tx.objectStore("media").put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); return true; } catch (e) { console.warn("idb put", e); return false; } }
async function idbGet(key) { try { const db = await idbOpen(); return await new Promise((res, rej) => { const r = db.transaction("media").objectStore("media").get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch { return null; } }
async function idbDel(key) { try { const db = await idbOpen(); db.transaction("media", "readwrite").objectStore("media").delete(key); } catch { } }
async function idbKeys() { try { const db = await idbOpen(); return await new Promise(res => { const r = db.transaction("media").objectStore("media").getAllKeys(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); }); } catch { return []; } }

/* register a File/Blob as runtime media (and persist it) */
function mediaKind(f) { const t = f.type || ""; return t.startsWith("video") ? "video" : t.startsWith("audio") ? "audio" : t.startsWith("image") ? "image" : /\.(mp4|mov|webm|m4v)$/i.test(f.name || "") ? "video" : /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name || "") ? "audio" : "image"; }
function mountMedia(mid, blob, name, persist = true) {
  const old = MEDIA.get(mid); if (old && old.url) URL.revokeObjectURL(old.url);
  const type = mediaKind(blob.type ? blob : { type: "", name }), url = URL.createObjectURL(blob), m = { url, name, type, el: null, buf: null, blob };
  if (type === "image") { m.el = new Image(); m.el.src = url; }
  else if (type === "video") { const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url; v.load(); m.el = v; }
  else { const a = new Audio(); a.preload = "auto"; a.src = url; m.el = a; }
  MEDIA.set(mid, m);
  if (persist) idbPut(mid, { blob, name, type: blob.type || "" });
  return m;
}
async function decodeMedia(mid) {
  const m = MEDIA.get(mid); if (!m) return null; if (m.buf) return m.buf;
  try { const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC(); const ab = await m.blob.arrayBuffer(); m.buf = await new Promise((r, j) => ctx.decodeAudioData(ab, r, j)); ctx.close && ctx.close(); } catch (e) { console.warn("decode", e); }
  return m.buf;
}
/* boot: restore everything referenced by the project */
async function restoreMedia() {
  const song = await idbGet("song");
  if (song && song.blob) { const f = new File([song.blob], song.name || "song", { type: song.type || song.blob.type }); await loadAudioFile(f, true); }
  const bg = await idbGet("bg");
  if (bg && bg.blob) setBgMedia(new File([bg.blob], bg.name || "bg", { type: bg.type || bg.blob.type }), false);
  for (const c of P.clips || []) { if (MEDIA.has(c.mid)) continue; const r = await idbGet(c.mid); if (r && r.blob) mountMedia(c.mid, r.blob, r.name, false); }
  for (const k of await idbKeys()) { if (typeof k === "string" && k.startsWith("font:")) { const r = await idbGet(k); if (r && r.blob) { try { const name = k.slice(5), ff = new FontFace(name, await r.blob.arrayBuffer()); await ff.load(); document.fonts.add(ff); if (!FONTS.includes(name)) FONTS.push(name); } catch { } } } }
  const cv = await idbGet("cover"); if (cv && cv.blob) mountMedia("cover", cv.blob, cv.name, false);
  layoutCache.clear(); changed("media");
}
/* drop stored files no longer referenced by the project */
async function gcMedia() {
  const keep = new Set(["song", "bg", "cover", ...(P.clips || []).map(c => c.mid)]);
  for (const k of await idbKeys()) if (typeof k === "string" && !k.startsWith("font:") && !keep.has(k)) idbDel(k);
}
