document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initStats();
  initLeaderboardPreview();
  initEasterEgg();
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }, { passive: true });

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const spans = navToggle.querySelectorAll('span');
      if (navLinks.classList.contains('open')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });

    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        const spans = navToggle.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      });
    });
  }

  const sections = document.querySelectorAll('section[id]');
  const navLinksAll = document.querySelectorAll('.nav-link[href^="#"]');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinksAll.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

function initStats() {
  const statElements = document.querySelectorAll('.stat-number[data-target]');
  if (statElements.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        animateNumber(el, target, 2000, suffix);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statElements.forEach(el => observer.observe(el));
}

function initLeaderboardPreview() {
  const tabBtns = document.querySelectorAll('.leaderboard-tab');
  const tbody = document.querySelector('#leaderboard-body');

  if (!tabBtns.length || !tbody) return;

  let activeGame = 'space-odyssey';

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGame = btn.dataset.game;
      renderLeaderboard(activeGame, tbody);
    });
  });

  renderLeaderboard(activeGame, tbody);
}

async function renderLeaderboard(game, tbody) {
  tbody.innerHTML = `
    <tr>
      <td colspan="3" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
        <div class="leaderboard-loading-spinner"></div>
        Loading scores...
      </td>
    </tr>
  `;

  let scores;
  try {
    scores = await LeaderboardDB.getScores(game, 5);
  } catch (e) {
    scores = LeaderboardDB.getScoresSync(game, 5);
  }

  if (scores.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎮</div>
          No scores yet — be the first to play!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = scores.map((entry, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const medals = ['🥇', '🥈', '🥉'];
    const rankDisplay = i < 3 ? medals[i] : `#${i + 1}`;
    const initials = getInitials(entry.name);

    return `
      <tr>
        <td>
          <span class="leaderboard-rank ${rankClass}">${rankDisplay}</span>
        </td>
        <td>
          <div class="leaderboard-player">
            <div class="leaderboard-avatar">${initials}</div>
            <span>${entry.name}</span>
          </div>
        </td>
        <td>
          <span class="leaderboard-score">${entry.score.toLocaleString()}</span>
        </td>
      </tr>
    `;
  }).join('');
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (link) {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});

function initEasterEgg() {
