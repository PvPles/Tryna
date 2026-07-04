# 🌀 Neon Orbit: Rekindle

A complete one-thumb arcade game for mobile browsers, with real progression and an ending. No installs, no dependencies, no build step — open `index.html` and play.

**The premise:** the five suns of the Auriga system have gone cold. You are the last Lightkeeper. Every spark you catch banks light toward reigniting the current sun — fill the meter mid-run and the core reignites live, unlocking the next sector. Reignite all five and you've beaten the game (then New Dawn prestige mode begins).

## How to play

- **Hold** anywhere to dive toward the core (you orbit faster down low, and low flying earns bonus score).
- **Release** to drift back out.
- **Double-tap** to phase dash through danger (once you've bought the Phase Drive upgrade).
- Catch **gold sparks** ✦ — currency, combo fuel, and sun-light all at once.
- **Graze** hazards (barely miss them) for bonus sparks.
- Dodge everything: pink **mines**, red **sweeper lasers**, blue **comets**, expanding **pulse waves**, and purple homing **phantoms**. Every hazard telegraphs before it becomes deadly.

Desktop: **Space** = hold/dive (double-press to dash), **D** = dash, **Esc** = pause, **M**-adjacent sound toggles are on the title screen.

## What's in the game

- **5 sectors**, each with its own palette, music, and hazard mix: Cinder Reach, Frost Hollow, Storm Cradle, Void Garden, Crown of Ash
- **Economy & upgrades**: sparks persist between runs and buy 5 upgrade tracks — Hull Plating (shields), Tractor Prism (magnet), Refraction Core (spark value), Phase Drive (dash), Ember Protocol (auto-revive)
- **4 ships** with different stats: Ember, Wisp, Bulwark, Phoenix
- **Contracts**: 3 rotating missions with spark rewards
- **Live ignition events**: fill the sun's meter mid-run for a hazard-clearing shockwave
- **Win state + prestige**: reignite all five suns, then New Dawn resets the suns with harder hazards and richer sparks
- **Procedural audio**: ambient pad + pentatonic arpeggio per sector, synth SFX — zero audio files
- Haptics, particles, screen shake, graze system, combo multipliers, local save with best score

## Run it

```bash
# from the repo root
python3 -m http.server 8080
# then open http://localhost:8080 (or from your phone on the same network)
```

Or deploy free with **GitHub Pages** (repo Settings → Pages → deploy from branch → root). The game is fully static and installable as a PWA — served over HTTPS it works offline and can be added to your home screen.

## Files

| File | Purpose |
|---|---|
| `index.html` | Shell page, viewport setup, service-worker registration |
| `game.js` | The entire game: loop, physics, hazards, economy, screens, audio |
| `manifest.webmanifest` | PWA manifest (fullscreen, portrait) |
| `sw.js` | Service worker for offline play |
| `icon.svg` | App icon |
