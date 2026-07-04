/* ============================================================
   NEON ORBIT: REKINDLE
   The five suns of the Auriga system have gone cold.
   You are the last Lightkeeper. Harvest stray sparks,
   bank their light, and reignite every sun.

   One-thumb controls: hold to dive, release to drift,
   double-tap to phase dash (once unlocked).
   ============================================================ */
'use strict';

(() => {

// ---------- Canvas & sizing ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0, H = 0, DPR = 1;
let CX = 0, CY = 0;
let S = 1; // entity scale (1 ≈ a typical phone)

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  CX = W / 2;
  CY = H / 2;
  S = Math.max(0.7, Math.min(1.8, Math.min(W, H) / 420));
  buildStars();
}
window.addEventListener('resize', resize);

// ---------- Helpers ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
function angDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- Glow sprites ----------
const glowCache = {};
function glowSprite(color) {
  if (glowCache[color]) return glowCache[color];
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s * 2;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s, s, 0, s, s, s);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s * 2, s * 2);
  glowCache[color] = c;
  return c;
}
function drawGlow(x, y, r, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// ---------- Save data ----------
const SAVE_KEY = 'neonOrbitRekindle';
let save = {
  v: 2,
  sparks: 0,
  best: 0,
  runs: 0,
  ship: 0,
  ships: [true, false, false, false],
  up: { plate: 0, magnet: 0, prism: 0, dash: 0, revive: 0 },
  sector: 0,
  unlocked: 1,
  ign: [0, 0, 0, 0, 0],
  ignited: [false, false, false, false, false],
  missions: [],
  sound: true,
  music: true,
  prestige: 0,
  winSeen: false,
  totalOrbs: 0,
};

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === 2) Object.assign(save, d);
    } else {
      // migrate v1 best score
      const old = parseInt(localStorage.getItem('neonOrbitBest') || '0', 10);
      if (old > 0) save.best = old;
    }
  } catch (e) {}
}
loadSave();

// ---------- Sectors ----------
const SECTORS = [
  { name: 'CINDER REACH', tag: 'where the first sun died',
    bg: '#070b18', coreFill: '#101a38', core: 'rgba(90,140,255,0.9)', coreRim: 'rgba(120,170,255,0.8)',
    ring: 'rgba(120,160,255,0.10)', star: '#aebfff', root: 110, req: 30,
    intro: 'mines · sweeper lasers',
    haz: { mines: 0, lasers: 20, comets: -1, pulses: -1, phantoms: -1 } },
  { name: 'FROST HOLLOW', tag: 'comet-scarred and silent',
    bg: '#06111a', coreFill: '#0d2231', core: 'rgba(90,190,255,0.9)', coreRim: 'rgba(140,215,255,0.8)',
    ring: 'rgba(120,200,255,0.10)', star: '#bfe9ff', root: 98, req: 70,
    intro: '+ comets',
    haz: { mines: 0, lasers: 30, comets: 8, pulses: -1, phantoms: -1 } },
  { name: 'STORM CRADLE', tag: 'the core still spasms',
    bg: '#0b0716', coreFill: '#1b1233', core: 'rgba(170,120,255,0.9)', coreRim: 'rgba(190,150,255,0.8)',
    ring: 'rgba(180,140,255,0.10)', star: '#d6c6ff', root: 116.54, req: 120,
    intro: '+ pulse waves',
    haz: { mines: 0, lasers: 15, comets: -1, pulses: 6, phantoms: -1 } },
  { name: 'VOID GARDEN', tag: 'something grows in the dark',
    bg: '#04040c', coreFill: '#100e26', core: 'rgba(130,110,255,0.9)', coreRim: 'rgba(150,135,255,0.8)',
    ring: 'rgba(140,130,255,0.09)', star: '#8f9dd9', root: 87.31, req: 200,
    intro: '+ phantoms',
    haz: { mines: 4, lasers: 40, comets: 25, pulses: -1, phantoms: 3 } },
  { name: 'CROWN OF ASH', tag: 'the eldest sun. the last light.',
    bg: '#120b06', coreFill: '#2b1a08', core: 'rgba(255,190,90,0.9)', coreRim: 'rgba(255,210,130,0.85)',
    ring: 'rgba(255,200,120,0.10)', star: '#ffe2b8', root: 130.81, req: 300,
    intro: 'everything, faster',
    haz: { mines: 0, lasers: 10, comets: 15, pulses: 20, phantoms: 30 } },
];

// ---------- Ships ----------
const SHIPS = [
  { name: 'EMBER', color: '#4df0ff', trail: '#22c8e6', price: 0,
    desc: 'The original lightkeeper. Balanced and true.',
    stats: 'balanced',
    speed: 1, hitbox: 1, magnet: 1, sparkMul: 1, shield: 0, dashCd: 1 },
  { name: 'WISP', color: '#7dff9e', trail: '#3fdd75', price: 400,
    desc: 'Barely there. Slips through gaps others cannot.',
    stats: '+12% speed · −20% hitbox',
    speed: 1.12, hitbox: 0.8, magnet: 1, sparkMul: 1, shield: 0, dashCd: 1 },
  { name: 'BULWARK', color: '#ffb84d', trail: '#e09a2e', price: 900,
    desc: 'Old mining hull. Starts every run shielded.',
    stats: '+1 shield · −8% speed',
    speed: 0.92, hitbox: 1.15, magnet: 1, sparkMul: 1, shield: 1, dashCd: 1 },
  { name: 'PHOENIX', color: '#ff7de9', trail: '#e055c8', price: 2000,
    desc: 'Burns twice as bright. Sparks cling to its wake.',
    stats: '+50% sparks · −30% dash cooldown',
    speed: 1.04, hitbox: 1, magnet: 1.25, sparkMul: 1.5, shield: 0, dashCd: 0.7 },
];

// ---------- Upgrades ----------
const UPGRADES = [
  { key: 'plate', name: 'HULL PLATING', max: 3, costs: [150, 450, 1200],
    desc: 'Start each run with one shield charge per level.' },
  { key: 'magnet', name: 'TRACTOR PRISM', max: 3, costs: [100, 300, 800],
    desc: 'Pull in sparks from farther away.' },
  { key: 'prism', name: 'REFRACTION CORE', max: 3, costs: [120, 350, 900],
    desc: 'Sparks are worth +25% per level.' },
  { key: 'dash', name: 'PHASE DRIVE', max: 3, costs: [200, 500, 1000],
    desc: 'Double-tap to blink through danger. Levels cut the cooldown.' },
  { key: 'revive', name: 'EMBER PROTOCOL', max: 1, costs: [1500],
    desc: 'Once per run, survive a fatal hit in a burst of flame.' },
];
const DASH_CD = [0, 6, 4.5, 3];

// ---------- Missions ----------
const MISSION_POOL = [
  { id: 'orbs10',  text: 'Catch 10 sparks in one run',    type: 'orbs',  target: 10,   reward: 75 },
  { id: 'orbs20',  text: 'Catch 20 sparks in one run',    type: 'orbs',  target: 20,   reward: 150 },
  { id: 'orbs35',  text: 'Catch 35 sparks in one run',    type: 'orbs',  target: 35,   reward: 300 },
  { id: 'time45',  text: 'Survive 45 seconds',            type: 'time',  target: 45,   reward: 100 },
  { id: 'time90',  text: 'Survive 90 seconds',            type: 'time',  target: 90,   reward: 250 },
  { id: 'score15', text: 'Score 1,500 in one run',        type: 'score', target: 1500, reward: 100 },
  { id: 'score40', text: 'Score 4,000 in one run',        type: 'score', target: 4000, reward: 250 },
  { id: 'score90', text: 'Score 9,000 in one run',        type: 'score', target: 9000, reward: 500 },
  { id: 'near5',   text: 'Graze 5 hazards in one run',    type: 'near',  target: 5,    reward: 120 },
  { id: 'near12',  text: 'Graze 12 hazards in one run',   type: 'near',  target: 12,   reward: 300 },
  { id: 'dash6',   text: 'Phase dash 6 times in one run', type: 'dash',  target: 6,    reward: 150, needsDash: true },
  { id: 'light25', text: 'Harvest 25 light in one run',   type: 'light', target: 25,   reward: 150 },
  { id: 'combo8',  text: 'Reach a ×8 combo',              type: 'combo', target: 8,    reward: 150 },
];

function rollMissions() {
  const have = save.missions.map((m) => m.id);
  const pool = MISSION_POOL.filter((m) =>
    !have.includes(m.id) && (!m.needsDash || save.up.dash > 0));
  while (save.missions.length < 3 && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    save.missions.push({ id: pool[i].id, best: 0, done: false });
    pool.splice(i, 1);
  }
}
function missionDef(id) { return MISSION_POOL.find((m) => m.id === id); }
if (save.missions.length < 3) { rollMissions(); persist(); }

// ---------- Audio ----------
let AC = null, masterGain = null, sfxGain = null, musicGain = null;
let padNodes = null, nextArp = 0;

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); startMusic(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = AC.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(AC.destination);
    sfxGain = AC.createGain();
    sfxGain.connect(masterGain);
    musicGain = AC.createGain();
    musicGain.gain.value = 0.55;
    musicGain.connect(masterGain);
    startMusic();
  } catch (e) { AC = null; }
}

