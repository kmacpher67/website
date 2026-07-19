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
const BLUEGILL_SPEED_LUCK_MAX = 2;
const BLUEGILL_SMALL_CASH = 0.25;
const BLUEGILL_PRICE_PER_POUND_MIN = 2;
const BLUEGILL_PRICE_PER_POUND_MAX = 4;
const CATCH_LENGTH_COEFFICIENTS = {
  shallow: 0.0035,
  deep: 0.00235,
};
const BREAK_ZONE_FRACTION = 0.85; // last ~15% of maxDistance is the near-miss risk zone
const SKILL_NEAR_MISS_PENALTY = 8; // skillOutput dip per failed break-risk roll, rest of fight
const CATCH_HISTORY_MAX = 20; // newest-first cap; feeds the future settings/profile history phase
const TAB_FALLBACK_X = 43.8;
const TAB_FALLBACK_Y = 29.0;
const TAB_MIN_NODE_SPACING = 3.5;
const TAB_RELOCATE_ATTEMPTS = 40;
const TAB_BANK_MARGIN = 3;
const GEAR_UPGRADE_BONUS = 20;
const UPGRADE_COST = 40;
const BENCH_INTERACT_RANGE = 3.2;
const SAVE_KEY = 'fishing-save-v1';
const CAST_RELEASE_MIN_MS = 260;
const CAST_RELEASE_MAX_MS = 1900;
const CAST_TRAVEL_PAUSE_SHORT_MS = 520;
const CAST_TRAVEL_PAUSE_LONG_MS = 1650;
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

// V16 catch-reveal art is optional. If the species-specific image assets are
// not present yet, the draw path below falls back to a hand-drawn silhouette
// instead of blocking the slice.
const CATCH_REVEAL_ART_DEFS = {
  shallow: { src: 'images/catch-reveal-bluegill.png' },
  deep: { src: 'images/catch-reveal-old-ironjaw.png' },
};

const catchRevealArtImages = {};

function loadCatchRevealArt() {
  for (const key of Object.keys(CATCH_REVEAL_ART_DEFS)) {
    const img = new Image();
    img.onload = () => { catchRevealArtImages[key] = img; };
    img.onerror = () => { catchRevealArtImages[key] = null; };
    img.src = CATCH_REVEAL_ART_DEFS[key].src;
    catchRevealArtImages[key] = undefined;
  }
}
loadCatchRevealArt();

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

// V17: Level 2 ("The Gutter") background art — the Lvl 1-3 V8 pond board,
// the first rung of the pond-progression reference set.
let level2BackgroundImage;
function loadLevel2Background() {
  const img = new Image();
  img.onload = () => { level2BackgroundImage = img; };
  img.onerror = () => { level2BackgroundImage = null; };
  img.src = 'images/v8-assets/pond-1-the-gutter-reference.png';
}
loadLevel2Background();

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

// V17: Level 2 ("The Gutter") reuses the Level 1 pond/deep-cast coordinates
// so the existing collision/casting math (blockedAt, nearWater,
// deepCastSpot) works unmodified for both locations — only the tree/bench
// props and scavenge nodes are Level-1-only, and only the background art
// differs. The travel gate sits in an open bottom-right grass corner, clear
// of the pond, tree, bench, and the south-bank line node.
const travelGate = { x: 45.0, y: 45.0 };
const TRAVEL_GATE_RANGE = 3.0;
const TRAVEL_ARRIVE_OFFSET = { x: -4.2, y: -4.2 };
const LEVEL2_UNLOCK_LEVEL = 2;

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
    sizeRange: [0.25, 1.35],
    referenceSizeLb: 0.6,
  },
  deep: {
    name: LEGENDARY_BASS_NAME,
    resistance: DREAM_BASS_RESISTANCE,
    startDistance: 30,
    maxDistance: 48,
    safeZoneWidth: 0.12,
    // min-size roll lands sizeFactor exactly 1.0 (resistance 180), preserving
    // the pre-V13 "170 max power < 180 < 190 max power" gear-upgrade
    // invariant for the smallest Old Ironjaw; bigger rolls exceed it by
    // design — see docs/design/line-tension-mechanics.md §2.
    sizeRange: [10, 30],
    referenceSizeLb: 20,
  },
};

const game = {
  state: 'title',
  // V17: which map the player is standing in — 'level1' (starter pond,
  // unchanged) or 'level2' (The Gutter, unlocked at LEVEL2_UNLOCK_LEVEL).
  location: 'level1',
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
  // Second line on the result band, holds the numeric catch/loss breakdown
  // (weight/XP/luck/cash or the hook-lost consequence) for as long as the
  // result screen itself stays open, instead of expiring with the timed
  // message log entry that used to be the only place it was shown.
  resultDetail: '',
  // V16 catch-reveal payload used to size/draw the hanging fish presentation.
  resultCatch: null,
  fishing: null,
  dialog: null,
  achievementToast: null,
  achievementIds: {},
  firstShallowCastDialogShown: false,
  hasCaughtFish: false,
  paused: false,
  guestId: null,
  guestName: null,
  // Newest-first log of landed catches, capped to CATCH_HISTORY_MAX. Not
  // surfaced in any UI yet — persisted now so the settings/profile Phase 2
  // history view has real data to read once it's built.
  catchHistory: [],
};

// Guest play identity: a stable local-only id/name pair, generated once on
// first run and persisted in the save blob. This is intentionally the
// smallest possible slice — no login, no network, no conversion flow — so
// later account/settings work has *something* to attach to.
function generateGuestId() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `guest-${suffix}`;
}

