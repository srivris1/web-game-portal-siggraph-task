const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let scoreDisplay, highScoreDisplay, overlayStart, overlayGameOver, finalScoreDisplay;

const GRID = 20;
let cols, rows;
let snake, food, direction, nextDirection;
let score = 0, highScore = 0;
let isPlaying = false, gameOver = false;
let gameLoop = null;
let baseSpeed = 150, currentSpeed;
let particles = [];
let trail = [];

document.addEventListener('DOMContentLoaded', init);

function init() {
  scoreDisplay = document.getElementById('score-value');
  highScoreDisplay = document.getElementById('high-score-value');
  overlayStart = document.getElementById('overlay-start');
  overlayGameOver = document.getElementById('overlay-gameover');
  finalScoreDisplay = document.getElementById('final-score');

  highScore = LeaderboardDB.getHighScore('neon-snake');
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
  cols = Math.floor(canvas.width / GRID);
  rows = Math.floor(canvas.height / GRID);
}

function setupControls() {
  document.addEventListener('keydown', (e) => {
    switch(e.key) {
      case 'ArrowUp': case 'w': case 'W':
        if (direction !== 'down') nextDirection = 'up'; break;
      case 'ArrowDown': case 's': case 'S':
        if (direction !== 'up') nextDirection = 'down'; break;
      case 'ArrowLeft': case 'a': case 'A':
        if (direction !== 'right') nextDirection = 'left'; break;
      case 'ArrowRight': case 'd': case 'D':
        if (direction !== 'left') nextDirection = 'right'; break;
      case ' ': case 'Enter':
        if (!isPlaying) { if (gameOver) resetGame(); startGame(); }
        break;
    }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  });

  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30 && direction !== 'left') nextDirection = 'right';
      else if (dx < -30 && direction !== 'right') nextDirection = 'left';
    } else {
      if (dy > 30 && direction !== 'up') nextDirection = 'down';
      else if (dy < -30 && direction !== 'down') nextDirection = 'up';
    }
  });

  const startBtn = document.getElementById('btn-start');
  if (startBtn) startBtn.addEventListener('click', () => { if (gameOver) resetGame(); startGame(); });
  const restartBtn = document.getElementById('btn-restart');
  if (restartBtn) restartBtn.addEventListener('click', () => { resetGame(); startGame(); });
  const submitBtn = document.getElementById('btn-submit-score');
  if (submitBtn) submitBtn.addEventListener('click', submitScore);

  document.querySelectorAll('.touch-btn').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const dir = btn.dataset.dir;
      if (dir === 'up' && direction !== 'down') nextDirection = 'up';
      if (dir === 'down' && direction !== 'up') nextDirection = 'down';
      if (dir === 'left' && direction !== 'right') nextDirection = 'left';
      if (dir === 'right' && direction !== 'left') nextDirection = 'right';
      if (!isPlaying && !gameOver) { startGame(); }
    });
  });
}

function startGame() {
  isPlaying = true;
  gameOver = false;
  if (overlayStart) overlayStart.classList.add('hidden');
  if (overlayGameOver) overlayGameOver.classList.add('hidden');

  snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
  direction = 'right';
  nextDirection = 'right';
  score = 0;
  currentSpeed = baseSpeed;
  trail = [];
  particles = [];
  updateScore();
  spawnFood();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(tick, currentSpeed);
  SFX.click();
}

function resetGame() {
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = null;
}

function spawnFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
  food.hue = Math.random() * 360;
}

function tick() {
  direction = nextDirection;
  const head = { ...snake[0] };

  switch (direction) {
    case 'up': head.y--; break;
    case 'down': head.y++; break;
    case 'left': head.x--; break;
    case 'right': head.x++; break;
  }

  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    endGame(); return;
  }

  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    endGame(); return;
  }

  snake.unshift(head);

  trail.push({ x: head.x, y: head.y, life: 1 });
  if (trail.length > 60) trail.shift();

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    updateScore();
    spawnFoodParticles(food.x, food.y);
    spawnFood();
    SFX.score();

    currentSpeed = Math.max(60, baseSpeed - snake.length * 2);
    clearInterval(gameLoop);
    gameLoop = setInterval(tick, currentSpeed);
  } else {
    snake.pop();
  }

  draw();
}

function spawnFoodParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: x * GRID + GRID / 2,
      y: y * GRID + GRID / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 1,
      hue: food.hue,
      size: Math.random() * 4 + 2,
    });
  }
}

function endGame() {
  isPlaying = false;
  gameOver = true;
  clearInterval(gameLoop);

  if (score > highScore) {
    highScore = score;
    if (highScoreDisplay) highScoreDisplay.textContent = highScore;
  }

  if (finalScoreDisplay) finalScoreDisplay.textContent = score;
  if (overlayGameOver) overlayGameOver.classList.remove('hidden');
  SFX.gameOver();
}

function submitScore() {
  const nameInput = document.getElementById('player-name');
  const name = nameInput ? nameInput.value.trim() : 'Anonymous';
  if (!name) return;
  LeaderboardDB.submitScore('neon-snake', name, score);
  const submitBtn = document.getElementById('btn-submit-score');
  if (submitBtn) { submitBtn.textContent = '✓ Saved!'; submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
}

function updateScore() {
  if (scoreDisplay) scoreDisplay.textContent = score;
}

function draw() {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < cols; x++) {
    ctx.beginPath(); ctx.moveTo(x * GRID, 0); ctx.lineTo(x * GRID, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < rows; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * GRID); ctx.lineTo(canvas.width, y * GRID); ctx.stroke();
  }

  trail.forEach((t, i) => {
    t.life -= 0.02;
    if (t.life > 0) {
      ctx.fillStyle = `rgba(0, 240, 255, ${t.life * 0.15})`;
      ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
      ctx.shadowBlur = 10;
      ctx.fillRect(t.x * GRID + 2, t.y * GRID + 2, GRID - 4, GRID - 4);
      ctx.shadowBlur = 0;
    }
  });
  trail = trail.filter(t => t.life > 0);

  snake.forEach((segment, i) => {
    const isHead = i === 0;
    const hue = 180 + i * 3;
    const saturation = 100;
    const lightness = isHead ? 60 : 45;

    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
    ctx.shadowBlur = isHead ? 20 : 10;

    const padding = isHead ? 1 : 2;
    const radius = isHead ? 5 : 3;

    roundRect(ctx, segment.x * GRID + padding, segment.y * GRID + padding, GRID - padding * 2, GRID - padding * 2, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
  });

  const fx = food.x * GRID + GRID / 2;
  const fy = food.y * GRID + GRID / 2;
  const pulse = Math.sin(Date.now() * 0.005) * 2 + 6;

  ctx.shadowColor = `hsl(${food.hue}, 100%, 50%)`;
  ctx.shadowBlur = 20;
  ctx.fillStyle = `hsl(${food.hue}, 100%, 60%)`;
  ctx.beginPath();
  ctx.arc(fx, fy, pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `hsla(${food.hue}, 100%, 60%, 0.3)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(fx, fy, pulse + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    p.vx *= 0.96;
    p.vy *= 0.96;

    if (p.life > 0) {
      ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life})`;
      ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });
  particles = particles.filter(p => p.life > 0);
}

function drawIdle() {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const time = Date.now() * 0.001;
  for (let i = 0; i < 20; i++) {
    const x = (Math.sin(time + i) * 0.5 + 0.5) * canvas.width;
    const y = (Math.cos(time * 0.7 + i * 1.5) * 0.5 + 0.5) * canvas.height;
    ctx.fillStyle = `hsla(${180 + i * 10}, 100%, 50%, 0.05)`;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!isPlaying && !gameOver) requestAnimationFrame(drawIdle);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