function startMusic() {
  if (!AC || !save.music || padNodes) return;
  const root = SECTORS[save.sector].root / 2;
  const mk = (freq, detune) => {
    const o = AC.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = detune;
    return o;
  };
  const o1 = mk(root, -6), o2 = mk(root, 6), o3 = mk(root * 1.4983, 3);
  const filt = AC.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 420;
  filt.Q.value = 0.7;
  const lfo = AC.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = AC.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain).connect(filt.frequency);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.055, AC.currentTime + 3);
  o1.connect(filt); o2.connect(filt); o3.connect(filt);
  filt.connect(g).connect(musicGain);
  o1.start(); o2.start(); o3.start(); lfo.start();
  padNodes = { o1, o2, o3, g, filt, lfo };
  nextArp = AC.currentTime + 1;
}
function stopMusic() {
  if (!padNodes) return;
  const t = AC.currentTime;
  padNodes.g.gain.cancelScheduledValues(t);
  padNodes.g.gain.setValueAtTime(padNodes.g.gain.value, t);
  padNodes.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  const p = padNodes;
  setTimeout(() => { try { p.o1.stop(); p.o2.stop(); p.o3.stop(); p.lfo.stop(); } catch (e) {} }, 800);
  padNodes = null;
}
function retuneMusic() {
  if (!padNodes || !AC) return;
  const root = SECTORS[save.sector].root / 2;
  const t = AC.currentTime;
  padNodes.o1.frequency.exponentialRampToValueAtTime(root, t + 1.5);
  padNodes.o2.frequency.exponentialRampToValueAtTime(root, t + 1.5);
  padNodes.o3.frequency.exponentialRampToValueAtTime(root * 1.4983, t + 1.5);
}
const PENTA = [0, 3, 5, 7, 10, 12, 15];
function tickArp() {
  if (!AC || !save.music || !padNodes) return;
  if (AC.currentTime < nextArp) return;
  const root = SECTORS[save.sector].root;
  const st = PENTA[Math.floor(Math.random() * PENTA.length)];
  const freq = root * Math.pow(2, st / 12) * (Math.random() < 0.3 ? 2 : 1);
  const t = Math.max(AC.currentTime, nextArp);
  const o = AC.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g).connect(musicGain);
  o.start(t); o.stop(t + 0.6);
  nextArp = t + (state === ST.PLAY ? 0.38 : 0.55);
}

function tone(freq, dur, type, vol, slide) {
  if (!AC || !save.sound) return;
  const t = AC.currentTime;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noiseBurst(dur, vol, fStart, fEnd) {
  if (!AC || !save.sound) return;
  const t = AC.currentTime;
  const len = Math.floor(AC.sampleRate * dur);
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = AC.createBufferSource();
  src.buffer = buf;
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const filt = AC.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(fStart || 3000, t);
  filt.frequency.exponentialRampToValueAtTime(fEnd || 200, t + dur);
  src.connect(filt).connect(g).connect(sfxGain);
  src.start(t);
}
const sfx = {
  pickup(combo) { tone(440 + Math.min(combo, 16) * 55, 0.12, 'sine', 0.25, 1.5); },
  dive() { tone(220, 0.08, 'triangle', 0.08, 0.7); },
  warn() { tone(180, 0.25, 'square', 0.06, 1.0); },
  death() { noiseBurst(0.6, 0.5); tone(160, 0.5, 'sawtooth', 0.25, 0.25); },
  start() { tone(330, 0.15, 'sine', 0.2, 2.0); },
  best() { tone(523, 0.12, 'sine', 0.22, 1.0); setTimeout(() => tone(784, 0.2, 'sine', 0.22, 1.0), 110); },
  click() { tone(660, 0.05, 'sine', 0.12, 0.8); },
  buy() { tone(523, 0.09, 'sine', 0.2, 1.0); setTimeout(() => tone(659, 0.09, 'sine', 0.2, 1.0), 80); setTimeout(() => tone(880, 0.14, 'sine', 0.2, 1.0), 160); },
  denied() { tone(140, 0.2, 'square', 0.12, 0.8); },
  shield() { noiseBurst(0.2, 0.3, 6000, 800); tone(880, 0.15, 'triangle', 0.2, 0.5); },
  dash() { noiseBurst(0.25, 0.25, 8000, 1500); tone(300, 0.2, 'sine', 0.15, 3.0); },
  graze() { tone(1200, 0.05, 'sine', 0.07, 1.3); },
  ignite() { noiseBurst(1.2, 0.4, 500, 4000);
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.6, 'sine', 0.2, 1.0), i * 130)); },
  revive() { noiseBurst(0.5, 0.35, 400, 3000); tone(220, 0.6, 'sawtooth', 0.15, 3.0); },
  mission() { tone(587, 0.1, 'sine', 0.2, 1.0); setTimeout(() => tone(880, 0.18, 'sine', 0.2, 1.0), 100); },
};
function buzz(ms) {
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
}

// ---------- Colors (hazards stay semantic across sectors) ----------
const COL = {
  ship: '#4df0ff',
  orb: '#ffd34d',
  orbCore: '#fff6d8',
  mine: '#ff4d7e',
  mineCore: '#ffd7e2',
  laser: '#ff5b4d',
  phantom: '#b06bff',
  comet: '#7fd4ff',
  gold: '#ffd34d',
  text: '#dfe8ff',
  dim: 'rgba(223,232,255,0.55)',
  faint: 'rgba(223,232,255,0.3)',
  good: '#7dff9e',
  panel: 'rgba(20,28,54,0.72)',
  panelLit: 'rgba(30,42,78,0.85)',
};
function sector() { return SECTORS[save.sector]; }

// ---------- Stars ----------
let stars = [];
function buildStars() {
  stars = [];
  const n = Math.floor((W * H) / 9000);
  for (let i = 0; i < n; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: rand(0.4, 1.6), tw: rand(0, TAU), sp: rand(0.5, 2) });
  }
}

// ---------- Particles & popups ----------
let particles = [];
let popups = [];
function burst(x, y, color, n, speed, size) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const s2 = rand(speed * 0.3, speed);
    particles.push({ x, y, vx: Math.cos(a) * s2, vy: Math.sin(a) * s2, life: rand(0.3, 0.8), maxLife: 0.8, size: rand(size * 0.5, size), color });
  }
  if (particles.length > 400) particles.splice(0, particles.length - 400);
}
function popup(x, y, text, color, big) {
  popups.push({ x, y, text, color, t: 0, big: !!big });
}

// ---------- Game state machine ----------
const ST = { TITLE: 0, PLAY: 1, PAUSE: 2, RESULTS: 3, MAP: 4, HANGAR: 5, SHOP: 6, WIN: 7 };
let state = ST.TITLE;
let screenT = 0; // seconds since screen entered
function goto_(s) { state = s; screenT = 0; buttons = []; }

// ---------- Run state ----------
const R_MIN_F = 0.16, R_MAX_F = 0.42, R_CORE_F = 0.07;
function arenaR() { return Math.min(W, H) * 0.5; }

const ship = { ang: -Math.PI / 2, r: 0, vr: 0, holding: false, trail: [] };
let score = 0, displayScore = 0, combo = 1, comboTimer = 0, elapsed = 0;
let deadTimer = 0, shake = 0, flash = 0, flashCol = '255,80,110';
let orbs = [], mines = [], lasers = [], comets = [], pulses = [], phantoms = [];
let orbTimer = 0, mineTimer = 0, laserTimer = 0, cometTimer = 0, pulseTimer = 0, phantomTimer = 0;
let shieldCharges = 0, invulnT = 0, reviveAvail = false;
let dashT = 0, dashCd = 0, lastTapT = -10;
let runStats = null;
let sparksRunF = 0, runLight = 0, coreLitNow = false, shockwaves = [];
let res = null; // results data

function shipDef() { return SHIPS[save.ship]; }
function prestigeMul() { return 1 + 0.5 * save.prestige; }
function sparkPer() { return 2 * (1 + 0.25 * save.up.prism) * shipDef().sparkMul * prestigeMul(); }
function magnetR() { return (55 + 32 * save.up.magnet) * S * shipDef().magnet; }
function shipX() { return CX + Math.cos(ship.ang) * ship.r; }
function shipY() { return CY + Math.sin(ship.ang) * ship.r; }

function startRun() {
  score = 0; displayScore = 0; combo = 1; comboTimer = 0; elapsed = 0;
  ship.ang = -Math.PI / 2;
  ship.r = arenaR() * (R_MAX_F + R_MIN_F);
  ship.vr = 0; ship.trail = []; ship.holding = false;
  orbs = []; mines = []; lasers = []; comets = []; pulses = []; phantoms = [];
  particles = []; popups = []; shockwaves = [];
  orbTimer = 0.5; mineTimer = 2.5;
  const hz = sector().haz;
  laserTimer = hz.lasers >= 0 ? hz.lasers : 1e9;
  cometTimer = hz.comets >= 0 ? hz.comets : 1e9;
  pulseTimer = hz.pulses >= 0 ? hz.pulses : 1e9;
  phantomTimer = hz.phantoms >= 0 ? hz.phantoms : 1e9;
  shieldCharges = save.up.plate + shipDef().shield;
  invulnT = 0;
  reviveAvail = save.up.revive > 0;
  dashT = 0; dashCd = 0;
  sparksRunF = 0; runLight = 0;
  coreLitNow = save.ignited[save.sector];
  runStats = { orbs: 0, time: 0, score: 0, near: 0, dash: 0, light: 0, combo: 1 };
  goto_(ST.PLAY);
  sfx.start();
}

// ---------- Difficulty ----------
function difficulty() {
  const base = save.sector * 0.10 + save.prestige * 0.12;
  return Math.min(1, elapsed / 90 + base) + Math.max(0, (elapsed - 90) / 400);
}
function speedMul() { return (1 + save.prestige * 0.1) * (save.sector === 4 ? 1.12 : 1); }

