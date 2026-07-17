const FIREBASE_URL = " https://primero-339b8-default-rtdb.firebaseio.com" 
// ↑ CAMBIA ESTO por tu URL de Firebase Realtime Database


const SAVE_KEY = 'cuberunner_v3';
let save = {
  playerName: '',
  coins: 0,
  best: 0,
  leaderboard: [],          
  ownedSkins: ['default'],
  equippedSkin: 'default',
  ownedPowerups: { magnet: 0, shield: 0, doubleJump: 0 },
  opts: { music: true, sfx: true },
  difficulty: 'normal',
};

function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (d) Object.assign(save, d);
  } catch(e) {}
}
function writeSave() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
function clearData() {
  if (!confirm('¿Borrar todos los datos locales?')) return;
  if (save.playerName) {
    fetch(`${FIREBASE_URL}/leaderboard/${encodeURIComponent(save.playerName)}.json`, { method: 'DELETE' })
      .finally(() => { localStorage.removeItem(SAVE_KEY); location.reload(); });
  } else {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}

function initNameScreen() {
  const input = document.getElementById('nameInput');
  const counter = document.getElementById('nameLen');
  const error   = document.getElementById('nameError');

  input.addEventListener('input', () => {
    const v = input.value.replace(/[^a-zA-Z0-9_\-]/g, '');
    input.value = v.toUpperCase();
    counter.textContent = v.length;
    error.textContent = '';
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveName();
  });

  makeStars('starsName');
}

function saveName() {
  const raw = document.getElementById('nameInput').value.trim().toUpperCase();
  const error = document.getElementById('nameError');
  if (raw.length < 2) { error.textContent = 'Mínimo 2 caracteres'; return; }
  if (raw.length > 12) { error.textContent = 'Máximo 12 caracteres'; return; }

  if (save.playerName && save.playerName !== raw) {
    fetch(`${FIREBASE_URL}/leaderboard/${encodeURIComponent(save.playerName)}.json`, { method: 'DELETE' });
  }

  save.playerName = raw;
  writeSave();
  showScreen('menuScreen');
  startMusic();
}


function changeName() {
  document.getElementById('nameInput').value = save.playerName || '';
  document.getElementById('nameLen').textContent = (save.playerName || '').length;
  document.getElementById('nameError').textContent = '';
  showScreen('nameScreen');
}

// ════════════════════════════════════════════════════════════
//  FIREBASE — RANKING GLOBAL
// ════════════════════════════════════════════════════════════
async function fetchGlobalLeaderboard() {
  try {
    const res = await fetch(`${FIREBASE_URL}/leaderboard.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return [];
    // Convertir objeto {name: {score, date}} → array
    return Object.entries(data)
      .map(([name, val]) => ({ name, score: val.score || 0, date: val.date || 0 }))
      .sort((a, b) => b.score - a.score);
  } catch(e) {
    return null; // sin conexión o URL no configurada
  }
}

async function uploadScore(name, score) {
  // Leer el score existente del jugador
  try {
    const res = await fetch(`${FIREBASE_URL}/leaderboard/${encodeURIComponent(name)}.json`);
    const existing = await res.json();
    // Solo subir si supera el record previo (evita duplicados y regresiones)
    if (existing && existing.score >= score) return false;
    await fetch(`${FIREBASE_URL}/leaderboard/${encodeURIComponent(name)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, date: Date.now() })
    });
    return true;
  } catch(e) {
    return false;
  }
}

