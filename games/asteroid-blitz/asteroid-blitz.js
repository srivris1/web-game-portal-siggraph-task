const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let scoreDisplay, highScoreDisplay, overlayStart, overlayGameOver, finalScoreDisplay, livesDisplay;

let ship, bullets = [], asteroids = [], particles = [], powerUps = [];
let score = 0, highScore = 0, lives = 3;
let isPlaying = false, gameOver = false;
let keys = {};
let lastShot = 0;
let animFrameId;
let lastTime = 0;
let spawnTimer = 0;
let level = 1;
let screenShake = 0;

document.addEventListener('DOMContentLoaded', init);

function init() {
  scoreDisplay = document.getElementById('score-value');
  highScoreDisplay = document.getElementById('high-score-value');
  overlayStart = document.getElementById('overlay-start');
  overlayGameOver = document.getElementById('overlay-gameover');
  finalScoreDisplay = document.getElementById('final-score');
  livesDisplay = document.getElementById('lives-display');

  highScore = LeaderboardDB.getHighScore('asteroid-blitz');
  if (highScoreDisplay) highScoreDisplay.textContent = highScore;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  setupControls();
  drawIdle();
}

function resizeCanvas() {
  const wrapper = document.getElementById('game-canvas-wrapper');
  canvas.width = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;
}

function setupControls() {
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()) || e.key === ' ') e.preventDefault();
    if ((e.key === ' ' || e.key === 'Enter') && !isPlaying) {
      if (gameOver) resetGame();
      startGame();
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  const startBtn = document.getElementById('btn-start');
  if (startBtn) startBtn.addEventListener('click', () => { if (gameOver) resetGame(); startGame(); });
  const restartBtn = document.getElementById('btn-restart');
  if (restartBtn) restartBtn.addEventListener('click', () => { resetGame(); startGame(); });
  const submitBtn = document.getElementById('btn-submit-score');
  if (submitBtn) submitBtn.addEventListener('click', submitScore);

  document.querySelectorAll('.touch-btn').forEach(btn => {
    const dir = btn.dataset.dir;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      keys['arrow' + dir] = true;
      if (!isPlaying && !gameOver) startGame();
    });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys['arrow' + dir] = false; });
  });

  canvas.addEventListener('touchstart', () => { keys[' '] = true; });
  canvas.addEventListener('touchend', () => { keys[' '] = false; });
}

function startGame() {
  isPlaying = true;
  gameOver = false;
  if (overlayStart) overlayStart.classList.add('hidden');
  if (overlayGameOver) overlayGameOver.classList.add('hidden');

  ship = {
    x: canvas.width / 2, y: canvas.height / 2,
    angle: -Math.PI / 2, vx: 0, vy: 0,
    radius: 14, invincible: 0, thrustParticles: [],
  };
  bullets = []; asteroids = []; particles = [];
  score = 0; lives = 3; level = 1; spawnTimer = 0;
  updateScore(); updateLives();

  for (let i = 0; i < 4; i++) spawnAsteroid(3);

  lastTime = performance.now();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  gameLoop(performance.now());
  SFX.click();
}

function resetGame() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
}

function spawnAsteroid(size, x, y) {
  const edge = Math.random() * 4 | 0;
  if (x === undefined) {
    if (edge === 0) { x = Math.random() * canvas.width; y = -40; }
    else if (edge === 1) { x = canvas.width + 40; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 40; }
    else { x = -40; y = Math.random() * canvas.height; }
  }

  const speed = (1.5 + Math.random() * 1.5) * (4 - size) * 0.5;
  const angle = Math.random() * Math.PI * 2;
  const radii = [0, 12, 22, 35];
  const points = [];
  const numPoints = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < numPoints; i++) {
    points.push(radii[size] * (0.7 + Math.random() * 0.3));
  }

  asteroids.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: radii[size],
    size,
    rotation: 0,
    rotSpeed: (Math.random() - 0.5) * 0.04,
    points,
    hue: Math.random() * 40 + 10,
  });
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  draw();

  if (isPlaying) animFrameId = requestAnimationFrame(gameLoop);
}

