#!/usr/bin/env python3
"""Assemble Mobile.html (a single self-contained file) from:
   style.css + body.html + js/*.js (in name order)
   + the MIT-licensed mp4-muxer / webm-muxer / thai-romanization builds
     that already ship inside LyricMoblie.html."""
import re, pathlib
here = pathlib.Path(__file__).resolve().parent
root = here.parent
old = (root / "LyricMoblie.html").read_text(encoding="utf-8")
def grab(tag):
    m = re.search(r"<script>/\* " + re.escape(tag) + r" .*?</script>", old, re.S)
    assert m, tag
    return m.group(0)
FONTS = "Kanit:wght@400;700;800;900&family=Prompt:wght@400;700;900&family=Sarabun:wght@400;700;800&family=Mitr:wght@400;600&family=Pridi:wght@400;700&family=Chakra+Petch:wght@400;700&family=Itim&family=Bai+Jamjuree:wght@400;700&family=Inter:wght@400;700;900&family=Pacifico"
head = f"""<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SN28PVM501"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());

  gtag('config', 'G-SN28PVM501');
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<meta name="theme-color" content="#09090d">
<meta name="color-scheme" content="dark">
<title>LyricVerse Mobile</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={FONTS}&display=swap" rel="stylesheet">
<style>
{(here / "style.css").read_text(encoding="utf-8")}
</style>
</head>
<body>
"""
js = "\n".join(p.read_text(encoding="utf-8") for p in sorted((here / "js").glob("*.js")))
out = (head + (here / "body.html").read_text(encoding="utf-8")
       + grab("@pcampus/thai-romanization") + "\n" + grab("mp4-muxer") + "\n" + grab("webm-muxer")
       + "\n<script>\n" + js + "\n</script>\n</body>\n</html>\n")
(root / "Mobile.html").write_text(out, encoding="utf-8")
print("wrote", root / "Mobile.html", len(out) // 1024, "KB")