async function openLeaderboard() {
  showScreen('lbScreen');
  const list = document.getElementById('lbList');
  const subtitle = document.getElementById('lbSubtitle');
  list.innerHTML = '<div class="lb-loading">⏳ Cargando ranking global...</div>';
  subtitle.textContent = '';

  const data = await fetchGlobalLeaderboard();

  if (data === null) {
    list.innerHTML = '<div class="lb-empty">⚠ Sin conexión o Firebase no configurado.<br><br>Configura FIREBASE_URL en game.js</div>';
    subtitle.textContent = 'modo offline';
    return;
  }
  if (data.length === 0) {
    list.innerHTML = '<div class="lb-empty">Sé el primero en jugar 🚀</div>';
    subtitle.textContent = '0 jugadores';
    return;
  }

  subtitle.textContent = `${data.length} jugador${data.length !== 1 ? 'es' : ''}`;
  const medals = ['🥇','🥈','🥉'];
  const rowClasses = ['gold-row','silver-row','bronze-row'];
  const myName = save.playerName;

  list.innerHTML = data.slice(0, 15).map((entry, i) => {
    const isYou = entry.name.toUpperCase() === (myName || '').toUpperCase();
    const medal  = medals[i] || `#${i+1}`;
    const rowCls = rowClasses[i] || '';
    return `
      <div class="lb-row ${rowCls} ${isYou ? 'you' : ''}">
        <span class="lb-rank ${isYou ? 'you-rank' : ''}">${medal}</span>
        <span class="lb-name">${isYou ? '★ ' : ''}${entry.name}</span>
        <span class="lb-score">${entry.score}m</span>
      </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════
//  SKINS
// ════════════════════════════════════════════════════════════
const SKINS = [
  { id:'default',    name:'Cubo Verde',   color:'#4ECDC4', shade:'#1a8a84', price:0    },
  { id:'redcube',    name:'Cubo Rojo',    color:'#E74C3C', shade:'#8a1a1a', price:50   },
  { id:'goldcube',   name:'Cubo Dorado',  color:'#FFD700', shade:'#a08000', price:100  },
  { id:'purplecube', name:'Cubo Morado',  color:'#9B59B6', shade:'#5a1a8a', price:150  },
  { id:'pinkcube',   name:'Cubo Rosa',    color:'#FF6B9D', shade:'#aa1a60', price:200  },
  { id:'dirtcube',   name:'Cubo Tierra',  color:'#8B5E3C', shade:'#4a2a10', price:300  },
  { id:'icecube',    name:'Cubo Hielo',   color:'#B8E4F9', shade:'#6aaecc', price:500  },
  { id:'obsidian',   name:'Obsidiana',    color:'#1a0a2e', shade:'#0a051a', price:1000 },
];

const POWERUP_DEFS = [
  { id:'magnet',     name:'Imán',       emoji:'🧲', desc:'Atrae monedas 15s', price:30 },
  { id:'shield',     name:'Escudo',     emoji:'🛡', desc:'Absorbe 1 golpe',   price:50 },
  { id:'doubleJump', name:'Doble Salto',emoji:'⬆⬆', desc:'Salto extra 30s',  price:80 },
];

// ════════════════════════════════════════════════════════════
//  AUDIO
// ════════════════════════════════════════════════════════════
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, dur, type='square', vol=0.12, detune=0) {
  if (!save.opts.sfx) return;
  try {
    const ctx = getAudio();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch(e) {}
}
function sfxJump()    { playTone(320,0.15,'square',0.11); playTone(480,0.1,'square',0.07,100); }
function sfxCoin()    { playTone(880,0.06,'sine',0.14); playTone(1200,0.09,'sine',0.09); }
function sfxHit()     { playTone(80,0.3,'sawtooth',0.18); playTone(60,0.35,'sawtooth',0.13); }
function sfxDie()     { [200,150,100,80].forEach((f,i)=>setTimeout(()=>playTone(f,0.2,'sawtooth',0.18),i*80)); }
function sfxShield()  { playTone(600,0.2,'sine',0.14); playTone(800,0.15,'sine',0.09); }
function sfxPowerup() { [400,600,800].forEach((f,i)=>setTimeout(()=>playTone(f,0.12,'sine',0.14),i*60)); }

let musicPlaying = false;
function startMusic() {
  if (!save.opts.music || musicPlaying) return;
  musicPlaying = true;
  const notes = [130,146,164,174,196,220,246,261];
  let i = 0;
  function playNote() {
    if (!save.opts.music) { musicPlaying = false; return; }
    try {
      const ctx = getAudio();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle';
      o.frequency.value = notes[i % notes.length] * (i % 16 < 8 ? 1 : 1.5);
      g.gain.setValueAtTime(0.035, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
      o.start(); o.stop(ctx.currentTime + 0.4);
      i++;
    } catch(e) {}
    if (musicPlaying) setTimeout(playNote, 280);
  }
  playNote();
}
function stopMusic() { musicPlaying = false; }

// ════════════════════════════════════════════════════════════
//  CANVAS
// ════════════════════════════════════════════════════════════
const canvas = document.getElementById('gameCanvas');
const ctx2d  = canvas.getContext('2d');
ctx2d.imageSmoothingEnabled = false;

let W, H;
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ════════════════════════════════════════════════════════════
//  ESTADO DEL JUEGO
// ════════════════════════════════════════════════════════════
let state = 'init'; // init | menu | playing | paused | gameover
let rafId = null;
let lastTime = 0;
let frameCount = 0;

const GRAVITY        = 1400;
const JUMP_VEL       = -580;
const GROUND_OFFSET  = 120;
const TILE_SIZE      = 32;
const MAGNET_RADIUS  = 260;  // píxeles en pantalla
const MAGNET_SPEED   = 420;  // px/s de atracción

let groundY;
let scrollX = 0;
let speed   = 0;
let lastTileEnd = 0;
let diffMultiplier = 1;

// Arrays del mundo (coordenadas de MUNDO)
let tiles        = [];
let coins        = [];
let spikes       = [];
let enemies      = [];
let pickups      = [];  // power-ups en el suelo
let particles    = [];

// ─── JUGADOR ───
const player = {
  x: 0, y: 0,          // coordenadas de PANTALLA (x fijo, y varía)
  w: 36, h: 36,
  vy: 0,
  onGround: false,
  jumps: 0, maxJumps: 1,
  coins: 0,
  distance: 0,
  health: 3, maxHealth: 3,
  invincible: 0,
  squish: 1, squishV: 0,
  skinColor: '#4ECDC4',
  skinShade: '#1a8a84',
  // power-up timers
  magnetTimer:    0,
  shieldActive:   false,
  doubleJumpTimer:0,
};

// ════════════════════════════════════════════════════════════
//  PANTALLAS
// ════════════════════════════════════════════════════════════
const SCREENS = ['nameScreen','menuScreen','shopScreen','lbScreen',
                 'optScreen','pauseScreen','gameoverScreen'];

function showScreen(id) {
  SCREENS.forEach(s => document.getElementById(s).classList.add('hidden'));
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('pauseBtn').style.display   = 'none';
  document.getElementById('speedIndicator').style.display = 'none';
  document.getElementById('powerupHUD').style.display = 'none';
  document.getElementById('touchHint').style.display  = 'none';
  if (id) document.getElementById(id).classList.remove('hidden');
  refreshMenuStats();
  if (id === 'shopScreen') renderShop();
  if (id === 'optScreen')  renderOptions();
}

function refreshMenuStats() {
  document.getElementById('menuBest').textContent        = save.best + 'm';
  document.getElementById('menuTotalCoins').textContent  = save.coins;
  document.getElementById('menuPlayerName').textContent  = save.playerName || '???';
}

// ════════════════════════════════════════════════════════════
//  ESTRELLITAS DE FONDO
// ════════════════════════════════════════════════════════════
function makeStars(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = '';
  for (let i = 0; i < 80; i++) {
    const s   = document.createElement('div');
    s.className = 'star';
    const sz  = Math.random() < 0.7 ? 2 : 4;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;opacity:${0.2+Math.random()*0.6}`;
    c.appendChild(s);
  }
}
['starsName','starsMenu','starsShop'].forEach(id => {
  const el = document.getElementById(id);
  if (el) makeStars(id);
});

// Estrellas del parallax en canvas
const bgStars = Array.from({length:60}, () => ({
  x: Math.random() * 12000,
  y: Math.random() * 500,
  sz: Math.random() < 0.5 ? 1 : 2,
  speed: 0.05 + Math.random() * 0.1,
}));

// ════════════════════════════════════════════════════════════
//  TIENDA
// ════════════════════════════════════════════════════════════
function lighten(hex) {
  let n = parseInt(hex.slice(1), 16);
  const r = Math.min(255,(n>>16)+60), g = Math.min(255,((n>>8)&0xff)+60), b = Math.min(255,(n&0xff)+60);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

function renderShop() {
  document.getElementById('shopCoinVal').textContent = save.coins;

  // Skins
  const grid = document.getElementById('skinsGrid');
  grid.innerHTML = '';
  SKINS.forEach(sk => {
    const owned    = save.ownedSkins.includes(sk.id);
    const equipped = save.equippedSkin === sk.id;
    const canAfford= save.coins >= sk.price;
    const el = document.createElement('div');
    el.className = 'shop-item' + (owned?' owned':'') + (equipped?' equipped':'') + (!owned&&!canAfford?' cant-afford':'');
    el.innerHTML = `
      <div class="item-preview" style="background:${sk.color};box-shadow:inset -4px -4px 0 ${sk.shade},inset 4px 4px 0 ${lighten(sk.color)}"></div>
      <div class="item-name">${sk.name}</div>
      ${equipped ? '<div class="item-badge">EQUIPADO</div>' : ''}
      ${owned && !equipped ? '<div class="item-price" style="color:#4ECDC4">EQUIPAR</div>' : ''}
      ${!owned ? `<div class="item-price">💰${sk.price}</div>` : ''}
    `;
    el.onclick = () => {
      if (owned)        { save.equippedSkin = sk.id; writeSave(); renderShop(); }
      else if (canAfford){ save.coins -= sk.price; save.ownedSkins.push(sk.id); save.equippedSkin = sk.id; writeSave(); sfxCoin(); renderShop(); }
    };
    grid.appendChild(el);
  });

  // Power-ups
  const pw = document.getElementById('powerupsShop');
  pw.innerHTML = '';
  POWERUP_DEFS.forEach(pu => {
    const count    = save.ownedPowerups[pu.id] || 0;
    const canAfford= save.coins >= pu.price;
    const el = document.createElement('div');
    el.className = 'powerup-item' + (!canAfford ? ' cant-afford' : '');
    el.innerHTML = `
      <div class="powerup-icon">${pu.emoji}</div>
      <div class="powerup-info">
        <div class="powerup-name">${pu.name}</div>
        <div class="powerup-desc">${pu.desc}</div>
      </div>
      <div class="powerup-count">x${count}</div>
      <div class="powerup-price">💰${pu.price}</div>
    `;
    el.onclick = () => {
      if (!canAfford) return;
      save.coins -= pu.price;
      save.ownedPowerups[pu.id] = (save.ownedPowerups[pu.id] || 0) + 1;
      writeSave(); sfxCoin(); renderShop();
    };
    pw.appendChild(el);
  });
}

// ════════════════════════════════════════════════════════════
//  OPCIONES
// ════════════════════════════════════════════════════════════
function renderOptions() {
  document.getElementById('togMusic').className = 'toggle' + (save.opts.music ? ' on' : '');
  document.getElementById('togSfx').className   = 'toggle' + (save.opts.sfx   ? ' on' : '');
  document.getElementById('diffBtn').textContent =
    ({easy:'FÁCIL', normal:'NORMAL', hard:'DIFÍCIL'})[save.difficulty] || 'NORMAL';
}
function toggleOpt(key) {
  save.opts[key] = !save.opts[key];
  if (key === 'music') { if (save.opts.music) startMusic(); else stopMusic(); }
  writeSave(); renderOptions();
}
const DIFFS = ['easy','normal','hard'];
function cycleDiff() {
  save.difficulty = DIFFS[(DIFFS.indexOf(save.difficulty)+1) % 3];
  diffMultiplier  = ({easy:0.7, normal:1, hard:1.4})[save.difficulty] || 1;
  writeSave(); renderOptions();
}
diffMultiplier = ({easy:0.7, normal:1, hard:1.4})[save.difficulty] || 1;

// ════════════════════════════════════════════════════════════
//  GENERACIÓN DE MUNDO
// ════════════════════════════════════════════════════════════
function getSkin() { return SKINS.find(s=>s.id===save.equippedSkin) || SKINS[0]; }

function generateInitialWorld() {
  groundY = H - GROUND_OFFSET;
  tiles=[]; coins=[]; spikes=[]; enemies=[]; pickups=[]; particles=[];
  lastTileEnd = 0;

  // Zona segura al inicio
  for (let x = -200; x < W * 2.5; x += TILE_SIZE) {
    tiles.push({ x, y: groundY, w: TILE_SIZE, h: TILE_SIZE * 3, type: 'ground' });
  }
  // Monedas iniciales
  for (let i = 0; i < 5; i++) {
    coins.push({ x: 200 + i*90, y: groundY - 60, r: 10, collected: false, anim: Math.random()*Math.PI*2 });
  }
  lastTileEnd = W * 2.5;
}

function generateChunk(startX) {
  const dist     = Math.floor(player.distance / 100);
  const gapChance   = Math.min(0.38, 0.08 + dist * 0.007) * diffMultiplier;
  const spikeChance = Math.min(0.32, 0.05 + dist * 0.005) * diffMultiplier;
  const enemyChance = Math.min(0.28, 0.03 + dist * 0.004) * diffMultiplier;

  let x   = startX;
  const end = startX + 500;

  while (x < end) {
    const rnd = Math.random();

    if (rnd < gapChance && x > startX + 120) {
      // Hueco
      const gapW = Math.min(108, 52 + dist + Math.random() * 38);
      x += Math.floor(gapW / TILE_SIZE) * TILE_SIZE;
      // 2 tiles seguros tras el hueco
      for (let i = 0; i < 2; i++) {
        tiles.push({ x: x + i*TILE_SIZE, y: groundY, w: TILE_SIZE, h: TILE_SIZE*3, type:'ground' });
      }
      x += 2 * TILE_SIZE;

    } else if (rnd < gapChance + spikeChance) {

      // Pinchos
          const n = 1 + Math.floor(Math.random() * 2);  // 1 o 2 pinchos
      for (let i = 0; i < n; i++) {
        tiles.push({ x: x+i*TILE_SIZE, y: groundY, w:TILE_SIZE, h:TILE_SIZE*3, type:'ground' });
        spikes.push({ x: x+i*TILE_SIZE, y: groundY-TILE_SIZE, w:TILE_SIZE, h:TILE_SIZE, alive:true });
      }
      x += n * TILE_SIZE;

    } else {
      // Suelo normal
      tiles.push({ x, y: groundY, w: TILE_SIZE, h: TILE_SIZE*3, type:'ground' });

      // Plataforma flotante ocasional
      if (Math.random() < 0.18) {
        const pw2 = TILE_SIZE * (2 + Math.floor(Math.random()*4));
        const py  = groundY - TILE_SIZE * (3 + Math.floor(Math.random()*3));
        for (let px = x; px < x + pw2; px += TILE_SIZE) {
          tiles.push({ x:px, y:py, w:TILE_SIZE, h:TILE_SIZE, type:'platform' });
          if (Math.random() < 0.6) coins.push({ x:px+8, y:py-24, r:10, collected:false, anim:Math.random()*Math.PI*2 });
        }
      }

      // Moneda en suelo
      if (Math.random() < 0.22) {
        coins.push({ x:x+8, y:groundY-58, r:10, collected:false, anim:Math.random()*Math.PI*2 });
      }

      // Enemigo
      if (Math.random() < enemyChance) {
        enemies.push({
          x, y: groundY - TILE_SIZE,
          w: TILE_SIZE, h: TILE_SIZE,
          vx: -(44+dist*2)*diffMultiplier,
          alive: true,
          startX: x,
          rangeX: 60 + Math.random()*60,
        });
      }

      // Pickup de power-up (raro)
      if (Math.random() < 0.025) {
        const types = ['magnet','shield','doubleJump'];
        pickups.push({ x:x+4, y:groundY-66, w:28, h:28, type:types[Math.floor(Math.random()*3)], alive:true });
      }

      x += TILE_SIZE;
    }
  }
  lastTileEnd = end;
}

// ════════════════════════════════════════════════════════════
//  COLISIÓN (helper)
// ════════════════════════════════════════════════════════════
function overlap(a, b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

// ════════════════════════════════════════════════════════════
//  PARTÍCULAS
// ════════════════════════════════════════════════════════════
function spawnParticles(sx, sy, color, count=6) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI*2/count)*i + Math.random()*0.5;
    const spd   = 80 + Math.random()*120;
    particles.push({
      x:sx, y:sy,
      vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd-60,
      alpha:1, color, size:6+Math.random()*6,
      life:0.6+Math.random()*0.4, maxLife:1,
      text: null,
    });
  }
}
function spawnText(sx, sy, text, color='#FFD700') {
  particles.push({ x:sx, y:sy, vx:0, vy:-80, alpha:1, color, size:14, life:0.8, maxLife:0.8, text });
}

