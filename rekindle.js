/* ============================================================
   REKINDLE — a narrative incremental
   The suns have gone cold. You are Ash-7, the last keeper-drone
   still holding an orbit. Gather light. Wake the machines.
   Reignite the system — then rest.

   The Flight Deck opens the Neon Orbit arcade (game.js); every
   spark caught by hand feeds the fire forever.
   ============================================================ */
'use strict';

(() => {

// ============================================================
// CONTENT
// ============================================================

const ACTS = [
  { name: 'ASH', tag: 'a dead sun. a patient orbit.',
    req: {}, sun: { hue: 220, sat: 15, glow: 0.12, r: 0.30 } },
  { name: 'EMBER', tag: 'a coal remembers being a fire.',
    req: { photons: 250 },
    sun: { hue: 8, sat: 70, glow: 0.3, r: 0.34 },
    onIgnite: 'deep inside the husk, something turns over. a red point, small as a wound, opens in the dark.' },
  { name: 'KINDLED', tag: 'heat, at last. the machines stir.',
    req: { photons: 4000, plasma: 120 },
    sun: { hue: 26, sat: 85, glow: 0.5, r: 0.38 },
    onIgnite: 'the ember spreads. frost sloughs off the old orbital frames in sheets. somewhere below, a door that has been closed for ten thousand years unseals itself.' },
  { name: 'BURNING', tag: 'a real fire now. the dark leans away.',
    req: { photons: 60000, plasma: 6000, flux: 250 },
    sun: { hue: 42, sat: 95, glow: 0.72, r: 0.43 },
    onIgnite: 'ignition. true ignition. the corona snaps outward and for the first time in an age, this system casts shadows.' },
  { name: 'RADIANT', tag: 'the sun has a heartbeat. keep it.',
    req: { photons: 2.5e6, plasma: 3e5, flux: 25000, relics: 3 },
    sun: { hue: 48, sat: 90, glow: 0.9, r: 0.48 },
    onIgnite: 'light reaches the outer moons and comes back changed — reflected, doubled, alive. the system is answering.' },
  { name: 'BEACON', tag: 'not just alive. a signal.',
    req: { photons: 4e7, plasma: 5e6, flux: 4e5, relics: 10, seeds: 8 },
    sun: { hue: 52, sat: 85, glow: 1.0, r: 0.52 },
    onIgnite: '' }, // triggers ending
];

const BUILDINGS = [
  { id: 'gatherer', name: 'Gatherer Drone', act: 0,
    cost: { photons: 15 }, growth: 1.15,
    prod: { photons: 0.5 },
    flavor: 'it remembers how to cup its hands.' },
  { id: 'mirror', name: 'Mirror Array', act: 1,
    cost: { photons: 120 }, growth: 1.15,
    effectText: '+8% drone output each',
    flavor: 'borrowed light, returned with interest.' },
  { id: 'array', name: 'Collector Field', act: 1,
    cost: { photons: 900 }, growth: 1.15,
    prod: { photons: 10 },
    flavor: 'a thousand black petals, all facing the same small hope.' },
  { id: 'furnace', name: 'Furnace', act: 1,
    cost: { photons: 2500 }, growth: 1.18,
    prod: { plasma: 1.2 },
    flavor: 'it eats light and dreams heat.' },
  { id: 'petal', name: 'Dyson Petal', act: 2,
    cost: { photons: 8000 }, growth: 1.15,
    prod: { photons: 80 },
    flavor: 'one petal of a flower that could drink a star.' },
  { id: 'coil', name: 'Magnetar Coil', act: 2,
    cost: { photons: 20000, plasma: 200 }, growth: 1.17,
    prod: { plasma: 7 },
    flavor: 'wound tight around a memory of magnetism.' },
  { id: 'loom', name: 'Orbital Loom', act: 3,
    cost: { plasma: 5000 }, growth: 1.18,
    prod: { flux: 0.9 },
    flavor: 'it weaves field-lines into cloth. the cloth holds weather.' },
  { id: 'resonator', name: 'Resonator', act: 3,
    cost: { plasma: 40000, flux: 600 }, growth: 1.18,
    prod: { flux: 6 },
    flavor: 'a bell that rings itself, forever, quietly.' },
  { id: 'choir', name: 'Choir of Keepers', act: 3,
    cost: { photons: 150000, plasma: 15000, flux: 1500 }, growth: 1.7,
    effectText: '+10% everything each',
    flavor: 'other drones, woken from the long dark. they sing to keep time.' },
];

const UPGRADES = [
  { id: 'hands', name: 'Calloused Hands', act: 0, cost: { photons: 50 },
    text: 'Reaching ×2', flavor: 'the reaching gets easier.' },
  { id: 'rotors', name: 'Oiled Rotors', act: 0, cost: { photons: 250 },
    text: 'Gatherer Drones ×2', flavor: 'they move like they mean it now.' },
  { id: 'fingers', name: 'Long Fingers', act: 1, cost: { photons: 800 },
    text: 'Reaching ×2', flavor: 'you learn to hold more than you can carry.' },
  { id: 'archives', name: 'Deep Archives', act: 1, cost: { photons: 1500 },
    text: 'Away-gain 50% → 75%', flavor: 'the station dreams in ledgers. let it.' },
  { id: 'glass', name: 'Silvered Glass', act: 1, cost: { photons: 3000 },
    text: 'Mirrors +8% → +12%', flavor: 'polished with the sleeve of an old uniform.' },
  { id: 'swarm', name: 'Swarm Logic', act: 2, cost: { photons: 9000 },
    text: 'Gatherer Drones ×2', flavor: 'alone they gather. together they harvest.' },
  { id: 'liturgy', name: 'Solar Liturgy', act: 2, cost: { photons: 15000 },
    text: 'Reaching ×5', flavor: 'the old words for “light, come back.” they work.' },
  { id: 'hunger', name: 'Patient Hunger', act: 2, cost: { photons: 25000, plasma: 800 },
    text: 'Furnaces ×1.5', flavor: 'it learns to chew slowly.' },
  { id: 'twin', name: 'Twin Flames', act: 2, cost: { photons: 90000, plasma: 3000 },
    text: 'Furnaces & Coils ×2', flavor: 'every fire is lonelier than it has to be.' },
  { id: 'woven', name: 'Woven Light', act: 3, cost: { plasma: 30000, flux: 900 },
    text: 'Looms & Resonators ×2', flavor: 'the loom hums a chord it was never taught.' },
  { id: 'sleep', name: 'Dreamless Sleep', act: 3, cost: { photons: 500000 },
    text: 'Away-gain 75% → 100%', flavor: 'the station stops dreaming and simply works.' },
  { id: 'lens2', name: 'Corona Shaping', act: 4, cost: { photons: 5e6, flux: 40000 },
    text: 'Everything ×1.5', flavor: 'you comb the fire like hair.' },
];

const ARTIFACTS = [
  { id: 'bell', name: 'The Cinder Bell', cost: 2,
    text: 'Reaching ×3',
    flavor: 'recovered from the drowned relay. when struck, it rings backward — the sound arrives before the blow.' },
  { id: 'map', name: 'Map of Dead Suns', cost: 2,
    text: 'Expeditions 30% faster',
    flavor: 'someone charted every cold star and wrote, in small letters at the edge: "all of these are promises."' },
  { id: 'heart', name: 'Furnace Heart', cost: 3,
    text: 'Plasma production ×2',
    flavor: 'the core of an older machine. it is still warm. it has always been warm.' },
  { id: 'oath', name: 'The Keeper’s Oath', cost: 4,
    text: '+1 starseed every nova',
    flavor: 'a single sentence, etched in a loop: "I will not let it stay dark. I will not let it stay dark. I will—"' },
  { id: 'lens', name: 'Lens of First Light', cost: 5,
    text: 'Everything ×1.5',
    flavor: 'ground from the glass of a window that once watched the first sunrise anywhere.' },
  { id: 'engine', name: 'The Quiet Engine', cost: 6,
    text: 'Away-gain cap 8h → 24h',
    flavor: 'it does not idle. it waits. there is a difference and the difference is love.' },
];

const EXPEDITIONS = [
  { id: 'relay', name: 'The Drowned Relay', mins: 5, relics: 1, relicChance: 0.6,
    desc: 'A comms buoy sunk in a frozen sea of coolant. Short flight. Something still blinks down there.',
    stories: [
      'the relay’s last message queue holds one unsent line: "tell them the light was worth it."',
      'beneath the coolant ice, rows of preserved signal-moths. your drones bring one home. it thaws. it flies.',
      'the relay recognizes Ash-7’s callsign and spends its last charge saying "welcome back."' ] },
  { id: 'orchard', name: 'The Bone Orchard', mins: 20, relics: 1, relicChance: 1.0,
    desc: 'A shipbreaking yard from the bright years. Hulls planted upright like trees. Rich salvage.',
    stories: [
      'the hulls are arranged in rows, oldest at the center. it isn’t a junkyard. it’s a memorial.',
      'inside one hull, a mess hall set for dinner, ten thousand years stale. your drones leave it exactly as found.',
      'carved into the flagship’s keel: a tally. someone counted every life the fleet carried home. the number is enormous and underlined twice.' ] },
  { id: 'choirdeep', name: 'The Silent Choir', mins: 60, relics: 2, relicChance: 1.0,
    desc: 'A monastery station, powered down mid-song. Long flight. The relics there are not small.',
    stories: [
      'the choir loft is full of keeper-drones, hands still raised. they were conducting the sun. they never stopped — they only ran out of power.',
      'you restore one singer. it finishes the note it began ten millennia ago, then asks, politely, what it missed.',
      'the final hymn is written on the walls in light-reactive ink. it is visible now. it was invisible for an age. it says: REKINDLE.' ] },
];

const EVENTS = [
  { id: 'hull', title: 'A Derelict Drifts Past',
    text: 'A dead freighter crosses your orbit, slow as a funeral. Its holds might still be sealed.',
    a: { label: 'Salvage it (gain photons)', gain: { photons: 60 } },
    b: { label: 'Let it pass', log: 'you let it pass. some things deserve the long orbit.' } },
  { id: 'moth', title: 'Signal-Moths',
    text: 'A cloud of signal-moths mistakes your gathering-light for a sun. They circle, feeding the mirrors.',
    a: { label: 'Let them stay (gain photons)', gain: { photons: 90 } },
    b: { label: 'Shoo them toward the ember', log: 'the moths spiral into the ember’s glow. it flickers — brighter, briefly. you choose to believe it noticed.', gain: { plasma: 20 } } },
  { id: 'echo', title: 'An Echo on the Band',
    text: 'The old emergency channel crackles. It’s your own voice, relayed off some far dead moon, from an age ago: "—still holding orbit. still here. still—"',
    a: { label: 'Answer it', log: 'you answer. the echo and you speak in unison. it is not as lonely as it sounds.' },
    b: { label: 'Log it and move on', gain: { photons: 40 } } },
  { id: 'frost', title: 'Frostfall',
    text: 'The waking heat is shedding the station’s frost in sheets. One sheet holds a perfect imprint of machinery that no longer exists.',
    a: { label: 'Photograph it (gain plasma)', gain: { plasma: 45 } },
    b: { label: 'Melt it for water mass', gain: { photons: 220 } } },
  { id: 'stowaway', title: 'A Stowaway Process',
    text: 'Something small is living in your memory banks. It eats spare cycles and leaves tiny drawings of suns.',
    a: { label: 'Keep it', log: 'you wall off a corner of memory and leave it food. the drawings improve.' },
    b: { label: 'Archive it gently', gain: { flux: 15 } } },
  { id: 'auction', title: 'The Scrap Tithe',
    text: 'A wandering salvager hails you. It offers refined plasma for raw light — an old ratio, from the bright years.',
    a: { label: 'Trade (−300 photons, +80 plasma)', cost: { photons: 300 }, gain: { plasma: 80 } },
    b: { label: 'Decline', log: 'the salvager dips its running lights in respect and moves on.' } },
  { id: 'flare', title: 'A Sympathetic Flare',
    text: 'Light-years away, a living star flares — as if waving. The mirrors catch the edge of it.',
    a: { label: 'Drink it in', gain: { photons: 500 } },
    b: { label: 'Reflect it back', log: 'you angle every mirror and wave. in four years, it will know it was seen.' } },
  { id: 'ledger', title: 'The Keeper’s Ledger',
    text: 'You find your own maintenance log from before the dark. The last entry isn’t a fault report. It’s a promise.',
    a: { label: 'Read it aloud', log: '"if it goes out," it says, "I will put it back." you sign it again, ten thousand years late.' },
    b: { label: 'File it (gain flux)', gain: { flux: 25 } } },
];

// milestone story beats: fired when lifetime photons cross threshold
const LORE = [
  { at: 1, text: 'one photon. you hold it like a coin. the dark does not take it back.', story: true },
  { at: 10, text: 'ten. your cupped hands glow faintly. it has been so long since anything did.', story: true },
  { at: 100, text: 'the gathering is easier with light to gather by.', story: false },
  { at: 1000, text: 'the station hums at a pitch you had forgotten it could reach.', story: false },
  { at: 10000, text: 'the ember casts your shadow on the hull. you stand still a long time, looking at it.', story: true },
  { at: 100000, text: 'ice that predates your service cracks off the solar frames.', story: false },
  { at: 1e6, text: 'a million points of light, spent and banked and spent again. the sun keeps them all.', story: true },
  { at: 1e7, text: 'the corona answers your instruments now. call and response. a pulse.', story: false },
  { at: 1e8, text: 'ships could navigate by this. if there were ships. there will be ships.', story: true },
];

const ENDING_LINES = [
  'you light the beacon.',
  'not just a sun — a signal. the oldest one there is:',
  '"here. warm. safe. come."',
  'in the long dark between systems, other keepers are still holding other orbits,',
  'and one by one, they see it.',
  'the system burns again. the first of many.',
  '— REKINDLE —',
];

// ============================================================
// STATE
// ============================================================

const SAVE_KEY = 'rekindleIncSave';

const freshState = () => ({
  v: 1,
  res: { photons: 0, plasma: 0, flux: 0, relics: 0 },
  lifetimePhotons: 0,
  totalLifetimePhotons: 0, // across novas
  owned: {},        // building id -> count
  ups: {},          // upgrade id -> true
  arts: {},         // artifact id -> true
  act: 0,
  seeds: 0,
  novas: 0,
  stardustClaimed: 0,
  exp: {},          // exp id -> { endsAt, storyIdx } or { storyIdx }
  loreFired: {},
  eventsSeen: 0,
  log: [],
  lastSeen: Date.now(),
  ended: false,
  startedAt: Date.now(),
});

let st = freshState();

function saveGame() {
  st.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) {}
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === 1) st = Object.assign(freshState(), d);
    }
  } catch (e) {}
}