function update(dt) {
  const rotSpeed = 4.5;
  const thrust = 300;
  const friction = 0.99;

  if (keys['arrowleft'] || keys['a']) ship.angle -= rotSpeed * dt;
  if (keys['arrowright'] || keys['d']) ship.angle += rotSpeed * dt;

  if (keys['arrowup'] || keys['w']) {
    ship.vx += Math.cos(ship.angle) * thrust * dt;
    ship.vy += Math.sin(ship.angle) * thrust * dt;
    if (Math.random() > 0.3) {
      const backAngle = ship.angle + Math.PI + (Math.random() - 0.5) * 0.5;
      particles.push({
        x: ship.x - Math.cos(ship.angle) * 16,
        y: ship.y - Math.sin(ship.angle) * 16,
        vx: Math.cos(backAngle) * (80 + Math.random() * 60),
        vy: Math.sin(backAngle) * (80 + Math.random() * 60),
        life: 0.5 + Math.random() * 0.3,
        size: 2 + Math.random() * 2,
        hue: 30 + Math.random() * 20,
        type: 'thrust',
      });
    }
  }

  ship.vx *= friction;
  ship.vy *= friction;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  if (ship.x < -20) ship.x = canvas.width + 20;
  if (ship.x > canvas.width + 20) ship.x = -20;
  if (ship.y < -20) ship.y = canvas.height + 20;
  if (ship.y > canvas.height + 20) ship.y = -20;

  if (ship.invincible > 0) ship.invincible -= dt;

  if (keys[' '] && timestamp - lastShot > 180) {
    bullets.push({
      x: ship.x + Math.cos(ship.angle) * 18,
      y: ship.y + Math.sin(ship.angle) * 18,
      vx: Math.cos(ship.angle) * 500 + ship.vx * 0.3,
      vy: Math.sin(ship.angle) * 500 + ship.vy * 0.3,
      life: 1.2,
    });
    lastShot = timestamp;
    SFX.play(880, 0.05, 'square', 0.04);
  }

  bullets.forEach(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  });
  bullets = bullets.filter(b => b.life > 0);

  asteroids.forEach(a => {
    a.x += a.vx * dt * 60;
    a.y += a.vy * dt * 60;
    a.rotation += a.rotSpeed;
    if (a.x < -50) a.x = canvas.width + 50;
    if (a.x > canvas.width + 50) a.x = -50;
    if (a.y < -50) a.y = canvas.height + 50;
    if (a.y > canvas.height + 50) a.y = -50;
  });

  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = asteroids.length - 1; j >= 0; j--) {
      const b = bullets[i]; const a = asteroids[j];
      if (!b || !a) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.sqrt(dx * dx + dy * dy) < a.radius) {
        for (let k = 0; k < 8; k++) {
          const angle = Math.random() * Math.PI * 2;
          particles.push({
            x: a.x, y: a.y,
            vx: Math.cos(angle) * (40 + Math.random() * 80),
            vy: Math.sin(angle) * (40 + Math.random() * 80),
            life: 0.6 + Math.random() * 0.4,
            size: 1 + Math.random() * 3,
            hue: a.hue,
            type: 'explosion',
          });
        }

        if (a.size > 1) {
          spawnAsteroid(a.size - 1, a.x, a.y);
          spawnAsteroid(a.size - 1, a.x, a.y);
        }

        score += [0, 100, 50, 20][a.size];
        updateScore();
        SFX.hit();
        screenShake = 3;
        asteroids.splice(j, 1);
        bullets.splice(i, 1);
        break;
      }
    }
  }

  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      const dx = ship.x - a.x, dy = ship.y - a.y;
      if (Math.sqrt(dx * dx + dy * dy) < a.radius + ship.radius * 0.6) {
        lives--;
        updateLives();
        ship.invincible = 2;
        screenShake = 8;
        SFX.gameOver();

        for (let k = 0; k < 15; k++) {
          const angle = Math.random() * Math.PI * 2;
          particles.push({
            x: ship.x, y: ship.y,
            vx: Math.cos(angle) * (50 + Math.random() * 100),
            vy: Math.sin(angle) * (50 + Math.random() * 100),
            life: 0.8, size: 2 + Math.random() * 3, hue: 180, type: 'explosion',
          });
        }

        if (lives <= 0) { endGame(); return; }
        break;
      }
    }
  }

  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt * 2;
    p.vx *= 0.98;
    p.vy *= 0.98;
  });
  particles = particles.filter(p => p.life > 0);

  spawnTimer += dt;
  if (spawnTimer > 3 && asteroids.length < 8 + level * 2) {
    spawnAsteroid(3);
    spawnTimer = 0;
  }

  if (asteroids.length === 0) {
    level++;
    for (let i = 0; i < 3 + level; i++) spawnAsteroid(3);
    SFX.powerUp();
  }

  if (screenShake > 0) screenShake *= 0.9;
  if (screenShake < 0.1) screenShake = 0;
}

function draw() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake * 2, (Math.random() - 0.5) * screenShake * 2);
  }

  ctx.fillStyle = '#020208';
  ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);

  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`;
    ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  asteroids.forEach(a => {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);
    ctx.strokeStyle = `hsl(${a.hue}, 40%, 55%)`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `hsl(${a.hue}, 60%, 40%)`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < a.points.length; i++) {
      const angle = (Math.PI * 2 / a.points.length) * i;
      const r = a.points[i];
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `hsla(${a.hue}, 30%, 15%, 0.5)`;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  });

  bullets.forEach(b => {
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  if (ship && isPlaying) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    if (ship.invincible > 0 && Math.floor(ship.invincible * 10) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  for (let i = 0; i < lives; i++) {
    ctx.save();
    ctx.translate(30 + i * 28, canvas.height - 25);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawIdle() {
  ctx.fillStyle = '#020208';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const time = Date.now() * 0.0005;
  for (let i = 0; i < 6; i++) {
    const x = canvas.width * 0.5 + Math.cos(time + i * 1.1) * canvas.width * 0.35;
    const y = canvas.height * 0.5 + Math.sin(time * 0.8 + i * 1.5) * canvas.height * 0.35;
    ctx.strokeStyle = `hsla(${20 + i * 10}, 40%, 40%, 0.3)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 15 + i * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (!isPlaying && !gameOver) requestAnimationFrame(drawIdle);
}

function endGame() {
  isPlaying = false;
  gameOver = true;
  if (score > highScore) { highScore = score; if (highScoreDisplay) highScoreDisplay.textContent = highScore; }
  if (finalScoreDisplay) finalScoreDisplay.textContent = score;
  if (overlayGameOver) overlayGameOver.classList.remove('hidden');
}

function submitScore() {
  const nameInput = document.getElementById('player-name');
  const name = nameInput ? nameInput.value.trim() : 'Anonymous';
  if (!name) return;
  LeaderboardDB.submitScore('asteroid-blitz', name, score);
  const submitBtn = document.getElementById('btn-submit-score');
  if (submitBtn) { submitBtn.textContent = '✓ Saved!'; submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
}

function updateScore() { if (scoreDisplay) scoreDisplay.textContent = score; }
function updateLives() { if (livesDisplay) livesDisplay.textContent = '❤️'.repeat(lives); }