// ---------- Spawning ----------
function fairAngle(minDist) {
  for (let i = 0; i < 20; i++) {
    const a = rand(0, TAU);
    if (Math.abs(angDiff(a, ship.ang)) > minDist) return a;
  }
  return ship.ang + Math.PI;
}
function spawnOrb() {
  const A = arenaR();
  orbs.push({ ang: fairAngle(0.5), r: A * rand(R_MIN_F + 0.02, R_MAX_F - 0.02), pulse: rand(0, TAU), mag: 0 });
}
function spawnMine() {
  const d = difficulty(), A = arenaR();
  mines.push({
    ang: fairAngle(1.1), r: A * rand(R_MIN_F + 0.01, R_MAX_F - 0.01),
    t: 0, armTime: lerp(1.1, 0.7, Math.min(d, 1)), armed: false,
    spin: rand(-0.25, 0.25), life: rand(11, 16), grazed: false,
  });
  sfx.warn();
}
function spawnLaser() {
  const d = difficulty();
  lasers.push({
    ang: fairAngle(1.5),
    spin: (Math.random() < 0.5 ? -1 : 1) * lerp(0.25, 0.65, Math.min(d, 1)) * speedMul(),
    t: 0, warmup: 1.4, dur: rand(4, 6.5),
  });
  sfx.warn();
}
function spawnComet() {
  const A = arenaR();
  const entry = rand(0, TAU);
  const ex = CX + Math.cos(entry) * A * 1.15;
  const ey = CY + Math.sin(entry) * A * 1.15;
  const tAng = fairAngle(0.9);
  const tr = A * rand(R_MIN_F + 0.02, R_MAX_F);
  const tx = CX + Math.cos(tAng) * tr;
  const ty = CY + Math.sin(tAng) * tr;
  const dx = tx - ex, dy = ty - ey;
  const dist = Math.hypot(dx, dy) || 1;
  const sp = A * lerp(0.42, 0.62, Math.min(difficulty(), 1)) * speedMul();
  comets.push({ x: ex, y: ey, vx: dx / dist * sp, vy: dy / dist * sp, t: 0, warn: 0.8, grazed: false });
  sfx.warn();
}
function spawnPulse() {
  const d = difficulty();
  pulses.push({
    t: 0, warmup: 1.6,
    gapAng: rand(0, TAU),
    gapW: lerp(1.9, 1.25, Math.min(d, 1)),
    speed: arenaR() * lerp(0.20, 0.30, Math.min(d, 1)) * speedMul(),
    r: 0, done: false,
  });
  sfx.warn();
}
function spawnPhantom() {
  const A = arenaR();
  phantoms.push({
    ang: fairAngle(1.4), r: A * rand(R_MIN_F, R_MAX_F),
    t: 0, life: rand(8, 11), grazed: false,
  });
  sfx.warn();
}

// ---------- Hits, shields, death ----------
function shockwave(x, y, color) {
  shockwaves.push({ x, y, r: 10, color, t: 0 });
}
function clearHazardsNear() {
  for (const m of mines) burst(CX + Math.cos(m.ang) * m.r, CY + Math.sin(m.ang) * m.r, COL.mine, 10, 300 * S, 3 * S);
  for (const p of phantoms) burst(CX + Math.cos(p.ang) * p.r, CY + Math.sin(p.ang) * p.r, COL.phantom, 10, 300 * S, 3 * S);
  for (const c of comets) burst(c.x, c.y, COL.comet, 10, 300 * S, 3 * S);
  mines = []; phantoms = []; comets = []; pulses = [];
  for (const L of lasers) L.t = L.warmup + L.dur;
}

// returns true if the hit was fatal-flow handled (shield/revive/death)
function hitShip(destroyCb) {
  if (dashT > 0 || invulnT > 0) return false;
  const sx = shipX(), sy = shipY();
  if (shieldCharges > 0) {
    shieldCharges--;
    invulnT = 1.2;
    if (destroyCb) destroyCb();
    shockwave(sx, sy, COL.ship);
    burst(sx, sy, '#ffffff', 12, 300 * S, 3 * S);
    popup(sx, sy - 30 * S, 'SHIELD DOWN', COL.ship);
    sfx.shield(); buzz(40); shake = Math.max(shake, 0.5);
    return false;
  }
  if (reviveAvail) {
    reviveAvail = false;
    invulnT = 2.2;
    clearHazardsNear();
    shockwave(sx, sy, '#ffb84d');
    burst(sx, sy, '#ffb84d', 30, 400 * S, 4 * S);
    popup(sx, sy - 34 * S, 'EMBER PROTOCOL', '#ffb84d', true);
    sfx.revive(); buzz([50, 30, 80]);
    shake = Math.max(shake, 0.8); flash = 0.6; flashCol = '255,184,77';
    return false;
  }
  die(sx, sy);
  return true;
}

function die(x, y) {
  shake = 1; flash = 1; flashCol = '255,80,110';
  sfx.death(); buzz([60, 40, 120]);
  burst(x, y, shipDef().color, 40, 440 * S, 4 * S);
  burst(x, y, '#ffffff', 14, 320 * S, 3 * S);
  endRun();
}

function endRun() {
  const finalScore = Math.floor(score);
  const newBest = finalScore > save.best;
  if (newBest) { save.best = finalScore; setTimeout(() => sfx.best(), 500); }

  // bank light
  const cs = save.sector;
  let banked = runLight;
  if (!save.ignited[cs]) {
    save.ign[cs] = Math.min(sector().req, save.ign[cs] + runLight);
  }

  // missions
  runStats.score = finalScore;
  runStats.time = elapsed;
  const missionsDone = [];
  let missionSparks = 0;
  for (const m of save.missions) {
    const def = missionDef(m.id);
    if (!def) continue;
    const v = runStats[def.type] || 0;
    m.best = Math.max(m.best, Math.floor(v));
    if (!m.done && m.best >= def.target) {
      m.done = true;
      missionsDone.push(def);
      missionSparks += def.reward;
    }
  }

  const orbSparks = Math.floor(sparksRunF);
  const total = orbSparks + missionSparks;
  save.sparks += total;
  save.runs++;
  save.totalOrbs += runStats.orbs;

  res = {
    score: finalScore, newBest,
    orbs: runStats.orbs, near: runStats.near, time: elapsed,
    orbSparks, missionsDone, missionSparks, total,
    light: banked, ignitedNow: coreLitNow && !res_wasIgnitedAtStart,
    sector: cs,
  };
  persist();

  const allLit = save.ignited.every(Boolean);
  if (allLit && !save.winSeen) {
    save.winSeen = true;
    persist();
    deadTimer = 0;
    goto_(ST.WIN);
  } else {
    deadTimer = 0;
    goto_(ST.RESULTS);
  }
}
let res_wasIgnitedAtStart = false;

function leaveResults() {
  // replace completed missions with fresh ones
  save.missions = save.missions.filter((m) => !m.done);
  rollMissions();
  persist();
}

function igniteCore() {
  const cs = save.sector;
  save.ignited[cs] = true;
  save.ign[cs] = sector().req;
  save.unlocked = Math.max(save.unlocked, Math.min(5, cs + 2));
  coreLitNow = true;
  score += 1000;
  persist();
  shockwave(CX, CY, COL.gold);
  clearHazardsNear();
  burst(CX, CY, COL.gold, 60, 500 * S, 5 * S);
  popup(CX, CY - arenaR() * 0.2, 'SUN REIGNITED', COL.gold, true);
  popup(CX, CY - arenaR() * 0.2 + 30 * S, '+1000', COL.text);
  sfx.ignite(); buzz([80, 50, 80, 50, 200]);
  flash = 0.8; flashCol = '255,211,77';
  shake = Math.max(shake, 0.9);
}

// ---------- Dash ----------
function tryDash() {
  if (state !== ST.PLAY || save.up.dash === 0 || dashCd > 0 || dashT > 0) return;
  dashT = 0.35;
  dashCd = DASH_CD[save.up.dash] * shipDef().dashCd;
  runStats.dash++;
  sfx.dash(); buzz(25);
  const sx = shipX(), sy = shipY();
  burst(sx, sy, shipDef().color, 12, 350 * S, 3 * S);
}

// ---------- Input ----------
let buttons = [];

function uiTap(x, y) {
  for (const b of buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      if (b.disabled) { sfx.denied(); return true; }
      b.flash = 0.18;
      if (!b.silent) sfx.click();
      b.cb();
      return true;
    }
  }
  return false;
}

function pauseBtnRect() { return { x: W - 58, y: 10, w: 48, h: 48 }; }

function pressStart(x, y) {
  initAudio();
  if (state === ST.PLAY) {
    const pb = pauseBtnRect();
    if (x >= pb.x && x <= pb.x + pb.w && y >= pb.y && y <= pb.y + pb.h) {
      goto_(ST.PAUSE); sfx.click(); return;
    }
    const now = performance.now() / 1000;
    if (now - lastTapT < 0.30) tryDash();
    lastTapT = now;
    ship.holding = true;
    sfx.dive();
    return;
  }
  if (state === ST.RESULTS && screenT < 0.7) return; // ignore accidental taps
  uiTap(x, y);
}
function pressEnd() { ship.holding = false; }

window.addEventListener('pointerdown', (e) => { e.preventDefault(); pressStart(e.clientX, e.clientY); }, { passive: false });
window.addEventListener('pointerup', (e) => { e.preventDefault(); pressEnd(); }, { passive: false });
window.addEventListener('pointercancel', () => pressEnd(), { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space') {
    if (state === ST.PLAY) {
      initAudio();
      const now = performance.now() / 1000;
      if (now - lastTapT < 0.30) tryDash();
      lastTapT = now;
      ship.holding = true; sfx.dive();
    } else if (state === ST.TITLE) { initAudio(); startRun(); }
    e.preventDefault();
  }
  if (e.code === 'KeyD' || e.code === 'ShiftLeft') tryDash();
  if (e.code === 'Escape' && state === ST.PLAY) goto_(ST.PAUSE);
  else if (e.code === 'Escape' && state === ST.PAUSE) goto_(ST.PLAY);
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') pressEnd(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    lastT = 0; ship.holding = false;
    if (state === ST.PLAY) goto_(ST.PAUSE);
  }
});

