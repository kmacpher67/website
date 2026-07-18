// V1 throwaway prototype — Scavenger Phase plus first fishing pass.
// Scope: grid-based bank exploration, stationary FPV casting, and the
// skill-vs-luck reeling loop.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const GRID_W = 50;
const GRID_H = 50;
const REF_CELL_W = 16; // reference cell size at the original 800x600 design resolution
const REF_CELL_H = 12;

// W/H are the canvas's CSS-pixel size; they change on resize instead of being
// fixed at 800x600, which is what lets the world fill any viewport.
let W = window.innerWidth;
let H = window.innerHeight;
let CELL_W = W / GRID_W;
let CELL_H = H / GRID_H;
let DPR = 1;
let propScale = 1;
let mobileMode = false;

const toPxX = x => x * CELL_W;
const toPxY = y => y * CELL_H;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const ellipseTest = (x, y, shape, pad = 0) => {
  const dx = (x - shape.x) / (shape.rx + pad);
  const dy = (y - shape.y) / (shape.ry + pad);
  return dx * dx + dy * dy;
};
const XP_FOR_LEVEL_CAP = 30;
const XP_FOR_SKILL_FACTOR = XP_FOR_LEVEL_CAP * 3;
const LUCK_MIN = -100;
const LUCK_MAX = 100;
const GEAR_MODIFIER = -30;
const DREAM_BASS_RESISTANCE = 180;
const LEGENDARY_BASS_NAME = 'Old Ironjaw';
const BLUEGILL_BASE_XP = 1;
const BLUEGILL_SPEED_XP_MAX = 4;
const BLUEGILL_SMALL_CASH = 0.25;
const BLUEGILL_PRICE_PER_POUND_MIN = 2;
const BLUEGILL_PRICE_PER_POUND_MAX = 4;
const TAB_FALLBACK_X = 43.8;
const TAB_FALLBACK_Y = 29.0;
const TAB_MIN_NODE_SPACING = 3.5;
const TAB_RELOCATE_ATTEMPTS = 40;
const TAB_BANK_MARGIN = 3;
const GEAR_UPGRADE_BONUS = 20;
const UPGRADE_COST = 40;
const BENCH_INTERACT_RANGE = 3.2;
const SAVE_KEY = 'fishing-save-v1';
const formatSigned = value => `${value >= 0 ? '+' : ''}${Math.round(value)}`;
const formatMoney = value => `$${value.toFixed(2)}`;
const formatWeight = value => `${value.toFixed(value < 1 ? 2 : 1)} lb`;
const getLevel = xp => Math.floor(xp / XP_FOR_LEVEL_CAP) + 1;
const xpIntoLevel = xp => xp % XP_FOR_LEVEL_CAP;
const formatXpProgress = value => `${xpIntoLevel(value)} / ${XP_FOR_LEVEL_CAP}`;
const currentLevel = () => getLevel(game.skillXp);
const currentLevelProgress = () => xpIntoLevel(game.skillXp) / XP_FOR_LEVEL_CAP;

// --- Responsive canvas shell ---
// Cap DPR so low-end phones don't choke on an oversized backing buffer.
const MAX_DPR = 2;
// This is a fallback for phone-width windows on non-touch-reporting devices
// (e.g. devtools device emulation). It intentionally stays low: laptop
// browser viewports routinely dip under 720px tall once tabs/address bar/
// bookmarks bar are subtracted from a common 1366x768 screen, which used to
// misfire mobile mode (oversized HUD fonts/meters) on ordinary laptops.
const MOBILE_BREAKPOINT = 480;
const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function resizeCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, MAX_DPR);

  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  CELL_W = W / GRID_W;
  CELL_H = H / GRID_H;

  // Uniform-ish scale for decorative world props (tree, bench, ripples...) so
  // they don't look broken at aspect ratios far from the original 800x600
  // design, while sprite/HUD sizing below still tracks CELL_W/CELL_H directly.
  propScale = clamp(Math.min(CELL_W / REF_CELL_W, CELL_H / REF_CELL_H), 0.45, 2.4);

  mobileMode = hasTouch || Math.min(W, H) < MOBILE_BREAKPOINT;

  const touchUI = document.getElementById('touch-controls');
  if (touchUI) touchUI.classList.toggle('hidden', !hasTouch);
}

addEventListener('resize', resizeCanvas);
addEventListener('orientationchange', resizeCanvas);
resizeCanvas();

// --- Sprite art ---
// Each source jpeg is a crop from game-images/sprite-sheet-v1.jpeg that still
// carries whitespace and a baked-in text label below the art; `crop` is the
// tight bounding box of the art itself (measured once offline) so the label
// never bleeds into the game view.
const SPRITE_DEFS = {
  player: { src: 'images/wanderer.jpeg', crop: { x: 19, y: 119, w: 226, h: 269 } },
  stick: { src: 'images/driftwood.jpeg', crop: { x: 70, y: 55, w: 149, h: 421 } },
  line: { src: 'images/river-thread.jpeg', crop: { x: 2, y: 134, w: 253, h: 262 } },
  tab: { src: 'images/rusted-relic.jpeg', crop: { x: 58, y: 145, w: 140, h: 251 } },
};

const spriteImages = {};

function loadSprites() {
  for (const key of Object.keys(SPRITE_DEFS)) {
    const img = new Image();
    img.onload = () => { spriteImages[key] = img; };
    img.onerror = () => { spriteImages[key] = null; };
    img.src = SPRITE_DEFS[key].src;
    spriteImages[key] = undefined; // pending
  }
}
loadSprites();

// V9: upgraded gear art shown in the inventory strip once
// `game.gearUpgradeBought` is true, replacing the scavenged stick/line/tab
// look with the V8 gear-card reference art. The source PNGs are full cards
// (title band + icon + caption band); `crop` here isolates just the icon
// band (measured offline as a percentage of each card's height) so a tiny
// inventory slot doesn't try to cram an entire card into itself. There is
// no upgraded counterpart for a 4th "lure" slot — only 3 scavenged items
// exist, so only rod/line/hook are used.
const GEAR_CARD_DEFS = {
  stick: { src: 'images/v8-assets/gear-rod-card-reference.png' },
  line: { src: 'images/v8-assets/gear-line-card-reference.png' },
  tab: { src: 'images/v8-assets/gear-hook-card-reference.png' },
};

const gearCardImages = {};

function loadGearCards() {
  for (const key of Object.keys(GEAR_CARD_DEFS)) {
    const img = new Image();
    img.onload = () => { gearCardImages[key] = img; };
    img.onerror = () => { gearCardImages[key] = null; };
    img.src = GEAR_CARD_DEFS[key].src;
    gearCardImages[key] = undefined; // pending
  }
}
loadGearCards();

function drawGearCardIcon(nodeId, x, y, w, h) {
  const img = gearCardImages[nodeId];
  if (!img || !img.complete || !img.naturalWidth) return false;

  const iconTop = img.naturalHeight * 0.24;
  const iconH = img.naturalHeight * 0.46;
  const aspect = img.naturalWidth / iconH;
  const drawH = h;
  const drawW = Math.min(w, drawH * aspect);
  const dx = x + (w - drawW) / 2;

  ctx.drawImage(img, 0, iconTop, img.naturalWidth, iconH, dx, y, drawW, drawH);
  return true;
}

function drawSprite(key, cx, cy, targetH, anchor) {
  const img = spriteImages[key];
  if (!img || !img.complete || !img.naturalWidth) return false;

  const crop = SPRITE_DEFS[key].crop;
  const aspect = crop.w / crop.h;
  const h = targetH;
  const w = h * aspect;
  const top = anchor === 'bottom' ? cy - h : cy - h / 2;

  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, cx - w / 2, top, w, h);
  return true;
}

