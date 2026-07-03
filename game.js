/* ============================================================
   NEON ORBIT — a one-thumb neon arcade game
   Hold to dive toward the core, release to drift out.
   Collect energy sparks, dodge mines and sweeper lasers.
   ============================================================ */
'use strict';

(() => {

// ---------- Canvas & sizing ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0, H = 0, DPR = 1;
let CX = 0, CY = 0;      // arena center
let S = 1;               // entity scale (1 ≈ a typical phone)

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
// signed smallest angular difference, in (-PI, PI]
function angDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// ---------- Glow sprites (pre-rendered; shadowBlur is too slow on mobile) ----------
const glowCache = {};
function glowSprite(color, size) {
  const key = color + '|' + size;
  if (glowCache[key]) return glowCache[key];
  const s = Math.ceil(size);
  const c = document.createElement('canvas');
  c.width = c.height = s * 2;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s, s, 0, s, s, s);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s * 2, s * 2);
  glowCache[key] = c;
  return c;
}
function drawGlow(x, y, r, color, alpha) {
  const spr = glowSprite(color, 64);
  ctx.globalAlpha = alpha;
  ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// ---------- Audio (tiny synth, unlocked on first touch) ----------
let AC = null;
let masterGain = null;
let muted = false;

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = AC.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(AC.destination);
  } catch (e) { AC = null; }
}

function tone(freq, dur, type, vol, slide) {
  if (!AC || muted) return;
  const t = AC.currentTime;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol) {
  if (!AC || muted) return;
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
  filt.frequency.setValueAtTime(3000, t);
  filt.frequency.exponentialRampToValueAtTime(200, t + dur);
  src.connect(filt).connect(g).connect(masterGain);
  src.start(t);
}

const sfx = {
  pickup(combo) { tone(440 + Math.min(combo, 16) * 55, 0.12, 'sine', 0.25, 1.5); },
  dive() { tone(220, 0.08, 'triangle', 0.08, 0.7); },
  warn() { tone(180, 0.25, 'square', 0.06, 1.0); },
  death() { noiseBurst(0.6, 0.5); tone(160, 0.5, 'sawtooth', 0.25, 0.25); },
  start() { tone(330, 0.15, 'sine', 0.2, 2.0); },
  best() { tone(523, 0.12, 'sine', 0.22, 1.0); setTimeout(() => tone(784, 0.2, 'sine', 0.22, 1.0), 110); },
};

function buzz(ms) {
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
}

// ---------- Colors ----------
const COL = {
  bg: '#070b18',
  ship: '#4df0ff',
  shipCore: '#e9ffff',
  trail: '#22c8e6',
  orb: '#ffd34d',
  orbCore: '#fff6d8',
  mine: '#ff4d7e',
  mineCore: '#ffd7e2',
  laser: '#ff5b4d',
  ring: 'rgba(120,160,255,0.10)',
  text: '#dfe8ff',
  dim: 'rgba(223,232,255,0.55)',
};

// ---------- Stars ----------
let stars = [];
function buildStars() {
  stars = [];
  const n = Math.floor((W * H) / 9000);
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: rand(0.4, 1.6),
      tw: rand(0, TAU),
      sp: rand(0.5, 2),
    });
  }
}

// ---------- Game state ----------
const ST_MENU = 0, ST_PLAY = 1, ST_DEAD = 2;
let state = ST_MENU;

let best = 0;
try { best = parseInt(localStorage.getItem('neonOrbitBest') || '0', 10) || 0; } catch (e) {}

const ship = {
  ang: -Math.PI / 2,
  r: 0,          // current orbit radius (px)
  vr: 0,
  holding: false,
  trail: [],     // {x, y, a}
};

let score = 0;
let displayScore = 0;
let combo = 1;
let comboTimer = 0;
let elapsed = 0;         // run time in seconds
let deadTimer = 0;
let newBest = false;
let shake = 0;
let flash = 0;