// ════════════════════════════════════════════════════════════
//  INICIO / FIN
// ════════════════════════════════════════════════════════════
function startGame() {
  const sk = getSkin();
  player.skinColor = sk.color;
  player.skinShade = sk.shade;

  player.x = W * 0.25;
  player.y = H - GROUND_OFFSET - player.h;
  player.vy = 0;
  player.onGround = false;
  player.jumps = 0; player.maxJumps = 1;
  player.coins = 0; player.distance = 0;
  player.health = player.maxHealth;
  player.invincible = 0;
  player.magnetTimer = 0; player.shieldActive = false; player.doubleJumpTimer = 0;
  player.squish = 1; player.squishV = 0;

  scrollX    = 0;
  speed      = 180 + 60 * diffMultiplier;
  frameCount = 0;

  generateInitialWorld();
  updateHUD();
  updatePowerupHUD();

  showScreen(null);
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('pauseBtn').style.display   = 'block';
  document.getElementById('speedIndicator').style.display = 'block';
  document.getElementById('powerupHUD').style.display = 'flex';
  if ('ontouchstart' in window) document.getElementById('touchHint').style.display = 'block';

  state = 'playing';
  startMusic();
  if (rafId) cancelAnimationFrame(rafId);
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

function pauseGame() {
  if (state !== 'playing') return;
  state = 'paused';
  document.getElementById('pauseScreen').classList.remove('hidden');
  stopMusic();
}
function resumeGame() {
  if (state !== 'paused') return;
  state = 'playing';
  document.getElementById('pauseScreen').classList.add('hidden');
  startMusic();
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

async function gameOver() {
  state = 'gameover';
  stopMusic();
  sfxDie();
  flashScreen('#E74C3C');

  const dist = Math.floor(player.distance);
  const c    = player.coins;
  const isRecord = dist > save.best;

  save.coins += c;
  if (isRecord) save.best = dist;
  writeSave();

  document.getElementById('goDistance').textContent = dist;
  document.getElementById('goCoins').textContent    = c;
  document.getElementById('goNewBest').textContent  = `MEJOR: ${save.best}m`;
  document.getElementById('goRecordBadge').innerHTML = isRecord
    ? '<div class="go-record-badge">🏆 ¡NUEVO RÉCORD!</div>' : '';

  showScreen('gameoverScreen');
  document.getElementById('gameoverScreen').classList.remove('hidden');

  // Subir al ranking solo si es un nuevo record
  if (isRecord && save.playerName) {
    const statusEl = document.getElementById('goUploadStatus');
    statusEl.textContent = '☁ Subiendo al ranking...';
    const ok = await uploadScore(save.playerName, dist);
    statusEl.textContent = ok ? '✅ Ranking actualizado' : '⚠ Sin conexión (guardado local)';
  }
}

function gotoMenu() {
  state = 'menu';
  stopMusic();
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  showScreen('menuScreen');
  startMusic();
}

function flashScreen(color) {
  const fl = document.getElementById('flashOverlay');
  fl.style.background = color;
  fl.style.opacity    = '0.4';
  setTimeout(() => { fl.style.opacity = '0'; }, 200);
}

// ════════════════════════════════════════════════════════════
//  INPUT
// ════════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (['Space','ArrowUp','KeyW'].includes(e.code)) { e.preventDefault(); tryJump(); }
  if (e.code === 'Escape') {
    if (state==='playing') pauseGame();
    else if (state==='paused') resumeGame();
  }
  if (state === 'playing') {
    const map = { Digit1:'magnet', Digit2:'shield', Digit3:'doubleJump' };
    const t   = map[e.code];
    if (t && save.ownedPowerups[t] > 0) {
      save.ownedPowerups[t]--; writeSave(); applyPowerup(t);
    }
  }
});

