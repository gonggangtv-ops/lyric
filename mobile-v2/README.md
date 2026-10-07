# LyricVerse Mobile (LyricMobileV2.html)

Mobile-first lyric video maker. `LyricMobileV2.html` is a single self-contained file
generated from the sources in this folder:

```
python3 mobile-v2/build.py
```

The build inlines `style.css`, `body.html`, every `js/*.js` file (in name order) and the
MIT-licensed `@pcampus/thai-romanization`, `mp4-muxer` and `webm-muxer` builds that already
ship inside `LyricMoblie.html`. Edit the sources, then rebuild. Do not edit the generated file.

| File | Contents |
|---|---|
| `js/00-core.js` | utils, project defaults (`DEF`), state, persistence, line timing |
| `js/10-audio.js` | playback clock, offline audio analysis (envelope, spectrum, beats) |
| `js/15-store.js` | IndexedDB storage for song, background, clips, cover, fonts |
| `js/20-text.js` | Thai-aware layout, 21 animations, 12 text effects, word karaoke |
| `js/30-bg.js` | background, filters, 23 effects, Looks |
| `js/40-viz.js` | 19 visualizer modes |
| `js/50-modes.js` | Thai-TV karaoke, streaming mode, romanization, Mood Styles |
| `js/55-sync.js` | Auto-Sync (vocal gaps) and AI Whisper transcription + alignment |
| `js/58-cards.js` | title card, music player widget, opening title, end credits |
| `js/60-render.js` | compositor shared by preview and export, live stage |
| `js/65-clips.js` | timeline image/video/audio clips |
| `js/70-ui.js` | control builder, tabs, song / lyrics / sync tabs |
| `js/75-timeline.js` | timeline editing tab |
| `js/80-style.js` | style tab sections |
| `js/85-line.js` | per-line editor sheet |
| `js/90-export.js` | WebCodecs export (MP4/WebM) |
| `js/95-system.js` | undo/redo, command menu, guide, UI theme, live-recording export |
| `js/99-boot.js` | start-up and keyboard shortcuts |

Everything the renderer draws is a pure function of time (effects use seeded randomness and
the audio analysis is precomputed), so the preview and the exported video match frame for frame.
