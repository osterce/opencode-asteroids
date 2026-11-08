'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins de la nave ──────────────────────────────────────────────────────────
const SKIN_STORAGE_KEY = 'asteroids.skin';

const SKINS = [
  {
    id: 'clasica',
    name: 'CLÁSICA',
    color: '#fff',
    flame: 'rgba(255, 130, 0, 0.85)',
    flameX: -8,
    path(ctx) {
      ctx.moveTo( 20,  0);   // nariz
      ctx.lineTo(-12, -9);   // ala izquierda
      ctx.lineTo( -7,  0);   // muesca trasera
      ctx.lineTo(-12,  9);   // ala derecha
      ctx.closePath();
    },
  },
  {
    id: 'caza',
    name: 'CAZA',
    color: '#ffb347',
    flame: 'rgba(255, 179, 71, 0.85)',
    flameX: -9,
    path(ctx) {
      ctx.moveTo( 21,  0);
      ctx.lineTo(  2, -5);
      ctx.lineTo( -8, -11);
      ctx.lineTo(-12, -11);
      ctx.lineTo( -9, -4);
      ctx.lineTo(-10,  0);
      ctx.lineTo( -9,  4);
      ctx.lineTo(-12, 11);
      ctx.lineTo( -8, 11);
      ctx.lineTo(  2,  5);
      ctx.closePath();
    },
  },
  {
    id: 'delta',
    name: 'DELTA',
    color: '#7df9ff',
    flame: 'rgba(125, 249, 255, 0.85)',
    flameX: -8,
    path(ctx) {
      ctx.moveTo( 22,  0);
      ctx.lineTo(  0, -6);
      ctx.lineTo(-13, -10);
      ctx.lineTo( -8, -2);
      ctx.lineTo( -8,  2);
      ctx.lineTo(-13, 10);
      ctx.lineTo(  0,  6);
      ctx.closePath();
    },
  },
  {
    id: 'espectro',
    name: 'ESPECTRO',
    color: '#ff6ec7',
    flame: 'rgba(255, 110, 199, 0.85)',
    flameX: -10,
    path(ctx) {
      ctx.moveTo( 20,  0);
      ctx.lineTo(  2, -7);
      ctx.lineTo( -7, -10);
      ctx.lineTo( -4, -3);
      ctx.lineTo(-13, -5);
      ctx.lineTo( -9,  0);
      ctx.lineTo(-13,  5);
      ctx.lineTo( -4,  3);
      ctx.lineTo( -7, 10);
      ctx.lineTo(  2,  7);
      ctx.closePath();
    },
  },
];

function loadSkin() {
  try {
    const id = localStorage.getItem(SKIN_STORAGE_KEY);
    const index = SKINS.findIndex(s => s.id === id);
    return index >= 0 ? index : 0;
  } catch {
    return 0;
  }
}

function saveSkin() {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, SKINS[skinIndex].id);
  } catch {
    // localStorage puede no estar disponible (por ejemplo, en file://)
  }
}

let skinIndex = loadSkin();
let skinToast = 0;

function currentSkin() { return SKINS[skinIndex]; }

function cycleSkin() {
  skinIndex = (skinIndex + 1) % SKINS.length;
  saveSkin();
  skinToast = 1.8;
}