document.getElementById('pauseBtn').onclick = () => {
  if (state==='playing') pauseGame(); else if (state==='paused') resumeGame();
};

let lastTap = 0;
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const now = Date.now();
  if (now - lastTap < 250 && player.jumps < player.maxJumps) tryJump();
  else tryJump();
  lastTap = now;
}, { passive:false });

function tryJump() {
  if (state !== 'playing') return;
  if (player.onGround || player.jumps < player.maxJumps) {
    player.vy      = JUMP_VEL;
    player.jumps++;
    player.onGround = false;
    player.squish   = 0.6;
    sfxJump();
    spawnParticles(player.x + player.w/2, player.y + player.h, '#4ECDC4', 4);
  }
}

// ════════════════════════════════════════════════════════════
//  UPDATE
// ════════════════════════════════════════════════════════════
function update(dt) {
  frameCount++;

  // Velocidad progresiva
  const distKm = player.distance / 500;
  speed = (180 + 60*diffMultiplier) + distKm * 80;
  document.getElementById('speedVal').textContent = (1 + distKm*0.5).toFixed(1);

  // Scroll del mundo
  scrollX          += speed * dt;
  player.distance  += speed * dt / 50;

  // Generar más mundo por delante
  while (lastTileEnd - scrollX < W * 3) generateChunk(lastTileEnd);

  // Limpiar objetos que quedaron atrás
  const cullX = scrollX - 400;
  tiles   = tiles.filter(t => t.x + t.w > cullX);
  coins   = coins.filter(c => c.x + 20 > cullX && !c.collected);
  spikes  = spikes.filter(s => s.x + s.w > cullX && s.alive);
  enemies = enemies.filter(e => e.x + e.w > cullX && e.alive);
  pickups = pickups.filter(p => p.x + p.w > cullX && p.alive);

  // Temporizadores de power-ups
  if (player.doubleJumpTimer > 0) {
    player.maxJumps = 2;
    player.doubleJumpTimer -= dt;
    if (player.doubleJumpTimer <= 0) { player.maxJumps = 1; updatePowerupHUD(); }
  }
  if (player.magnetTimer > 0) {
    player.magnetTimer -= dt;
    if (player.magnetTimer <= 0) updatePowerupHUD();
  }
  if (player.invincible > 0) player.invincible -= dt;

  // ── GRAVEDAD Y MOVIMIENTO VERTICAL ──
  player.vy += GRAVITY * dt;
  player.y  += player.vy * dt;

  // Squish
  player.squishV += (1 - player.squish) * 30 * dt;
  player.squishV *= 0.8;
  player.squish  += player.squishV;
  player.squish   = Math.max(0.5, Math.min(1.4, player.squish));

  // ── COLISIÓN CON TILES (solo vertical) ──
  player.onGround = false;
  const pBox = { x:player.x+5, y:player.y+2, w:player.w-10, h:player.h-2 };

  tiles.forEach(t => {
    const tBox = { x:t.x-scrollX, y:t.y, w:t.w, h:t.h };
    if (!overlap(pBox, tBox)) return;
    const ot = (pBox.y+pBox.h) - tBox.y;
    const ob = (tBox.y+tBox.h) - pBox.y;
    if (ot <= ob && ot < 20 && player.vy >= 0) {
      player.y = tBox.y - player.h;
      player.vy = 0; player.onGround = true; player.jumps = 0;
    } else if (ob < ot && ob < 20 && player.vy < 0) {
      player.y  = tBox.y + tBox.h - 2;
      player.vy = 0;
    }
  });

  // Caída al vacío
  if (player.y > H + 100) { gameOver(); return; }

  // ── IMÁN: atraer monedas hacia el jugador ──
  // El jugador está en coordenadas de pantalla; las monedas en mundo.
  // Jugador en mundo: player.x + scrollX
  if (player.magnetTimer > 0) {
    const pWorldX = player.x + scrollX + player.w / 2;
    const pWorldY = player.y + player.h / 2;

    coins.forEach(c => {
      if (c.collected) return;
      const dx   = pWorldX - c.x;
      const dy   = pWorldY - c.y;
      // distancia en pantalla = distancia en mundo (mismo ratio de escala)
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < MAGNET_RADIUS && dist > 0) {
        // Velocidad proporcional: más rápido cuanto más cerca
        const spd = MAGNET_SPEED * (1 + (MAGNET_RADIUS - dist) / MAGNET_RADIUS);
        c.x += (dx / dist) * spd * dt;
        c.y += (dy / dist) * spd * dt;
      }
    });
  }

  // ── RECOLECTAR MONEDAS ──
  // Convertir moneda a pantalla para comparar con player.x
  coins.forEach(c => {
    c.anim += dt * 3;
    const cSX = c.x - scrollX;   // moneda en coordenadas de pantalla
    const dx  = Math.abs((player.x + player.w/2) - cSX);
    const dy  = Math.abs((player.y + player.h/2) - c.y);
    if (dx < player.w/2 + c.r && dy < player.h/2 + c.r) {
      c.collected = true;
      player.coins++;
      sfxCoin();
      spawnText(cSX, c.y, '+1');
      updateHUD();
    }
  });

  // ── PINCHOS ──
  const dmgBox = { x:player.x+6, y:player.y+4, w:player.w-12, h:player.h-4 };
  spikes.forEach(s => {
    const sBox = { x:s.x-scrollX, y:s.y, w:s.w-4, h:s.h-6 };
    if (overlap(dmgBox, sBox)) takeDamage('spike');
  });

  // ── ENEMIGOS ──
  enemies.forEach(e => {
    e.x += e.vx * dt;
    if (e.x < e.startX - e.rangeX || e.x > e.startX) e.vx *= -1;
    const eBox = { x:e.x-scrollX+4, y:e.y+2, w:e.w-8, h:e.h-4 };
    if (!overlap(dmgBox, eBox)) return;
    if (player.vy > 0 && player.y + player.h < e.y + e.h/2) {
      e.alive = false;
      player.vy = JUMP_VEL * 0.7;
      spawnParticles(e.x-scrollX+e.w/2, e.y, '#E74C3C', 8);
      sfxHit();
    } else {
      takeDamage('enemy');
    }
  });

  // ── PICKUPS DE POWER-UP ──
  pickups.forEach(p => {
    const pBox2 = { x:p.x-scrollX, y:p.y, w:p.w, h:p.h };
    if (overlap(pBox, pBox2)) { p.alive = false; applyPowerup(p.type); }
  });

  // ── PARTÍCULAS ──
  particles.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 150 * dt;
    p.life   -= dt;
    p.alpha   = p.life / p.maxLife;
  });
  particles = particles.filter(p => p.life > 0);

  updateHUD();
}