let orbs = [];       // {ang, r, pulse, mag}
let mines = [];      // {ang, r, t, armed, spin, life}
let lasers = [];     // {ang, spin, t, warmup, dur}
let particles = [];  // {x, y, vx, vy, life, maxLife, size, color}

let orbTimer = 0, mineTimer = 0, laserTimer = 0;

// radii as fractions of min(W,H)/2
const R_MIN_F = 0.16, R_MAX_F = 0.42, R_CORE_F = 0.07;
function arenaR() { return Math.min(W, H) * 0.5; }

function resetRun() {
  score = 0; displayScore = 0;
  combo = 1; comboTimer = 0;
  elapsed = 0;
  newBest = false;
  ship.ang = -Math.PI / 2;
  ship.r = arenaR() * (R_MAX_F + R_MIN_F);
  ship.vr = 0;
  ship.trail = [];
  ship.holding = false;
  orbs = []; mines = []; lasers = []; particles = [];
  orbTimer = 0.5; mineTimer = 2.5; laserTimer = 12;
}

// ---------- Input ----------
function pointerDown(e) {
  e.preventDefault();
  initAudio();
  if (state === ST_MENU) {
    resetRun();
    state = ST_PLAY;
    ship.holding = true;
    sfx.start();
    return;
  }
  if (state === ST_DEAD) {
    if (deadTimer > 0.7) {
      resetRun();
      state = ST_PLAY;
      ship.holding = true;
      sfx.start();
    }
    return;
  }
  ship.holding = true;
  sfx.dive();
}
function pointerUp(e) {
  e.preventDefault();
  ship.holding = false;
}
window.addEventListener('pointerdown', pointerDown, { passive: false });
window.addEventListener('pointerup', pointerUp, { passive: false });
window.addEventListener('pointercancel', pointerUp, { passive: false });
// keyboard for desktop testing
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space') pointerDown(new Event('x', { cancelable: true }));
  if (e.code === 'KeyM') muted = !muted;
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') pointerUp(new Event('x', { cancelable: true }));
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { lastT = 0; ship.holding = false; }
});

// ---------- Spawning ----------
function difficulty() {
  // 0 → 1 over ~90 seconds, keeps creeping slowly after
  return Math.min(1, elapsed / 90) + Math.max(0, (elapsed - 90) / 400);
}

function fairAngle(minDist) {
  // random angle at least minDist radians (along orbit) away from the ship
  for (let i = 0; i < 20; i++) {
    const a = rand(0, TAU);
    if (Math.abs(angDiff(a, ship.ang)) > minDist) return a;
  }
  return ship.ang + Math.PI;
}

function spawnOrb() {
  const A = arenaR();
  orbs.push({
    ang: fairAngle(0.5),
    r: A * rand(R_MIN_F + 0.02, R_MAX_F - 0.02),
    pulse: rand(0, TAU),
    mag: 0,
  });
}

function spawnMine() {
  const d = difficulty();
  const A = arenaR();
  mines.push({
    ang: fairAngle(1.1),
    r: A * rand(R_MIN_F + 0.01, R_MAX_F - 0.01),
    t: 0,
    armTime: lerp(1.1, 0.7, Math.min(d, 1)),
    armed: false,
    spin: rand(-0.25, 0.25),
    life: rand(11, 16),
  });
  sfx.warn();
}

function spawnLaser() {
  const d = difficulty();
  lasers.push({
    ang: fairAngle(1.5),
    spin: (Math.random() < 0.5 ? -1 : 1) * lerp(0.25, 0.65, Math.min(d, 1)),
    t: 0,
    warmup: 1.4,
    dur: rand(4, 6.5),
  });
  sfx.warn();
}

function burst(x, y, color, n, speed, size) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const s = rand(speed * 0.3, speed);
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.3, 0.8),
      maxLife: 0.8,
      size: rand(size * 0.5, size),
      color,
    });
  }
}

