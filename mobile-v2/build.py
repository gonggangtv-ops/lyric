#!/usr/bin/env python3
"""Assemble LyricMobileV2.html from app.template.html + the MIT-licensed
mp4-muxer / webm-muxer builds that already ship inside LyricMoblie.html."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
old = (root / "LyricMoblie.html").read_text(encoding="utf-8")
def grab(tag):
    m = re.search(r"<script>/\* " + re.escape(tag) + r" .*?</script>", old, re.S)
    assert m, tag
    return m.group(0)
tpl = (root / "mobile-v2" / "app.template.html").read_text(encoding="utf-8")
out = tpl.replace("<!--MUXERS-->", grab("mp4-muxer") + "\n" + grab("webm-muxer"))
(root / "LyricMobileV2.html").write_text(out, encoding="utf-8")
print("wrote", root / "LyricMobileV2.html", len(out) // 1024, "KB")