// ─── DAÑO ───
function takeDamage(from) {
  if (player.invincible > 0) return;
  if (player.shieldActive) {
    player.shieldActive = false;
    sfxShield();
    flashScreen('#4ECDC4');
    spawnParticles(player.x+player.w/2, player.y+player.h/2, '#4ECDC4', 10);
    updatePowerupHUD();
    return;
  }
  player.health--;
  player.invincible = 1.2;
  sfxHit();
  flashScreen('#E74C3C');
  spawnParticles(player.x+player.w/2, player.y+player.h/2, '#E74C3C', 8);
  updateHUD();
  if (player.health <= 0) gameOver();
}

// ─── APLICAR POWER-UP ───
function applyPowerup(type) {
  sfxPowerup();
  flashScreen('#FFD700');
  if (type === 'magnet')     player.magnetTimer    = 15;
  if (type === 'shield')     player.shieldActive   = true;
  if (type === 'doubleJump') { player.doubleJumpTimer = 30; player.maxJumps = 2; }
  updatePowerupHUD();
}

// ─── HUD ───
function updateHUD() {
  document.getElementById('hudCoins').textContent = player.coins;
  document.getElementById('hudDist').textContent  = Math.floor(player.distance) + 'm';
  const pct = (player.health / player.maxHealth) * 100;
  document.getElementById('healthFill').style.width = pct + '%';
  document.getElementById('healthFill').style.background =
    pct > 60 ? 'linear-gradient(90deg,#2ecc71,#4eff8a)' :
    pct > 30 ? 'linear-gradient(90deg,#f39c12,#ffc200)' :
               'linear-gradient(90deg,#E74C3C,#ff6b6b)';
}