// --- World layout ---
// Logical world size is 50x50 grid cells. The screen scales those cells to fit
// the 800x600 canvas while keeping the pond layout readable.
const pond = { x: 25, y: 25, rx: 14.1, ry: 12.9 };
const deep = { x: 25, y: 25, rx: 6.9, ry: 5.8 };
const tree = { x: 6.9, y: 7.9 };
const bench = { x: 43.1, y: 25.0 };

const player = {
  x: 9.2,
  y: 12.2,
  size: 1.35,
  speed: 0.18,
};

const nodes = [
  { id: 'stick', label: 'Sturdy Stick', x: 8.0, y: 12.3, color: '#8a5a2b', collected: false },
  { id: 'line', label: 'Tangled Line', x: 25.0, y: 42.7, color: '#cfd6dd', collected: false },
  { id: 'tab', label: 'Rusty Tab', x: 43.8, y: 29.0, color: '#b0653a', collected: false },
];

const PICKUP_RANGE = 2.8;
const NODE_RADIUS = 0.45;

const FISH_TYPES = {
  shallow: {
    name: 'Bluegill',
    resistance: 10,
    startDistance: 18,
    maxDistance: 34,
    safeZoneWidth: 0.24,
    value: 4,
  },
  deep: {
    name: LEGENDARY_BASS_NAME,
    resistance: DREAM_BASS_RESISTANCE,
    startDistance: 30,
    maxDistance: 48,
    safeZoneWidth: 0.12,
  },
};

const game = {
  state: 'scavenge',
  message: 'Wake up. Scavenge the bank. Build the rig.',
  messageUntil: performance.now() + 4200,
  messageLog: [],
  skillXp: 0,
  luck: 0,
  cash: 0,
  lastLuckDrainAt: 0,
  blockedSince: 0,
  rigReadyAnnounced: false,
  rigAssemblyAwarded: false,
  gearUpgradeBought: false,
  resultUntil: 0,
  resultMessage: '',
  fishing: null,
  dialog: null,
  achievementToast: null,
  achievementIds: {},
  firstShallowCastDialogShown: false,
  hasCaughtFish: false,
};

function captureSaveState() {
  return {
    version: 1,
    game: {
      skillXp: game.skillXp,
      luck: game.luck,
      cash: game.cash,
      rigReadyAnnounced: game.rigReadyAnnounced,
      rigAssemblyAwarded: game.rigAssemblyAwarded,
      gearUpgradeBought: game.gearUpgradeBought,
      firstShallowCastDialogShown: game.firstShallowCastDialogShown,
      hasCaughtFish: game.hasCaughtFish,
      achievementIds: { ...game.achievementIds },
    },
    player: { x: player.x, y: player.y },
    nodes: nodes.map(node => ({
      id: node.id,
      x: node.x,
      y: node.y,
      collected: node.collected,
    })),
  };
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(captureSaveState()));
    return true;
  } catch (err) {
    return false;
  }
}

function readNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.game !== 'object' || typeof parsed.player !== 'object' || !Array.isArray(parsed.nodes)) {
      return false;
    }

    const {
      skillXp, luck, cash,
      rigReadyAnnounced, rigAssemblyAwarded, gearUpgradeBought,
      firstShallowCastDialogShown, hasCaughtFish, achievementIds,
    } = parsed.game;
    const px = readNumber(parsed.player.x);
    const py = readNumber(parsed.player.y);
    if (px === null || py === null) return false;

    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    for (const savedNode of parsed.nodes) {
      if (!savedNode || typeof savedNode.id !== 'string') return false;
      const node = nodeMap.get(savedNode.id);
      if (!node) return false;
      const nx = readNumber(savedNode.x);
      const ny = readNumber(savedNode.y);
      if (nx === null || ny === null || typeof savedNode.collected !== 'boolean') return false;
    }
    if (parsed.nodes.length !== nodes.length) return false;

    if (
      !Number.isFinite(skillXp) ||
      !Number.isFinite(luck) ||
      !Number.isFinite(cash) ||
      typeof rigReadyAnnounced !== 'boolean' ||
      typeof rigAssemblyAwarded !== 'boolean' ||
      typeof gearUpgradeBought !== 'boolean' ||
      typeof firstShallowCastDialogShown !== 'boolean' ||
      typeof hasCaughtFish !== 'boolean' ||
      typeof achievementIds !== 'object' ||
      achievementIds === null ||
      Array.isArray(achievementIds)
    ) {
      return false;
    }

    game.skillXp = skillXp;
    game.luck = luck;
    game.cash = cash;
    game.rigReadyAnnounced = rigReadyAnnounced;
    game.rigAssemblyAwarded = rigAssemblyAwarded;
    game.gearUpgradeBought = gearUpgradeBought;
    game.firstShallowCastDialogShown = firstShallowCastDialogShown;
    game.hasCaughtFish = hasCaughtFish;
    game.achievementIds = { ...achievementIds };
    game.state = 'scavenge';
    game.fishing = null;
    game.dialog = null;
    game.achievementToast = null;
    game.resultMessage = '';
    game.resultUntil = 0;

    player.x = px;
    player.y = py;
    for (const savedNode of parsed.nodes) {
      const node = nodeMap.get(savedNode.id);
      node.x = savedNode.x;
      node.y = savedNode.y;
      node.collected = savedNode.collected;
    }
    return true;
  } catch (err) {
    return false;
  }
}

const loadedSave = loadGame();
if (!loadedSave) {
  relocateTab();
  randomizeSpawn();
}

const AudioCtor = window.AudioContext || window.webkitAudioContext;
const SFX = (() => {
  let ctx = null;
  let unlocked = false;
  let unlockPromise = null;

  function ensureContext() {
    if (!AudioCtor) return null;
    if (!ctx) ctx = new AudioCtor();
    return ctx;
  }

  function playTone({ type = 'sine', freq = 440, duration = 0.11, gain = 0.06, detune = 0, sweep = 0 }) {
    const audio = ensureContext();
    if (!audio || audio.state === 'closed') return;

    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (sweep) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), now + duration);
    }
    if (detune) osc.detune.setValueAtTime(detune, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  async function unlock() {
    const audio = ensureContext();
    if (!audio) return false;
    if (unlocked && audio.state === 'running') return true;
    if (unlockPromise) return unlockPromise;

    unlockPromise = (async () => {
      try {
        if (audio.state === 'suspended') {
          await audio.resume();
        }
        unlocked = audio.state === 'running';
        return unlocked;
      } catch (err) {
        unlocked = false;
        return false;
      } finally {
        unlockPromise = null;
      }
    })();

    return unlockPromise;
  }

  return {
    unlock,
    cast() {
      playTone({ type: 'triangle', freq: 260, duration: 0.09, gain: 0.05, sweep: 120 });
    },
    tick(onSafeZone) {
      playTone({
        type: onSafeZone ? 'sine' : 'square',
        freq: onSafeZone ? 820 : 240,
        duration: 0.04,
        gain: 0.02,
        sweep: onSafeZone ? 140 : -80,
      });
    },
    catch() {
      playTone({ type: 'sine', freq: 660, duration: 0.12, gain: 0.07, sweep: 220 });
      setTimeout(() => playTone({ type: 'sine', freq: 990, duration: 0.08, gain: 0.045, sweep: 140 }), 35);
    },
    snap() {
      playTone({ type: 'sawtooth', freq: 180, duration: 0.13, gain: 0.07, sweep: -110 });
    },
    pickup() {
      playTone({ type: 'square', freq: 540, duration: 0.06, gain: 0.04, sweep: 180 });
    },
  };
})();

const keys = {};
const touchKeys = {};
const isDown = name => !!(keys[name] || touchKeys[name]);