// ---------- Update ----------
function update(dt) {
  screenT += dt;
  for (const s2 of stars) s2.tw += s2.sp * dt;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.pow(0.05, dt); p.vy *= Math.pow(0.05, dt);
  }
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].t += dt;
    if (popups[i].t > 1.4) popups.splice(i, 1);
  }
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const w2 = shockwaves[i];
    w2.t += dt;
    w2.r += 900 * S * dt;
    if (w2.t > 0.6) shockwaves.splice(i, 1);
  }
  for (const b of buttons) if (b.flash > 0) b.flash -= dt;

  shake = Math.max(0, shake - dt * 3);
  flash = Math.max(0, flash - dt * 2.5);

  if (state === ST.TITLE || state === ST.MAP || state === ST.HANGAR || state === ST.SHOP || state === ST.WIN) {
    ship.ang += 0.5 * dt;
    ship.r = arenaR() * (R_MAX_F + R_MIN_F);
    updateTrail(dt, state === ST.TITLE ? 0.4 : 0);
    return;
  }
  if (state === ST.PAUSE) return;
  if (state === ST.RESULTS) { deadTimer += dt; return; }

  // ----- PLAYING -----
  elapsed += dt;
  runStats.time = elapsed;
  const d = difficulty();
  const A = arenaR();

  invulnT = Math.max(0, invulnT - dt);
  dashT = Math.max(0, dashT - dt);
  dashCd = Math.max(0, dashCd - dt);

  const target = A * (ship.holding ? R_MIN_F : R_MAX_F);
  const springK = 26, dampK = 9;
  ship.vr += (target - ship.r) * springK * dt;
  ship.vr *= Math.exp(-dampK * dt);
  ship.r += ship.vr * dt;
  ship.r = clamp(ship.r, A * (R_MIN_F - 0.02), A * (R_MAX_F + 0.02));

  const baseW = lerp(1.5, 2.4, Math.min(d, 1)) * shipDef().speed;
  const w = baseW * Math.sqrt(A * 0.30 / ship.r) * (dashT > 0 ? 2.1 : 1);
  ship.ang += w * dt;
  if (ship.ang > TAU) ship.ang -= TAU;

  updateTrail(dt, dashT > 0 ? 1.6 : 1);

  score += dt * (10 + (ship.r < A * (R_MIN_F + 0.06) ? 8 : 0)) * combo * 0.4;
  displayScore = lerp(displayScore, score, 1 - Math.pow(0.001, dt));

  if (combo > 1) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 1;
  }

  const sx = shipX(), sy = shipY();
  const shipHit = 8 * S * shipDef().hitbox;

  // spawn timers
  orbTimer -= dt;
  if (orbTimer <= 0 && orbs.length < 5) { spawnOrb(); orbTimer = rand(1.2, 2.4); }
  const hz = sector().haz;
  if (hz.mines >= 0 && elapsed > hz.mines) {
    mineTimer -= dt;
    if (mineTimer <= 0 && mines.length < 3 + Math.floor(d * 5)) {
      spawnMine();
      mineTimer = lerp(3.2, 1.1, Math.min(d, 1)) * rand(0.8, 1.2);
    }
  }
  if (hz.lasers >= 0 && elapsed > hz.lasers) {
    laserTimer -= dt;
    if (laserTimer <= 0 && lasers.length < 1 + Math.floor(d * 1.5)) {
      spawnLaser();
      laserTimer = lerp(16, 8, Math.min(d, 1)) * rand(0.85, 1.15);
    }
  }
  if (hz.comets >= 0 && elapsed > hz.comets) {
    cometTimer -= dt;
    if (cometTimer <= 0 && comets.length < 2 + Math.floor(d * 2)) {
      spawnComet();
      cometTimer = lerp(7, 3, Math.min(d, 1)) * rand(0.8, 1.2);
    }
  }
  if (hz.pulses >= 0 && elapsed > hz.pulses) {
    pulseTimer -= dt;
    if (pulseTimer <= 0 && pulses.length < 1) {
      spawnPulse();
      pulseTimer = lerp(14, 8, Math.min(d, 1)) * rand(0.85, 1.15);
    }
  }
  if (hz.phantoms >= 0 && elapsed > hz.phantoms) {
    phantomTimer -= dt;
    if (phantomTimer <= 0 && phantoms.length < 1 + Math.floor(d * 2)) {
      spawnPhantom();
      phantomTimer = lerp(11, 6, Math.min(d, 1)) * rand(0.85, 1.15);
    }
  }

  // orbs
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.pulse += 4 * dt;
    const ox = CX + Math.cos(o.ang) * o.r;
    const oy = CY + Math.sin(o.ang) * o.r;
    const dx = sx - ox, dy = sy - oy;
    const dist = Math.hypot(dx, dy);
    if (dist < magnetR()) o.mag = Math.min(1, o.mag + dt * 6);
    if (o.mag > 0) {
      const pull = o.mag * 220 * S * dt;
      const nx = dx / (dist || 1), ny = dy / (dist || 1);
      const nox = ox + nx * pull, noy = oy + ny * pull;
      o.ang = Math.atan2(noy - CY, nox - CX);
      o.r = Math.hypot(nox - CX, noy - CY);
    }
    if (dist < shipHit + 6 * S) {
      orbs.splice(i, 1);
      combo = Math.min(combo + 1, 20);
      runStats.combo = Math.max(runStats.combo, combo);
      comboTimer = 4;
      score += 25 * combo;
      runStats.orbs++;
      sparksRunF += sparkPer();
      if (!save.ignited[save.sector]) {
        runLight++;
        runStats.light++;
        if (save.ign[save.sector] + runLight >= sector().req) igniteCore();
      }
      sfx.pickup(combo);
      buzz(12);
      burst(ox, oy, COL.orb, 14, 280 * S, 3.5 * S);
    }
  }

  // mines
  for (let i = mines.length - 1; i >= 0; i--) {
    const m = mines[i];
    m.t += dt; m.life -= dt;
    if (m.life <= 0) { mines.splice(i, 1); continue; }
    if (!m.armed && m.t >= m.armTime) m.armed = true;
    m.ang += m.spin * dt;
    if (m.armed) {
      const mx = CX + Math.cos(m.ang) * m.r;
      const my = CY + Math.sin(m.ang) * m.r;
      const dist = Math.hypot(sx - mx, sy - my);
      const hitR = shipHit + 9 * S;
      if (dist < hitR) {
        const idx = i;
        if (hitShip(() => {
          burst(mx, my, COL.mine, 16, 320 * S, 3.5 * S);
          mines.splice(idx, 1);
        })) return;
        continue;
      }
      if (!m.grazed && dist < hitR + 20 * S && invulnT <= 0 && dashT <= 0) {
        m.grazed = true;
        graze(mx, my);
      }
    }
  }

  // lasers
  for (let i = lasers.length - 1; i >= 0; i--) {
    const L = lasers[i];
    L.t += dt;
    if (L.t > L.warmup + L.dur) { lasers.splice(i, 1); continue; }
    L.ang += L.spin * dt;
    if (L.t > L.warmup) {
      const halfWidth = (5 * S + shipHit) / ship.r;
      if (Math.abs(angDiff(ship.ang, L.ang)) < halfWidth) {
        if (hitShip(() => { L.t = L.warmup + L.dur; })) return;
      }
    }
  }

  // comets
  for (let i = comets.length - 1; i >= 0; i--) {
    const c = comets[i];
    c.t += dt;
    if (c.t < c.warn) continue;
    c.x += c.vx * dt; c.y += c.vy * dt;
    const distC = Math.hypot(c.x - CX, c.y - CY);
    if (c.t > c.warn + 1 && distC > A * 1.3) { comets.splice(i, 1); continue; }
    const dist = Math.hypot(sx - c.x, sy - c.y);
    const hitR = shipHit + 7 * S;
    if (dist < hitR) {
      const idx = i;
      if (hitShip(() => {
        burst(c.x, c.y, COL.comet, 16, 320 * S, 3.5 * S);
        comets.splice(idx, 1);
      })) return;
      continue;
    }
    if (!c.grazed && dist < hitR + 20 * S && invulnT <= 0 && dashT <= 0) {
      c.grazed = true;
      graze(c.x, c.y);
    }
  }

  // pulses
  for (let i = pulses.length - 1; i >= 0; i--) {
    const P = pulses[i];
    P.t += dt;
    if (P.t > P.warmup) {
      P.r = arenaR() * R_CORE_F + (P.t - P.warmup) * P.speed;
      if (P.r > A * 0.55) { pulses.splice(i, 1); continue; }
      const halfThick = 4 * S + shipHit;
      if (Math.abs(P.r - ship.r) < halfThick) {
        const margin = shipHit / ship.r;
        if (Math.abs(angDiff(ship.ang, P.gapAng)) > P.gapW / 2 - margin) {
          if (hitShip(() => { pulses.splice(i, 1); })) return;
        }
      }
    }
  }

  // phantoms
  for (let i = phantoms.length - 1; i >= 0; i--) {
    const p = phantoms[i];
    p.t += dt; p.life -= dt;
    if (p.life <= 0) { phantoms.splice(i, 1); continue; }
    if (p.t > 1) {
      const chase = 0.28 * speedMul();
      p.ang += clamp(angDiff(ship.ang, p.ang), -1, 1) * chase * dt;
      p.r += clamp(ship.r - p.r, -1, 1) * 30 * S * dt * (Math.abs(ship.r - p.r) > 4 ? 1 : 0);
      const px = CX + Math.cos(p.ang) * p.r;
      const py = CY + Math.sin(p.ang) * p.r;
      const dist = Math.hypot(sx - px, sy - py);
      const hitR = shipHit + 9 * S;
      if (dist < hitR) {
        const idx = i;
        if (hitShip(() => {
          burst(px, py, COL.phantom, 16, 320 * S, 3.5 * S);
          phantoms.splice(idx, 1);
        })) return;
        continue;
      }
      if (!p.grazed && dist < hitR + 20 * S && invulnT <= 0 && dashT <= 0) {
        p.grazed = true;
        graze(px, py);
      }
    }
  }
}

function graze(x, y) {
  runStats.near++;
  sparksRunF += 1;
  score += 15;
  popup((x + shipX()) / 2, (y + shipY()) / 2 - 12 * S, 'graze +✦', COL.dim);
  sfx.graze();
}

