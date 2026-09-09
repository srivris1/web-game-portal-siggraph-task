let scene, camera, renderer, clock;
let spaceship, asteroids = [], stars;
let score = 0, highScore = 0, isPlaying = false, gameOver = false;
let speed = 0.5, difficulty = 1;
let keys = {};
let shipVelocity = { x: 0, y: 0 };
let explosionParticles = [];

let scoreDisplay, highScoreDisplay, overlayStart, overlayGameOver, finalScoreDisplay;
let canvasWrapper;

const BOUNDS = { x: 8, y: 5 };
const ASTEROID_POOL_SIZE = 30;

document.addEventListener('DOMContentLoaded', init);

function init() {
  canvasWrapper = document.getElementById('game-canvas-wrapper');
  scoreDisplay = document.getElementById('score-value');
  highScoreDisplay = document.getElementById('high-score-value');
  overlayStart = document.getElementById('overlay-start');
  overlayGameOver = document.getElementById('overlay-gameover');
  finalScoreDisplay = document.getElementById('final-score');

  highScore = LeaderboardDB.getHighScore('space-odyssey');
  if (highScoreDisplay) highScoreDisplay.textContent = highScore;

  setupThreeJS();
  createStarfield();
  createSpaceship();
  initAsteroidPool();
  setupControls();
  animate();
}

function setupThreeJS() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000011, 0.02);

  camera = new THREE.PerspectiveCamera(75, canvasWrapper.clientWidth / canvasWrapper.clientHeight, 0.1, 1000);
  camera.position.set(0, 2, 10);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(canvasWrapper.clientWidth, canvasWrapper.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000011);
  canvasWrapper.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  const ambientLight = new THREE.AmbientLight(0x222244, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xff00e5, 0.6, 50);
  pointLight.position.set(-5, 5, 5);
  scene.add(pointLight);

  window.addEventListener('resize', onResize);
}

function onResize() {
  if (!canvasWrapper) return;
  camera.aspect = canvasWrapper.clientWidth / canvasWrapper.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvasWrapper.clientWidth, canvasWrapper.clientHeight);
}

function createStarfield() {
  const starCount = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 100;
    positions[i3 + 1] = (Math.random() - 0.5) * 100;
    positions[i3 + 2] = (Math.random() - 0.5) * 100;

    const color = new THREE.Color();
    color.setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.7 + Math.random() * 0.3);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  stars = new THREE.Points(geometry, material);
  scene.add(stars);
}

function createSpaceship() {
  const group = new THREE.Group();

  const bodyGeo = new THREE.OctahedronGeometry(0.5, 0);
  bodyGeo.scale(1, 0.4, 1.8);
  const bodyMat = new THREE.MeshPhongMaterial({
    color: 0x00f0ff,
    emissive: 0x003344,
    shininess: 100,
    specular: 0x88ffff,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  const wingGeo = new THREE.BufferGeometry();
  const wingVerts = new Float32Array([
    -0.2, 0, -0.3,
    -1.5, 0, 0.2,
    -0.2, 0, 0.5,
    0.2, 0, -0.3,
    1.5, 0, 0.2,
    0.2, 0, 0.5,
  ]);
  wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
  wingGeo.computeVertexNormals();
  const wingMat = new THREE.MeshPhongMaterial({
    color: 0x8b5cf6,
    emissive: 0x220044,
    side: THREE.DoubleSide,
  });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  group.add(wings);

  const engineGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const engineMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
  const engine = new THREE.Mesh(engineGeo, engineMat);
  engine.position.set(0, 0, 0.9);
  engine.name = 'engine';
  group.add(engine);

  const engineLight = new THREE.PointLight(0x00ff88, 1, 5);
  engineLight.position.set(0, 0, 1.2);
  group.add(engineLight);

  spaceship = group;
  spaceship.position.set(0, 0, 0);
  scene.add(spaceship);
}

function initAsteroidPool() {
  asteroids = [];
  const geos = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.OctahedronGeometry(1, 0),
  ];

  for (let i = 0; i < ASTEROID_POOL_SIZE; i++) {
    const geo = geos[Math.floor(Math.random() * geos.length)].clone();

    const positions = geo.attributes.position.array;
    for (let j = 0; j < positions.length; j++) {
      positions[j] += (Math.random() - 0.5) * 0.3;
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.3, 0.3),
      emissive: 0x110000,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.userData = {
      active: false,
      speed: 0,
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      ),
      scale: 1,
      boundingRadius: 1,
    };
    scene.add(mesh);
    asteroids.push(mesh);
  }
}

function spawnAsteroid() {
  const asteroid = asteroids.find(a => !a.userData.active);
  if (!asteroid) return;

  const scale = Math.random() * 0.6 + 0.3;
  asteroid.scale.setScalar(scale);
  asteroid.userData.scale = scale;
  asteroid.userData.boundingRadius = scale * 0.8;

  asteroid.position.set(
    (Math.random() - 0.5) * BOUNDS.x * 2.5,
    (Math.random() - 0.5) * BOUNDS.y * 2,
    -30 - Math.random() * 20
  );

  asteroid.userData.speed = speed * (0.8 + Math.random() * 0.4);
  asteroid.userData.active = true;
  asteroid.visible = true;

  asteroid.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
}

function setupControls() {
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if ((e.key === ' ' || e.key === 'Enter') && !isPlaying) {
      if (gameOver) {
        resetGame();
      }
      startGame();
    }

    if (e.key === 'Escape' && isPlaying) {
      endGame();
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  const startBtn = document.getElementById('btn-start');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (gameOver) resetGame();
      startGame();
    });
  }

  const restartBtn = document.getElementById('btn-restart');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      resetGame();
      startGame();
    });
  }

  const submitBtn = document.getElementById('btn-submit-score');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitScore);
  }

  setupTouchControls();
}