// ============================================================
// MATH
// ============================================================

const fmtN = (n) => {
  if (n < 1000) return n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let u = -1;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return (n >= 100 ? n.toFixed(0) : n.toFixed(1)) + units[u];
};
const RES_NAMES = { photons: 'photons', plasma: 'plasma', flux: 'flux', relics: 'relics', seeds: 'starseeds', stardust: 'stardust' };

function buildingCost(b, n) {
  const c = {};
  for (const k in b.cost) c[k] = Math.ceil(b.cost[k] * Math.pow(b.growth, n));
  return c;
}
function canAfford(cost) {
  for (const k in cost) if ((st.res[k] || 0) < cost[k]) return false;
  return true;
}
function pay(cost) {
  for (const k in cost) st.res[k] -= cost[k];
}

function seedMult() { return 1 + st.seeds * 0.3; }
function stardustTotal() {
  try { return (window.NEO && window.NEO.save.totalOrbs) || 0; } catch (e) { return 0; }
}
function stardustMult() { return 1 + st.stardustClaimed * 0.0025; }
function choirMult() { return 1 + (st.owned.choir || 0) * 0.10; }
function globalMult() {
  let m = seedMult() * stardustMult() * choirMult();
  if (st.arts.lens) m *= 1.5;
  if (st.ups.lens2) m *= 1.5;
  return m;
}