function tryInteract() {
  if (game.state !== 'scavenge') return;
  const n = nearestNodeInRange();
  if (n) {
    collectNode(n);
    return;
  }
  tryBuyGearUpgrade();
}

function tryCast() {
  if (game.state === 'scavenge') startFishing();
}

function tryEscape() {
  if (game.state !== 'fishing') return;
  if (game.fishing?.phase === 'fight') {
    fleeFishing('You flee the fight and back off the bank.');
  } else {
    fleeFishing('Cast canceled.');
  }
}

addEventListener('keydown', e => {
  void SFX.unlock();
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === 'e') tryInteract();
  if (e.key.toLowerCase() === 'f') tryCast();
  if (e.key === 'Escape') tryEscape();
});

addEventListener('pointerdown', () => {
  void SFX.unlock();
}, { capture: true });

addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

// Touch/mouse glide control for reeling: press-and-drag anywhere on the
// canvas during a fight to steer tension left/right, same effect as
// holding A/D or the d-pad, but readable at a glance like a joystick.
let dragPointerId = null;
let dragOriginX = 0;
let dragSteer = 0;

function inFightPhase() {
  return game.state === 'fishing' && game.fishing && game.fishing.phase === 'fight';
}

canvas.addEventListener('pointerdown', e => {
  if (!inFightPhase()) return;
  dragPointerId = e.pointerId;
  dragOriginX = e.clientX;
  dragSteer = 0;
  if (canvas.setPointerCapture) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* unsupported */ }
  }
});

canvas.addEventListener('pointermove', e => {
  if (dragPointerId !== e.pointerId) return;
  const rect = canvas.getBoundingClientRect();
  const maxDrag = Math.min(140, rect.width * 0.35);
  dragSteer = clamp((e.clientX - dragOriginX) / maxDrag, -1, 1);
});

const endDrag = e => {
  if (dragPointerId !== e.pointerId) return;
  dragPointerId = null;
  dragSteer = 0;
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('click', e => {
  if (game.state !== 'scavenge') return;

  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);

  for (const n of nodes) {
    if (n.collected) continue;
    const nx = toPxX(n.x);
    const ny = toPxY(n.y);
    if (Math.hypot(mx - nx, my - ny) < NODE_RADIUS * CELL_W + 6 && inRange(n)) {
      collectNode(n);
    }
  }
});

// --- Touch controls ---
// The d-pad holds a direction (mapped onto the same key names updateExploration
// already reads via isDown()); the action buttons fire once per press.
function bindHoldButton(el, keyName) {
  if (!el) return;
  const press = e => {
    e.preventDefault();
    touchKeys[keyName] = true;
    // Without pointer capture, a thumb drifting slightly off the button
    // during a hold fires pointerleave and silently cancels the press —
    // the button keeps the pointer once it's down instead.
    if (el.setPointerCapture) {
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* unsupported */ }
    }
  };
  const release = e => { e.preventDefault(); touchKeys[keyName] = false; };
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
}

function bindTapButton(el, handler) {
  if (!el) return;
  el.addEventListener('pointerdown', e => { e.preventDefault(); handler(); });
}

document.querySelectorAll('.dpad-btn').forEach(btn => bindHoldButton(btn, btn.dataset.dir));
bindTapButton(document.getElementById('btn-e'), tryInteract);
bindTapButton(document.getElementById('btn-f'), tryCast);
bindTapButton(document.getElementById('btn-esc'), tryEscape);

function setMessage(text, duration = 4200) {
  const until = performance.now() + duration;
  game.message = text;
  game.messageUntil = until;
  game.messageLog.unshift({ text, until });
  game.messageLog = game.messageLog.slice(0, 3);
}

// Narrative popup layer. Separate from setMessage()/messageLog above, which
// stay untouched and keep giving short mechanical HUD feedback ("+2 XP").
// This is a wider, longer-lived, purely cosmetic overlay for story beats —
// it never pauses update()/movement/the game loop.
function showDialog(text, duration = 5500) {
  game.dialog = { text, until: performance.now() + duration };
}

function showAchievement(title, text, duration = 5200) {
  const now = performance.now();
  game.achievementToast = { title, text, until: now + duration, startedAt: now };
}

function unlockAchievement(id, title, text, duration = 5200) {
  if (game.achievementIds[id]) return false;
  game.achievementIds[id] = true;
  showAchievement(title, text, duration);
  return true;
}

function announceRigAssembly() {
  if (!rigAssembled() || game.rigReadyAnnounced) return false;
  game.rigReadyAnnounced = true;
  if (!game.rigAssemblyAwarded) {
    awardXP(5);
    game.rigAssemblyAwarded = true;
  }
  setMessage('Rig assembled. +5 XP. Walk to the water and press F to cast.', 5000);
  showDialog('Rig Assembled! It is an ugly, terrible setup... but it’s enough to get a line in the water. Go find the deep water.');
  return true;
}

function awardXP(amount) {
  const beforeLevel = currentLevel();
  game.skillXp += amount;
  const afterLevel = currentLevel();
  if (afterLevel > beforeLevel) {
    unlockAchievement(
      `level-${afterLevel}`,
      `LEVEL ${afterLevel}`,
      'New level reached. Future scavenger tiers can hook in here.'
    );
  }
}

function adjustLuck(amount) {
  game.luck = clamp(game.luck + amount, LUCK_MIN, LUCK_MAX);
}

function currentXpFactor() {
  return clamp(game.skillXp / XP_FOR_SKILL_FACTOR, 0, 1);
}

function currentLuckModifier() {
  return GEAR_MODIFIER + (game.gearUpgradeBought ? GEAR_UPGRADE_BONUS : 0) + game.luck;
}

function computeBluegillCatchStats(f) {
  const fightSeconds = Math.max(1, (f.finishedAt - f.startedAt) / 1000);
  const speedFactor = clamp(1 - ((fightSeconds - 2) / 10), 0, 1);
  const skillFactor = clamp(f.skillOutput / 100, 0, 1);
  const luckFactor = clamp((game.luck + 100) / 200, 0, 1);
  const sizeLb = clamp(
    0.25 + (speedFactor * 0.55) + (skillFactor * 0.2) + (luckFactor * 0.25) + ((f.bobberSeed % 0.07) - 0.035),
    0.25,
    1.35
  );
  const xpBonus = clamp(Math.floor(speedFactor * BLUEGILL_SPEED_XP_MAX), 0, BLUEGILL_SPEED_XP_MAX);
  const pricePerPound = BLUEGILL_PRICE_PER_POUND_MIN + (luckFactor * (BLUEGILL_PRICE_PER_POUND_MAX - BLUEGILL_PRICE_PER_POUND_MIN));
  const cash = sizeLb < 0.5 ? BLUEGILL_SMALL_CASH : Math.round(sizeLb * pricePerPound * 100) / 100;

  return {
    fightSeconds,
    sizeLb,
    xp: BLUEGILL_BASE_XP + xpBonus,
    cash,
    beega: sizeLb >= 1,
  };
}

function collectNode(node) {
  if (node.collected) return false;

  node.collected = true;
  awardXP(2);

  if (node.id === 'tab') {
    setMessage('Collected Rusty Tab. The hook is crude, but it is a hook. +2 XP', 5000);
  } else {
    setMessage(`Collected ${node.label}. +2 XP`, 4200);
  }

  if (node.id === 'stick') {
    showDialog('A sturdy, broken branch. It’s got a good whip to it. Better than using your bare hands.');
  } else if (node.id === 'line') {
    showDialog('A nasty bird’s nest of discarded line. Smells like swamp mud, but it’ll hold a knot.');
  } else if (node.id === 'tab') {
    showDialog('An old soda tab bent into a vicious hook. You definitely need a tetanus shot after touching this.');
  }

  if (rigAssembled()) {
    announceRigAssembly();
  }

  SFX.pickup();
  saveGame();

  return true;
}

