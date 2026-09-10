const LeaderboardDB = {
  STORAGE_KEY: 'nexus_arcade_leaderboard',

  _getData() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  _saveData(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  async submitScore(game, playerName, score) {
    const data = this._getData();
    if (!data[game]) data[game] = [];

    const entry = {
      name: playerName,
      score: score,
      date: new Date().toISOString(),
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    };

    data[game].push(entry);
    data[game].sort((a, b) => b.score - a.score);
    data[game] = data[game].slice(0, 50);
    this._saveData(data);

    if (firebaseReady && firestoreDB) {
      try {
        await firestoreDB.collection('leaderboard').doc(game).collection('scores').add({
          name: playerName,
          score: score,
          date: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
      }
    }

    return true;
  },

  async getScores(game, limit = 10) {
    if (firebaseReady && firestoreDB) {
      try {
        const snapshot = await firestoreDB
          .collection('leaderboard')
          .doc(game)
          .collection('scores')
          .orderBy('score', 'desc')
          .limit(limit)
          .get();

        if (!snapshot.empty) {
          const firebaseScores = snapshot.docs.map(doc => {
            const d = doc.data();
            return { name: d.name, score: d.score, date: d.createdAt || '' };
          });

          const localData = this._getData();
          const localScores = localData[game] || [];
          const merged = this._mergeScores(firebaseScores, localScores, limit);
          return merged;
        }
      } catch (e) {
      }
    }

    const data = this._getData();
    if (!data[game]) return [];
    return data[game].slice(0, limit);
  },

  _mergeScores(firebaseScores, localScores, limit) {
    const seen = new Set();
    const all = [];

    [...firebaseScores, ...localScores].forEach(entry => {
      const key = entry.name + '|' + entry.score;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(entry);
      }
    });

    all.sort((a, b) => b.score - a.score);
    return all.slice(0, limit);
  },

  getScoresSync(game, limit = 10) {
    const data = this._getData();
    if (!data[game]) return [];
    return data[game].slice(0, limit);
  },

  getGames() {
    return Object.keys(this._getData());
  },

  getHighScore(game) {
    const scores = this.getScoresSync(game, 1);
    return scores.length > 0 ? scores[0].score : 0;
  },

  getTotalPlays() {
    const data = this._getData();
    let total = 0;
    for (const game of Object.values(data)) {
      total += game.length;
    }
    return total;
  },

  async getHighScoreAsync(game) {
    if (firebaseReady && firestoreDB) {
      try {
        const snapshot = await firestoreDB
          .collection('leaderboard')
          .doc(game)
          .collection('scores')
          .orderBy('score', 'desc')
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const firebaseHigh = snapshot.docs[0].data().score;
          const localHigh = this.getHighScore(game);
          return Math.max(firebaseHigh, localHigh);
        }
      } catch (e) {
      }
    }
    return this.getHighScore(game);
  },
};


function animateNumber(element, target, duration = 2000, suffix = '') {
  let start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);

    element.textContent = current.toLocaleString() + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('.reveal, .stagger-children').forEach((el) => {
    observer.observe(el);
  });
}

function formatScore(score) {
  if (score >= 1000000) return (score / 1000000).toFixed(1) + 'M';
  if (score >= 1000) return (score / 1000).toFixed(1) + 'K';
  return score.toString();
}

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

const SFX = {
  ctx: null,

  _getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  },

  play(frequency = 440, duration = 0.1, type = 'square', volume = 0.1) {
    try {
      const ctx = this._getCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
    }
  },

  score() { this.play(880, 0.15, 'square', 0.08); },
  hit() { this.play(200, 0.2, 'sawtooth', 0.06); },
  gameOver() {
    this.play(400, 0.3, 'sawtooth', 0.08);
    setTimeout(() => this.play(300, 0.3, 'sawtooth', 0.08), 150);
    setTimeout(() => this.play(200, 0.5, 'sawtooth', 0.08), 300);
  },
  click() { this.play(600, 0.05, 'sine', 0.05); },
  powerUp() {
    this.play(523, 0.1, 'square', 0.06);
    setTimeout(() => this.play(659, 0.1, 'square', 0.06), 100);
    setTimeout(() => this.play(784, 0.15, 'square', 0.06), 200);
  },
};