function drawShipShape(skin, lineWidth = 1.5) {
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = lineWidth;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  skin.path(ctx);
  ctx.stroke();
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3, opts = {}) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.streak = !!opts.streak;
    this.dead = false;

    const angle = opts.angle ?? rand(0, Math.PI * 2);
    const speed = (SPEEDS[size] + rand(-15, 15)) * (this.streak ? 3 : 1);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);
    this.ttl = this.streak ? rand(7, 10) : Infinity;

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    if (this.streak) {
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }
  }

  split() {
    if (this.streak || this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    // La estrella fugaz parpadea antes de desvanecerse
    if (this.streak && this.ttl < 1.5 && Math.floor(this.ttl * 8) % 2 === 0) return;

    if (this.streak) {
      const speed = Math.hypot(this.vx, this.vy) || 1;
      const tail = 50;
      ctx.strokeStyle = 'rgba(159, 240, 255, 0.4)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(this.x - (this.vx / speed) * tail, this.y - (this.vy / speed) * tail);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.streak ? '#9ff0ff' : '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;   // 'speed' | 'triple'
    this.radius = 11;
    this.vx = rand(-20, 20);
    this.vy = rand(-20, 20);
    this.rot = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-2, 2);
    this.ttl = 10;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está a punto de desaparecer
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    const triple = this.type === 'triple';
    const color  = triple ? '#6ee7ff' : '#ffe14d';

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    // Halo
    ctx.strokeStyle = triple
      ? 'rgba(110, 231, 255, 0.35)'
      : 'rgba(255, 225, 77, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.fillStyle   = triple ? 'rgba(110, 231, 255, 0.25)' : 'rgba(255, 225, 77, 0.25)';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';

    if (triple) {
      // Tres flechas en abanico
      const tips = [[-10, -7], [0, -11], [10, -7]];
      for (const [tx, ty] of tips) {
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        const a = Math.atan2(ty - 9, tx);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - Math.cos(a - 0.5) * 4, ty - Math.sin(a - 0.5) * 4);
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - Math.cos(a + 0.5) * 4, ty - Math.sin(a + 0.5) * 4);
        ctx.stroke();
      }
    } else {
      // Rayo
      ctx.beginPath();
      ctx.moveTo( 2, -10);
      ctx.lineTo(-5,   1);
      ctx.lineTo( 1,   1);
      ctx.lineTo(-2,  10);
      ctx.lineTo( 6,  -2);
      ctx.lineTo( 0,  -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedTimer    = 0;
    this.tripleTimer    = 0;
    this.shieldTimer    = 0;
    this.shieldCooldown = 0;
    this.shieldFlash    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedTimer    > 0) this.speedTimer    -= dt;
    if (this.tripleTimer   > 0) this.tripleTimer   -= dt;
    if (this.shieldFlash   > 0) this.shieldFlash   -= dt;

    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldTimer    = 0;
        this.shieldCooldown = 10;
      }
    } else if (this.shieldCooldown > 0) {
      this.shieldCooldown -= dt;
      if (this.shieldCooldown < 0) this.shieldCooldown = 0;
    }

    const ROT    = 3.5;                                  // rad/s
    const THRUST = 260 * (this.speedTimer > 0 ? 2 : 1);  // px/s² (x2 con Velocidad)
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE   = 21;
    const SPREAD = 0.21;   // rad (~12°) entre balas del Triple Shot
    const angles = this.tripleTimer > 0
      ? [this.angle - SPREAD, this.angle, this.angle + SPREAD]
      : [this.angle];
    return angles.map(a => new Bullet(
      this.x + Math.cos(a) * NOSE,
      this.y + Math.sin(a) * NOSE,
      a
    ));
  }

  activateShield() {
    if (this.dead || this.shieldTimer > 0 || this.shieldCooldown > 0) return;
    this.shieldTimer = 8;
    this.shieldFlash = 0;
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = currentSkin();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    drawShipShape(skin);

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const boost = this.speedTimer > 0;
      ctx.beginPath();
      ctx.moveTo(skin.flameX, -4);
      ctx.lineTo(skin.flameX - rand(6, 14) * (boost ? 1.6 : 1), 0);
      ctx.lineTo(skin.flameX,  4);
      ctx.strokeStyle = boost ? 'rgba(120, 230, 255, 0.9)' : skin.flame;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Se dibuja aparte de draw() para no parpadear con la invencibilidad
  drawShield() {
    if (this.dead || this.shieldTimer <= 0) return;

    const R     = 24;
    const flash = this.shieldFlash > 0;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Anillo exterior
    ctx.strokeStyle = flash
      ? 'rgba(190, 245, 255, 0.95)'
      : 'rgba(92, 216, 255, 0.55)';
    ctx.lineWidth = flash ? 3 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();

    // Hexágono giratorio
    ctx.rotate(this.shieldTimer * 0.6);
    ctx.strokeStyle = flash
      ? 'rgba(190, 245, 255, 0.9)'
      : 'rgba(92, 216, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a  = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * R;
      const py = Math.sin(a) * R;
      if (i === 0) ctx.moveTo(px, py);
      else         ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let streakTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnStreak() {
  if (asteroids.some(a => a.streak)) return;
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? 10 : W - 10;
  const y = rand(60, H - 60);
  const angle = (fromLeft ? 0 : Math.PI) + rand(-0.6, 0.6);
  asteroids.push(new Asteroid(x, y, 1, { streak: true, angle }));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  streakTimer = rand(6, 10);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  streakTimer = rand(10, 16);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (skinToast > 0) skinToast -= dt;
  if (pressed('KeyK')) cycleSkin();

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    pressed('KeyS'); // descarta pulsaciones mientras el juego está terminado
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    pressed('KeyS'); // descarta pulsaciones mientras la nave está destruida
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Escudo
  if (pressed('KeyS')) ship.activateShield();

  // Estrella fugaz
  streakTimer -= dt;
  if (streakTimer <= 0) {
    spawnStreak();
    streakTimer = rand(12, 20);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  powerUps.forEach(p => p.update(dt));
  particles.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size] + (a.streak ? 50 : 0);
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (powerUps.length < 2 && Math.random() < 0.15) {
          const type = Math.random() < 0.5 ? 'speed' : 'triple';
          powerUps.push(new PowerUp(a.x, a.y, type));
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'triple') ship.tripleTimer = 5;
      else                     ship.speedTimer  = 5;
      explode(p.x, p.y, 6);
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldTimer > 0) {
          // El escudo absorbe el impacto y empuja el asteroide hacia fuera
          let dx  = a.x - ship.x;
          let dy  = a.y - ship.y;
          let len = Math.hypot(dx, dy);
          if (len < 0.001) {
            const ang = rand(0, Math.PI * 2);
            dx  = Math.cos(ang);
            dy  = Math.sin(ang);
            len = 1;
          }
          const speed = Math.max(Math.hypot(a.vx, a.vy), 140);
          a.vx = (dx / len) * speed;
          a.vy = (dy / len) * speed;
          const gap = ship.radius + a.radius * 0.82 + 2;
          a.x = wrap(ship.x + (dx / len) * gap, W);
          a.y = wrap(ship.y + (dy / len) * gap, H);
          ship.shieldFlash = 0.25;
          explode(a.x, a.y, 4);
        } else {
          killShip();
        }
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const SCALE = 0.45;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(SCALE, SCALE);
  drawShipShape(currentSkin(), 1.2 / SCALE);
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  let hudY = 48;
  if (state === 'playing' && ship.speedTimer > 0) {
    ctx.fillStyle = '#ffe14d';
    ctx.fillText(`VELOCIDAD ${ship.speedTimer.toFixed(1)}s`, 14, hudY);
    hudY += 22;
  }
  if (state === 'playing' && ship.tripleTimer > 0) {
    ctx.fillStyle = '#6ee7ff';
    ctx.fillText(`TRIPLE ${ship.tripleTimer.toFixed(1)}s`, 14, hudY);
    hudY += 22;
  }

  if (state === 'playing') {
    if (ship.shieldTimer > 0) {
      ctx.fillStyle = '#5cd8ff';
      ctx.fillText(`ESCUDO ${ship.shieldTimer.toFixed(1)}s`, 14, hudY);
    } else if (ship.shieldCooldown > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`ESCUDO ${ship.shieldCooldown.toFixed(1)}s`, 14, hudY);
    } else {
      ctx.fillStyle = 'rgba(92, 216, 255, 0.65)';
      ctx.fillText('ESCUDO [S]', 14, hudY);
    }
    ctx.fillStyle = '#fff';
  }

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  const skin = currentSkin();
  ctx.textAlign = 'left';
  ctx.font      = '12px monospace';
  ctx.fillStyle = skinToast > 0 ? skin.color : 'rgba(255, 255, 255, 0.35)';
  ctx.fillText(`K — SKIN: ${skin.name}`, 14, H - 14);
}

function drawOverlay(title, sub, hint) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
  if (hint) {
    ctx.font      = '14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(hint, W / 2, H / 2 + 52);
  }
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();
  ship.drawShield();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`, 'K: CAMBIAR SKIN');
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