function inRange(n) {
  return dist(player.x, player.y, n.x, n.y) < PICKUP_RANGE;
}

function nearestNodeInRange() {
  let best = null;
  let bestD = Infinity;
  for (const n of nodes) {
    if (n.collected) continue;
    const d = dist(player.x, player.y, n.x, n.y);
    if (d < PICKUP_RANGE && d < bestD) {
      best = n;
      bestD = d;
    }
  }
  return best;
}

function rigAssembled() {
  return nodes.every(n => n.collected);
}

function nearWater() {
  const pondEdge = ellipseTest(player.x, player.y, pond, 0);
  return pondEdge >= 1 && pondEdge <= 1.32;
}

function nearBench() {
  return dist(player.x, player.y, bench.x, bench.y) < BENCH_INTERACT_RANGE;
}

function tryBuyGearUpgrade() {
  if (game.gearUpgradeBought) return false;
  if (!nearBench()) return false;
  if (game.cash < UPGRADE_COST) return false;

  game.cash -= UPGRADE_COST;
  game.gearUpgradeBought = true;
  setMessage(`Rig upgraded at the bench. -${formatMoney(UPGRADE_COST)}. Gear bonus +${GEAR_UPGRADE_BONUS}.`, 5000);
  saveGame();
  return true;
}

function deepCastSpot() {
  const eastBank = player.x > pond.x + pond.rx * 0.72;
  const centeredY = Math.abs(player.y - pond.y) < pond.ry * 0.42;
  return eastBank && centeredY;
}

function blockedAt(x, y) {
  if (ellipseTest(x, y, pond, 0.65) < 1) {
    return 'water';
  }

  if (dist(x, y, tree.x, tree.y - 0.5) < 2.45) {
    return 'tree';
  }

  const benchLeft = bench.x - 2.4;
  const benchRight = bench.x + 2.4;
  const benchTop = bench.y - 1.5;
  const benchBottom = bench.y + 1.8;
  if (x > benchLeft && x < benchRight && y > benchTop && y < benchBottom) {
    return 'bench';
  }

  return null;
}

function gearUpgradePrompt() {
  if (game.gearUpgradeBought) return null;
  if (!nearBench()) return null;
  if (game.cash < UPGRADE_COST) return null;
  return `Press E to upgrade your rig (${formatMoney(UPGRADE_COST)})`;
}

function canCast() {
  return game.state === 'scavenge' && rigAssembled() && nearWater();
}

// Spawns the player at a random open bank position instead of the fixed
// (9.2, 12.2) start — only used for a brand-new game (no existing save), so
// resuming a save still restores the exact position the player left off at.
function randomizeSpawn() {
  for (let attempt = 0; attempt < TAB_RELOCATE_ATTEMPTS; attempt++) {
    const x = TAB_BANK_MARGIN + Math.random() * (GRID_W - TAB_BANK_MARGIN * 2);
    const y = TAB_BANK_MARGIN + Math.random() * (GRID_H - TAB_BANK_MARGIN * 2);

    if (blockedAt(x, y)) continue;

    const tooCloseToNode = nodes.some(n => !n.collected && dist(x, y, n.x, n.y) < TAB_MIN_NODE_SPACING);
    if (tooCloseToNode) continue;

    player.x = x;
    player.y = y;
    return;
  }
  // Fallback keeps the original V1 spawn if rejection sampling can't find a spot.
}

function relocateTab() {
  const tab = nodes.find(n => n.id === 'tab');
  if (!tab) return;

  for (let attempt = 0; attempt < TAB_RELOCATE_ATTEMPTS; attempt++) {
    const x = TAB_BANK_MARGIN + Math.random() * (GRID_W - TAB_BANK_MARGIN * 2);
    const y = TAB_BANK_MARGIN + Math.random() * (GRID_H - TAB_BANK_MARGIN * 2);

    if (blockedAt(x, y)) continue;

    const tooClose = nodes.some(n => {
      if (n === tab || n.collected) return false;
      return dist(x, y, n.x, n.y) < TAB_MIN_NODE_SPACING;
    });
    if (tooClose) continue;

    tab.x = x;
    tab.y = y;
    return;
  }

  tab.x = TAB_FALLBACK_X;
  tab.y = TAB_FALLBACK_Y;
}

function loseHook() {
  const tab = nodes.find(n => n.id === 'tab');
  if (tab) tab.collected = false;
  relocateTab();
  game.rigReadyAnnounced = false;
  saveGame();
}

function fleeFishing(reason) {
  game.fishing = null;
  game.state = 'scavenge';
  setMessage(reason, 3800);
}

function startFishing() {
  if (!rigAssembled()) {
    setMessage('You still need all three scavenged parts.', 3800);
    return;
  }

  if (!nearWater()) {
    setMessage('Move closer to the pond before you cast.', 3800);
    return;
  }

  const fish = deepCastSpot() ? { ...FISH_TYPES.deep } : { ...FISH_TYPES.shallow };
  const now = performance.now();

  game.fishing = {
    fish,
    phase: 'casting',
    startedAt: now,
    strikeAt: now + 1400,
    nextTickAt: now + 2400,
    distance: fish.startDistance,
    marker: 0.5,
    markerVelocity: 0,
    skillOutput: 0,
    luckModifier: currentLuckModifier(),
    totalPower: 0,
    bobberSeed: Math.random() * Math.PI * 2,
    wasInSafeZone: true,
  };

  game.state = 'fishing';
  SFX.cast();
  if (fish.name === LEGENDARY_BASS_NAME) {
    setMessage('Deep-center cast. The boss is moving under the dark water.', 4500);
  } else {
    if (!game.firstShallowCastDialogShown) {
      game.firstShallowCastDialogShown = true;
      showDialog('Just small fry here in the shallows. The monster is holding in the deep water.');
    }
  }
}

function computeSkillOutput(f) {
  const safeCenter = 0.5;
  const halfZone = f.fish.safeZoneWidth / 2;
  const delta = Math.abs(f.marker - safeCenter);
  const baseScore = delta <= halfZone
    ? 100
    : Math.round((1 - clamp((delta - halfZone) / (0.5 - halfZone), 0, 1)) * 100);

  return Math.round(baseScore * (0.5 + 0.5 * currentXpFactor()));
}

function snapLine(text, options = {}) {
  if (options.xpReward) {
    awardXP(options.xpReward);
  }
  SFX.snap();
  loseHook();
  game.state = 'result';
  game.resultMessage = text;
  game.resultUntil = performance.now() + 4200;
}

function landFish(fish, f = null) {
  let bluegillResultText = 'NOICE catch, rookie!';
  if (fish.name === 'Bluegill') {
    const catchStats = f ? computeBluegillCatchStats(f) : {
      fightSeconds: 0,
      sizeLb: 0.25,
      xp: BLUEGILL_BASE_XP,
      cash: BLUEGILL_SMALL_CASH,
      beega: false,
    };
    bluegillResultText = catchStats.beega ? "NOW THAT'S A BEEGA FISH!" : 'NOICE catch, rookie!';
    awardXP(catchStats.xp);
    adjustLuck(catchStats.beega ? -2 : 2);
    game.cash += catchStats.cash;
    setMessage(
      `${catchStats.beega ? "NOW THAT'S A BEEGA FISH!" : 'NOICE catch, rookie!'} ${formatWeight(catchStats.sizeLb)}, +${catchStats.xp} XP, ${catchStats.beega ? '-2 Luck' : '+2 Luck'}, +${formatMoney(catchStats.cash)}.`,
      5000
    );
    if (!game.hasCaughtFish) {
      game.hasCaughtFish = true;
      unlockAchievement('first_catch', 'ACHIEVEMENT UNLOCKED', 'First Catch: something bit back.');
    }
  } else {
    setMessage(`Caught ${fish.name}.`, 4200);
  }
  SFX.catch();
  saveGame();
  game.state = 'result';
  game.resultMessage = fish.name === 'Bluegill'
    ? bluegillResultText
    : `Caught ${fish.name}.`;
  game.resultUntil = performance.now() + 4200;
}