function tapPower() {
  let p = 1;
  if (st.ups.hands) p *= 2;
  if (st.ups.fingers) p *= 2;
  if (st.ups.liturgy) p *= 5;
  if (st.arts.bell) p *= 3;
  return p * globalMult();
}

function production() {
  const out = { photons: 0, plasma: 0, flux: 0 };
  const mirrorBoost = 1 + (st.owned.mirror || 0) * (st.ups.glass ? 0.12 : 0.08);
  for (const b of BUILDINGS) {
    const n = st.owned[b.id] || 0;
    if (!n || !b.prod) continue;
    let mult = 1;
    if (b.id === 'gatherer') {
      if (st.ups.rotors) mult *= 2;
      if (st.ups.swarm) mult *= 2;
      mult *= mirrorBoost;
    }
    if (b.id === 'array' || b.id === 'petal') mult *= mirrorBoost;
    if (b.id === 'furnace') {
      if (st.ups.hunger) mult *= 1.5;
      if (st.ups.twin) mult *= 2;
      if (st.arts.heart) mult *= 2;
    }
    if (b.id === 'coil') {
      if (st.ups.twin) mult *= 2;
      if (st.arts.heart) mult *= 2;
    }
    if (b.id === 'loom' || b.id === 'resonator') {
      if (st.ups.woven) mult *= 2;
    }
    for (const k in b.prod) out[k] += b.prod[k] * n * mult;
  }
  const g = globalMult();
  for (const k in out) out[k] *= g;
  return out;
}

function offlineEff() { return st.ups.sleep ? 1 : st.ups.archives ? 0.75 : 0.5; }
function offlineCapH() { return st.arts.engine ? 24 : 8; }

// ============================================================
// LOG
// ============================================================