function generateGuestName() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Guest ${num}`;
}

function captureSaveState() {
  return {
    version: 1,
    game: {
      skillXp: game.skillXp,
      luck: game.luck,
      cash: game.cash,
      location: game.location,
      rigReadyAnnounced: game.rigReadyAnnounced,
      rigAssemblyAwarded: game.rigAssemblyAwarded,
      gearUpgradeBought: game.gearUpgradeBought,
      firstShallowCastDialogShown: game.firstShallowCastDialogShown,
      hasCaughtFish: game.hasCaughtFish,
      achievementIds: { ...game.achievementIds },
      guestId: game.guestId,
      guestName: game.guestName,
      catchHistory: game.catchHistory.slice(0, CATCH_HISTORY_MAX),
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
      skillXp, luck, cash, location,
      rigReadyAnnounced, rigAssemblyAwarded, gearUpgradeBought,
      firstShallowCastDialogShown, hasCaughtFish, achievementIds,
      guestId, guestName, catchHistory,
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
    // Older saves predate the Level 2 unlock (V17); backfill to the starter
    // pond rather than rejecting the whole save.
    game.location = location === 'level2' ? 'level2' : 'level1';
    game.rigReadyAnnounced = rigReadyAnnounced;
    game.rigAssemblyAwarded = rigAssemblyAwarded;
    game.gearUpgradeBought = gearUpgradeBought;
    game.firstShallowCastDialogShown = firstShallowCastDialogShown;
    game.hasCaughtFish = hasCaughtFish;
    game.achievementIds = { ...achievementIds };
    // Older saves predate guest identity (V12); backfill rather than reject
    // the whole save so upgrading players don't lose progress.
    game.guestId = typeof guestId === 'string' && guestId ? guestId : generateGuestId();
    game.guestName = typeof guestName === 'string' && guestName ? guestName : generateGuestName();
    // Older saves predate the catch history log (post-V13 addition); backfill
    // with an empty log rather than rejecting the whole save.
    game.catchHistory = Array.isArray(catchHistory) ? catchHistory.slice(0, CATCH_HISTORY_MAX) : [];
    game.state = 'title';
    game.fishing = null;
    game.dialog = null;
    game.achievementToast = null;
    game.resultMessage = '';
    game.resultDetail = '';
    game.resultCatch = null;
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

let loadedSave = loadGame();
if (!loadedSave) {
  relocateTab();
  randomizeSpawn();
  game.guestId = generateGuestId();
  game.guestName = generateGuestName();
}

// Dev-only test shortcut (?dev=level2 in the URL): grants the rig, enough
// XP to clear LEVEL2_UNLOCK_LEVEL, and drops the player at the Level 2
// trailhead — so the gated Level 2 unlock can be reached and verified
// without grinding the full scavenge/catch loop from scratch every time.
try {
  const params = new URLSearchParams(location.search);
  if (params.get('dev') === 'level2') {
    for (const node of nodes) node.collected = true;
    game.rigReadyAnnounced = true;
    game.rigAssemblyAwarded = true;
    game.skillXp = Math.max(game.skillXp, XP_FOR_LEVEL_CAP * (LEVEL2_UNLOCK_LEVEL - 1));
    player.x = travelGate.x + TRAVEL_ARRIVE_OFFSET.x;
    player.y = travelGate.y + TRAVEL_ARRIVE_OFFSET.y;
  }
} catch (err) { /* ignore malformed URL */ }

// New Game requires a second press within this window while a save exists,
// so a stray tap on the title screen can't silently erase cash/XP/gear.
const NEW_GAME_CONFIRM_MS = 3500;
let newGameConfirmUntil = 0;

function resetToFreshGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ }

  game.skillXp = 0;
  game.luck = 0;
  game.cash = 0;
  game.location = 'level1';
  game.lastLuckDrainAt = 0;
  game.blockedSince = 0;
  game.rigReadyAnnounced = false;
  game.rigAssemblyAwarded = false;
  game.gearUpgradeBought = false;
  game.resultUntil = 0;
  game.resultMessage = '';
  game.resultDetail = '';
  game.resultCatch = null;
  game.fishing = null;
  game.dialog = null;
  game.achievementToast = null;
  game.achievementIds = {};
  game.firstShallowCastDialogShown = false;
  game.hasCaughtFish = false;
  game.message = 'Wake up. Scavenge the bank. Build the rig.';
  game.messageUntil = performance.now() + 4200;
  game.messageLog = [];
  game.catchHistory = [];

  for (const node of nodes) node.collected = false;
  relocateTab();
  randomizeSpawn();
}

function handleNewGameRequest() {
  if (!loadedSave) {
    game.state = 'scavenge';
    return;
  }

  const now = performance.now();
  if (now < newGameConfirmUntil) {
    resetToFreshGame();
    newGameConfirmUntil = 0;
    game.state = 'scavenge';
    return;
  }

  newGameConfirmUntil = now + NEW_GAME_CONFIRM_MS;
  game.message = 'Press New Game again to confirm — this erases your save.';
  game.messageUntil = now + NEW_GAME_CONFIRM_MS;
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
  if (game.paused) return;
  if (game.state === 'title') {
    handleNewGameRequest();
    return;
  }
  if (game.state === 'result') {
    closeResultView();
    return;
  }
  if (game.state !== 'scavenge') return;
  const n = nearestNodeInRange();
  if (n) {
    collectNode(n);
    return;
  }
  if (tryBuyGearUpgrade()) return;
  tryTravel();
}

function tryCast() {
  if (game.paused) return;
  if (game.state === 'title') {
    game.state = 'scavenge';
    return;
  }
  if (game.state === 'scavenge') {
    startFishing();
    return;
  }
  if (game.state === 'fishing' && game.fishing?.phase === 'casting') {
    releaseCast();
    return;
  }
  if (game.state === 'result') {
    closeResultView();
  }
}

// Pause takes priority over every other Escape/BACK behavior so the same
// button that flees a fight or cancels a cast also resumes from pause.
function tryEscape() {
  if (game.paused) {
    game.paused = false;
    return;
  }
  if (game.state === 'title') {
    newGameConfirmUntil = 0;
    return;
  }
  if (game.state === 'result') {
    closeResultView();
    return;
  }
  if (game.state !== 'fishing') return;
  if (game.fishing?.phase === 'fight') {
    fleeFishing('You flee the fight and back off the bank.');
  } else {
    fleeFishing('Cast canceled.');
  }
}

function pauseable() {
  return game.state === 'scavenge' || game.state === 'fishing';
}

function togglePause() {
  if (!pauseable()) return;
  game.paused = !game.paused;
}

function returnToTitle() {
  saveGame();
  loadedSave = true;
  game.paused = false;
  game.fishing = null;
  game.dialog = null;
  game.state = 'title';
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

// Hit-rects for the pause button/overlay, recomputed each draw so click
// handling below always matches what's currently on screen.
let pauseButtonRect = null;
let pauseResumeRect = null;
let pauseTitleRect = null;

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

function pointInRect(px, py, rect) {
  return !!rect && px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);

  if (game.paused) {
    if (pointInRect(mx, my, pauseResumeRect)) game.paused = false;
    else if (pointInRect(mx, my, pauseTitleRect)) returnToTitle();
    return;
  }
  if (pauseable() && pointInRect(mx, my, pauseButtonRect)) {
    togglePause();
    return;
  }

  if (game.state === 'title') {
    tryCast();
    return;
  }
  if (game.state === 'result') {
    closeResultView();
    return;
  }
  if (game.state === 'fishing' && game.fishing?.phase === 'casting') {
    releaseCast();
    return;
  }
  if (game.state !== 'scavenge') return;

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
      'Your hands are steadier now. Every level pushes you closer to Old Ironjaw.'
    );
    showDialog(`Level ${afterLevel}. The pond starts feeling smaller, and the deep water feels louder.`);
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

// Resistance scales off the fight's own rolled size, not a 1:1 multiplier —
// a fish twice as heavy shouldn't fight twice as hard. See
// docs/design/line-tension-mechanics.md §2.
function sizeFactor(sizeLb, referenceSizeLb) {
  return 0.7 + 0.6 * clamp(sizeLb / referenceSizeLb, 0, 1.5);
}

// Rolled once, at the bite (see the 'waiting' -> 'fight' transition in
// updateFishing), so the fight's difficulty and the landing-time reward
// describe the same fish instead of two independent rolls.
function rollFightSize(fish) {
  const [minLb, maxLb] = fish.sizeRange;
  const luckFactor = clamp((game.luck + 100) / 200, 0, 1);
  const span = maxLb - minLb;
  return clamp(minLb + luckFactor * span * 0.35 + Math.random() * span * 0.85, minLb, maxLb);
}

function computeBluegillCatchStats(f) {
  const fightSeconds = Math.max(1, (f.finishedAt - f.startedAt) / 1000);
  const speedFactor = clamp(1 - ((fightSeconds - 2) / 10), 0, 1);
  const luckFactor = clamp((game.luck + 100) / 200, 0, 1);
  const sizeLb = f.sizeLb != null ? f.sizeLb : FISH_TYPES.shallow.sizeRange[0];
  const lengthIn = Math.cbrt(sizeLb / CATCH_LENGTH_COEFFICIENTS.shallow);
  const xpBonus = clamp(Math.floor(speedFactor * BLUEGILL_SPEED_XP_MAX), 0, BLUEGILL_SPEED_XP_MAX);
  const luckBonus = clamp(Math.round(speedFactor * BLUEGILL_SPEED_LUCK_MAX), 0, BLUEGILL_SPEED_LUCK_MAX);
  const pricePerPound = BLUEGILL_PRICE_PER_POUND_MIN + (luckFactor * (BLUEGILL_PRICE_PER_POUND_MAX - BLUEGILL_PRICE_PER_POUND_MIN));
  const cash = sizeLb < 0.5 ? BLUEGILL_SMALL_CASH : Math.round(sizeLb * pricePerPound * 100) / 100;

  return {
    fightSeconds,
    sizeLb,
    lengthIn,
    xp: BLUEGILL_BASE_XP + xpBonus,
    luckBonus,
    cash,
    beega: sizeLb >= 1,
  };
}

function computeCatchLengthInches(sizeLb, species) {
  const coeff = CATCH_LENGTH_COEFFICIENTS[species] ?? CATCH_LENGTH_COEFFICIENTS.shallow;
  return Math.cbrt(Math.max(sizeLb, 0) / coeff);
}

function formatLength(value) {
  return `${value.toFixed(1)} in`;
}

function buildCatchRevealStats(fish, f = null) {
  const species = fish.name === LEGENDARY_BASS_NAME ? 'deep' : 'shallow';
  const sizeLb = species === 'shallow'
    ? (f?.sizeLb != null ? f.sizeLb : FISH_TYPES.shallow.sizeRange[0])
    : (f?.sizeLb != null ? f.sizeLb : FISH_TYPES.deep.sizeRange[0]);
  const bluegillStats = species === 'shallow' && f ? computeBluegillCatchStats({ ...f, sizeLb }) : null;

  return {
    species,
    name: fish.name,
    sizeLb,
    lengthIn: species === 'shallow'
      ? (bluegillStats?.lengthIn ?? computeCatchLengthInches(sizeLb, species))
      : computeCatchLengthInches(sizeLb, species),
    cash: species === 'shallow' ? (bluegillStats?.cash ?? BLUEGILL_SMALL_CASH) : 0,
    xp: species === 'shallow' ? (bluegillStats?.xp ?? BLUEGILL_BASE_XP) : 0,
    luck: species === 'shallow'
      ? (bluegillStats ? (bluegillStats.beega ? -2 : 2 + bluegillStats.luckBonus) : 2)
      : 0,
    beega: species === 'shallow' ? sizeLb >= 1 : sizeLb >= 20,
  };
}

function formatCatchRevealLine(label, value) {
  return `${label}: ${value}`;
}

function drawCatchRevealSilhouette(species, x, y, w, h, sizeLb) {
  const colors = species === 'deep'
    ? {
        body: '#654526',
        belly: '#a77945',
        stripe: '#3b2719',
        fin: '#cfb07b',
        eye: '#0f0d0b',
      }
    : {
        body: '#4e9ac8',
        belly: '#cfe8bf',
        stripe: '#2e6b98',
        fin: '#eef3cf',
        eye: '#102233',
      };

  const [minLb, maxLb] = species === 'deep' ? FISH_TYPES.deep.sizeRange : FISH_TYPES.shallow.sizeRange;
  const ratio = clamp((sizeLb - minLb) / (maxLb - minLb), 0, 1);
  const scale = species === 'deep'
    ? 0.88 + ratio * 0.24
    : 0.84 + ratio * 0.28;
  const bodyW = (species === 'deep' ? 132 : 106) * scale;
  const bodyH = (species === 'deep' ? 44 : 34) * scale;
  const cx = x + w * 0.5;
  const cy = y + h * 0.58;
  const hookY = y + 10;
  const hookX = cx + bodyW * 0.08;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(species === 'deep' ? -0.08 : -0.03);

  // Main body.
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyW * 0.38, bodyH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly / highlight.
  ctx.fillStyle = colors.belly;
  ctx.beginPath();
  ctx.ellipse(bodyW * 0.03, bodyH * 0.1, bodyW * 0.28, bodyH * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail.
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.36, 0);
  ctx.lineTo(-bodyW * 0.56, -bodyH * 0.34);
  ctx.lineTo(-bodyW * 0.54, bodyH * 0.34);
  ctx.closePath();
  ctx.fill();

  // Head / mouth.
  ctx.beginPath();
  ctx.moveTo(bodyW * 0.34, 0);
  ctx.quadraticCurveTo(bodyW * 0.44, -bodyH * 0.16, bodyW * 0.46, 0);
  ctx.quadraticCurveTo(bodyW * 0.44, bodyH * 0.16, bodyW * 0.34, 0);
  ctx.fill();

  // Fin.
  ctx.fillStyle = colors.fin;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.05, -bodyH * 0.18);
  ctx.lineTo(bodyW * 0.08, -bodyH * 0.62);
  ctx.lineTo(bodyW * 0.18, -bodyH * 0.12);
  ctx.closePath();
  ctx.fill();

  // Species accents.
  ctx.strokeStyle = colors.stripe;
  ctx.lineWidth = Math.max(2, bodyH * 0.08);
  ctx.lineCap = 'round';
  if (species === 'deep') {
    ctx.beginPath();
    ctx.moveTo(-bodyW * 0.18, -bodyH * 0.14);
    ctx.lineTo(bodyW * 0.22, bodyH * 0.06);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-bodyW * 0.12, bodyH * 0.02);
    ctx.lineTo(bodyW * 0.2, bodyH * 0.18);
    ctx.stroke();
  } else {
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.1 + i * 8, -bodyH * 0.22);
      ctx.lineTo(-bodyW * 0.05 + i * 8, bodyH * 0.2);
      ctx.stroke();
    }
  }

  // Eye.
  ctx.fillStyle = colors.eye;
  ctx.beginPath();
  ctx.arc(bodyW * 0.3, -bodyH * 0.05, Math.max(1.8, bodyH * 0.07), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Stringer / gill-scale rig above the fish.
  ctx.strokeStyle = '#d7c39c';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, hookY - 2);
  ctx.lineTo(cx, cy - bodyH * 0.48);
  ctx.stroke();

  ctx.strokeStyle = '#8a6b44';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hookX, hookY);
  ctx.quadraticCurveTo(hookX + 5, hookY + 7, hookX - 2, hookY + 13);
  ctx.stroke();

  ctx.strokeStyle = '#4d3a24';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(hookX + 1, hookY + 1, 3, 0.6, Math.PI * 1.85);
  ctx.stroke();
}

function drawCatchRevealCard(fish, stats, x, y, w, h) {
  const art = catchRevealArtImages[stats.species];
  const topLineY = y + 24;
  ctx.textAlign = 'left';

  ctx.save();
  drawPanel(x, y, w, h, { radius: 8, fill: 'rgba(10,17,15,0.7)', border: PANEL_BORDER_STRONG, borderWidth: 2 });
  ctx.restore();

  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#ffe66d';
  ctx.textAlign = 'center';
  ctx.fillText(game.resultMessage, x + w / 2, topLineY);

  if (!mobileMode) {
    const fishBox = { x: x + 18, y: y + 40, w: 202, h: h - 66 };
    const statsBox = { x: x + 230, y: y + 40, w: w - 246, h: h - 66 };
    const fishAreaW = fishBox.w;
    const fishAreaH = fishBox.h;
    const fishH = stats.species === 'deep' ? Math.min(112, fishAreaH - 8) : Math.min(96, fishAreaH - 12);
    const fishW = fishH * (stats.species === 'deep' ? 2.3 : 2.0);
    const fishX = fishBox.x + (fishAreaW - fishW) / 2;
    const fishY = fishBox.y + (fishAreaH - fishH) / 2 - 2;

    if (!art || !art.complete || !art.naturalWidth) {
      drawCatchRevealSilhouette(stats.species, fishX, fishY, fishW, fishH, stats.sizeLb);
    } else {
      ctx.drawImage(art, fishX, fishY, fishW, fishH);
    }

    drawPanel(statsBox.x, statsBox.y, statsBox.w, statsBox.h, { radius: 7, fill: PANEL_FILL_SOFT });
    ctx.font = `${mobileMode ? 12 : 14}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = INK_DIM;
    const lineGap = 18;
    const lines = [
      formatCatchRevealLine('Species', fish.name),
      formatCatchRevealLine('Weight', formatWeight(stats.sizeLb)),
      formatCatchRevealLine('Length', formatLength(stats.lengthIn)),
      ...(fish.name === 'Bluegill' ? [formatCatchRevealLine('Cash', `+${formatMoney(stats.cash)}`)] : []),
      formatCatchRevealLine('XP / Luck', `${formatSigned(stats.xp)} XP, ${formatSigned(stats.luck)} Luck`),
      formatCatchRevealLine('Beega', stats.beega ? 'YES!' : 'no'),
    ];
    const startY = statsBox.y + 24;
    for (let i = 0; i < lines.length; i += 1) {
      const [label, value] = lines[i].split(': ');
      ctx.fillStyle = INK_DIM;
      ctx.fillText(`${label}:`, statsBox.x + 14, startY + i * lineGap);
      ctx.fillStyle = INK;
      ctx.fillText(value, statsBox.x + 105, startY + i * lineGap);
    }
  } else {
    const fishBox = { x: x + 20, y: y + 34, w: w - 40, h: 88 };
    const fishH = stats.species === 'deep' ? 84 : 76;
    const fishW = fishH * (stats.species === 'deep' ? 2.3 : 2.0);
    const fishX = fishBox.x + (fishBox.w - fishW) / 2;
    const fishY = fishBox.y + (fishBox.h - fishH) / 2 - 2;
    if (!art || !art.complete || !art.naturalWidth) {
      drawCatchRevealSilhouette(stats.species, fishX, fishY, fishW, fishH, stats.sizeLb);
    } else {
      ctx.drawImage(art, fishX, fishY, fishW, fishH);
    }

    const statsY = y + 130;
    drawPanel(x + 14, statsY - 16, w - 28, 104, { radius: 6, fill: PANEL_FILL_SOFT });
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    const leftX = x + 28;
    const valueX = leftX + 68;
    const row1 = statsY + 2;
    const row2 = statsY + 20;
    const row3 = statsY + 38;
    const row4 = statsY + 56;
    const row5 = statsY + 74;
    const row6 = statsY + 92;
    ctx.fillStyle = INK_DIM;
    ctx.fillText('Species:', leftX, row1);
    ctx.fillStyle = INK;
    ctx.fillText(fish.name, valueX, row1);
    ctx.fillStyle = INK_DIM;
    ctx.fillText('Weight:', leftX, row2);
    ctx.fillStyle = INK;
    ctx.fillText(formatWeight(stats.sizeLb), valueX, row2);
    ctx.fillStyle = INK_DIM;
    ctx.fillText('Length:', leftX, row3);
    ctx.fillStyle = INK;
    ctx.fillText(formatLength(stats.lengthIn), valueX, row3);
    if (fish.name === 'Bluegill') {
      ctx.fillStyle = INK_DIM;
      ctx.fillText('Cash:', leftX, row4);
      ctx.fillStyle = INK;
      ctx.fillText(`+${formatMoney(stats.cash)}`, valueX, row4);
      ctx.fillStyle = INK_DIM;
      ctx.fillText('XP / Luck:', leftX, row5);
      ctx.fillStyle = INK;
      ctx.fillText(`${formatSigned(stats.xp)} XP, ${formatSigned(stats.luck)} Luck`, valueX, row5);
      ctx.fillStyle = INK_DIM;
      ctx.fillText('Beega:', leftX, row6);
      ctx.fillStyle = INK;
      ctx.fillText(stats.beega ? 'YES!' : 'no', valueX, row6);
    } else {
      ctx.fillStyle = INK_DIM;
      ctx.fillText('XP / Luck:', leftX, row4);
      ctx.fillStyle = INK;
      ctx.fillText(`${formatSigned(stats.xp)} XP, ${formatSigned(stats.luck)} Luck`, valueX, row4);
      ctx.fillStyle = INK_DIM;
      ctx.fillText('Beega:', leftX, row5);
      ctx.fillStyle = INK;
      ctx.fillText(stats.beega ? 'YES!' : 'no', valueX, row5);
    }
  }
  ctx.textAlign = 'center';
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
  // Scavenge nodes only exist on the Level 1 starter pond.
  if (game.location !== 'level1') return null;
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
  // The bench (and the gear-upgrade purchase it offers) only exists on the
  // Level 1 starter pond, even though Level 2 reuses the same grid coords.
  if (game.location !== 'level1') return false;
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

  // Tree and bench are Level 1 props only — Level 2 reuses the same pond
  // coordinates for water collision but has an open bank otherwise.
  if (game.location === 'level1') {
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
  }

  return null;
}