function resolveFishingTick() {
  const f = game.fishing;
  if (!f || f.phase !== 'fight') return;

  f.skillOutput = computeSkillOutput(f);
  f.luckModifier = currentLuckModifier();
  f.totalPower = Math.max(0, f.skillOutput + f.luckModifier);

  if (f.totalPower > f.fish.resistance) {
    const gain = 1 + Math.floor((f.totalPower - f.fish.resistance) / 18);
    f.distance = Math.max(0, f.distance - gain);
  } else if (f.totalPower < f.fish.resistance) {
    const loss = 1 + Math.floor((f.fish.resistance - f.totalPower) / 20);
    f.distance = Math.min(f.fish.maxDistance, f.distance + loss);
  }

  if (f.distance <= 0) {
    f.finishedAt = performance.now();
    landFish(f.fish, f);
    return;
  }

  if (f.distance >= f.fish.maxDistance) {
    if (f.fish.name === LEGENDARY_BASS_NAME) {
      snapLine(`${f.fish.name} tore free. The hook is gone.`, { xpReward: 3 });
    } else {
      snapLine(`${f.fish.name} tore free. The hook is gone.`);
    }
  }
}

function updateExploration() {
  const now = performance.now();
  let dx = 0;
  let dy = 0;

  if (isDown('w') || isDown('arrowup')) dy -= 1;
  if (isDown('s') || isDown('arrowdown')) dy += 1;
  if (isDown('a') || isDown('arrowleft')) dx -= 1;
  if (isDown('d') || isDown('arrowright')) dx += 1;

  if (dx && dy) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  const nx = player.x + dx * player.speed;
  const ny = player.y + dy * player.speed;

  let blocked = false;

  if (!blockedAt(nx, player.y)) {
    player.x = nx;
  } else if (dx !== 0 || dy !== 0) {
    blocked = true;
  }

  if (!blockedAt(player.x, ny)) {
    player.y = ny;
  } else if (dx !== 0 || dy !== 0) {
    blocked = true;
  }

  if (blocked) {
    if (!game.blockedSince) {
      game.blockedSince = now;
    }

    if (now - game.blockedSince >= 1000 && now - game.lastLuckDrainAt >= 1000) {
      adjustLuck(-1);
      game.lastLuckDrainAt = now;
    }
  } else {
    game.blockedSince = 0;
  }

  player.x = clamp(player.x, 0.65, GRID_W - 0.65);
  player.y = clamp(player.y, 0.65, GRID_H - 0.65);
}

function updateFishing(now, dt) {
  const f = game.fishing;
  if (!f) return;
  const seconds = dt / 1000;

  if (f.phase === 'casting' && now >= f.strikeAt) {
    f.phase = 'fight';
    setMessage(`${f.fish.name} struck! Keep the marker in the safe zone.`, 2200);
  }

  if (f.phase !== 'fight') return;

  const keySteer = (isDown('d') || isDown('arrowright') ? 1 : 0) - (isDown('a') || isDown('arrowleft') ? 1 : 0);
  const steer = clamp(keySteer + dragSteer, -1, 1);
  const resistancePull = f.fish.name === LEGENDARY_BASS_NAME ? 0.9 : 1.15;
  const damping = f.fish.name === LEGENDARY_BASS_NAME ? 0.975 : 0.968;

  f.markerVelocity += steer * 0.65 * seconds;
  f.markerVelocity += (0.5 - f.marker) * resistancePull * seconds;
  f.markerVelocity += Math.sin((now - f.startedAt) / 520) * 0.03 * seconds;
  f.markerVelocity *= Math.pow(damping, seconds * 60);
  f.marker = clamp(f.marker + f.markerVelocity * seconds, 0, 1);

  const safeHalfWidth = f.fish.safeZoneWidth / 2;
  const inSafeZone = Math.abs(f.marker - 0.5) <= safeHalfWidth;
  if (f.wasInSafeZone !== inSafeZone) {
    f.wasInSafeZone = inSafeZone;
    SFX.tick(inSafeZone);
  }

  while (now >= f.nextTickAt && game.state === 'fishing') {
    resolveFishingTick();
    f.nextTickAt += 1000;
  }
}

function update(now, dt) {
  if (game.state === 'scavenge') {
    updateExploration();
    if (rigAssembled()) announceRigAssembly();
  } else if (game.state === 'fishing') {
    updateFishing(now, dt);
  } else if (game.state === 'result' && now >= game.resultUntil) {
    game.fishing = null;
    game.state = 'scavenge';
    if (!rigAssembled()) {
      setMessage('Recover the rusty hook at the bench before you cast again.', 4200);
    } else {
      setMessage('You are back on the bank.', 3000);
    }
  }
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_W; x++) {
    const px = x * CELL_W;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    const py = y * CELL_H;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
    ctx.stroke();
  }
}