function updatePowerupHUD() {
  const el = document.getElementById('powerupHUD');
  el.innerHTML = '';
  if (player.magnetTimer    > 0) el.innerHTML += `<div class="pu-chip">🧲 ${Math.ceil(player.magnetTimer)}s</div>`;
  if (player.shieldActive)       el.innerHTML += `<div class="pu-chip">🛡 ACTIVO</div>`;
  if (player.doubleJumpTimer> 0) el.innerHTML += `<div class="pu-chip">⬆⬆ ${Math.ceil(player.doubleJumpTimer)}s</div>`;
}

// ════════════════════════════════════════════════════════════
//  RENDER
// ════════════════════════════════════════════════════════════
function render() {
  // Cielo
  const grad = ctx2d.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0d0d1f'); grad.addColorStop(0.5,'#1a1a3e'); grad.addColorStop(1,'#0d0d2a');
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0,0,W,H);

  // Estrellas parallax
  ctx2d.fillStyle = 'rgba(255,255,255,0.5)';
  bgStars.forEach(s => {
    const sx = ((s.x - scrollX*s.speed) % (W+10) + W+10) % (W+10);
    ctx2d.fillRect(sx, s.y, s.sz, s.sz);
  });

  drawMountains();

  // ── TILES ──
  tiles.forEach(t => {
    const tx = t.x - scrollX;
    if (tx > W+50 || tx+t.w < -50) return;
    if (t.type === 'ground') {
      ctx2d.fillStyle = '#8B5E3C';
      ctx2d.fillRect(tx, t.y, t.w, t.h);
      ctx2d.fillStyle = '#7a5030';
      ctx2d.fillRect(tx+2, t.y+TILE_SIZE, t.w-4, 4);
      ctx2d.fillStyle = '#5D8A2E';
      ctx2d.fillRect(tx, t.y, t.w, 8);
      ctx2d.fillStyle = '#4a7020';
      ctx2d.fillRect(tx, t.y+8, t.w, 4);
      ctx2d.fillStyle = '#6ea034';
      ctx2d.fillRect(tx+4, t.y-4, 4, 4);
      ctx2d.fillRect(tx+t.w-10, t.y-4, 4, 4);
      ctx2d.fillStyle = 'rgba(255,255,255,0.06)';
      ctx2d.fillRect(tx, t.y, 3, t.h);
    } else {
      ctx2d.fillStyle = '#5D8A2E';
      ctx2d.fillRect(tx, t.y, t.w, 8);
      ctx2d.fillStyle = '#8B5E3C';
      ctx2d.fillRect(tx, t.y+8, t.w, t.h-8);
      ctx2d.fillStyle = '#4a7020';
      ctx2d.fillRect(tx, t.y+8, t.w, 4);
      ctx2d.fillStyle = 'rgba(0,0,0,0.25)';
      ctx2d.fillRect(tx, t.y+t.h, t.w, 4);
    }
  });

  // ── PINCHOS ──
  spikes.forEach(s => {
    const sx = s.x - scrollX;
    if (sx > W+50 || sx+s.w < -50) return;
    const cx = sx + s.w/2;
    ctx2d.fillStyle = '#E74C3C';
    ctx2d.beginPath(); ctx2d.moveTo(cx,s.y); ctx2d.lineTo(sx,s.y+s.h); ctx2d.lineTo(sx+s.w,s.y+s.h); ctx2d.closePath(); ctx2d.fill();
    ctx2d.fillStyle = '#ff8a7a';
    ctx2d.beginPath(); ctx2d.moveTo(cx,s.y+4); ctx2d.lineTo(cx-4,s.y+s.h); ctx2d.lineTo(cx+4,s.y+s.h); ctx2d.closePath(); ctx2d.fill();
  });

  // ── ENEMIGOS ──
  enemies.forEach(e => {
    if (!e.alive) return;
    const ex = e.x - scrollX;
    if (ex > W+50 || ex+e.w < -50) return;
    ctx2d.fillStyle = '#C0392B'; ctx2d.fillRect(ex,e.y,e.w,e.h);
    ctx2d.fillStyle = '#8a1a1a';
    ctx2d.fillRect(ex+e.w-6,e.y,6,e.h);
    ctx2d.fillRect(ex,e.y+e.h-6,e.w,6);
    ctx2d.fillStyle = 'rgba(255,255,255,0.14)'; ctx2d.fillRect(ex,e.y,e.w,5);
    ctx2d.fillStyle = '#FF0000';
    ctx2d.fillRect(ex+6,e.y+8,6,6); ctx2d.fillRect(ex+e.w-12,e.y+8,6,6);
    ctx2d.fillStyle = '#ff6666';
    ctx2d.fillRect(ex+7,e.y+9,3,3); ctx2d.fillRect(ex+e.w-11,e.y+9,3,3);
  });

  // ── PICKUPS ──
  pickups.forEach(p => {
    if (!p.alive) return;
    const px2 = p.x - scrollX;
    const bob = Math.sin(frameCount*0.08)*4;
    ctx2d.fillStyle = 'rgba(255,215,0,0.18)';
    ctx2d.fillRect(px2-4, p.y+bob-4, p.w+8, p.h+8);
    ctx2d.strokeStyle = '#FFD700'; ctx2d.lineWidth = 2;
    ctx2d.strokeRect(px2-4, p.y+bob-4, p.w+8, p.h+8);
    ctx2d.font = '22px serif';
    ctx2d.fillText({magnet:'🧲',shield:'🛡',doubleJump:'⬆'}[p.type], px2, p.y+bob+22);
  });

  // ── MONEDAS ──
  coins.forEach(c => {
    if (c.collected) return;
    const cx = c.x - scrollX;
    const bob = Math.sin(c.anim)*4;
    const cy  = c.y + bob;
    ctx2d.fillStyle = 'rgba(255,215,0,0.18)';
    ctx2d.beginPath(); ctx2d.arc(cx,cy,c.r+4,0,Math.PI*2); ctx2d.fill();
    ctx2d.fillStyle = '#FFD700';
    ctx2d.beginPath(); ctx2d.arc(cx,cy,c.r,0,Math.PI*2); ctx2d.fill();
    ctx2d.fillStyle = '#FFF06A';
    ctx2d.beginPath(); ctx2d.arc(cx-2,cy-2,c.r*0.4,0,Math.PI*2); ctx2d.fill();
    ctx2d.fillStyle = '#a08000';
    ctx2d.font = 'bold 10px monospace';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('$', cx, cy+4);
    ctx2d.textAlign = 'left';
  });

  // ── JUGADOR ──
  drawPlayer();

  // ── PARTÍCULAS ──
  particles.forEach(p => {
    ctx2d.globalAlpha = Math.max(0, p.alpha);
    if (p.text) {
      ctx2d.fillStyle = p.color;
      ctx2d.font = 'bold 16px "VT323",monospace';
      ctx2d.textAlign = 'center';
      ctx2d.fillText(p.text, p.x, p.y);
      ctx2d.textAlign = 'left';
    } else {
      ctx2d.fillStyle = p.color;
      ctx2d.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size);
    }
  });
  ctx2d.globalAlpha = 1;
}

