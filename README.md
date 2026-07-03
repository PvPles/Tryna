# 🌀 Neon Orbit

A one-thumb neon arcade game for mobile browsers. No installs, no dependencies, no build step — open `index.html` and play.

## How to play

You are a ship locked in orbit around a core.

- **Hold** anywhere on the screen to dive toward the core (you orbit faster down low).
- **Release** to drift back out to the outer ring.
- Catch the **gold sparks** ⭐ — each one raises your combo multiplier.
- Dodge the **pink mines** (they blink before arming) and the **red sweeper lasers** (they telegraph before firing).
- Flying low earns bonus score, but it's a lot more dangerous down there.

One touch. That's the whole control scheme. Survive as long as you can — the game keeps getting faster.

## Features

- 🎮 Pure canvas + vanilla JS, zero dependencies, ~1 file of game code
- 📱 Touch-first, works on any phone browser; Space bar works on desktop
- 📴 Installable PWA — plays offline once cached (served over HTTPS)
- 🔊 Procedural synth sound effects (WebAudio, no audio files), `M` to mute on desktop
- 📳 Haptic feedback on supported devices
- 🏆 Best score saved locally
- ✨ Particles, screen shake, glow trails, combo system, difficulty ramp

## Run it

Any static file server works:

```bash
# from the repo root
python3 -m http.server 8080
# then open http://localhost:8080 (or your phone on the same network)
```

Or deploy for free with **GitHub Pages**: repo Settings → Pages → deploy from branch → root. The game is fully static.

## Files

| File | Purpose |
|---|---|
| `index.html` | Shell page, viewport setup, service-worker registration |
| `game.js` | The entire game: loop, physics, entities, rendering, audio, UI |
| `manifest.webmanifest` | PWA manifest (fullscreen, portrait) |
| `sw.js` | Service worker for offline play |
| `icon.svg` | App icon |