// V17: the level-progression gate to Level 2. Sits at a fixed bank spot on
// both maps (same grid coordinates reused for both locations), so walking
// up to it reads as "the trail out of/back into this pond" either way.
function level2Unlocked() {
  return currentLevel() >= LEVEL2_UNLOCK_LEVEL;
}

function nearTravelGate() {
  return dist(player.x, player.y, travelGate.x, travelGate.y) < TRAVEL_GATE_RANGE;
}

function travelPrompt() {
  if (game.state !== 'scavenge' || !nearTravelGate()) return null;
  if (game.location === 'level1') {
    if (!level2Unlocked()) {
      return `Reach Level ${LEVEL2_UNLOCK_LEVEL} to unlock the trail to The Gutter`;
    }
    return 'Press E to follow the trail to The Gutter (Level 2)';
  }
  return 'Press E to head back to the starter pond';
}

function tryTravel() {
  if (game.state !== 'scavenge' || !nearTravelGate()) return false;

  if (game.location === 'level1') {
    if (!level2Unlocked()) return false;
    game.location = 'level2';
    player.x = travelGate.x + TRAVEL_ARRIVE_OFFSET.x;
    player.y = travelGate.y + TRAVEL_ARRIVE_OFFSET.y;
    setMessage('You follow the trail down to The Gutter.', 4000);
    unlockAchievement('level2-unlocked', 'New Water!', 'The Gutter opens up beyond the starter pond — same rig, tougher water.');
    saveGame();
    return true;
  }

  game.location = 'level1';
  player.x = travelGate.x + TRAVEL_ARRIVE_OFFSET.x;
  player.y = travelGate.y + TRAVEL_ARRIVE_OFFSET.y;
  setMessage('You head back to the starter pond.', 3200);
  saveGame();
  return true;
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

function castDirectionLabel(direction) {
  if (direction <= -0.35) return 'left';
  if (direction >= 0.35) return 'right';
  return 'center';
}

function castDistanceLabel(power) {
  if (power >= 0.72) return 'long';
  if (power >= 0.38) return 'medium';
  return 'short';
}

function pickFishForCast(direction, power) {
  const deepReach = deepCastSpot() && direction >= 0.18 && power >= 0.62;
  return deepReach ? { ...FISH_TYPES.deep } : { ...FISH_TYPES.shallow };
}

function closeResultView() {
  if (game.state !== 'result') return false;
  game.fishing = null;
  game.resultCatch = null;
  game.state = 'scavenge';
  if (!rigAssembled()) {
    setMessage('Result acknowledged. Recover the rusty hook before you cast again.', 4400);
  } else {
    setMessage('Result acknowledged. You are back on the bank.', 3200);
  }
  return true;
}

function releaseCast(autoRelease = false) {
  const f = game.fishing;
  if (!f || f.phase !== 'casting') return false;

  const now = performance.now();
  if (now < f.canReleaseAt && !autoRelease) {
    setMessage('Hold a moment longer to commit the cast.', 1200);
    return false;
  }

  const castPower = clamp(f.castPower, 0.08, 1);
  const castDirection = clamp(f.castDirection, -1, 1);
  const castTravelMs = Math.round(
    CAST_TRAVEL_PAUSE_SHORT_MS +
    (CAST_TRAVEL_PAUSE_LONG_MS - CAST_TRAVEL_PAUSE_SHORT_MS) * castPower
  );
  const fish = pickFishForCast(castDirection, castPower);

  f.castPower = castPower;
  f.castDirection = castDirection;
  f.castTravelMs = castTravelMs;
  f.fish = fish;
  f.phase = 'waiting';
  f.strikeAt = now + castTravelMs;
  f.distance = fish.startDistance;
  f.marker = 0.5;
  f.markerVelocity = 0;
  f.skillOutput = 0;
  f.luckModifier = currentLuckModifier();
  f.totalPower = 0;
  f.wasInSafeZone = true;
  f.nextTickAt = f.strikeAt + 1000;

  const directionLabel = castDirectionLabel(castDirection);
  const distanceLabel = castDistanceLabel(castPower);
  const fishHint = fish.name === LEGENDARY_BASS_NAME
    ? `${LEGENDARY_BASS_NAME} turns toward the bobber.`
    : 'Shallow water stirs near the bank.';
  setMessage(`Cast released ${distanceLabel} ${directionLabel}. ${fishHint}`, 3200);
  return true;
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

  const now = performance.now();

  game.fishing = {
    fish: { ...FISH_TYPES.shallow },
    phase: 'casting',
    startedAt: now,
    strikeAt: 0,
    nextTickAt: now + 1000,
    canReleaseAt: now + CAST_RELEASE_MIN_MS,
    forceReleaseAt: now + CAST_RELEASE_MAX_MS,
    castPower: 0,
    castDirection: 0,
    castTravelMs: 0,
    distance: FISH_TYPES.shallow.startDistance,
    marker: 0.5,
    markerVelocity: 0,
    skillOutput: 0,
    luckModifier: currentLuckModifier(),
    totalPower: 0,
    bobberSeed: Math.random() * Math.PI * 2,
    wasInSafeZone: true,
    sizeLb: null,
    skillPenalty: 0,
    inBreakZone: false,
    breakChance: 0,
  };

  game.state = 'fishing';
  SFX.cast();
  setMessage('Hold LEFT/RIGHT to shape cast. Press CAST/F to release.', 3800);
  if (!game.firstShallowCastDialogShown) {
    game.firstShallowCastDialogShown = true;
    showDialog('Short tosses stay shallow. Hold and throw long toward the right-side deep water for bigger risk.');
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
  const f = game.fishing;
  if (options.xpReward) {
    awardXP(options.xpReward);
  }
  SFX.snap();
  loseHook();
  if (f) {
    f.phase = 'result';
  }
  game.state = 'result';
  game.resultMessage = text;
  game.resultDetail = options.xpReward
    ? `+${options.xpReward} XP for the fight. Recover a rusty tab before your next cast.`
    : 'Recover a rusty tab before your next cast.';
  game.resultCatch = null;
}

// Newest-first, capped log of landed catches — not shown anywhere yet, but
// persisted so the settings/profile Phase 2 history view has real data once
// it's built (see docs/requirements/feature-log.md "Settings/profile/account
// corner — Phase 2").
function recordCatch(entry) {
  game.catchHistory.unshift({ caughtAt: Date.now(), ...entry });
  game.catchHistory = game.catchHistory.slice(0, CATCH_HISTORY_MAX);
}

function landFish(fish, f = null) {
  let bluegillResultText = 'NOICE catch, rookie!';
  if (fish.name === 'Bluegill') {
    const catchStats = f ? computeBluegillCatchStats(f) : {
      fightSeconds: 0,
      sizeLb: 0.25,
      lengthIn: computeCatchLengthInches(0.25, 'shallow'),
      xp: BLUEGILL_BASE_XP,
      luckBonus: 0,
      cash: BLUEGILL_SMALL_CASH,
      beega: false,
    };
    // A fast, controlled fight (marker held tight in the safe zone) earns a
    // speed bonus on top of the base catch reward; a beega fish already costs
    // luck for hooking something that big, so the speed bonus doesn't apply.
    const luckGain = catchStats.beega ? -2 : 2 + catchStats.luckBonus;
    bluegillResultText = catchStats.beega ? "NOW THAT'S A BEEGA FISH!" : 'NOICE catch, rookie!';
    awardXP(catchStats.xp);
    adjustLuck(luckGain);
    game.cash += catchStats.cash;
    game.resultDetail = `${formatWeight(catchStats.sizeLb)} · ${formatLength(catchStats.lengthIn)} · +${catchStats.xp} XP · ${formatSigned(luckGain)} Luck · +${formatMoney(catchStats.cash)}`;
    game.resultCatch = {
      ...buildCatchRevealStats(fish, f),
      lengthIn: catchStats.lengthIn,
      xp: catchStats.xp,
      luck: luckGain,
      cash: catchStats.cash,
      beega: catchStats.beega,
    };
    setMessage(
      `${catchStats.beega ? "NOW THAT'S A BEEGA FISH!" : 'NOICE catch, rookie!'} ${formatWeight(catchStats.sizeLb)}, ${formatLength(catchStats.lengthIn)}, +${catchStats.xp} XP, ${formatSigned(luckGain)} Luck, +${formatMoney(catchStats.cash)}.`,
      5000
    );
    recordCatch({
      species: fish.name,
      sizeLb: catchStats.sizeLb,
      lengthIn: catchStats.lengthIn,
      xp: catchStats.xp,
      luckChange: luckGain,
      cash: catchStats.cash,
      beega: catchStats.beega,
    });
    if (!game.hasCaughtFish) {
      game.hasCaughtFish = true;
      unlockAchievement('first_catch', 'FIRST CATCH', 'You landed your first fish. The hustle is officially on.');
      showDialog('First fish in hand. Tiny win, big signal: you can build a legend from scraps.');
    }
  } else {
    const sizeLb = f && f.sizeLb != null ? f.sizeLb : null;
    const lengthIn = sizeLb != null ? computeCatchLengthInches(sizeLb, 'deep') : null;
    game.resultDetail = sizeLb != null ? `${formatWeight(sizeLb)} · ${formatLength(lengthIn)}` : '';
    game.resultCatch = sizeLb != null ? {
      species: 'deep',
      name: fish.name,
      sizeLb,
      lengthIn,
      cash: 0,
      xp: 0,
      luck: 0,
      beega: sizeLb >= 20,
    } : null;
    setMessage(`Caught ${fish.name}.`, 4200);
    recordCatch({
      species: fish.name,
      sizeLb,
      lengthIn,
      xp: 0,
      luckChange: 0,
      cash: 0,
      beega: false,
    });
  }
  SFX.catch();
  saveGame();
  if (game.fishing) {
    game.fishing.phase = 'result';
  }
  game.state = 'result';
  game.resultMessage = fish.name === 'Bluegill'
    ? bluegillResultText
    : `Caught ${fish.name}.`;
}

function resolveFishingTick() {
  const f = game.fishing;
  if (!f || f.phase !== 'fight') return;

  f.skillOutput = Math.max(0, computeSkillOutput(f) - f.skillPenalty);
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

  // Break-risk zone: the last ~15% of maxDistance is a size-scaled danger
  // zone instead of a hard wall. Every tick spent in it rolls a break check
  // (bigger fish + lower skill raise the odds); a fish can snap the line
  // here before distance ever hard-caps. A failed roll (line holds) isn't a
  // free pass — it costs skillOutput for the rest of the fight, representing
  // a jerked, less-controlled rod. See docs/design/line-tension-mechanics.md §3.
  const breakZoneStart = f.fish.maxDistance * BREAK_ZONE_FRACTION;
  f.inBreakZone = f.distance >= breakZoneStart;
  f.breakChance = 0;

  if (f.inBreakZone) {
    const sizeFac = sizeFactor(f.sizeLb, f.fish.referenceSizeLb);
    const skillFactor = clamp(f.skillOutput / 100, 0, 1);
    f.breakChance = clamp(0.05 + 0.35 * sizeFac - skillFactor * 0.2, 0.05, 0.6);

    if (Math.random() < f.breakChance) {
      if (f.fish.name === LEGENDARY_BASS_NAME) {
        snapLine(`${f.fish.name} tore free. The hook is gone.`, { xpReward: 3 });
      } else {
        snapLine(`${f.fish.name} tore free. The hook is gone.`);
      }
      return;
    }

    f.skillPenalty += SKILL_NEAR_MISS_PENALTY;
    setMessage('NEAR MISS! The line held, but the jerk cost you control.', 2600);
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

  const keySteer = (isDown('d') || isDown('arrowright') ? 1 : 0) - (isDown('a') || isDown('arrowleft') ? 1 : 0);
  const steer = clamp(keySteer + dragSteer, -1, 1);

  if (f.phase === 'casting') {
    f.castDirection = clamp(f.castDirection + steer * 1.45 * seconds, -1, 1);
    if (Math.abs(steer) > 0.05) {
      f.castPower = clamp(f.castPower + 0.9 * seconds, 0, 1);
    } else {
      f.castPower = clamp(f.castPower - 0.18 * seconds, 0, 1);
    }
    if (now >= f.forceReleaseAt) {
      releaseCast(true);
    }
    return;
  }

  if (f.phase === 'waiting' && now >= f.strikeAt) {
    f.phase = 'fight';
    f.sizeLb = rollFightSize(f.fish);
    f.fish.resistance = Math.round(f.fish.resistance * sizeFactor(f.sizeLb, f.fish.referenceSizeLb));
    setMessage(`${f.fish.name} struck! Keep the marker in the safe zone.`, 2200);
    f.nextTickAt = now + 1000;
  }

  if (f.phase !== 'fight') return;

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
  if (game.paused) return;
  if (game.state === 'scavenge') {
    updateExploration();
    if (rigAssembled()) announceRigAssembly();
  } else if (game.state === 'fishing') {
    updateFishing(now, dt);
  }
}

// --- V15 shared visual system -----------------------------------------
// One motif for every HUD/menu surface: darker layered panels with a warm
// brass/tackle-shop accent instead of flat black boxes + plain white
// strokes. `drawPanel` is the one place that motif is defined so title,
// pause, HUD, inventory, and fishing panels all read as the same UI.
const PANEL_FILL = 'rgba(11,17,15,0.86)';
const PANEL_FILL_SOFT = 'rgba(11,17,15,0.58)';
const PANEL_BORDER = 'rgba(198,168,110,0.55)';
const PANEL_BORDER_STRONG = 'rgba(216,180,106,0.85)';
const PANEL_HIGHLIGHT = 'rgba(255,255,255,0.05)';
const ACCENT_BRASS = '#d8b46a';
const INK = '#eee6d6';
const INK_DIM = 'rgba(238,230,214,0.68)';

function drawPanel(x, y, w, h, opts = {}) {
  const { fill = PANEL_FILL, border = PANEL_BORDER, radius = 8, borderWidth = 1.5 } = opts;
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = PANEL_HIGHLIGHT;
  ctx.fillRect(x, y, w, Math.min(4, h / 3));
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h);
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.restore();
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
  if (game.location === 'level2') {
    drawLevel2World();
    return;
  }
  drawLevel1World();
}

function drawTravelGate() {
  const gx = toPxX(travelGate.x);
  const gy = toPxY(travelGate.y);
  ctx.save();
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(gx - 3 * propScale, gy - 26 * propScale, 6 * propScale, 26 * propScale);
  ctx.fillStyle = '#3f2c1a';
  ctx.fillRect(gx - 16 * propScale, gy - 30 * propScale, 32 * propScale, 10 * propScale);
  ctx.font = `bold ${Math.max(8, 9 * propScale)}px monospace`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  const label = game.location === 'level1'
    ? (level2Unlocked() ? 'TRAIL: THE GUTTER' : `TRAIL: LOCKED (LV${LEVEL2_UNLOCK_LEVEL})`)
    : 'TRAIL: STARTER POND';
  ctx.fillText(label, gx, gy - 24 * propScale);
  ctx.textAlign = 'left';
  ctx.restore();
}

// V17: Level 2 ("The Gutter") — reuses the Level 1 pond/deep-cast
// coordinates for collision and casting, but swaps the drawn ground for the
// V8 pond-progression board art instead of the procedural Level 1 scene.
function drawLevel2World() {
  if (level2BackgroundImage && level2BackgroundImage.complete && level2BackgroundImage.naturalWidth) {
    // Crop off the reference art's own baked-in "Valhalla Proving Grounds"
    // title band (top ~22%) so it doesn't collide with the SKL/LUCK/CASH
    // HUD row drawn over the same corner.
    const img = level2BackgroundImage;
    const cropTop = img.naturalHeight * 0.22;
    ctx.drawImage(img, 0, cropTop, img.naturalWidth, img.naturalHeight - cropTop, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#3a3a22';
    ctx.fillRect(0, 0, W, H);
  }

  if (game.state === 'scavenge' && deepCastSpot()) {
    ctx.font = `bold ${mobileMode ? 16 : 12}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText('Deep water: something big lives here.', toPxX(36.2), toPxY(18.2));
  }

  drawTravelGate();
}

function drawLevel1World() {
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

  drawTravelGate();
}

function drawNodes() {
  if (game.location !== 'level1') return;
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
  ctx.fillStyle = INK;
  ctx.fillText(`${label} ${valueLabel}`, x, y - 5);
  drawPanel(x, y, width, h, { radius: 4 });
  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 2, y + 2, (width - 4) * clamp(value, 0, 1), h - 4);
}

function drawLuckMeter(x, y, width = 170) {
  const h = 16;
  const center = x + width / 2;
  const magnitude = clamp(Math.abs(game.luck) / 100, 0, 1);
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = INK;
  ctx.fillText(`LUCK ${formatSigned(game.luck)}`, x, y - 5);
  drawPanel(x, y, width, h, { radius: 4 });
  ctx.fillStyle = 'rgba(238,230,214,0.22)';
  ctx.fillRect(center - 1, y + 1, 2, h - 2);
  if (game.luck < 0) {
    ctx.fillStyle = 'rgba(214,94,74,0.92)';
    ctx.fillRect(center - (width / 2) * magnitude, y + 2, (width / 2) * magnitude, h - 4);
  } else if (game.luck > 0) {
    ctx.fillStyle = 'rgba(90,182,140,0.92)';
    ctx.fillRect(center, y + 2, (width / 2) * magnitude, h - 4);
  }
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
      drawPanel(x, y, w, 20, {
        radius: 5,
        fill: n.collected ? (upgraded ? 'rgba(84,64,132,0.85)' : 'rgba(58,96,58,0.85)') : PANEL_FILL_SOFT,
        border: n.collected ? (upgraded ? 'rgba(216,196,255,0.7)' : 'rgba(160,224,160,0.65)') : PANEL_BORDER,
      });
      if (n.collected && upgraded && drawGearCardIcon(n.id, x + 2, y + 1, 16, 18)) {
        // icon drawn; skip the text label so it doesn't fight the tiny art
      } else {
        ctx.fillStyle = n.collected ? INK : INK_DIM;
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
    drawPanel(x, y, 100, 24, {
      radius: 6,
      fill: n.collected ? (upgraded ? 'rgba(84,64,132,0.85)' : 'rgba(58,96,58,0.85)') : PANEL_FILL_SOFT,
      border: n.collected ? (upgraded ? 'rgba(216,196,255,0.7)' : 'rgba(160,224,160,0.65)') : PANEL_BORDER,
    });

    if (n.collected && upgraded && drawGearCardIcon(n.id, x + 2, y + 2, 20, 20)) {
      ctx.fillStyle = INK;
      ctx.fillText('✓ ' + n.label, x + 26, y + 16);
    } else {
      ctx.fillStyle = n.collected ? INK : INK_DIM;
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
    drawPanel(x, y - 20, w, 30, { radius: 6, fill: PANEL_FILL_SOFT });
    ctx.fillStyle = INK;
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
  drawPanel(x - 6, y - 6, w, h, { radius: 6, fill: 'rgba(11,17,15,0.62)' });
  ctx.font = '12px monospace';
  ctx.fillStyle = INK;
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

  ctx.fillStyle = INK;
  ctx.font = `bold ${mobileMode ? 18 : 22}px monospace`;
  ctx.fillText(toast.title, x + 16, y + 46);

  ctx.font = `${mobileMode ? 12 : 13}px monospace`;
  ctx.fillStyle = INK_DIM;
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
  drawPanel(x, y, w, h, { radius: 8, fill: 'rgba(10,17,15,0.82)', border: PANEL_BORDER_STRONG, borderWidth: 2 });
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
  const phaseLabel = f.phase === 'casting'
    ? 'AIM CAST'
    : f.phase === 'waiting'
      ? 'LINE OUT'
      : f.phase === 'fight'
        ? 'REELING'
        : 'RESULT';

  if (mobileMode) {
    ctx.save();
    const panelW = Math.min(300, W - 24);
    const panelX = (W - panelW) / 2;
    // Sits below the SKL/LUCK/CASH meter row (occupies roughly y 14-68) so
    // the two panels stack instead of overlapping.
    const panelY = 86;
    const panelH = 96;
    drawPanel(panelX, panelY, panelW, panelH, { radius: 8 });
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = INK;
    ctx.fillText(`${f.fish.name}  (resist ${f.fish.resistance})`, panelX + 12, panelY + 20);
    ctx.fillText(`POWER ${f.totalPower}  LUCK ${formatSigned(game.luck)}`, panelX + 12, panelY + 40);
    ctx.font = '11px monospace';
    ctx.fillStyle = f.inBreakZone ? '#e08a5a' : INK_DIM;
    ctx.fillText(
      f.sizeLb != null
        ? `${formatWeight(f.sizeLb)}${f.inBreakZone ? ` · RISK ${Math.round(f.breakChance * 100)}%` : ''}${f.skillPenalty > 0 ? ` · -${f.skillPenalty} skill` : ''}`
        : '',
      panelX + 12,
      panelY + 58
    );
    ctx.fillStyle = INK_DIM;
    ctx.fillText(`STATE: ${phaseLabel} · BACK closes/flees`, panelX + 12, panelY + 76);
    ctx.restore();

    if (f.phase === 'casting') {
      const castW = panelW;
      const castX = panelX;
      const castY = panelY + panelH + 8;
      drawPanel(castX, castY, castW, 46, { radius: 8 });
      ctx.fillStyle = 'rgba(238,230,214,0.16)';
      ctx.fillRect(castX + 10, castY + 24, castW - 20, 12);
      ctx.fillStyle = ACCENT_BRASS;
      ctx.fillRect(castX + 10, castY + 24, (castW - 20) * f.castPower, 12);
      ctx.fillStyle = INK;
      ctx.font = '11px monospace';
      ctx.fillText(`CAST ${castDistanceLabel(f.castPower)} ${castDirectionLabel(f.castDirection)} · CAST/F to throw`, castX + 10, castY + 16);
    }

    const meterW = Math.min(300, W - 40);
    const meterX = (W - meterW) / 2;
    const meterY = H - TOUCH_UI_RESERVE - 34;
    const meterH = 20;
    drawPanel(meterX, meterY, meterW, meterH, { radius: 6, fill: 'rgba(11,17,15,0.7)' });

    const safeStart = meterX + meterW * (0.5 - f.fish.safeZoneWidth / 2);
    const safeWidth = meterW * f.fish.safeZoneWidth;
    ctx.fillStyle = 'rgba(90,182,140,0.8)';
    ctx.fillRect(safeStart, meterY, safeWidth, meterH);

    const markerX = meterX + meterW * f.marker;
    ctx.fillStyle = ACCENT_BRASS;
    ctx.fillRect(markerX - 2, meterY - 4, 4, meterH + 8);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = INK;
    ctx.fillText('TENSION', meterX, meterY - 6);
    return;
  }

  ctx.save();
  const panelX = W - 332;
  const panelY = 12;
  const panelW = 320;
  const panelH = 172;
  drawPanel(panelX, panelY, panelW, panelH, { radius: 8 });

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = INK;
  ctx.fillText(`FISH: ${f.fish.name}`, panelX + 14, panelY + 24);
  ctx.fillText(`RESISTANCE: ${f.fish.resistance}`, panelX + 14, panelY + 42);
  ctx.fillText(`XP: L${currentLevel()} ${formatXpProgress(game.skillXp)}`, panelX + 14, panelY + 60);
  ctx.fillText(`SKILL_OUTPUT: ${f.skillOutput}`, panelX + 14, panelY + 78);
  ctx.fillText(`LUCK: ${formatSigned(game.luck)}`, panelX + 178, panelY + 24);
  ctx.fillText(`GEAR_MOD: ${GEAR_MODIFIER}`, panelX + 178, panelY + 42);
  ctx.fillText(`LUCK_MOD: ${f.luckModifier}`, panelX + 178, panelY + 60);
  ctx.fillText(`TOTAL_POWER: ${f.totalPower}`, panelX + 178, panelY + 78);
  ctx.fillText(`SIZE: ${f.sizeLb != null ? formatWeight(f.sizeLb) : '—'}`, panelX + 14, panelY + 96);
  ctx.fillStyle = f.inBreakZone ? '#e08a5a' : INK;
  ctx.fillText(
    f.inBreakZone
      ? `RISK: ${Math.round(f.breakChance * 100)}%/tick`
      : 'RISK: clear',
    panelX + 178,
    panelY + 96
  );
  ctx.fillStyle = f.skillPenalty > 0 ? '#e08a5a' : INK;
  ctx.fillText(
    f.skillPenalty > 0 ? `NEAR MISS! -${f.skillPenalty} skill (rod jerked)` : '',
    panelX + 14,
    panelY + 114
  );
  ctx.fillStyle = INK_DIM;
  ctx.fillText(`STATE: ${phaseLabel}`, panelX + 14, panelY + 136);
  const controlHint = f.phase === 'fight'
    ? 'A/D: steer marker | ESC: close/flee'
    : 'A/D: aim+power | F: cast | ESC: close/flee';
  ctx.fillText(controlHint, panelX + 14, panelY + 154);
  ctx.restore();

  if (f.phase === 'casting') {
    const castX = panelX;
    const castY = panelY + panelH + 8;
    const castW = panelW;
    const castH = 44;
    ctx.save();
    drawPanel(castX, castY, castW, castH, { radius: 8 });
    ctx.fillStyle = 'rgba(238,230,214,0.16)';
    ctx.fillRect(castX + 12, castY + 24, castW - 24, 12);
    ctx.fillStyle = ACCENT_BRASS;
    ctx.fillRect(castX + 12, castY + 24, (castW - 24) * f.castPower, 12);
    ctx.fillStyle = INK;
    ctx.font = '11px monospace';
    ctx.fillText(`CAST ${castDistanceLabel(f.castPower)} ${castDirectionLabel(f.castDirection)} · press F to release`, castX + 12, castY + 16);
    ctx.restore();
  }

  // Sits beside the SKL/LUCK/CASH row (top-left cluster ends at x=555) so all
  // player stats read as one group instead of tension being stranded at the
  // bottom of the screen. Falls back to a second row under that cluster when
  // the window isn't wide enough to fit it before the FISH info panel.
  const cashMeterRight = 555;
  const tensionGap = 15;
  const roomToTheRight = panelX - cashMeterRight - tensionGap * 2;
  let meterX, meterY, meterW;
  if (roomToTheRight >= 160) {
    meterX = cashMeterRight + tensionGap;
    meterY = 30;
    meterW = clamp(roomToTheRight, 160, 260);
  } else {
    // Below the "STATIONARY ... STATE" banner (occupies y 66-116) so the
    // fallback row doesn't sit underneath it.
    meterX = 15;
    meterY = 130;
    meterW = 300;
  }
  const meterH = 16;
  drawPanel(meterX, meterY, meterW, meterH, { radius: 5, fill: 'rgba(11,17,15,0.7)' });

  const safeStart = meterX + meterW * (0.5 - f.fish.safeZoneWidth / 2);
  const safeWidth = meterW * f.fish.safeZoneWidth;
  ctx.fillStyle = 'rgba(90,182,140,0.8)';
  ctx.fillRect(safeStart, meterY, safeWidth, meterH);

  const markerX = meterX + meterW * f.marker;
  ctx.fillStyle = ACCENT_BRASS;
  ctx.fillRect(markerX - 2, meterY - 4, 4, meterH + 8);

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = INK;
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
    drawPanel(18, 66, 360, 50, { radius: 7, fill: 'rgba(11,17,15,0.5)' });
    ctx.restore();

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    const stateHeader = f.phase === 'fight' ? 'STATIONARY REELING STATE' : 'STATIONARY CASTING STATE';
    ctx.fillText(stateHeader, 28, 88);
    ctx.font = '13px monospace';
    ctx.fillStyle = INK_DIM;
    const phasePrompt = f.phase === 'casting'
      ? 'Hold A/D to shape cast distance+direction. Press F/CAST to throw.'
      : f.phase === 'waiting'
        ? `Line out... ${castDistanceLabel(f.castPower)} throw is traveling.`
        : f.phase === 'result'
          ? 'Result paused. Press ESC/BACK/CAST/E or click to return.'
          : 'Steer A / D to hold the marker in the safe zone — steady control reels the fish in faster.';
    ctx.fillText(phasePrompt, 28, 108);
  }

  const resultBandW = mobileMode ? Math.min(W - 32, 360) : 632;
  const resultBandX = (W - resultBandW) / 2;
  const catchRevealActive = game.resultCatch && game.resultMessage !== '';
  const resultBandH = catchRevealActive
    ? (mobileMode ? 238 : 184)
    : (game.resultDetail ? 72 : 52);
  if (game.state === 'result') {
    ctx.save();
    drawPanel(resultBandX, H * 0.28, resultBandW, resultBandH, { radius: 9, fill: 'rgba(11,17,15,0.55)', border: PANEL_BORDER_STRONG, borderWidth: 2 });
    ctx.restore();
  }

  if (game.state !== 'result') {
    drawFishingHUD();
  }
  drawHUD(now);

  if (game.state === 'result') {
    if (catchRevealActive) {
      drawCatchRevealCard(game.fishing?.fish ?? { name: game.resultMessage }, game.resultCatch, resultBandX, H * 0.28, resultBandW, resultBandH);
      ctx.font = `${mobileMode ? 12 : 13}px monospace`;
      ctx.fillStyle = INK_DIM;
      ctx.textAlign = 'center';
      ctx.fillText('Press BACK/ESC/CAST/E or click to close', W / 2, H * 0.28 + resultBandH - 14);
    } else {
      ctx.font = `bold ${mobileMode ? 18 : 24}px monospace`;
      ctx.fillStyle = '#ffe66d';
      ctx.textAlign = 'center';
      ctx.fillText(game.resultMessage, W / 2, H * 0.28 + 30);
      let hintY = H * 0.28 + 48;
      if (game.resultDetail) {
        ctx.font = `${mobileMode ? 12 : 14}px monospace`;
        ctx.fillStyle = INK;
        ctx.fillText(game.resultDetail, W / 2, hintY);
        hintY += 20;
      }
      ctx.font = `${mobileMode ? 12 : 13}px monospace`;
      ctx.fillStyle = INK_DIM;
      ctx.fillText('Press BACK/ESC/CAST/E or click to close', W / 2, hintY);
      ctx.textAlign = 'left';
    }
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
    ctx.fillStyle = INK;
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
        drawPanel(x, y - 18, w, 24, { radius: 6, fill: PANEL_FILL_SOFT });
        ctx.fillStyle = INK;
        ctx.fillText(prompt, x + 10, y);
      }
      if (canCast()) {
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = INK;
        ctx.fillText('Press CAST to fish from the bank', 14, 134);
      }
      const upgradePrompt = gearUpgradePrompt();
      if (upgradePrompt && !near) {
        ctx.font = 'bold 14px monospace';
        const w = Math.min(W - 28, ctx.measureText(upgradePrompt).width + 24);
        const x = 14;
        const y = 154;
        drawPanel(x, y - 18, w, 24, { radius: 6, fill: PANEL_FILL_SOFT });
        ctx.fillStyle = INK;
        ctx.fillText(upgradePrompt, x + 10, y);
      }
      const gatePrompt = travelPrompt();
      if (gatePrompt && !near && !upgradePrompt) {
        ctx.font = 'bold 13px monospace';
        const w = Math.min(W - 28, ctx.measureText(gatePrompt).width + 24);
        const x = 14;
        const y = 154;
        drawPanel(x, y - 18, w, 24, { radius: 6, fill: PANEL_FILL_SOFT });
        ctx.fillStyle = INK;
        ctx.fillText(gatePrompt, x + 10, y);
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
      ctx.fillStyle = INK_DIM;
      ctx.fillText('An ugly, terrible rig. But it will get a line in the water.', W - 20, H - 6);
      ctx.textAlign = 'left';
    }

    if (canCast()) {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = INK;
      ctx.fillText('Press F to cast from the bank', 20, 78);
    }

    const upgradePrompt = gearUpgradePrompt();
    if (upgradePrompt) {
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.fillText(upgradePrompt, toPxX(bench.x), toPxY(bench.y) - 26 * propScale);
      ctx.textAlign = 'left';
    }

    const gatePrompt = travelPrompt();
    if (gatePrompt) {
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.fillText(gatePrompt, toPxX(travelGate.x), toPxY(travelGate.y) - 34 * propScale);
      ctx.textAlign = 'left';
    }
  }

  if (now < game.messageUntil && game.message) {
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = INK;
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

// Small gear icon, top-right, shown whenever the game is pauseable. Drawn
// as plain canvas shapes (no asset) since it only needs to read as "menu".
function drawPauseButton() {
  const cx = W - 26;
  const cy = 26;
  const r = 15;
  pauseButtonRect = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };

  ctx.save();
  ctx.fillStyle = PANEL_FILL;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.strokeStyle = ACCENT_BRASS;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  const barW = 12;
  [-5, 0, 5].forEach(dy => {
    ctx.beginPath();
    ctx.moveTo(cx - barW / 2, cy + dy);
    ctx.lineTo(cx + barW / 2, cy + dy);
    ctx.stroke();
  });
  ctx.restore();
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(4,7,6,0.72)';
  ctx.fillRect(0, 0, W, H);

  const panelW = Math.min(W - 60, 320);
  const panelH = 170;
  const panelX = (W - panelW) / 2;
  const panelY = (H - panelH) / 2;

  drawPanel(panelX, panelY, panelW, panelH, { radius: 10, border: PANEL_BORDER_STRONG, borderWidth: 2 });

  ctx.textAlign = 'center';
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ffe66d';
  ctx.fillText('PAUSED', W / 2, panelY + 42);

  const resumeY = panelY + 90;
  const titleY = panelY + 130;
  ctx.font = 'bold 15px monospace';

  ctx.fillStyle = '#4fc3f7';
  ctx.fillText('Resume', W / 2, resumeY);
  pauseResumeRect = { x: panelX + 20, y: resumeY - 20, w: panelW - 40, h: 28 };

  ctx.fillStyle = '#e08a5a';
  ctx.fillText('Return to Title', W / 2, titleY);
  pauseTitleRect = { x: panelX + 20, y: titleY - 20, w: panelW - 40, h: 28 };

  if (game.guestName) {
    ctx.font = '11px monospace';
    ctx.fillStyle = INK_DIM;
    ctx.fillText(game.guestName, W / 2, panelY + panelH - 12);
  }

  ctx.textAlign = 'left';
  ctx.restore();
}

function drawTitleScreen(now) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0f1a15');
  bg.addColorStop(1, '#070c0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const panelW = mobileMode ? Math.min(W - 32, 340) : Math.min(W - 80, 520);
  const panelH = mobileMode ? 220 : 240;
  const panelX = (W - panelW) / 2;
  const panelY = (H - panelH) / 2;

  ctx.save();
  drawPanel(panelX, panelY, panelW, panelH, { radius: 12, fill: 'rgba(11,17,15,0.72)', border: PANEL_BORDER_STRONG, borderWidth: 2 });
  ctx.restore();

  ctx.textAlign = 'center';

  ctx.font = `bold ${mobileMode ? 24 : 32}px monospace`;
  ctx.fillStyle = '#ffe66d';
  ctx.fillText('SCAVENGER ANGLER', W / 2, panelY + (mobileMode ? 46 : 56));

  ctx.font = `${mobileMode ? 12 : 14}px monospace`;
  ctx.fillStyle = INK_DIM;
  ctx.fillText('Wake up. Scavenge the bank. Build a rig. Land Old Ironjaw.', W / 2, panelY + (mobileMode ? 76 : 90));

  const actionY = panelY + (mobileMode ? 122 : 140);
  const actionGap = mobileMode ? 26 : 30;
  ctx.font = `bold ${mobileMode ? 14 : 16}px monospace`;

  if (loadedSave) {
    const confirming = performance.now() < newGameConfirmUntil;
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(mobileMode ? 'CAST / F — Continue' : 'Press F or CAST to Continue', W / 2, actionY);
    ctx.fillStyle = confirming ? '#e0645a' : INK;
    ctx.fillText(
      confirming
        ? (mobileMode ? 'USE / E again — confirm erase' : 'Press E or USE again to confirm New Game')
        : (mobileMode ? 'USE / E — New Game' : 'Press E or USE for New Game'),
      W / 2,
      actionY + actionGap
    );
  } else {
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(mobileMode ? 'CAST / F / USE / E — Start' : 'Press F, CAST, E, or USE to Start', W / 2, actionY);
  }

  ctx.font = `${mobileMode ? 11 : 12}px monospace`;
  ctx.fillStyle = INK_DIM;
  ctx.fillText('Or click/tap anywhere', W / 2, actionY + actionGap * 2);

  ctx.textAlign = 'left';

  if (game.guestName) {
    ctx.font = '11px monospace';
    ctx.fillStyle = INK_DIM;
    ctx.textAlign = 'right';
    ctx.fillText(`Playing as ${game.guestName}`, W - 10, H - 10);
    ctx.textAlign = 'left';
  }
}

function loop(now) {
  if (!loop.lastNow) loop.lastNow = now;
  const dt = Math.min(32, now - loop.lastNow || 16);
  loop.lastNow = now;

  update(now, dt);

  // Backing store is DPR times larger than W/H; this transform lets every
  // draw call below keep working in CSS-pixel (W/H) coordinates.
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  if (game.state === 'title') {
    drawTitleScreen(now);
  } else if (game.state === 'fishing' || game.state === 'result') {
    drawFishingScene(now);
  } else {
    drawScavengeScene(now);
  }
  if (pauseable()) drawPauseButton();
  drawDialog();
  if (game.paused) drawPauseOverlay();

  requestAnimationFrame(loop);
}

if (rigAssembled()) {
  game.rigReadyAnnounced = true;
}

requestAnimationFrame(loop);