// ---------- Update ----------
function update(dt) {
  // stars twinkle regardless of state
  for (const s of stars) s.tw += s.sp * dt;

  // particles always simmer
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.05, dt);
    p.vy *= Math.pow(0.05, dt);
  }

  shake = Math.max(0, shake - dt * 3);
  flash = Math.max(0, flash - dt * 2.5);

  if (state === ST_MENU) {
    // idle ship circles slowly on menu
    ship.ang += 0.5 * dt;
    ship.r = arenaR() * (R_MAX_F + R_MIN_F);
    updateTrail(dt, 0.4);
    return;
  }

  if (state === ST_DEAD) {
    deadTimer += dt;
    return;
  }

  // ----- PLAYING -----
  elapsed += dt;
  const d = difficulty();
  const A = arenaR();

  // radial motion: smooth spring toward target ring
  const target = A * (ship.holding ? R_MIN_F : R_MAX_F);
  const springK = 26, dampK = 9;
  ship.vr += (target - ship.r) * springK * dt;
  ship.vr *= Math.exp(-dampK * dt);
  ship.r += ship.vr * dt;
  ship.r = clamp(ship.r, A * (R_MIN_F - 0.02), A * (R_MAX_F + 0.02));

  // angular speed: faster when diving low (angular-momentum feel) + ramps with difficulty
  const baseW = lerp(1.5, 2.4, Math.min(d, 1));
  const w = baseW * Math.sqrt(A * 0.30 / ship.r);
  ship.ang += w * dt;
  if (ship.ang > TAU) ship.ang -= TAU;

  updateTrail(dt, 1);

  // score: survival + speed bonus for flying low
  score += dt * (10 + (ship.r < A * (R_MIN_F + 0.06) ? 8 : 0)) * combo * 0.4;
  displayScore = lerp(displayScore, score, 1 - Math.pow(0.001, dt));

  // combo decay
  if (combo > 1) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 1;
  }

  const sx = CX + Math.cos(ship.ang) * ship.r;
  const sy = CY + Math.sin(ship.ang) * ship.r;
  const shipHit = 8 * S; // ship collision radius in px

  // spawn timers
  orbTimer -= dt;
  if (orbTimer <= 0 && orbs.length < 5) {
    spawnOrb();
    orbTimer = rand(1.2, 2.4);
  }
  mineTimer -= dt;
  if (mineTimer <= 0 && mines.length < 3 + Math.floor(d * 5)) {
    spawnMine();
    mineTimer = lerp(3.2, 1.1, Math.min(d, 1)) * rand(0.8, 1.2);
  }
  if (elapsed > 20) {
    laserTimer -= dt;
    if (laserTimer <= 0 && lasers.length < 1 + Math.floor(d * 1.5)) {
      spawnLaser();
      laserTimer = lerp(16, 8, Math.min(d, 1)) * rand(0.85, 1.15);
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
    // magnet pull when near
    if (dist < 55 * S) o.mag = Math.min(1, o.mag + dt * 6);
    if (o.mag > 0) {
      const pull = o.mag * 220 * S * dt;
      const nx = dx / (dist || 1), ny = dy / (dist || 1);
      const nox = ox + nx * pull, noy = oy + ny * pull;
      o.ang = Math.atan2(noy - CY, nox - CX);
      o.r = Math.hypot(nox - CX, noy - CY);
    }
    if (dist < shipHit + 6 * S) {
      // collected!
      orbs.splice(i, 1);
      combo = Math.min(combo + 1, 20);
      comboTimer = 4;
      score += 25 * combo;
      sfx.pickup(combo);
      buzz(12);
      burst(ox, oy, COL.orb, 14, 280 * S, 3.5 * S);
    }
  }

  // mines
  for (let i = mines.length - 1; i >= 0; i--) {
    const m = mines[i];
    m.t += dt;
    m.life -= dt;
    if (m.life <= 0) { mines.splice(i, 1); continue; }
    if (!m.armed && m.t >= m.armTime) m.armed = true;
    m.ang += m.spin * dt;
    if (m.armed) {
      const mx = CX + Math.cos(m.ang) * m.r;
      const my = CY + Math.sin(m.ang) * m.r;
      if (Math.hypot(sx - mx, sy - my) < shipHit + 9 * S) {
        return die(sx, sy);
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
      // active beam: from core outward — hit if ship angle aligns
      const halfWidth = (5 * S + shipHit) / ship.r;
      if (Math.abs(angDiff(ship.ang, L.ang)) < halfWidth) {
        return die(sx, sy);
      }
    }
  }
}

function updateTrail(dt, intensity) {
  const sx = CX + Math.cos(ship.ang) * ship.r;
  const sy = CY + Math.sin(ship.ang) * ship.r;
  ship.trail.unshift({ x: sx, y: sy, a: intensity });
  if (ship.trail.length > 26) ship.trail.pop();
  for (const t of ship.trail) t.a *= Math.pow(0.02, dt);
}

function die(x, y) {
  state = ST_DEAD;
  deadTimer = 0;
  shake = 1;
  flash = 1;
  sfx.death();
  buzz([60, 40, 120]);
  burst(x, y, COL.ship, 40, 440 * S, 4 * S);
  burst(x, y, '#ffffff', 14, 320 * S, 3 * S);
  const final = Math.floor(score);
  if (final > best) {
    best = final;
    newBest = true;
    try { localStorage.setItem('neonOrbitBest', String(best)); } catch (e) {}
    setTimeout(() => sfx.best(), 500);
  }
}

// ---------- Render ----------
function render(t) {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (shake > 0) {
    const s = shake * shake * 14;
    ctx.translate(rand(-s, s), rand(-s, s));
  }

  // stars
  ctx.fillStyle = '#aebfff';
  for (const s of stars) {
    ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(s.tw));
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  const A = arenaR();

  // guide rings
  ctx.strokeStyle = COL.ring;
  ctx.lineWidth = 1;
  for (const f of [R_MIN_F, (R_MIN_F + R_MAX_F) / 2, R_MAX_F]) {
    ctx.beginPath();
    ctx.arc(CX, CY, A * f, 0, TAU);
    ctx.stroke();
  }

  // core
  const corePulse = 1 + 0.06 * Math.sin(t * 0.003);
  drawGlow(CX, CY, A * R_CORE_F * 3.2 * corePulse, 'rgba(90,140,255,0.9)', 0.5);
  ctx.fillStyle = '#101a38';
  ctx.beginPath();
  ctx.arc(CX, CY, A * R_CORE_F * corePulse, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,170,255,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // lasers
  for (const L of lasers) {
    const len = A * (R_MAX_F + 0.10);
    const x2 = CX + Math.cos(L.ang) * len;
    const y2 = CY + Math.sin(L.ang) * len;
    const x1 = CX + Math.cos(L.ang) * A * R_CORE_F;
    const y1 = CY + Math.sin(L.ang) * A * R_CORE_F;
    if (L.t <= L.warmup) {
      // telegraph: dashed warning line
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
      // telegraph: blinking outline
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
      // spiky square
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

  // trail
  for (let i = ship.trail.length - 1; i >= 0; i--) {
    const tr = ship.trail[i];
    const f = 1 - i / ship.trail.length;
    ctx.globalAlpha = tr.a * f * 0.5;
    ctx.fillStyle = COL.trail;
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, (6 * f + 1) * S, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ship
  if (state !== ST_DEAD) {
    const sx = CX + Math.cos(ship.ang) * ship.r;
    const sy = CY + Math.sin(ship.ang) * ship.r;
    drawGlow(sx, sy, 34 * S, COL.ship, 0.6);
    ctx.save();
    ctx.translate(sx, sy);
    // nose along direction of travel: tangent, tilted by radial velocity
    const tilt = -Math.atan2(ship.vr, ship.r * 2);
    ctx.rotate(ship.ang + Math.PI + tilt);
    ctx.scale(S, S);
    ctx.fillStyle = COL.ship;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(7.5, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7.5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COL.shipCore;
    ctx.beginPath();
    ctx.arc(0, -2, 2.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // particles
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore(); // end shake

  // death flash
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,80,110,${flash * 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }

  renderUI(t);
}

function renderUI(t) {
  const small = Math.min(W, H);
  ctx.textAlign = 'center';

  if (state === ST_PLAY) {
    // score top center
    ctx.fillStyle = COL.text;
    ctx.font = `700 ${Math.round(small * 0.055)}px system-ui, sans-serif`;
    ctx.fillText(String(Math.floor(displayScore)), CX, small * 0.085 + (H - small) * 0.25);
    if (combo > 1) {
      const comboAlpha = clamp(comboTimer / 1.5, 0, 1);
      ctx.globalAlpha = 0.4 + 0.6 * comboAlpha;
      ctx.fillStyle = COL.orb;
      ctx.font = `700 ${Math.round(small * 0.03)}px system-ui, sans-serif`;
      ctx.fillText(`×${combo}`, CX, small * 0.085 + (H - small) * 0.25 + small * 0.045);
      ctx.globalAlpha = 1;
    }
    return;
  }

  const pulse = 0.6 + 0.4 * Math.sin(t * 0.004);

  if (state === ST_MENU) {
    ctx.fillStyle = COL.text;
    ctx.font = `800 ${Math.round(small * 0.085)}px system-ui, sans-serif`;
    ctx.fillText('NEON ORBIT', CX, H * 0.24);

    ctx.fillStyle = COL.dim;
    ctx.font = `400 ${Math.round(small * 0.033)}px system-ui, sans-serif`;
    ctx.fillText('hold to dive · release to drift', CX, H * 0.30);
    ctx.fillText('catch sparks · dodge everything', CX, H * 0.34);

    if (best > 0) {
      ctx.fillStyle = COL.orb;
      ctx.font = `600 ${Math.round(small * 0.032)}px system-ui, sans-serif`;
      ctx.fillText(`BEST ${best}`, CX, H * 0.40);
    }

    ctx.globalAlpha = pulse;
    ctx.fillStyle = COL.ship;
    ctx.font = `700 ${Math.round(small * 0.042)}px system-ui, sans-serif`;
    ctx.fillText('TAP TO PLAY', CX, H * 0.78);
    ctx.globalAlpha = 1;
    return;
  }

  if (state === ST_DEAD) {
    const a = clamp(deadTimer / 0.5, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = COL.text;
    ctx.font = `800 ${Math.round(small * 0.06)}px system-ui, sans-serif`;
    ctx.fillText('SIGNAL LOST', CX, H * 0.30);

    ctx.font = `700 ${Math.round(small * 0.09)}px system-ui, sans-serif`;
    ctx.fillText(String(Math.floor(score)), CX, H * 0.42);

    if (newBest) {
      ctx.fillStyle = COL.orb;
      ctx.font = `700 ${Math.round(small * 0.038)}px system-ui, sans-serif`;
      ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 0.008));
      ctx.fillText('★ NEW BEST ★', CX, H * 0.48);
      ctx.globalAlpha = a;
    } else {
      ctx.fillStyle = COL.dim;
      ctx.font = `500 ${Math.round(small * 0.032)}px system-ui, sans-serif`;
      ctx.fillText(`BEST ${best}`, CX, H * 0.48);
    }

    if (deadTimer > 0.7) {
      ctx.globalAlpha = pulse;
      ctx.fillStyle = COL.ship;
      ctx.font = `700 ${Math.round(small * 0.042)}px system-ui, sans-serif`;
      ctx.fillText('TAP TO RETRY', CX, H * 0.78);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- Main loop ----------
let lastT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  if (!lastT) { lastT = t; return; }
  let dt = (t - lastT) / 1000;
  lastT = t;
  dt = Math.min(dt, 1 / 20); // clamp big pauses
  update(dt);
  render(t);
}

resize();
requestAnimationFrame(frame);

})();