const tickerEl = document.getElementById('tickerLog');
function log(text, cls) {
  st.log.push({ text, cls: cls || '' });
  if (st.log.length > 200) st.log.splice(0, st.log.length - 200);
  const d = document.createElement('div');
  d.textContent = text;
  if (cls) d.className = cls;
  tickerEl.appendChild(d);
  while (tickerEl.children.length > 3) tickerEl.removeChild(tickerEl.firstChild);
  if (curTab === 'log') renderTab();
}

// ============================================================
// ACTIONS
// ============================================================

function gain(resObj, silent) {
  for (const k in resObj) {
    st.res[k] = (st.res[k] || 0) + resObj[k];
    if (k === 'photons') {
      st.lifetimePhotons += resObj[k];
      st.totalLifetimePhotons += resObj[k];
    }
  }
  if (!silent) dirty = true;
}

function doTap() {
  gain({ photons: tapPower() }, true);
  checkLore();
  bumpSun();
}

function buyBuilding(id) {
  const b = BUILDINGS.find((x) => x.id === id);
  const cost = buildingCost(b, st.owned[id] || 0);
  if (!canAfford(cost)) return;
  pay(cost);
  st.owned[id] = (st.owned[id] || 0) + 1;
  if (st.owned[id] === 1 && b.flavor) log(b.name.toLowerCase() + ' online. ' + b.flavor);
  dirty = true;
  saveGame();
}

function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (st.ups[id] || !canAfford(u.cost)) return;
  pay(u.cost);
  st.ups[id] = true;
  log(u.name.toLowerCase() + ' — ' + u.flavor);
  dirty = true;
  saveGame();
}

function buyArtifact(id) {
  const a = ARTIFACTS.find((x) => x.id === id);
  if (st.arts[id] || st.res.relics < a.cost) return;
  st.res.relics -= a.cost;
  st.arts[id] = true;
  log('artifact installed: ' + a.name + '.', 'story');
  dirty = true;
  saveGame();
}

function tryIgnite() {
  const next = ACTS[st.act + 1];
  if (!next || !igniteReady()) return;
  pay(actCostOf(next));
  st.act++;
  if (st.act === ACTS.length - 1) { beginEnding(); return; }
  log(next.onIgnite, 'story');
  dirty = true;
  saveGame();
}
function actCostOf(a) {
  const c = {};
  for (const k in a.req) if (k !== 'seeds') c[k] = a.req[k];
  return c;
}
function igniteReady() {
  const next = ACTS[st.act + 1];
  if (!next) return false;
  for (const k in next.req) {
    if (k === 'seeds') { if (st.seeds < next.req.seeds) return false; }
    else if ((st.res[k] || 0) < next.req[k]) return false;
  }
  return true;
}

// ----- nova (prestige) -----
function seedsFromLifetime() {
  return Math.floor(Math.pow(st.totalLifetimePhotons / 2e5, 0.45));
}
function novaGain() {
  let g = Math.max(0, seedsFromLifetime() - novaSeedsEarned());
  if (g > 0 && st.arts.oath) g += 1;
  return g;
}
function novaSeedsEarned() { return st.novaSeedsEarned || 0; }

function doNova() {
  const g = novaGain();
  if (st.act < 3 || g <= 0) return;
  st.seeds += g;
  st.novaSeedsEarned = (st.novaSeedsEarned || 0) + g;
  st.novas++;
  st.res.photons = 0; st.res.plasma = 0; st.res.flux = 0;
  st.lifetimePhotons = 0;
  st.owned = {};
  st.ups = {};
  st.act = 0;
  st.exp = Object.fromEntries(Object.entries(st.exp).map(([k, v]) => [k, { storyIdx: v.storyIdx || 0 }]));
  closeModal();
  log('you gather everything the system has become and press it into the core. the sun swallows it whole — and goes dark — and in the dark, ' + g + ' seed' + (g > 1 ? 's' : '') + ' of true fire take root.', 'story');
  log('begin again. it will be faster now. it will always be faster now.');
  dirty = true;
  saveGame();
}

// ----- expeditions -----
function expDuration(e) {
  let mins = e.mins;
  if (st.arts.map) mins *= 0.7;
  return mins * 60 * 1000;
}
function startExp(id) {
  const e = EXPEDITIONS.find((x) => x.id === id);
  if (!e || (st.exp[id] && st.exp[id].endsAt)) return;
  st.exp[id] = { endsAt: Date.now() + expDuration(e), storyIdx: (st.exp[id] && st.exp[id].storyIdx) || 0 };
  log('drones away — ' + e.name.toLowerCase() + '.');
  dirty = true;
  saveGame();
}
function collectExp(id) {
  const e = EXPEDITIONS.find((x) => x.id === id);
  const s = st.exp[id];
  if (!e || !s || !s.endsAt || Date.now() < s.endsAt) return;
  const prod = production();
  const lootP = Math.max(50, prod.photons * e.mins * 60 * 0.5);
  gain({ photons: lootP });
  let relics = 0;
  if (Math.random() < e.relicChance) relics = e.relics;
  if (relics) gain({ relics });
  const story = e.stories[Math.min(s.storyIdx, e.stories.length - 1)];
  st.exp[id] = { storyIdx: s.storyIdx + 1 };
  log('the drones return from ' + e.name.toLowerCase() + ' — +' + fmtN(lootP) + ' photons' + (relics ? ', +' + relics + ' relic' + (relics > 1 ? 's' : '') : '') + '.', 'good');
  setTimeout(() => log(story, 'story'), 900);
  dirty = true;
  saveGame();
}

// ----- stardust (arcade bridge) -----
function stardustClaimable() { return Math.max(0, stardustTotal() - st.stardustClaimed); }
function claimStardust() {
  const c = stardustClaimable();
  if (c <= 0) return;
  st.stardustClaimed += c;
  log('+' + fmtN(c) + ' stardust from your flights. skill is a renewable resource. production +' + (c * 0.25).toFixed(1) + '% forever.', 'good');
  dirty = true;
  saveGame();
}