function drawPlayer() {
  const { x:px, y:py, w:pw, h:ph, squish:sq } = player;
  if (player.invincible > 0 && Math.floor(player.invincible*10)%2===0) return;

  const cx = px + pw/2;
  const cy = py + ph;

  ctx2d.save();
  ctx2d.translate(cx,cy); ctx2d.scale(1/sq,sq); ctx2d.translate(-cx,-cy);

  // Sombra
  ctx2d.fillStyle = 'rgba(0,0,0,0.28)';
  ctx2d.fillRect(px-4,py+ph,pw+8,6);

  // Escudo
  if (player.shieldActive) {
    ctx2d.fillStyle = 'rgba(78,205,196,0.18)';
    ctx2d.beginPath(); ctx2d.arc(px+pw/2,py+ph/2,pw*0.8,0,Math.PI*2); ctx2d.fill();
    ctx2d.strokeStyle='#4ECDC4'; ctx2d.lineWidth=3;
    ctx2d.beginPath(); ctx2d.arc(px+pw/2,py+ph/2,pw*0.75,0,Math.PI*2); ctx2d.stroke();
  }

  // Aura de imán
  if (player.magnetTimer > 0) {
    ctx2d.strokeStyle = 'rgba(255,80,80,0.25)';
    ctx2d.lineWidth = 2;
    ctx2d.setLineDash([6,6]);
    ctx2d.beginPath(); ctx2d.arc(px+pw/2,py+ph/2,MAGNET_RADIUS,0,Math.PI*2); ctx2d.stroke();
    ctx2d.setLineDash([]);
  }

  // Cuerpo
  ctx2d.fillStyle = player.skinColor; ctx2d.fillRect(px,py,pw,ph);
  ctx2d.fillStyle = player.skinShade;
  ctx2d.fillRect(px+pw-8,py,8,ph); ctx2d.fillRect(px,py+ph-8,pw,8);
  ctx2d.fillStyle = 'rgba(255,255,255,0.22)';
  ctx2d.fillRect(px,py,pw,5); ctx2d.fillRect(px,py,5,ph);
  ctx2d.fillStyle = 'rgba(255,255,255,0.28)';
  ctx2d.fillRect(px+4,py+4,10,10);

  // Ojos
  ctx2d.fillStyle='#fff'; ctx2d.fillRect(px+6,py+10,8,8); ctx2d.fillRect(px+pw-14,py+10,8,8);
  ctx2d.fillStyle='#0a0a1a'; ctx2d.fillRect(px+8,py+12,4,4); ctx2d.fillRect(px+pw-12,py+12,4,4);

  // Piernas animadas
  const leg = Math.sin(frameCount*0.25)*4;
  ctx2d.fillStyle = player.skinShade;
  ctx2d.fillRect(px+4,py+ph,10,8+leg);
  ctx2d.fillRect(px+pw-14,py+ph,10,8-leg);

  ctx2d.restore();
}

