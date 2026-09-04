class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 150 };
    this.animationId = null;
    this.lastTime = 0;
    this.isRunning = false;

    this.config = {
      particleCount: 80,
      particleMinSize: 1,
      particleMaxSize: 3,
      particleSpeed: 0.3,
      connectionDistance: 120,
      mouseAttraction: 0.02,
      colors: ['#00f0ff', '#8b5cf6', '#ff00e5', '#00ff88'],
      baseOpacity: 0.5,
    };

    this.init();
  }

  init() {
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.start();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const area = this.canvas.width * this.canvas.height;
    this.config.particleCount = Math.min(120, Math.max(40, Math.floor(area / 15000)));
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    const size = Math.random() * (this.config.particleMaxSize - this.config.particleMinSize) + this.config.particleMinSize;
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * this.config.particleSpeed * 2,
      vy: (Math.random() - 0.5) * this.config.particleSpeed * 2,
      size: size,
      baseSize: size,
      color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
      opacity: Math.random() * this.config.baseOpacity + 0.1,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      pulseOffset: Math.random() * Math.PI * 2,
    };
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });
  }

  update(time) {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      p.size = p.baseSize + Math.sin(time * p.pulseSpeed + p.pulseOffset) * 0.5;

      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          p.vx += dx * this.config.mouseAttraction * force;
          p.vy += dy * this.config.mouseAttraction * force;
          p.opacity = Math.min(1, p.opacity + force * 0.3);
        } else {
          p.opacity += (this.config.baseOpacity - p.opacity) * 0.02;
        }
      }

      p.vx *= 0.99;
      p.vy *= 0.99;

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 2) {
        p.vx = (p.vx / speed) * 2;
        p.vy = (p.vy / speed) * 2;
      }

      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.canvas.height + 10;
      if (p.y > this.canvas.height + 10) p.y = -10;
    }
  }

  drawConnections() {
    const dist = this.config.connectionDistance;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < dist) {
          const opacity = (1 - d / dist) * 0.15;
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(0, 240, 255, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.stroke();
        }
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawConnections();

    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.globalAlpha = p.opacity * 0.3;
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  animate(timestamp) {
    if (!this.isRunning) return;
    this.update(timestamp);
    this.draw();
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy() {
    this.stop();
    this.particles = [];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('particle-canvas')) {
    window.particleSystem = new ParticleSystem('particle-canvas');
  }
});
