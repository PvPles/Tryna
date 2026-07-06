# ☀️ REKINDLE

*The suns have gone cold. You are Ash-7, the last keeper-drone still holding an orbit. Gather light. Wake the machines. Reignite the system — then rest.*

A narrative incremental game with an arcade heart, built for mobile browsers. No installs, no dependencies, no build step, no ads, no purchases, no tracking. A complete game with a beginning, a middle, and an ending.

## The game

**REKINDLE** is a story-driven incremental in the tradition of *A Dark Room*:

- **Reach for light.** Tap to gather photons. Buy Gatherer Drones to gather for you. Refine plasma in Furnaces, weave flux on Orbital Looms, wake the Choir of Keepers.
- **Stoke the sun through six acts** — ASH → EMBER → KINDLED → BURNING → RADIANT → BEACON. The sun on your screen visibly comes back to life, act by act.
- **A written story** unfolds in the log as you play: milestones, machines coming online, encounters with what's left of the bright years.
- **Expeditions** travel in real time — send drones to the Drowned Relay, the Bone Orchard, the Silent Choir. They come back with relics and pieces of the story.
- **Encounters**: choice-driven events that interrupt the vigil. Salvage the derelict or let it pass?
- **Artifacts**: spend relics on six unique story-objects with powerful permanent effects.
- **Nova (prestige)**: collapse everything you've built into starseeds — +30% to everything, each, forever. The final act demands it.
- **The Flight Deck** — the built-in **Neon Orbit** arcade game. Fly patrol sorties *by hand* (hold to dive, release to drift, double-tap to dash); every spark you catch becomes permanent stardust production bonuses in the incremental. Skill feeds the idle game forever.
- **Away-gain**: the machines keep the vigil while you're gone (50% → 100% with upgrades, capped 8h → 24h with an artifact).
- **A real ending.** Light the Beacon and the game ends — properly — with your statistics and a freeplay option.

## Run it

```bash
python3 -m http.server 8080   # from the repo root
```

Then open `http://localhost:8080` — or deploy free with **GitHub Pages** (Settings → Pages → deploy from branch → root). Served over HTTPS it's an installable PWA: add to home screen, plays offline.

Saves live in your browser (localStorage), with export/import codes under SYSTEM.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell: sun canvas, tabs, arcade overlay |
| `rekindle.js` | The incremental: content, economy, story, expeditions, nova, ending |
| `game.js` | Neon Orbit — the full arcade game that powers the Flight Deck |
| `style.css` | UI styling |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | PWA installability + offline |