function updateTrail(dt, intensity) {
  const sx = shipX(), sy = shipY();
  ship.trail.unshift({ x: sx, y: sy, a: intensity });
  if (ship.trail.length > 26) ship.trail.pop();
  for (const t of ship.trail) t.a *= Math.pow(0.02, dt);
}

// ---------- Render: world ----------
function renderWorld(t, showShip) {
  const sec = sector();
  ctx.fillStyle = sec.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (shake > 0) {
    const s2 = shake * shake * 14;
    ctx.translate(rand(-s2, s2), rand(-s2, s2));
  }

  ctx.fillStyle = sec.star;
  for (const s2 of stars) {
    ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(s2.tw));
    ctx.fillRect(s2.x, s2.y, s2.r, s2.r);
  }
  ctx.globalAlpha = 1;

  const A = arenaR();

  ctx.strokeStyle = sec.ring;
  ctx.lineWidth = 1;
  for (const f of [R_MIN_F, (R_MIN_F + R_MAX_F) / 2, R_MAX_F]) {
    ctx.beginPath();
    ctx.arc(CX, CY, A * f, 0, TAU);
    ctx.stroke();
  }

  // core (gold when ignited)
  const lit = coreLitNow || (state !== ST.PLAY && save.ignited[save.sector]);
  const corePulse = 1 + 0.06 * Math.sin(t * 0.003);
  const coreGlow = lit ? 'rgba(255,200,90,0.95)' : sec.core;
  drawGlow(CX, CY, A * R_CORE_F * (lit ? 4.2 : 3.2) * corePulse, coreGlow, lit ? 0.65 : 0.5);
  ctx.fillStyle = lit ? '#4a2f08' : sec.coreFill;
  ctx.beginPath();
  ctx.arc(CX, CY, A * R_CORE_F * corePulse, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = lit ? 'rgba(255,220,140,0.95)' : sec.coreRim;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (lit) {
    ctx.fillStyle = 'rgba(255,230,160,0.9)';
    ctx.beginPath();
    ctx.arc(CX, CY, A * R_CORE_F * 0.45 * corePulse, 0, TAU);
    ctx.fill();
  }

  // ignition progress arc around core (during play, unlit sectors)
  if (state === ST.PLAY && !lit) {
    const frac = clamp((save.ign[save.sector] + runLight) / sec.req, 0, 1);
    if (frac > 0) {
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 3.5 * S;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(CX, CY, A * R_CORE_F + 8 * S, -Math.PI / 2, -Math.PI / 2 + frac * TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // pulses
  for (const P of pulses) {
    if (P.t <= P.warmup) {
      const blink = 0.2 + 0.5 * Math.abs(Math.sin(P.t * 10));
      // safe wedge guide
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, A * 0.5, P.gapAng - P.gapW / 2, P.gapAng + P.gapW / 2);
      ctx.closePath();
      ctx.fill();
      // charging ring at core
      ctx.globalAlpha = blink;
      ctx.strokeStyle = COL.laser;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(CX, CY, A * R_CORE_F + 14 * S, P.gapAng + P.gapW / 2, P.gapAng - P.gapW / 2 + TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (P.r > 0) {
      drawGlowRing(P.r, P.gapAng, P.gapW);
    }
  }

  // lasers
  for (const L of lasers) {
    const len = A * (R_MAX_F + 0.10);
    const x2 = CX + Math.cos(L.ang) * len;
    const y2 = CY + Math.sin(L.ang) * len;
    const x1 = CX + Math.cos(L.ang) * A * R_CORE_F;
    const y1 = CY + Math.sin(L.ang) * A * R_CORE_F;
    if (L.t <= L.warmup) {
      const blink = 0.25 + 0.5 * Math.abs(Math.sin(L.t * 14));
      ctx.strokeStyle = COL.laser;
      ctx.globalAlpha = blink * 0.5;
      ctx.setLineDash([8, 10]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    } else {
      const fade = Math.min(1, (L.warmup + L.dur - L.t) / 0.3);
      ctx.strokeStyle = COL.laser;
      ctx.lineWidth = 10 * S;
      ctx.lineCap = 'round';
      ctx.globalAlpha = fade * 0.25;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.lineWidth = 3.5 * S;
      ctx.globalAlpha = fade;
      ctx.strokeStyle = '#ffd9d4';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // orbs
  for (const o of orbs) {
    const ox = CX + Math.cos(o.ang) * o.r;
    const oy = CY + Math.sin(o.ang) * o.r;
    const p = (1 + 0.15 * Math.sin(o.pulse)) * S;
    drawGlow(ox, oy, 26 * p, COL.orb, 0.55);
    ctx.fillStyle = COL.orbCore;
    ctx.beginPath();
    ctx.arc(ox, oy, 5 * p, 0, TAU);
    ctx.fill();
  }

  // mines
  for (const m of mines) {
    const mx = CX + Math.cos(m.ang) * m.r;
    const my = CY + Math.sin(m.ang) * m.r;
    if (!m.armed) {
      const blink = 0.3 + 0.7 * Math.abs(Math.sin(m.t * 12));
      ctx.strokeStyle = COL.mine;
      ctx.globalAlpha = blink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx, my, 12 * S, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      const fadeIn = Math.min(1, (m.t - m.armTime) / 0.2);
      const dying = Math.min(1, m.life / 1.5);
      const al = fadeIn * dying;
      drawGlow(mx, my, 30 * S, COL.mine, 0.5 * al);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(m.t * 2);
      ctx.scale(S, S);
      ctx.fillStyle = COL.mine;
      ctx.globalAlpha = al;
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(4.5, -4.5);
        ctx.lineTo(-4.5, -4.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = COL.mineCore;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // phantoms
  for (const p of phantoms) {
    const px = CX + Math.cos(p.ang) * p.r;
    const py = CY + Math.sin(p.ang) * p.r;
    if (p.t < 1) {
      const blink = 0.3 + 0.6 * Math.abs(Math.sin(p.t * 10));
      ctx.strokeStyle = COL.phantom;
      ctx.globalAlpha = blink * 0.7;
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 12 * S, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    } else {
      const dying = Math.min(1, p.life / 1.2);
      const breathe = 0.8 + 0.2 * Math.sin(p.t * 5);
      drawGlow(px, py, 30 * S * breathe, COL.phantom, 0.5 * dying);
      ctx.fillStyle = COL.phantom;
      ctx.globalAlpha = 0.85 * dying;
      ctx.beginPath();
      ctx.arc(px, py, 7 * S * breathe, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.9 * dying;
      ctx.fillStyle = '#e8d8ff';
      ctx.beginPath();
      ctx.arc(px - 2 * S, py - 2 * S, 2 * S, 0, TAU);
      ctx.arc(px + 3 * S, py - 1 * S, 1.6 * S, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // comets
  for (const c of comets) {
    if (c.t < c.warn) {
      const blink = 0.3 + 0.7 * Math.abs(Math.sin(c.t * 14));
      const dirA = Math.atan2(c.vy, c.vx);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(dirA);
      ctx.strokeStyle = COL.comet;
      ctx.globalAlpha = blink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6 * S, -8 * S); ctx.lineTo(6 * S, 0); ctx.lineTo(-6 * S, 8 * S);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      const sp = Math.hypot(c.vx, c.vy) || 1;
      const tx = -c.vx / sp, ty = -c.vy / sp;
      drawGlow(c.x, c.y, 26 * S, COL.comet, 0.55);
      const gradTail = ctx.createLinearGradient(c.x, c.y, c.x + tx * 60 * S, c.y + ty * 60 * S);
      gradTail.addColorStop(0, 'rgba(127,212,255,0.7)');
      gradTail.addColorStop(1, 'rgba(127,212,255,0)');
      ctx.strokeStyle = gradTail;
      ctx.lineWidth = 5 * S;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + tx * 60 * S, c.y + ty * 60 * S);
      ctx.stroke();
      ctx.fillStyle = '#e8f7ff';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5 * S, 0, TAU);
      ctx.fill();
    }
  }

  // trail
  const sd = shipDef();
  for (let i = ship.trail.length - 1; i >= 0; i--) {
    const tr = ship.trail[i];
    const f = 1 - i / ship.trail.length;
    ctx.globalAlpha = tr.a * f * 0.5;
    ctx.fillStyle = sd.trail;
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, (6 * f + 1) * S, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ship
  if (showShip) {
    const sx = shipX(), sy = shipY();
    const blinking = invulnT > 0 && Math.sin(invulnT * 30) > 0;
    if (!blinking) {
      drawGlow(sx, sy, 34 * S * (dashT > 0 ? 1.5 : 1), sd.color, dashT > 0 ? 0.85 : 0.6);
      ctx.save();
      ctx.translate(sx, sy);
      const tilt = -Math.atan2(ship.vr, ship.r * 2);
      ctx.rotate(ship.ang + Math.PI + tilt);
      ctx.scale(S, S);
      drawShipShape(sd.color);
      ctx.restore();
      // shield ring
      if (shieldCharges > 0 && state === ST.PLAY) {
        ctx.strokeStyle = sd.color;
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 0.006);
        ctx.lineWidth = 1.5 * S;
        ctx.beginPath();
        ctx.arc(sx, sy, 16 * S, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  // shockwaves
  for (const w2 of shockwaves) {
    ctx.strokeStyle = w2.color;
    ctx.globalAlpha = clamp(1 - w2.t / 0.6, 0, 1) * 0.7;
    ctx.lineWidth = 3 * S * (1 - w2.t / 0.7);
    ctx.beginPath();
    ctx.arc(w2.x, w2.y, w2.r, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // particles
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // popups
  for (const p of popups) {
    const a = clamp(1 - p.t / 1.4, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round((p.big ? 24 : 14) * S)}px system-ui, sans-serif`;
    ctx.fillText(p.text, p.x, p.y - p.t * 28 * S);
  }
  ctx.globalAlpha = 1;

  ctx.restore(); // shake

  if (flash > 0) {
    ctx.fillStyle = `rgba(${flashCol},${flash * 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawGlowRing(r, gapAng, gapW) {
  const start = gapAng + gapW / 2;
  const end = gapAng - gapW / 2 + TAU;
  ctx.strokeStyle = COL.laser;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 14 * S;
  ctx.beginPath(); ctx.arc(CX, CY, r, start, end); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ffd9d4';
  ctx.lineWidth = 4 * S;
  ctx.beginPath(); ctx.arc(CX, CY, r, start, end); ctx.stroke();
}

function drawShipShape(color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(7.5, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-7.5, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -2, 2.6, 0, TAU);
  ctx.fill();
}

// ---------- UI primitives ----------
function addBtn(x, y, w, h, label, cb, opts) {
  opts = opts || {};
  const b = { x, y, w, h, label, cb, flash: 0, disabled: !!opts.disabled, silent: !!opts.silent };
  buttons.push(b);

  const primary = !!opts.primary;
  const accent = opts.accent || SHIPS[save.ship].color;
  ctx.save();
  rr(x, y, w, h, opts.round != null ? opts.round : 12 * S);
  if (primary) {
    ctx.fillStyle = b.flash > 0 ? '#ffffff' : accent;
    ctx.fill();
    ctx.fillStyle = '#071018';
  } else {
    ctx.fillStyle = b.flash > 0 ? COL.panelLit : (opts.fill || COL.panel);
    ctx.fill();
    ctx.strokeStyle = opts.stroke || 'rgba(140,170,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = opts.color || COL.text;
  }
  if (b.disabled) ctx.globalAlpha = 0.4;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round((opts.font || 16) * S)}px system-ui, sans-serif`;
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
  return b;
}

function panel(x, y, w, h, lit) {
  rr(x, y, w, h, 14 * S);
  ctx.fillStyle = lit ? COL.panelLit : COL.panel;
  ctx.fill();
  ctx.strokeStyle = lit ? 'rgba(160,190,255,0.5)' : 'rgba(140,170,255,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function sparkIcon(x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color || COL.orb;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a + Math.PI / 4) * r * 0.4, Math.sin(a + Math.PI / 4) * r * 0.4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBalance() {
  const y = 12 + 14 * S;
  sparkIcon(20 + 7 * S, y, 7 * S);
  ctx.fillStyle = COL.text;
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.round(16 * S)}px system-ui, sans-serif`;
  ctx.fillText(fmt(save.sparks), 20 + 18 * S, y + 5 * S);
}

function backBtn() {
  addBtn(14, 12, 74 * S, 40 * S, '‹ BACK', () => goto_(ST.TITLE), { font: 14 });
}

function progressBar(x, y, w, h, frac, color) {
  rr(x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  if (frac > 0) {
    rr(x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2);
    ctx.fillStyle = color || COL.gold;
    ctx.fill();
  }
}

// ---------- Screens ----------
function renderTitle(t) {
  renderWorld(t, true);
  buttons = [];
  const small = Math.min(W, H);
  const fadeIn = clamp(screenT / 0.4, 0, 1);
  ctx.globalAlpha = fadeIn;

  drawBalance();
  // sound toggles top-right
  addBtn(W - 100 * S, 12, 42 * S, 40 * S, save.sound ? '♪' : '✕', () => { save.sound = !save.sound; persist(); }, { font: 18, silent: !save.sound });
  addBtn(W - 52 * S, 12, 42 * S, 40 * S, save.music ? '♫' : '✕', () => {
    save.music = !save.music; persist();
    if (save.music) { initAudio(); } else stopMusic();
  }, { font: 18 });

  ctx.textAlign = 'center';
  ctx.fillStyle = COL.text;
  ctx.font = `800 ${Math.round(small * 0.078)}px system-ui, sans-serif`;
  ctx.fillText('NEON ORBIT', CX, H * 0.145);
  ctx.fillStyle = COL.gold;
  ctx.font = `600 ${Math.round(small * 0.032)}px system-ui, sans-serif`;
  ctx.fillText('R E K I N D L E', CX, H * 0.185);

  const lit = save.ignited.filter(Boolean).length;
  ctx.fillStyle = COL.dim;
  ctx.font = `500 ${Math.round(small * 0.03)}px system-ui, sans-serif`;
  ctx.fillText(lit === 0 ? 'the five suns have gone cold' : `${lit} of 5 suns reignited`, CX, H * 0.225);
  if (save.prestige > 0) {
    ctx.fillStyle = '#ffb84d';
    ctx.fillText(`— dawn ×${save.prestige + 1} —`, CX, H * 0.255);
  }

  // sun dots
  const dotY = H * 0.285, dotGap = small * 0.055;
  for (let i = 0; i < 5; i++) {
    const dx = CX + (i - 2) * dotGap;
    if (save.ignited[i]) {
      drawGlow(dx, dotY, 12 * S, 'rgba(255,200,90,0.9)', 0.7);
      ctx.fillStyle = COL.gold;
    } else {
      ctx.fillStyle = i < save.unlocked ? 'rgba(180,200,255,0.5)' : 'rgba(120,140,180,0.2)';
    }
    ctx.beginPath();
    ctx.arc(dx, dotY, 4.5 * S, 0, TAU);
    ctx.fill();
  }

  // buttons column
  const bw = Math.min(W * 0.78, 330 * S);
  const bx = CX - bw / 2;
  let by = H * 0.36;
  const bh = 54 * S, gap = 12 * S;

  addBtn(bx, by, bw, bh, '►  IGNITE — ' + sector().name, () => startRun(), { primary: true, font: 17 });
  by += bh + gap;
  addBtn(bx, by, bw, bh * 0.85, 'SECTORS', () => goto_(ST.MAP), { font: 15 });
  by += bh * 0.85 + gap;
  addBtn(bx, by, bw / 2 - gap / 2, bh * 0.85, 'HANGAR', () => goto_(ST.HANGAR), { font: 15 });
  addBtn(bx + bw / 2 + gap / 2, by, bw / 2 - gap / 2, bh * 0.85, 'UPGRADES', () => goto_(ST.SHOP), { font: 15 });
  by += bh * 0.85 + gap * 1.6;

  if (save.best > 0) {
    ctx.fillStyle = COL.dim;
    ctx.textAlign = 'center';
    ctx.font = `600 ${Math.round(13 * S)}px system-ui, sans-serif`;
    ctx.fillText(`BEST ${fmt(save.best)}`, CX, by);
    by += 22 * S;
  }

  // missions panel
  const mh = 30 * S;
  const panelH = mh * 3 + 46 * S;
  const py = Math.min(by, H - panelH - 12);
  panel(bx, py, bw, panelH);
  ctx.fillStyle = COL.faint;
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.round(11 * S)}px system-ui, sans-serif`;
  ctx.fillText('C O N T R A C T S', bx + 16 * S, py + 22 * S);
  let my = py + 40 * S;
  for (const m of save.missions) {
    const def = missionDef(m.id);
    if (!def) continue;
    ctx.fillStyle = m.done ? COL.good : COL.text;
    ctx.font = `500 ${Math.round(12.5 * S)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText((m.done ? '✓ ' : '') + def.text, bx + 16 * S, my + 12 * S);
    ctx.textAlign = 'right';
    ctx.fillStyle = COL.orb;
    ctx.fillText('✦ ' + def.reward, bx + bw - 14 * S, my + 12 * S);
    progressBar(bx + 16 * S, my + 18 * S, bw - 32 * S, 3.5 * S, m.best / def.target, m.done ? COL.good : COL.gold);
    my += mh;
  }
  ctx.globalAlpha = 1;
}

function renderPlayHUD(t) {
  const small = Math.min(W, H);
  const topY = 12 + (H - small) * 0.1;

  // score
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.text;
  ctx.font = `700 ${Math.round(small * 0.055)}px system-ui, sans-serif`;
  ctx.fillText(String(Math.floor(displayScore)), CX, topY + small * 0.06);
  if (combo > 1) {
    const comboAlpha = clamp(comboTimer / 1.5, 0, 1);
    ctx.globalAlpha = 0.4 + 0.6 * comboAlpha;
    ctx.fillStyle = COL.orb;
    ctx.font = `700 ${Math.round(small * 0.03)}px system-ui, sans-serif`;
    ctx.fillText(`×${combo}`, CX, topY + small * 0.06 + small * 0.042);
    ctx.globalAlpha = 1;
  }

  // sparks this run (top-left)
  const y1 = topY + 14 * S;
  sparkIcon(20 + 7 * S, y1, 6.5 * S);
  ctx.fillStyle = COL.text;
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.round(15 * S)}px system-ui, sans-serif`;
  ctx.fillText('+' + fmt(sparksRunF), 20 + 17 * S, y1 + 5 * S);

  // shields
  for (let i = 0; i < shieldCharges; i++) {
    ctx.strokeStyle = shipDef().color;
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.arc(28 + i * 20 * S, y1 + 26 * S, 6 * S, 0, TAU);
    ctx.stroke();
  }
  if (reviveAvail) {
    ctx.fillStyle = '#ffb84d';
    ctx.font = `700 ${Math.round(11 * S)}px system-ui, sans-serif`;
    ctx.fillText('◈', 22, y1 + 50 * S);
  }

  // pause button
  const pb = pauseBtnRect();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(pb.x, pb.y, pb.w, pb.h, 10);
  ctx.fill();
  ctx.fillStyle = COL.dim;
  ctx.fillRect(pb.x + 16, pb.y + 14, 5, 20);
  ctx.fillRect(pb.x + 27, pb.y + 14, 5, 20);

  // dash cooldown pip (bottom center)
  if (save.up.dash > 0) {
    const cdMax = DASH_CD[save.up.dash] * shipDef().dashCd;
    const frac = 1 - clamp(dashCd / cdMax, 0, 1);
    const dy = H - 34 * S;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 3 * S;
    ctx.beginPath();
    ctx.arc(CX, dy, 12 * S, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = frac >= 1 ? shipDef().color : COL.dim;
    ctx.beginPath();
    ctx.arc(CX, dy, 12 * S, -Math.PI / 2, -Math.PI / 2 + frac * TAU);
    ctx.stroke();
    if (frac >= 1) {
      ctx.fillStyle = shipDef().color;
      ctx.font = `700 ${Math.round(9 * S)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('DASH', CX, dy + 26 * S);
    }
  }

  // first-runs tutorial
  if (save.runs < 2 && elapsed < 9) {
    const a = elapsed < 7 ? 1 : (9 - elapsed) / 2;
    ctx.globalAlpha = a * (0.7 + 0.3 * Math.sin(t * 0.005));
    ctx.fillStyle = COL.text;
    ctx.textAlign = 'center';
    ctx.font = `600 ${Math.round(15 * S)}px system-ui, sans-serif`;
    ctx.fillText('HOLD to dive · RELEASE to drift', CX, H * 0.82);
    ctx.fillStyle = COL.orb;
    ctx.fillText('catch sparks ✦ — they refill the sun', CX, H * 0.82 + 24 * S);
    ctx.globalAlpha = 1;
  }
}

function renderPause(t) {
  renderWorld(t, true);
  buttons = [];
  ctx.fillStyle = 'rgba(4,6,14,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.text;
  const small = Math.min(W, H);
  ctx.font = `800 ${Math.round(small * 0.06)}px system-ui, sans-serif`;
  ctx.fillText('PAUSED', CX, H * 0.32);
  ctx.fillStyle = COL.dim;
  ctx.font = `500 ${Math.round(small * 0.03)}px system-ui, sans-serif`;
  ctx.fillText(sector().name, CX, H * 0.365);

  const bw = Math.min(W * 0.7, 300 * S);
  addBtn(CX - bw / 2, H * 0.44, bw, 54 * S, 'RESUME', () => goto_(ST.PLAY), { primary: true });
  addBtn(CX - bw / 2, H * 0.44 + 68 * S, bw, 48 * S, 'ABANDON RUN', () => {
    res_wasIgnitedAtStart = true;
    endRun();
  });
}

function renderResults(t) {
  renderWorld(t, false);
  buttons = [];
  const small = Math.min(W, H);
  const a = clamp(screenT / 0.5, 0, 1);
  ctx.globalAlpha = a;

  ctx.textAlign = 'center';
  ctx.fillStyle = COL.text;
  ctx.font = `800 ${Math.round(small * 0.052)}px system-ui, sans-serif`;
  ctx.fillText('SIGNAL LOST', CX, H * 0.14);

  ctx.font = `800 ${Math.round(small * 0.085)}px system-ui, sans-serif`;
  ctx.fillText(fmt(res.score), CX, H * 0.225);

  if (res.newBest) {
    ctx.fillStyle = COL.orb;
    ctx.font = `700 ${Math.round(small * 0.032)}px system-ui, sans-serif`;
    ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 0.008));
    ctx.fillText('★ NEW BEST ★', CX, H * 0.265);
    ctx.globalAlpha = a;
  } else {
    ctx.fillStyle = COL.dim;
    ctx.font = `500 ${Math.round(small * 0.028)}px system-ui, sans-serif`;
    ctx.fillText(`BEST ${fmt(save.best)}`, CX, H * 0.265);
  }

  // earnings panel
  const bw = Math.min(W * 0.84, 360 * S);
  const bx = CX - bw / 2;
  let py = H * 0.30;
  const rows = 2 + res.missionsDone.length;
  const ph = 30 * S * rows + 58 * S;
  panel(bx, py, bw, ph);
  ctx.textAlign = 'left';
  ctx.fillStyle = COL.faint;
  ctx.font = `700 ${Math.round(11 * S)}px system-ui, sans-serif`;
  ctx.fillText('S A L V A G E', bx + 16 * S, py + 22 * S);
  let ry = py + 46 * S;
  const row = (label, val, color) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = COL.text;
    ctx.font = `500 ${Math.round(13.5 * S)}px system-ui, sans-serif`;
    ctx.fillText(label, bx + 16 * S, ry);
    ctx.textAlign = 'right';
    ctx.fillStyle = color || COL.orb;
    ctx.font = `700 ${Math.round(13.5 * S)}px system-ui, sans-serif`;
    ctx.fillText(val, bx + bw - 16 * S, ry);
    ry += 30 * S;
  };
  row(`${res.orbs} sparks · ${res.near} grazes`, '+✦ ' + fmt(res.orbSparks));
  for (const def of res.missionsDone) row('✓ ' + def.text, '+✦ ' + fmt(def.reward), COL.good);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(bx + 16 * S, ry - 18 * S);
  ctx.lineTo(bx + bw - 16 * S, ry - 18 * S);
  ctx.stroke();
  row('banked', '✦ ' + fmt(save.sparks), COL.text);

  py += ph + 14 * S;

  // ignition status
  const sec = SECTORS[res.sector];
  if (save.ignited[res.sector]) {
    ctx.textAlign = 'center';
    ctx.fillStyle = COL.gold;
    ctx.font = `700 ${Math.round(14 * S)}px system-ui, sans-serif`;
    ctx.fillText('☀ ' + sec.name + ' BURNS AGAIN', CX, py + 12 * S);
  } else {
    const shown = clamp(save.ign[res.sector] - res.light + res.light * Math.min(1, screenT / 1.2), 0, sec.req);
    ctx.textAlign = 'center';
    ctx.fillStyle = COL.dim;
    ctx.font = `600 ${Math.round(12.5 * S)}px system-ui, sans-serif`;
    ctx.fillText(`${sec.name} — ${Math.floor(shown)} / ${sec.req} light`, CX, py + 10 * S);
    progressBar(bx + 20 * S, py + 20 * S, bw - 40 * S, 6 * S, shown / sec.req, COL.gold);
  }
  py += 44 * S;

  const bh = 54 * S;
  const btnY = Math.min(py, H - bh - 20);
  addBtn(bx, btnY, bw * 0.62 - 6 * S, bh, '►  FLY AGAIN', () => { leaveResults(); startRun(); }, { primary: true, font: 16 });
  addBtn(bx + bw * 0.62 + 6 * S, btnY, bw * 0.38 - 6 * S, bh, 'BASE', () => { leaveResults(); goto_(ST.TITLE); }, { font: 15 });
  ctx.globalAlpha = 1;
}

function renderMap(t) {
  renderWorld(t, false);
  buttons = [];
  backBtn();
  drawBalance2(W - 20);
  const small = Math.min(W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.text;
  ctx.font = `800 ${Math.round(small * 0.05)}px system-ui, sans-serif`;
  ctx.fillText('THE FIVE SUNS', CX, H * 0.115);

  const bw = Math.min(W * 0.86, 380 * S);
  const bx = CX - bw / 2;
  const ch = Math.min((H * 0.78) / 5 - 10 * S, 96 * S);
  let cy = H * 0.16;

  for (let i = 0; i < SECTORS.length; i++) {
    const sec = SECTORS[i];
    const unlocked = i < save.unlocked;
    const selected = save.sector === i;
    panel(bx, cy, bw, ch, selected);
    if (selected) {
      ctx.strokeStyle = SHIPS[save.ship].color;
      ctx.lineWidth = 2;
      rr(bx, cy, bw, ch, 14 * S);
      ctx.stroke();
    }

    // sun dot
    const dotX = bx + 30 * S, dotY = cy + ch / 2;
    if (save.ignited[i]) {
      drawGlow(dotX, dotY, 22 * S, 'rgba(255,200,90,0.9)', 0.8);
      ctx.fillStyle = COL.gold;
    } else {
      ctx.fillStyle = unlocked ? 'rgba(170,190,255,0.45)' : 'rgba(110,125,160,0.2)';
    }
    ctx.beginPath();
    ctx.arc(dotX, dotY, 9 * S, 0, TAU);
    ctx.fill();

    ctx.textAlign = 'left';
    if (!unlocked) {
      ctx.fillStyle = 'rgba(180,195,230,0.35)';
      ctx.font = `700 ${Math.round(15 * S)}px system-ui, sans-serif`;
      ctx.fillText(sec.name, bx + 56 * S, cy + ch / 2 - 4 * S);
      ctx.font = `500 ${Math.round(11.5 * S)}px system-ui, sans-serif`;
      ctx.fillText('🔒 reignite the previous sun', bx + 56 * S, cy + ch / 2 + 16 * S);
    } else {
      ctx.fillStyle = COL.text;
      ctx.font = `700 ${Math.round(15 * S)}px system-ui, sans-serif`;
      ctx.fillText(sec.name, bx + 56 * S, cy + ch / 2 - 12 * S);
      ctx.fillStyle = COL.dim;
      ctx.font = `500 ${Math.round(11.5 * S)}px system-ui, sans-serif`;
      ctx.fillText(sec.intro + '  ·  ' + sec.tag, bx + 56 * S, cy + ch / 2 + 8 * S);
      if (save.ignited[i]) {
        ctx.fillStyle = COL.gold;
        ctx.font = `700 ${Math.round(11 * S)}px system-ui, sans-serif`;
        ctx.fillText('☀ REIGNITED', bx + 56 * S, cy + ch / 2 + 26 * S);
      } else {
        progressBar(bx + 56 * S, cy + ch / 2 + 20 * S, bw - 130 * S, 4.5 * S, save.ign[i] / sec.req, COL.gold);
        ctx.fillStyle = COL.faint;
        ctx.textAlign = 'right';
        ctx.font = `600 ${Math.round(10.5 * S)}px system-ui, sans-serif`;
        ctx.fillText(`${save.ign[i]}/${sec.req}`, bx + bw - 14 * S, cy + ch / 2 + 26 * S);
      }
      // clickable
      const idx = i;
      buttons.push({
        x: bx, y: cy, w: bw, h: ch, flash: 0, silent: false, disabled: false,
        label: '', cb: () => {
          save.sector = idx;
          persist();
          retuneMusic();
          goto_(ST.MAP);
        },
      });
    }
    cy += ch + 10 * S;
  }
}

function drawBalance2(rightX) {
  const y = 12 + 14 * S;
  ctx.fillStyle = COL.text;
  ctx.textAlign = 'right';
  ctx.font = `700 ${Math.round(16 * S)}px system-ui, sans-serif`;
  const txt = fmt(save.sparks);
  ctx.fillText(txt, rightX, y + 5 * S);
  const tw = ctx.measureText(txt).width;
  sparkIcon(rightX - tw - 12 * S, y, 7 * S);
}

function renderHangar(t) {
  renderWorld(t, false);
  buttons = [];
  backBtn();
  drawBalance2(W - 20);
  const small = Math.min(W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.text;
  ctx.font = `800 ${Math.round(small * 0.05)}px system-ui, sans-serif`;
  ctx.fillText('HANGAR', CX, H * 0.115);

  const bw = Math.min(W * 0.86, 380 * S);
  const bx = CX - bw / 2;
  const ch = Math.min((H * 0.78) / 4 - 10 * S, 118 * S);
  let cy = H * 0.16;

  for (let i = 0; i < SHIPS.length; i++) {
    const sp = SHIPS[i];
    const owned = save.ships[i];
    const selected = save.ship === i;
    panel(bx, cy, bw, ch, selected);
    if (selected) {
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = 2;
      rr(bx, cy, bw, ch, 14 * S);
      ctx.stroke();
    }

    // glyph
    ctx.save();
    ctx.translate(bx + 34 * S, cy + ch / 2);
    ctx.scale(S * 1.4, S * 1.4);
    drawGlow(0, 0, 22, sp.color, owned ? 0.5 : 0.15);
    if (!owned) ctx.globalAlpha = 0.35;
    drawShipShape(sp.color);
    ctx.restore();
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
    ctx.fillStyle = owned ? COL.text : 'rgba(200,212,240,0.6)';
    ctx.font = `700 ${Math.round(15 * S)}px system-ui, sans-serif`;
    ctx.fillText(sp.name, bx + 64 * S, cy + 26 * S);
    ctx.fillStyle = sp.color;
    ctx.font = `600 ${Math.round(10.5 * S)}px system-ui, sans-serif`;
    ctx.fillText(sp.stats, bx + 64 * S, cy + 43 * S);
    ctx.fillStyle = COL.dim;
    ctx.font = `400 ${Math.round(11 * S)}px system-ui, sans-serif`;
    wrapText(sp.desc, bx + 64 * S, cy + 60 * S, bw - 190 * S, 14 * S);

    // action
    const abw = 96 * S, abh = 38 * S;
    const ax = bx + bw - abw - 12 * S, ay = cy + ch / 2 - abh / 2;
    if (selected) {
      ctx.fillStyle = sp.color;
      ctx.textAlign = 'right';
      ctx.font = `700 ${Math.round(12 * S)}px system-ui, sans-serif`;
      ctx.fillText('FLYING', bx + bw - 20 * S, cy + ch / 2 + 4 * S);
    } else if (owned) {
      const idx = i;
      addBtn(ax, ay, abw, abh, 'SELECT', () => { save.ship = idx; persist(); }, { font: 13 });
    } else {
      const idx = i;
      const afford = save.sparks >= sp.price;
      addBtn(ax, ay, abw, abh, '✦ ' + fmt(sp.price), () => {
        if (save.sparks >= sp.price) {
          save.sparks -= sp.price;
          save.ships[idx] = true;
          save.ship = idx;
          persist();
          sfx.buy();
          burst(ax + abw / 2, ay + abh / 2, sp.color, 20, 300 * S, 3 * S);
        } else sfx.denied();
      }, { font: 13, silent: true, color: afford ? COL.orb : 'rgba(255,211,77,0.4)' });
    }
    cy += ch + 10 * S;
  }
}

function wrapText(text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = wd;
      y += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}

function renderShop(t) {
  renderWorld(t, false);
  buttons = [];
  backBtn();
  drawBalance2(W - 20);
  const small = Math.min(W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.text;
  ctx.font = `800 ${Math.round(small * 0.05)}px system-ui, sans-serif`;
  ctx.fillText('UPGRADES', CX, H * 0.115);

  const bw = Math.min(W * 0.86, 380 * S);
  const bx = CX - bw / 2;
  const ch = Math.min((H * 0.78) / 5 - 10 * S, 96 * S);
  let cy = H * 0.16;

  for (const up of UPGRADES) {
    const lv = save.up[up.key];
    const maxed = lv >= up.max;
    panel(bx, cy, bw, ch);

    ctx.textAlign = 'left';
    ctx.fillStyle = COL.text;
    ctx.font = `700 ${Math.round(14 * S)}px system-ui, sans-serif`;
    ctx.fillText(up.name, bx + 16 * S, cy + 24 * S);

    // level pips
    for (let i = 0; i < up.max; i++) {
      const px = bx + 16 * S + i * 16 * S;
      const py2 = cy + 38 * S;
      ctx.fillStyle = i < lv ? SHIPS[save.ship].color : 'rgba(255,255,255,0.12)';
      rr(px, py2, 11 * S, 5 * S, 2.5 * S);
      ctx.fill();
    }

    ctx.fillStyle = COL.dim;
    ctx.font = `400 ${Math.round(11 * S)}px system-ui, sans-serif`;
    wrapText(up.desc, bx + 16 * S, cy + 60 * S, bw - 130 * S, 14 * S);

    const abw = 92 * S, abh = 38 * S;
    const ax = bx + bw - abw - 12 * S, ay = cy + ch / 2 - abh / 2;
    if (maxed) {
      ctx.fillStyle = COL.good;
      ctx.textAlign = 'right';
      ctx.font = `700 ${Math.round(12 * S)}px system-ui, sans-serif`;
      ctx.fillText('MAX', bx + bw - 22 * S, cy + ch / 2 + 4 * S);
    } else {
      const cost = up.costs[lv];
      const afford = save.sparks >= cost;
      const key = up.key;
      addBtn(ax, ay, abw, abh, '✦ ' + fmt(cost), () => {
        if (save.sparks >= cost) {
          save.sparks -= cost;
          save.up[key]++;
          persist();
          sfx.buy();
        } else sfx.denied();
      }, { font: 13, silent: true, color: afford ? COL.orb : 'rgba(255,211,77,0.4)' });
    }
    cy += ch + 10 * S;
  }
}

function renderWin(t) {
  // golden world
  renderWorld(t, false);
  buttons = [];
  const small = Math.min(W, H);
  const a = clamp(screenT / 1.2, 0, 1);

  // rising embers
  if (Math.random() < 0.3) {
    particles.push({
      x: rand(0, W), y: H + 10,
      vx: rand(-10, 10), vy: rand(-60, -160) * S,
      life: rand(1.5, 3), maxLife: 3, size: rand(1.5, 3.5) * S, color: COL.gold,
    });
  }

  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.gold;
  ctx.font = `800 ${Math.round(small * 0.07)}px system-ui, sans-serif`;
  ctx.fillText('THE SYSTEM BURNS', CX, H * 0.24);
  ctx.fillText('AGAIN', CX, H * 0.24 + small * 0.08);

  ctx.fillStyle = COL.text;
  ctx.font = `500 ${Math.round(small * 0.032)}px system-ui, sans-serif`;
  ctx.fillText('all five suns reignited', CX, H * 0.38);
  ctx.fillStyle = COL.dim;
  ctx.font = `400 ${Math.round(small * 0.027)}px system-ui, sans-serif`;
  ctx.fillText(`${save.runs} flights · ${fmt(save.totalOrbs)} sparks harvested`, CX, H * 0.42);
  ctx.fillText('the lightkeeper rests. for now.', CX, H * 0.455);

  const bw = Math.min(W * 0.78, 330 * S);
  addBtn(CX - bw / 2, H * 0.54, bw, 56 * S, '☀ NEW DAWN — prestige +' + (save.prestige + 1),
    () => {
      save.prestige++;
      save.ign = [0, 0, 0, 0, 0];
      save.ignited = [false, false, false, false, false];
      save.unlocked = 1;
      save.sector = 0;
      save.winSeen = false;
      persist();
      retuneMusic();
      goto_(ST.TITLE);
    }, { primary: true, accent: COL.gold, font: 15 });
  ctx.fillStyle = COL.faint;
  ctx.font = `400 ${Math.round(11.5 * S)}px system-ui, sans-serif`;
  ctx.fillText('suns reset · hazards +12% · sparks +50% · keep everything else', CX, H * 0.54 + 74 * S);

  addBtn(CX - bw / 2, H * 0.54 + 92 * S, bw, 48 * S, 'KEEP FLYING', () => goto_(ST.TITLE), { font: 14 });
  ctx.globalAlpha = 1;
}

// ---------- Render dispatch ----------
function render(t) {
  switch (state) {
    case ST.TITLE: renderTitle(t); break;
    case ST.PLAY: renderWorld(t, true); renderPlayHUD(t); break;
    case ST.PAUSE: renderPause(t); break;
    case ST.RESULTS: renderResults(t); break;
    case ST.MAP: renderMap(t); break;
    case ST.HANGAR: renderHangar(t); break;
    case ST.SHOP: renderShop(t); break;
    case ST.WIN: renderWin(t); break;
  }
}

// ---------- Main loop ----------
let lastT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  if (!lastT) { lastT = t; return; }
  let dt = (t - lastT) / 1000;
  lastT = t;
  dt = Math.min(dt, 1 / 20);
  update(dt);
  render(t);
  tickArp();
}

resize();
requestAnimationFrame(frame);

// debug/testing hooks
window.NEO = { save, persist, goto_: goto_, ST, state: () => state, kill: () => { if (state === ST.PLAY) die(shipX(), shipY()); } };

})();