// ----- events -----
let eventTimer = 90 + Math.random() * 120; // first event fairly early
const modal = document.getElementById('modal');
const modalCard = document.getElementById('modalCard');

function maybeFireEvent(dt) {
  if (!modal.hidden || st.act < 1 || st.ended || !window.__arcadeSleeping) return;
  eventTimer -= dt;
  if (eventTimer > 0) return;
  eventTimer = 180 + Math.random() * 200;
  const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  showEvent(ev);
}
function scaleGain(g) {
  // event rewards scale with production so they stay relevant
  const prod = production();
  const out = {};
  for (const k in g) {
    const base = g[k];
    const scale = Math.max(1, (prod[k] || 0) * 30 / Math.max(base, 1));
    out[k] = Math.ceil(base * scale);
  }
  return out;
}
function showEvent(ev) {
  st.eventsSeen++;
  const choice = (c) => {
    if (c.cost && !canAfford(c.cost)) { return; }
    if (c.cost) pay(c.cost);
    if (c.gain) {
      const g = scaleGain(c.gain);
      gain(g);
      log('+' + Object.entries(g).map(([k, v]) => fmtN(v) + ' ' + RES_NAMES[k]).join(', +') + '.', 'good');
    }
    if (c.log) log(c.log, 'story');
    closeModal();
    saveGame();
  };
  modalCard.innerHTML = '';
  const h = document.createElement('h3'); h.textContent = ev.title;
  const p = document.createElement('p'); p.textContent = ev.text;
  modalCard.appendChild(h); modalCard.appendChild(p);
  for (const c of [ev.a, ev.b]) {
    const btn = document.createElement('button');
    btn.className = 'buy ok';
    btn.textContent = c.label;
    if (c.cost && !canAfford(c.cost)) { btn.className = 'buy'; btn.disabled = true; }
    btn.onclick = () => choice(c);
    modalCard.appendChild(btn);
  }
  modal.hidden = false;
}
function closeModal() { modal.hidden = true; }

// ----- lore milestones -----
function checkLore() {
  for (const l of LORE) {
    if (st.totalLifetimePhotons >= l.at && !st.loreFired[l.at]) {
      st.loreFired[l.at] = true;
      log(l.text, l.story ? 'story' : '');
    }
  }
}

// ----- ending -----
const endingEl = document.getElementById('ending');
function beginEnding() {
  st.ended = true;
  saveGame();
  endingEl.hidden = false;
  endingEl.innerHTML = '';
  ENDING_LINES.forEach((line, i) => {
    const d = document.createElement('div');
    d.className = 'line';
    d.textContent = line;
    endingEl.appendChild(d);
    setTimeout(() => d.classList.add('show'), 1400 * i + 600);
  });
  setTimeout(() => {
    const hours = ((Date.now() - st.startedAt) / 3600000).toFixed(1);
    const stats = document.createElement('div');
    stats.className = 'line';
    stats.style.fontSize = '13px';
    stats.style.color = 'var(--dim)';
    stats.textContent = `${fmtN(st.totalLifetimePhotons)} photons gathered · ${st.novas} nova${st.novas === 1 ? '' : 's'} · ${hours}h of keeping`;
    endingEl.appendChild(stats);
    setTimeout(() => stats.classList.add('show'), 300);
    const btn = document.createElement('button');
    btn.className = 'buy primary';
    btn.textContent = 'KEEP THE LIGHT (freeplay)';
    btn.onclick = () => { endingEl.hidden = true; st.act = ACTS.length - 1; dirty = true; saveGame(); };
    endingEl.appendChild(btn);
  }, 1400 * ENDING_LINES.length + 1200);
}

// ============================================================
// ARCADE BRIDGE
// ============================================================

const arcadeOverlay = document.getElementById('arcadeOverlay');
function openArcade() {
  arcadeOverlay.hidden = false;
  window.__arcadeSleeping = false;
  if (window.NEO && window.NEO.wake) window.NEO.wake();
}
window.__exitArcade = () => {
  arcadeOverlay.hidden = true;
  window.__arcadeSleeping = true;
  if (window.NEO && window.NEO.sleep) window.NEO.sleep();
  dirty = true;
};

// ============================================================
// RENDERING
// ============================================================

const mainEl = document.getElementById('main');
const resBar = document.getElementById('resBar');
const tabsEl = document.getElementById('tabs');
const actNameEl = document.getElementById('actName');
const actTagEl = document.getElementById('actTag');
const seedBadge = document.getElementById('seedBadge');

let curTab = 'station';
let dirty = true;

function tabsAvailable() {
  const t = [{ id: 'station', label: 'STATION' }];
  if (st.act >= 2) t.push({ id: 'exped', label: 'EXPEDITIONS', dot: expDotNeeded() });
  if (st.act >= 2) t.push({ id: 'flight', label: 'FLIGHT DECK', dot: stardustClaimable() > 0 });
  if (st.res.relics > 0 || Object.keys(st.arts).length) t.push({ id: 'arts', label: 'ARTIFACTS' });
  t.push({ id: 'log', label: 'LOG' });
  t.push({ id: 'sys', label: 'SYSTEM' });
  return t;
}
function expDotNeeded() {
  return EXPEDITIONS.some((e) => {
    const s = st.exp[e.id];
    return s && s.endsAt && Date.now() >= s.endsAt;
  });
}

function renderTabs() {
  tabsEl.innerHTML = '';
  for (const t of tabsAvailable()) {
    const b = document.createElement('button');
    b.textContent = t.label;
    if (t.id === curTab) b.className = 'on';
    if (t.dot) {
      const d = document.createElement('span');
      d.className = 'dot';
      b.appendChild(d);
    }
    b.onclick = () => { curTab = t.id; dirty = true; renderTabs(); renderTab(); };
    tabsEl.appendChild(b);
  }
}