function drawWorld() {
  ctx.fillStyle = '#4f7942';
  ctx.fillRect(0, 0, W, H);

  drawGrid();

  ctx.fillStyle = '#8d7350';
  ctx.beginPath();
  ctx.ellipse(toPxX(43.2), toPxY(35.0), 58 * propScale, 125 * propScale, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a90b8';
  ctx.beginPath();
  ctx.ellipse(toPxX(pond.x), toPxY(pond.y), toPxX(pond.rx), toPxY(pond.ry), 0, 0, Math.PI * 2);
  ctx.fill();

  if (game.state === 'scavenge') {
    ctx.save();
    ctx.fillStyle = 'rgba(19, 47, 24, 0.16)';
    ctx.strokeStyle = 'rgba(220, 255, 220, 0.22)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.fillRect(toPxX(35.5), toPxY(19.5), toPxX(13.2), toPxY(11.2));
    ctx.strokeRect(toPxX(35.5), toPxY(19.5), toPxX(13.2), toPxY(11.2));
    ctx.restore();
  }

  ctx.fillStyle = '#7bc0df';
  ctx.beginPath();
  ctx.ellipse(toPxX(pond.x), toPxY(pond.y), toPxX(pond.rx * 0.96), toPxY(pond.ry * 0.9), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2c5f7c';
  ctx.beginPath();
  ctx.ellipse(toPxX(deep.x), toPxY(deep.y), toPxX(deep.rx), toPxY(deep.ry), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(17, 47, 70, 0.54)';
  ctx.beginPath();
  ctx.ellipse(toPxX(pond.x + pond.rx * 0.56), toPxY(pond.y + 0.6), toPxX(pond.rx * 0.44), toPxY(pond.ry * 0.26), -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(toPxX(pond.x + pond.rx * 0.63 + i * 3.1), toPxY(pond.y - 1.1 + i * 1.5), (12 + i * 5) * propScale, 0.25, Math.PI * 1.55);
    ctx.stroke();
  }

  ctx.fillStyle = '#624a2e';
  ctx.fillRect(toPxX(pond.x + pond.rx * 0.82), toPxY(pond.y - 10.8), 5 * propScale, 14 * propScale);
  ctx.fillRect(toPxX(pond.x + pond.rx * 0.79), toPxY(pond.y - 11.0), 12 * propScale, 3 * propScale);
  ctx.font = `${Math.max(9, 10 * propScale)}px monospace`;
  ctx.fillStyle = '#fff';
  ctx.fillText('DEEP CAST', toPxX(pond.x + pond.rx * 0.69), toPxY(pond.y - 11.8));

  if (game.state === 'scavenge' && deepCastSpot()) {
    ctx.font = `bold ${mobileMode ? 16 : 12}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText('Deep water: something big lives here.', toPxX(36.2), toPxY(18.2));
  }

  ctx.strokeStyle = '#3a6b35';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const a = 3.6 + i * 0.12;
    const rx = pond.x + Math.cos(a) * (pond.rx - 0.15);
    const ry = pond.y + Math.sin(a) * (pond.ry - 0.15);
    ctx.beginPath();
    ctx.moveTo(toPxX(rx), toPxY(ry));
    ctx.lineTo(toPxX(rx + 0.2), toPxY(ry - 1.2));
    ctx.stroke();
  }

  ctx.fillStyle = '#5b4326';
  ctx.fillRect(toPxX(tree.x) - 6 * propScale, toPxY(tree.y), 12 * propScale, 30 * propScale);
  ctx.fillStyle = '#2e5b2e';
  ctx.beginPath();
  ctx.arc(toPxX(tree.x), toPxY(tree.y - 1.5), 38 * propScale, 0, Math.PI * 2);
  ctx.arc(toPxX(tree.x) - 26 * propScale, toPxY(tree.y - 0.2), 26 * propScale, 0, Math.PI * 2);
  ctx.arc(toPxX(tree.x) + 26 * propScale, toPxY(tree.y - 0.2), 26 * propScale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(toPxX(bench.x) - 22 * propScale, toPxY(bench.y) - 6 * propScale, 44 * propScale, 8 * propScale);
  ctx.fillRect(toPxX(bench.x) - 20 * propScale, toPxY(bench.y) + 2 * propScale, 5 * propScale, 12 * propScale);
  ctx.fillRect(toPxX(bench.x) + 15 * propScale, toPxY(bench.y) + 2 * propScale, 5 * propScale, 12 * propScale);
}

function drawNodes() {
  for (const n of nodes) {
    if (n.collected) continue;
    const nx = toPxX(n.x);
    const ny = toPxY(n.y);
    const targetH = NODE_RADIUS * CELL_H * 3.6;
    const drew = drawSprite(n.id, nx, ny, targetH, 'center');
    if (!drew) {
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(nx, ny, NODE_RADIUS * CELL_W, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffe66d';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  const near = nearestNodeInRange();
  if (near && !mobileMode) {
    const prompt = `Press E to pick up ${near.label}`;
    ctx.font = `${mobileMode ? 16 : 13}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    const promptWidth = ctx.measureText(prompt).width;
    const promptX = clamp(toPxX(near.x), promptWidth / 2 + 12, W - promptWidth / 2 - 12);
    const promptY = clamp(
      toPxY(near.y) - NODE_RADIUS * CELL_H * 2 - 6,
      mobileMode ? 60 : 18,
      H - (mobileMode ? TOUCH_UI_RESERVE : 28)
    );
    ctx.fillText(prompt, promptX, promptY);
    ctx.textAlign = 'left';
  }
}

function drawPlayer() {
  const halfW = (player.size * CELL_W) / 2;
  const halfH = (player.size * CELL_H) / 2;
  const px = toPxX(player.x);
  const py = toPxY(player.y);
  const targetH = player.size * CELL_H * 2.1;
  const drew = drawSprite('player', px, py + halfH, targetH, 'bottom');

  if (!drew) {
    ctx.fillStyle = '#e8574b';
    ctx.fillRect(px - halfW, py - halfH, player.size * CELL_W, player.size * CELL_H);
    ctx.strokeStyle = '#7c221a';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - halfW, py - halfH, player.size * CELL_W, player.size * CELL_H);
  }
}

function drawFilledMeter(label, valueLabel, value, x, y, fillColor, width = 170) {
  const h = 16;
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${label} ${valueLabel}`, x, y - 5);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, width, h);
  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 2, y + 2, (width - 4) * clamp(value, 0, 1), h - 4);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, h);
}

function drawLuckMeter(x, y, width = 170) {
  const h = 16;
  const center = x + width / 2;
  const magnitude = clamp(Math.abs(game.luck) / 100, 0, 1);
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`LUCK ${formatSigned(game.luck)}`, x, y - 5);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, width, h);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(center - 1, y + 1, 2, h - 2);
  if (game.luck < 0) {
    ctx.fillStyle = 'rgba(232,87,74,0.92)';
    ctx.fillRect(center - (width / 2) * magnitude, y + 2, (width / 2) * magnitude, h - 4);
  } else if (game.luck > 0) {
    ctx.fillStyle = 'rgba(73,201,164,0.92)';
    ctx.fillRect(center, y + 2, (width / 2) * magnitude, h - 4);
  }
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, h);
}

// Reserve room at the bottom for the touch d-pad/action buttons so nothing
// mobile draws underneath them. The action-button column (BACK+CAST+USE plus
// gaps and the bottom safe-area margin) is the taller of the two touch
// clusters at ~210px, so this reserves a bit more than that.
const TOUCH_UI_RESERVE = 224;

function drawInventoryStrip() {
  const upgraded = game.gearUpgradeBought;

  if (mobileMode) {
    ctx.font = 'bold 11px monospace';
    const y = 78;
    let x = 14;
    nodes.forEach(n => {
      const short = n.id.toUpperCase();
      const w = ctx.measureText(short).width + 16;
      ctx.fillStyle = n.collected ? (upgraded ? 'rgba(90,70,150,0.85)' : 'rgba(80,160,80,0.85)') : 'rgba(0,0,0,0.45)';
      ctx.fillRect(x, y, w, 20);
      ctx.strokeStyle = n.collected ? (upgraded ? '#d8c8ff' : '#aef0ae') : '#888';
      ctx.strokeRect(x, y, w, 20);
      if (n.collected && upgraded && drawGearCardIcon(n.id, x + 2, y + 1, 16, 18)) {
        // icon drawn; skip the text label so it doesn't fight the tiny art
      } else {
        ctx.fillStyle = n.collected ? '#fff' : '#aaa';
        ctx.fillText((n.collected ? '✓' : '') + short, x + 8, y + 14);
      }
      x += w + 8;
    });
    return;
  }

  ctx.font = 'bold 12px monospace';
  nodes.forEach((n, i) => {
    const x = 15 + i * 110;
    const y = H - 40;
    ctx.fillStyle = n.collected ? (upgraded ? 'rgba(90,70,150,0.85)' : 'rgba(80,160,80,0.85)') : 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y, 100, 24);
    ctx.strokeStyle = n.collected ? (upgraded ? '#d8c8ff' : '#aef0ae') : '#888';
    ctx.strokeRect(x, y, 100, 24);

    if (n.collected && upgraded && drawGearCardIcon(n.id, x + 2, y + 2, 20, 20)) {
      ctx.fillStyle = '#fff';
      ctx.fillText('✓ ' + n.label, x + 26, y + 16);
    } else {
      ctx.fillStyle = n.collected ? '#fff' : '#aaa';
      ctx.fillText((n.collected ? '✓ ' : '') + n.label, x + 8, y + 16);
    }
  });
}

function drawMessageLog() {
  const now = performance.now();
  const entries = game.messageLog.filter(entry => now < entry.until);
  if (!entries.length) return;

  if (mobileMode) {
    // Only the most recent line, bigger font, parked well above the touch UI.
    const entry = entries[0];
    const y = H - TOUCH_UI_RESERVE - 70;
    ctx.font = 'bold 15px monospace';
    const w = Math.min(W - 24, ctx.measureText(entry.text).width + 24);
    const x = (W - w) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y - 20, w, 30);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(x, y - 20, w, 30);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(entry.text, W / 2, y);
    ctx.textAlign = 'left';
    ctx.restore();
    return;
  }

  const x = 15;
  const y = H - 126;
  const lineH = 17;
  const w = 520;
  const h = entries.length * lineH + 12;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(x - 6, y - 6, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.strokeRect(x - 6, y - 6, w, h);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#fff';
  entries.slice(0, 3).forEach((entry, i) => {
    ctx.fillText(entry.text, x, y + i * lineH + 10);
  });
  ctx.restore();
}

function drawAchievementToast() {
  const now = performance.now();
  if (!game.achievementToast || now >= game.achievementToast.until) return;

  const toast = game.achievementToast;
  const life = (now - toast.startedAt) / (toast.until - toast.startedAt);
  const pulse = 0.5 + 0.5 * Math.sin(now / 160);
  const w = mobileMode ? Math.min(W - 24, 360) : 460;
  const h = mobileMode ? 88 : 104;
  const x = (W - w) / 2;
  // Clear of both the top meter row + fish panel (fishing, ends ~164) and
  // the top meter row + rig/cast prompts (scavenge, deepest one ends ~160),
  // so one fixed offset works for either state instead of branching on it.
  const y = mobileMode ? 172 : 82;

  ctx.save();
  ctx.globalAlpha = clamp(1 - life * 0.15, 0.82, 1);
  ctx.fillStyle = 'rgba(8, 12, 18, 0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255, 230, 109, 0.82)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = 'rgba(255,230,109,0.15)';
  ctx.fillRect(x + 4, y + 4, w - 8, 22);

  ctx.fillStyle = '#ffe66d';
  ctx.font = `bold ${mobileMode ? 14 : 16}px monospace`;
  ctx.fillText('ACHIEVEMENT UNLOCKED', x + 16, y + 18);

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${mobileMode ? 18 : 22}px monospace`;
  ctx.fillText(toast.title, x + 16, y + 46);

  ctx.font = `${mobileMode ? 12 : 13}px monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(toast.text, x + 16, y + 68);

  for (let i = 0; i < 5; i++) {
    const sx = x + w - 24 - i * 18;
    const sy = y + 20 + Math.sin(now / 180 + i) * 4;
    ctx.fillStyle = i % 2 === 0
      ? `rgba(255,230,109,${0.55 + pulse * 0.35})`
      : `rgba(255,255,255,${0.35 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.2 + pulse * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Wraps `text` to fit within `maxWidth` px using the currently-set ctx.font.
function wrapDialogText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Narrative popup box — visually distinct from drawMessageLog()'s bottom-left
// mechanical feedback strip. Wider, upper-band, bigger font, longer-lived.
// Purely cosmetic: never gates update()/movement/the loop.
function drawDialog() {
  const now = performance.now();
  if (!game.dialog || now >= game.dialog.until) return;

  const fontSize = mobileMode ? 14 : 16;
  ctx.font = `bold ${fontSize}px monospace`;

  const w = mobileMode ? Math.min(W - 24, 360) : Math.min(W - 40, 620);
  const padX = 16;
  const padY = 14;
  const lineH = fontSize + 6;
  const lines = wrapDialogText(game.dialog.text, w - padX * 2);
  const h = lines.length * lineH + padY * 2;
  const x = (W - w) / 2;
  // Mobile: both the scavenge prompts (inventory strip, node-pickup box,
  // "Rig Assembled!") and the fishing fish-info panel are top-anchored and
  // centered, so a fixed low y here collided with whichever was showing.
  // Mid-screen sits clear of both that top cluster and the bottom
  // touch-control/tension-meter cluster regardless of game state.
  const toastActive = mobileMode && game.achievementToast && now < game.achievementToast.until;
  // If an achievement toast is visible, nudge the dialog below it instead of
  // risking overlap on a narrow screen.
  const y = mobileMode
    ? (toastActive ? Math.max(Math.round(H * 0.42), 172 + 88 + 10) : Math.round(H * 0.42))
    : 88;

  ctx.save();
  ctx.fillStyle = 'rgba(10,20,15,0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,230,109,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#ffe66d';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, y + padY + i * lineH + fontSize);
  });
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawFishingHUD() {
  const f = game.fishing;
  if (!f) return;

  if (mobileMode) {
    ctx.save();
    const panelW = Math.min(300, W - 24);
    const panelX = (W - panelW) / 2;
    // Sits below the SKL/LUCK/CASH meter row (occupies roughly y 14-68) so
    // the two panels stack instead of overlapping.
    const panelY = 86;
    const panelH = 78;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${f.fish.name}  (resist ${f.fish.resistance})`, panelX + 12, panelY + 20);
    ctx.fillText(`POWER ${f.totalPower}  LUCK ${formatSigned(game.luck)}`, panelX + 12, panelY + 40);
    ctx.font = '11px monospace';
    ctx.fillText(`STATE: ${f.phase === 'casting' ? 'CASTING' : 'REELING'} · BACK to flee`, panelX + 12, panelY + 58);
    ctx.restore();

    const meterW = Math.min(300, W - 40);
    const meterX = (W - meterW) / 2;
    const meterY = H - TOUCH_UI_RESERVE - 34;
    const meterH = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(meterX, meterY, meterW, meterH);

    const safeStart = meterX + meterW * (0.5 - f.fish.safeZoneWidth / 2);
    const safeWidth = meterW * f.fish.safeZoneWidth;
    ctx.fillStyle = 'rgba(73, 201, 164, 0.8)';
    ctx.fillRect(safeStart, meterY, safeWidth, meterH);

    const markerX = meterX + meterW * f.marker;
    ctx.fillStyle = '#ffe66d';
    ctx.fillRect(markerX - 2, meterY - 4, 4, meterH + 8);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(meterX, meterY, meterW, meterH);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('TENSION', meterX, meterY - 6);
    return;
  }

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  const panelX = W - 332;
  const panelY = 12;
  const panelW = 320;
  const panelH = 136;
  ctx.fillRect(panelX, panelY, panelW, panelH);

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`FISH: ${f.fish.name}`, panelX + 14, panelY + 24);
  ctx.fillText(`RESISTANCE: ${f.fish.resistance}`, panelX + 14, panelY + 42);
  ctx.fillText(`XP: L${currentLevel()} ${formatXpProgress(game.skillXp)}`, panelX + 14, panelY + 60);
  ctx.fillText(`SKILL_OUTPUT: ${f.skillOutput}`, panelX + 14, panelY + 78);
  ctx.fillText(`LUCK: ${formatSigned(game.luck)}`, panelX + 178, panelY + 24);
  ctx.fillText(`GEAR_MOD: ${GEAR_MODIFIER}`, panelX + 178, panelY + 42);
  ctx.fillText(`LUCK_MOD: ${f.luckModifier}`, panelX + 178, panelY + 60);
  ctx.fillText(`TOTAL_POWER: ${f.totalPower}`, panelX + 178, panelY + 78);
  ctx.fillText(`STATE: ${f.phase === 'casting' ? 'CASTING' : 'REELING'}`, panelX + 14, panelY + 100);
  ctx.fillText('A/D: tension | ESC: flee/cancel', panelX + 14, panelY + 118);
  ctx.restore();

  const meterX = 250;
  const meterY = H - 76;
  const meterW = 300;
  const meterH = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(meterX, meterY, meterW, meterH);

  const safeStart = meterX + meterW * (0.5 - f.fish.safeZoneWidth / 2);
  const safeWidth = meterW * f.fish.safeZoneWidth;
  ctx.fillStyle = 'rgba(73, 201, 164, 0.8)';
  ctx.fillRect(safeStart, meterY, safeWidth, meterH);

  const markerX = meterX + meterW * f.marker;
  ctx.fillStyle = '#ffe66d';
  ctx.fillRect(markerX - 2, meterY - 4, 4, meterH + 8);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(meterX, meterY, meterW, meterH);

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('TENSION', meterX, meterY - 6);
}

function drawFishingScene(now) {
  const f = game.fishing;
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.48);
  sky.addColorStop(0, '#86c1e3');
  sky.addColorStop(1, '#d7ecf7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const water = ctx.createLinearGradient(0, H * 0.34, 0, H);
  water.addColorStop(0, '#4a90b8');
  water.addColorStop(0.45, '#2d6a8c');
  water.addColorStop(1, '#163a52');
  ctx.fillStyle = water;
  ctx.fillRect(0, H * 0.32, W, H * 0.68);

  ctx.fillStyle = '#6c8f53';
  ctx.fillRect(0, H * 0.26, W, 18);

  ctx.fillStyle = '#345c31';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.26);
  ctx.quadraticCurveTo(W * 0.24, H * 0.18, W * 0.43, H * 0.26);
  ctx.quadraticCurveTo(W * 0.61, H * 0.34, W, H * 0.25);
  ctx.lineTo(W, H * 0.31);
  ctx.lineTo(0, H * 0.31);
  ctx.closePath();
  ctx.fill();

  const ripple = ctx.createRadialGradient(W * 0.56, H * 0.53, 8, W * 0.56, H * 0.53, 95);
  ripple.addColorStop(0, 'rgba(255,255,255,0.28)');
  ripple.addColorStop(0.45, 'rgba(255,255,255,0.08)');
  ripple.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = ripple;
  ctx.beginPath();
  ctx.arc(W * 0.56, H * 0.53, 95, 0, Math.PI * 2);
  ctx.fill();

  const bobberX = W * 0.56 + Math.sin(f.bobberSeed + now / 240) * 5;
  const bobberY = H * 0.53 + Math.cos(f.bobberSeed + now / 310) * 2 + (f.phase === 'fight' ? Math.max(0, f.distance) * 0.03 : 0);
  const rodTipX = W * 0.5;
  const rodTipY = H * 0.9;

  ctx.strokeStyle = '#e6d3a6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rodTipX, rodTipY);
  ctx.lineTo(bobberX, bobberY);
  ctx.stroke();

  ctx.fillStyle = '#5b4326';
  ctx.fillRect(W * 0.44, H * 0.87, 120, 10);
  ctx.fillStyle = '#7c221a';
  ctx.fillRect(W * 0.53, H * 0.89, 16, 6);

  ctx.fillStyle = '#ffe66d';
  ctx.beginPath();
  ctx.arc(bobberX, bobberY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7c221a';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (!mobileMode) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(18, 66, 360, 50);
    ctx.restore();

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('STATIONARY CASTING STATE', 28, 88);
    ctx.font = '13px monospace';
    ctx.fillText(f.phase === 'casting' ? 'Waiting for the strike...' : 'Reel with A / D to hold tension.', 28, 108);
  }

  const resultBandW = mobileMode ? Math.min(W - 32, 360) : 632;
  const resultBandX = (W - resultBandW) / 2;
  if (game.state === 'result') {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(resultBandX, H * 0.28, resultBandW, 52);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.strokeRect(resultBandX, H * 0.28, resultBandW, 52);
    ctx.restore();
  }

  drawFishingHUD();
  drawHUD(now);

  if (game.state === 'result') {
    ctx.font = `bold ${mobileMode ? 18 : 24}px monospace`;
    ctx.fillStyle = '#ffe66d';
    ctx.textAlign = 'center';
    ctx.fillText(game.resultMessage, W / 2, H * 0.28 + 34);
    ctx.textAlign = 'left';
  }
}

function drawHUD(now) {
  if (mobileMode) {
    const topPad = 14;
    const barW = Math.min(150, Math.floor((W - 38) / 2));
    const rowW = barW * 2 + 10;
    const rowX = (W - rowW) / 2;
    drawFilledMeter('SKL', `L${currentLevel()} ${formatXpProgress(game.skillXp)}`, currentLevelProgress(), rowX, topPad + 18, '#4fc3f7', barW);
    drawLuckMeter(rowX + barW + 10, topPad + 18, barW);

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`CASH ${formatMoney(game.cash)}`, 14, topPad + 50);

    // Rig contents are irrelevant mid-cast (you can't cast without a
    // complete rig), and this strip sits in the same band the fishing
    // panel uses below — drawing it during fishing/result overlapped.
    if (game.state === 'scavenge') drawInventoryStrip();
    drawMessageLog();
    drawAchievementToast();

    if (game.state === 'scavenge') {
      if (rigAssembled()) {
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#ffe66d';
        ctx.fillText('Rig Assembled!', 14, 116);
      }
      const near = nearestNodeInRange();
      if (near) {
        const prompt = `Press E to pick up ${near.label}`;
        ctx.font = 'bold 14px monospace';
        const w = Math.min(W - 28, ctx.measureText(prompt).width + 24);
        const x = 14;
        const y = 154;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y - 18, w, 24);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(x, y - 18, w, 24);
        ctx.fillStyle = '#fff';
        ctx.fillText(prompt, x + 10, y);
      }
      if (canCast()) {
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText('Press CAST to fish from the bank', 14, 134);
      }
      const upgradePrompt = gearUpgradePrompt();
      if (upgradePrompt && !near) {
        ctx.font = 'bold 14px monospace';
        const w = Math.min(W - 28, ctx.measureText(upgradePrompt).width + 24);
        const x = 14;
        const y = 154;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y - 18, w, 24);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(x, y - 18, w, 24);
        ctx.fillStyle = '#fff';
        ctx.fillText(upgradePrompt, x + 10, y);
      }
    }
    // The single-line message-log banner above already surfaces the latest
    // message; skip the redundant bottom-center text so it can't sit under
    // the touch controls.
    return;
  }

  drawFilledMeter('SKL', `L${currentLevel()} ${formatXpProgress(game.skillXp)}`, currentLevelProgress(), 15, 30, '#4fc3f7');
  drawLuckMeter(200, 30);
  drawFilledMeter('CASH', formatMoney(game.cash), 0, 385, 30, '#d7b15d', 170);

  drawInventoryStrip();
  drawMessageLog();
  drawAchievementToast();

  if (game.state === 'scavenge') {
    if (rigAssembled()) {
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#ffe66d';
      ctx.textAlign = 'right';
      ctx.fillText('Rig Assembled!', W - 20, H - 22);
      ctx.font = '12px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('An ugly, terrible rig. But it will get a line in the water.', W - 20, H - 6);
      ctx.textAlign = 'left';
    }

    if (canCast()) {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('Press F to cast from the bank', 20, 78);
    }

    const upgradePrompt = gearUpgradePrompt();
    if (upgradePrompt) {
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(upgradePrompt, toPxX(bench.x), toPxY(bench.y) - 26 * propScale);
      ctx.textAlign = 'left';
    }
  }

  if (now < game.messageUntil && game.message) {
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(game.message, W / 2, H - 12);
    ctx.textAlign = 'left';
  }
}

function drawScavengeScene(now) {
  drawWorld();
  drawNodes();
  drawPlayer();
  drawHUD(now);
}

function loop(now) {
  if (!loop.lastNow) loop.lastNow = now;
  const dt = Math.min(32, now - loop.lastNow || 16);
  loop.lastNow = now;

  update(now, dt);

  // Backing store is DPR times larger than W/H; this transform lets every
  // draw call below keep working in CSS-pixel (W/H) coordinates.
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  if (game.state === 'fishing' || game.state === 'result') {
    drawFishingScene(now);
  } else {
    drawScavengeScene(now);
  }
  drawDialog();

  requestAnimationFrame(loop);
}

if (rigAssembled()) {
  game.rigReadyAnnounced = true;
}

requestAnimationFrame(loop);