function drawMountains() {
  ctx2d.fillStyle = '#1a1a3a';
  const off1 = scrollX*0.15;
  for (let m=-1; m<Math.ceil(W/300)+2; m++) {
    const mx = m*300 - off1%300;
    const mh = 80 + ((m*73+7)%60);
    ctx2d.beginPath(); ctx2d.moveTo(mx,groundY-20); ctx2d.lineTo(mx+150,groundY-mh-20); ctx2d.lineTo(mx+300,groundY-20); ctx2d.fill();
  }
  ctx2d.fillStyle = '#151530';
  const off2 = scrollX*0.3;
  for (let m=-1; m<Math.ceil(W/200)+2; m++) {
    const mx = m*200 - off2%200;
    const mh = 50 + ((m*53+3)%40);
    ctx2d.beginPath(); ctx2d.moveTo(mx,groundY); ctx2d.lineTo(mx+100,groundY-mh); ctx2d.lineTo(mx+200,groundY); ctx2d.fill();
  }
}

// ════════════════════════════════════════════════════════════
//  GAME LOOP
// ════════════════════════════════════════════════════════════
function loop(timestamp) {
  if (state !== 'playing') return;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(dt);
  render();
  rafId = requestAnimationFrame(loop);
}

// ════════════════════════════════════════════════════════════
//  INICIO
// ════════════════════════════════════════════════════════════
initNameScreen();

if (save.playerName) {
  // Ya tiene nombre → ir al menú
  state = 'menu';
  showScreen('menuScreen');
  startMusic();
} else {
  // Primera vez → pedir nombre
  state = 'init';
  showScreen('nameScreen');
}