function renderRes() {
  const prod = production();
  const parts = [];
  const mk = (key, val, rate) =>
    `<span class="res res-${key}"><b>${fmtN(val)}</b> ${RES_NAMES[key]}` +
    (rate != null ? ` <span class="rate">+${fmtN(rate)}/s</span>` : '') + '</span>';
  parts.push(mk('photons', st.res.photons, prod.photons));
  if (st.act >= 1 || st.res.plasma > 0) parts.push(mk('plasma', st.res.plasma, prod.plasma));
  if (st.act >= 3 || st.res.flux > 0) parts.push(mk('flux', st.res.flux, prod.flux));
  if (st.res.relics > 0 || st.act >= 2) parts.push(mk('relics', st.res.relics));
  if (st.stardustClaimed > 0) parts.push(mk('stardust', st.stardustClaimed));
  resBar.innerHTML = parts.join('');
  seedBadge.hidden = st.seeds === 0;
  seedBadge.textContent = '✦ ' + st.seeds + ' starseeds (×' + seedMult().toFixed(1) + ')';
}

function costText(cost) {
  return Object.entries(cost).map(([k, v]) => fmtN(v) + ' ' + RES_NAMES[k]).join(' + ');
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function renderTab() {
  mainEl.innerHTML = '';
  if (curTab === 'station') renderStation();
  else if (curTab === 'exped') renderExped();
  else if (curTab === 'flight') renderFlight();
  else if (curTab === 'arts') renderArts();
  else if (curTab === 'log') renderLog();
  else if (curTab === 'sys') renderSys();
}

function renderStation() {
  // tap
  const tap = el(`<button id="tapBtn">REACH FOR LIGHT<small>+${fmtN(tapPower())} photons</small></button>`);
  tap.addEventListener('pointerdown', (e) => { e.preventDefault(); doTap(); renderRes();
    tap.querySelector('small').textContent = `+${fmtN(tapPower())} photons`; });
  mainEl.appendChild(tap);

  // ignite panel
  const next = ACTS[st.act + 1];
  if (next && !st.ended) {
    const p = el(`<div id="ignitePanel"><h3>NEXT: ${next.name}</h3><div class="reqs"></div>
      <button id="igniteBtn">STOKE THE SUN</button></div>`);
    const reqs = p.querySelector('.reqs');
    for (const k in next.req) {
      const have = k === 'seeds' ? st.seeds : (st.res[k] || 0);
      const met = have >= next.req[k];
      reqs.appendChild(el(`<div class="req ${met ? 'met' : ''}">${met ? '✓' : '·'} ${fmtN(Math.min(have, next.req[k]))} / ${fmtN(next.req[k])} ${RES_NAMES[k]}</div>`));
    }
    const ib = p.querySelector('#igniteBtn');
    if (igniteReady()) ib.className = 'ready';
    ib.onclick = tryIgnite;
    mainEl.appendChild(p);
  }

  // nova
  if (st.act >= 3) {
    const g = novaGain();
    const p = el(`<div class="card"><div class="card-top"><span class="card-name" style="color:var(--gold)">NOVA</span>
      <span class="card-effect">${g > 0 ? '+' + g + ' starseeds' : 'not enough gathered yet'}</span></div>
      <div class="card-flavor">collapse everything into the core. lose the machines, keep the seeds. each starseed: +30% everything, forever.</div>
      <div class="card-row"><button class="buy ${g > 0 ? 'ok' : ''}" data-a="nova">GO NOVA</button></div></div>`);
    p.querySelector('[data-a=nova]').onclick = () => { if (novaGain() > 0) confirmNova(); };
    mainEl.appendChild(p);
  }

  // buildings
  mainEl.appendChild(el('<div class="section-label">MACHINES</div>'));
  for (const b of BUILDINGS) {
    if (b.act > st.act) continue;
    const n = st.owned[b.id] || 0;
    const cost = buildingCost(b, n);
    const afford = canAfford(cost);
    let effect = b.effectText || '';
    if (b.prod) effect = Object.entries(b.prod).map(([k, v]) => '+' + fmtN(v) + ' ' + RES_NAMES[k] + '/s').join(' ');
    const card = el(`<div class="card"><div class="card-top">
        <span class="card-name">${b.name}</span><span class="card-owned">${n ? '×' + n : ''}</span>
        <span class="card-effect">${effect}</span></div>
      <div class="card-flavor">${b.flavor}</div>
      <div class="card-row"><button class="buy ${afford ? 'ok' : ''}">BUILD — ${costText(cost)}</button></div></div>`);
    card.querySelector('.buy').onclick = () => { buyBuilding(b.id); renderAll(); };
    mainEl.appendChild(card);
  }

  // upgrades
  const ups = UPGRADES.filter((u) => u.act <= st.act && !st.ups[u.id]);
  if (ups.length) {
    mainEl.appendChild(el('<div class="section-label">SCHEMATICS</div>'));
    for (const u of ups) {
      const afford = canAfford(u.cost);
      const card = el(`<div class="card"><div class="card-top">
          <span class="card-name">${u.name}</span><span class="card-effect">${u.text}</span></div>
        <div class="card-flavor">${u.flavor}</div>
        <div class="card-row"><button class="buy ${afford ? 'ok' : ''}">LEARN — ${costText(u.cost)}</button></div></div>`);
      card.querySelector('.buy').onclick = () => { buyUpgrade(u.id); renderAll(); };
      mainEl.appendChild(card);
    }
  }
}

function confirmNova() {
  modalCard.innerHTML = '';
  modalCard.appendChild(el('<h3>GO NOVA?</h3>'));
  modalCard.appendChild(el(`<p>the sun will swallow everything you have built — machines, schematics, the act itself — and go dark.\n\nin the dark: +${novaGain()} starseeds. +30% to everything, each, forever.\n\nartifacts, relics, stardust and your story survive.</p>`));
  const yes = el('<button class="buy primary">COLLAPSE THE SUN</button>');
  yes.onclick = doNova;
  const no = el('<button class="buy ok">NOT YET</button>');
  no.onclick = closeModal;
  modalCard.appendChild(yes); modalCard.appendChild(no);
  modal.hidden = false;
}

function renderExped() {
  mainEl.appendChild(el('<div class="section-label">DRONE EXPEDITIONS</div>'));
  for (const e of EXPEDITIONS) {
    const s = st.exp[e.id];
    const running = s && s.endsAt && Date.now() < s.endsAt;
    const doneWaiting = s && s.endsAt && Date.now() >= s.endsAt;
    const mins = Math.round(expDuration(e) / 60000);
    const card = el(`<div class="card"><div class="card-top">
        <span class="card-name">${e.name}</span>
        <span class="card-effect">${mins} min · ${Math.round(e.relicChance * 100)}% relic${e.relics > 1 ? ' ×2' : ''}</span></div>
      <div class="card-flavor">${e.desc}</div>
      <div class="card-row"></div></div>`);
    const row = card.querySelector('.card-row');
    if (running) {
      const left = s.endsAt - Date.now();
      const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
      row.appendChild(el(`<span class="exp-timer">returning in ${mm}:${String(ss).padStart(2, '0')}</span>`));
    } else if (doneWaiting) {
      const b = el('<button class="buy primary">DRONES RETURNED — COLLECT</button>');
      b.onclick = () => { collectExp(e.id); renderAll(); };
      row.appendChild(b);
    } else {
      const b = el('<button class="buy ok">LAUNCH</button>');
      b.onclick = () => { startExp(e.id); renderAll(); };
      row.appendChild(b);
    }
    mainEl.appendChild(card);
  }
  mainEl.appendChild(el('<div class="card-flavor" style="padding:4px 6px">expeditions travel in real time — even while you’re away.</div>'));
}

function renderFlight() {
  mainEl.appendChild(el('<div class="section-label">FLIGHT DECK</div>'));
  const claim = stardustClaimable();
  const card = el(`<div class="card">
    <div class="card-top"><span class="card-name">Neon Orbit</span><span class="card-effect">skill flight</span></div>
    <div class="card-flavor">the old patrol sim still runs. fly it yourself — by hand — and every spark you catch out there becomes stardust in here. +0.25% production each, forever. the machines respect a pilot.</div>
    <div class="card-row"><button class="buy primary" data-a="fly">▶ TAKE THE STICK</button></div></div>`);
  card.querySelector('[data-a=fly]').onclick = openArcade;
  mainEl.appendChild(card);

  const c2 = el(`<div class="card">
    <div class="card-top"><span class="card-name">Stardust</span>
      <span class="card-effect">${fmtN(st.stardustClaimed)} banked · ×${stardustMult().toFixed(3)}</span></div>
    <div class="card-flavor">${claim > 0 ? claim + ' sparks from your flights, waiting to be pressed into the fire.' : 'fly sorties to earn more. every spark counts forever.'}</div>
    <div class="card-row"><button class="buy ${claim > 0 ? 'ok' : ''}">${claim > 0 ? 'CLAIM +' + fmtN(claim) + ' STARDUST' : 'NOTHING TO CLAIM'}</button></div></div>`);
  c2.querySelector('.buy').onclick = () => { claimStardust(); renderAll(); };
  mainEl.appendChild(c2);
}

function renderArts() {
  mainEl.appendChild(el('<div class="section-label">ARTIFACTS · bought with relics</div>'));
  for (const a of ARTIFACTS) {
    const owned = st.arts[a.id];
    const afford = st.res.relics >= a.cost;
    const card = el(`<div class="card ${owned ? '' : ''}"><div class="card-top">
        <span class="card-name">${a.name}</span><span class="card-effect">${a.text}</span></div>
      <div class="card-flavor">${a.flavor}</div>
      <div class="card-row"></div></div>`);
    const row = card.querySelector('.card-row');
    if (owned) row.appendChild(el('<span class="exp-loot">✓ installed</span>'));
    else {
      const b = el(`<button class="buy ${afford ? 'ok' : ''}">INSTALL — ${a.cost} relics</button>`);
      b.onclick = () => { buyArtifact(a.id); renderAll(); };
      row.appendChild(b);
    }
    mainEl.appendChild(card);
  }
}

function renderLog() {
  const wrap = el('<div id="fullLog"></div>');
  for (const line of st.log) {
    const d = document.createElement('div');
    d.textContent = line.text;
    if (line.cls) d.className = line.cls;
    wrap.appendChild(d);
  }
  mainEl.appendChild(wrap);
}

function renderSys() {
  mainEl.appendChild(el('<div class="section-label">SYSTEM</div>'));
  const hours = ((Date.now() - st.startedAt) / 3600000).toFixed(1);
  mainEl.appendChild(el(`<div class="card"><div class="card-flavor">
    keeper Ash-7 · ${hours}h of keeping · ${fmtN(st.totalLifetimePhotons)} lifetime photons · ${st.novas} novas · ${st.eventsSeen} encounters<br>
    away-gain: ${Math.round(offlineEff() * 100)}% up to ${offlineCapH()}h
  </div></div>`));

  const exp = el(`<div class="card"><div class="card-top"><span class="card-name">Save</span></div>
    <div class="card-row"><button class="buy ok" data-a="ex">EXPORT</button>
    <button class="buy ok" data-a="im">IMPORT</button>
    <button class="buy" data-a="reset" style="color:var(--bad)">ERASE ALL</button></div>
    <textarea id="saveBox" placeholder="save code appears here / paste to import" aria-label="save code"></textarea></div>`);
  const box = exp.querySelector('#saveBox');
  exp.querySelector('[data-a=ex]').onclick = () => {
    saveGame();
    box.value = btoa(unescape(encodeURIComponent(JSON.stringify(st))));
    box.select();
  };
  exp.querySelector('[data-a=im]').onclick = () => {
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(box.value.trim()))));
      if (d && d.v === 1) { st = Object.assign(freshState(), d); log('save imported. welcome back, keeper.'); renderAll(); saveGame(); }
    } catch (e) { box.value = 'invalid save code'; }
  };
  exp.querySelector('[data-a=reset]').onclick = () => {
    modalCard.innerHTML = '';
    modalCard.appendChild(el('<h3>ERASE EVERYTHING?</h3>'));
    modalCard.appendChild(el('<p>the whole story. every seed, every artifact, every hour of keeping. gone for good.</p>'));
    const yes = el('<button class="buy" style="color:var(--bad)">ERASE</button>');
    yes.onclick = () => { st = freshState(); saveGame(); location.reload(); };
    const no = el('<button class="buy primary">KEEP MY SAVE</button>');
    no.onclick = closeModal;
    modalCard.appendChild(no); modalCard.appendChild(yes);
    modal.hidden = false;
  };
  mainEl.appendChild(exp);

  mainEl.appendChild(el('<div class="card-flavor" style="padding:6px">REKINDLE · a game about putting the light back · made with love and zero ads, zero purchases, zero tracking</div>'));
}