function setupTouchControls() {
  const touchBtns = document.querySelectorAll('.touch-btn');
  touchBtns.forEach(btn => {
    const dir = btn.dataset.dir;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (dir === 'up') keys['arrowup'] = true;
      if (dir === 'down') keys['arrowdown'] = true;
      if (dir === 'left') keys['arrowleft'] = true;
      if (dir === 'right') keys['arrowright'] = true;
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (dir === 'up') keys['arrowup'] = false;
      if (dir === 'down') keys['arrowdown'] = false;
      if (dir === 'left') keys['arrowleft'] = false;
      if (dir === 'right') keys['arrowright'] = false;
    });
  });
}

function startGame() {
  isPlaying = true;
  gameOver = false;
  if (overlayStart) overlayStart.classList.add('hidden');
  if (overlayGameOver) overlayGameOver.classList.add('hidden');
  SFX.click();
}

function resetGame() {
  score = 0;
  speed = 0.5;
  difficulty = 1;
  shipVelocity = { x: 0, y: 0 };

  spaceship.position.set(0, 0, 0);
  spaceship.rotation.set(0, 0, 0);

  asteroids.forEach(a => {
    a.userData.active = false;
    a.visible = false;
  });

  explosionParticles.forEach(p => {
    scene.remove(p);
    p.geometry.dispose();
    p.material.dispose();
  });
  explosionParticles = [];

  updateScoreDisplay();
}

function endGame() {
  isPlaying = false;
  gameOver = true;

  if (score > highScore) {
    highScore = score;
    if (highScoreDisplay) highScoreDisplay.textContent = highScore;
  }

  if (finalScoreDisplay) finalScoreDisplay.textContent = score;
  if (overlayGameOver) overlayGameOver.classList.remove('hidden');

  SFX.gameOver();
  createExplosion(spaceship.position);
}

function submitScore() {
  const nameInput = document.getElementById('player-name');
  const name = nameInput ? nameInput.value.trim() : 'Anonymous';
  if (!name) return;

  LeaderboardDB.submitScore('space-odyssey', name, score);

  const submitBtn = document.getElementById('btn-submit-score');
  if (submitBtn) {
    submitBtn.textContent = '✓ Saved!';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
  }
}

function createExplosion(position) {
  const count = 30;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.05, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random() * 0.15 + 0.5, 1, 0.6),
    });
    const particle = new THREE.Mesh(geo, mat);
    particle.position.copy(position);
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    );
    particle.userData.life = 1;
    scene.add(particle);
    explosionParticles.push(particle);
  }
}

function updateSpaceship(delta) {
  const accel = 15 * delta;
  const friction = 0.92;

  if (keys['arrowleft'] || keys['a']) shipVelocity.x -= accel;
  if (keys['arrowright'] || keys['d']) shipVelocity.x += accel;
  if (keys['arrowup'] || keys['w']) shipVelocity.y += accel;
  if (keys['arrowdown'] || keys['s']) shipVelocity.y -= accel;

  shipVelocity.x *= friction;
  shipVelocity.y *= friction;

  spaceship.position.x += shipVelocity.x * delta * 10;
  spaceship.position.y += shipVelocity.y * delta * 10;

  spaceship.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, spaceship.position.x));
  spaceship.position.y = Math.max(-BOUNDS.y, Math.min(BOUNDS.y, spaceship.position.y));

  spaceship.rotation.z = -shipVelocity.x * 0.3;
  spaceship.rotation.x = shipVelocity.y * 0.15;

  const engine = spaceship.getObjectByName('engine');
  if (engine) {
    const pulse = 0.12 + Math.sin(Date.now() * 0.01) * 0.05;
    engine.scale.setScalar(pulse / 0.15);
  }
}

function updateAsteroids(delta) {
  asteroids.forEach(a => {
    if (!a.userData.active) return;

    a.position.z += a.userData.speed * delta * 15;

    a.rotation.x += a.userData.rotSpeed.x;
    a.rotation.y += a.userData.rotSpeed.y;
    a.rotation.z += a.userData.rotSpeed.z;

    if (a.position.z > 12) {
      a.userData.active = false;
      a.visible = false;
      score += Math.floor(10 * difficulty);
      updateScoreDisplay();
    }

    if (isPlaying) {
      const dx = a.position.x - spaceship.position.x;
      const dy = a.position.y - spaceship.position.y;
      const dz = a.position.z - spaceship.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const collisionDist = a.userData.boundingRadius + 0.5;

      if (dist < collisionDist) {
        endGame();
      }
    }
  });
}

function updateExplosions(delta) {
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    p.position.add(p.userData.velocity);
    p.userData.life -= delta * 2;
    p.material.opacity = p.userData.life;
    p.scale.setScalar(p.userData.life);

    if (p.userData.life <= 0) {
      scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
      explosionParticles.splice(i, 1);
    }
  }
}

function updateScoreDisplay() {
  if (scoreDisplay) scoreDisplay.textContent = score;
}

let spawnTimer = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (stars) {
    stars.rotation.y += delta * 0.02;
    stars.rotation.x += delta * 0.01;
  }

  if (isPlaying) {
    updateSpaceship(delta);
    updateAsteroids(delta);

    difficulty = 1 + score / 200;
    speed = 0.5 + difficulty * 0.15;

    spawnTimer += delta;
    const spawnInterval = Math.max(0.3, 1.5 - difficulty * 0.1);
    if (spawnTimer > spawnInterval) {
      spawnAsteroid();
      spawnTimer = 0;
    }
  }

  updateExplosions(delta);
  renderer.render(scene, camera);
}