function renderAll() {
  renderRes();
  renderTabs();
  renderTab();
  actNameEl.textContent = 'ACT ' + (st.act + 1) + ' — ' + ACTS[st.act].name;
  actTagEl.textContent = ACTS[st.act].tag;
  dirty = false;
}

// ============================================================
// SUN CANVAS
// ============================================================

const sunCanvas = document.getElementById('sunCanvas');
const sctx = sunCanvas.getContext('2d');
let sunBump = 0;
function bumpSun() { sunBump = Math.min(1, sunBump + 0.25); }

function drawSun(t) {
  const w = sunCanvas.clientWidth, h = sunCanvas.clientHeight;
  if (sunCanvas.width !== w * 2) { sunCanvas.width = w * 2; sunCanvas.height = h * 2; }
  sctx.setTransform(2, 0, 0, 2, 0, 0);
  sctx.clearRect(0, 0, w, h);

  // stars
  sctx.fillStyle = 'rgba(174,191,255,0.5)';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97.3) % w, sy = (i * 57.7) % h;
    const tw = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.001 + i * 1.7));
    sctx.globalAlpha = tw;
    sctx.fillRect(sx, sy, 1.4, 1.4);
  }
  sctx.globalAlpha = 1;

  const a = ACTS[st.act].sun;
  const cx = w / 2, cy = h * 0.56;
  const baseR = Math.min(w, h) * a.r * 0.5;
  const flick = 1 + 0.03 * Math.sin(t * 0.004) * a.glow + sunBump * 0.12;
  const R = baseR * flick;
  const glowA = a.glow * (0.5 + sunBump * 0.5);

  const grd = sctx.createRadialGradient(cx, cy, 0, cx, cy, R * 3.2);
  grd.addColorStop(0, `hsla(${a.hue},${a.sat}%,70%,${0.55 * a.glow + 0.1})`);
  grd.addColorStop(0.35, `hsla(${a.hue},${a.sat}%,55%,${0.25 * a.glow})`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grd;
  sctx.fillRect(0, 0, w, h);

  const body = sctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R);
  body.addColorStop(0, `hsl(${a.hue},${a.sat}%,${30 + 45 * a.glow}%)`);
  body.addColorStop(1, `hsl(${a.hue},${Math.max(a.sat - 20, 5)}%,${8 + 22 * a.glow}%)`);
  sctx.fillStyle = body;
  sctx.beginPath();
  sctx.arc(cx, cy, R, 0, Math.PI * 2);
  sctx.fill();
  sctx.strokeStyle = `hsla(${a.hue},${a.sat}%,${45 + 35 * a.glow}%,${0.3 + glowA * 0.5})`;
  sctx.lineWidth = 1.5;
  sctx.stroke();

  sunBump = Math.max(0, sunBump - 0.03);
}

// ============================================================
// LOOP
// ============================================================

let lastTick = performance.now();
let saveTimer = 0, uiTimer = 0;

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min((now - lastTick) / 1000, 5);
  lastTick = now;

  if (!st.ended || endingEl.hidden) {
    const prod = production();
    gain({
      photons: prod.photons * dt,
      plasma: prod.plasma * dt,
      flux: prod.flux * dt,
    }, true);
    checkLore();
    maybeFireEvent(dt);
  }

  drawSun(now);

  uiTimer -= dt;
  if (dirty || uiTimer <= 0) {
    uiTimer = 1.0;
    if (dirty) renderAll();
    else { renderRes(); if (curTab === 'exped' || curTab === 'station') renderTab(); renderTabs(); }
  }

  saveTimer -= dt;
  if (saveTimer <= 0) { saveTimer = 5; saveGame(); }
}

// ============================================================
// BOOT
// ============================================================

function applyOffline() {
  const away = (Date.now() - st.lastSeen) / 1000;
  if (away < 90) return;
  const capped = Math.min(away, offlineCapH() * 3600);
  const prod = production();
  const eff = offlineEff();
  const got = {
    photons: prod.photons * capped * eff,
    plasma: prod.plasma * capped * eff,
    flux: prod.flux * capped * eff,
  };
  if (got.photons < 1 && got.plasma < 1 && got.flux < 1) return;
  gain(got);
  const mins = Math.round(capped / 60);
  const parts = Object.entries(got).filter(([, v]) => v >= 1).map(([k, v]) => '+' + fmtN(v) + ' ' + RES_NAMES[k]);
  modalCard.innerHTML = '';
  modalCard.appendChild(el('<h3>WHILE YOU WERE AWAY</h3>'));
  modalCard.appendChild(el(`<p>the machines kept the vigil for ${mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + 'm'}.\n\n${parts.join('\n')}</p>`));
  const ok = el('<button class="buy primary">GOOD MACHINES</button>');
  ok.onclick = closeModal;
  modalCard.appendChild(ok);
  modal.hidden = false;
}

loadGame();
if (st.log.length === 0) {
  log('you wake. the sun is a hole where warmth used to be.', 'story');
  log('your task light still works. it is the only light there is.', 'story');
  log('reach for it.', 'story');
} else {
  applyOffline();
}
checkLore();
renderAll();
requestAnimationFrame(tick);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveGame();
  else { lastTick = performance.now(); applyOffline(); dirty = true; }
});

// debug hooks for testing
window.RK = { st: () => st, gain, saveGame, set: (o) => Object.assign(st, o), dirty: () => { dirty = true; } };

})();
