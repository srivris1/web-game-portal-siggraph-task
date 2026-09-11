# Nexus Arcade

Hey! This is a web game portal I built for the ACM SIGGRAPH recruitment task. It's basically a hub page where you can browse and play some browser games I put together. 

I've hit all the main requirements and even added the bonus features like the global Firebase leaderboard and some cool creative graphics.

**Live Link:** [https://srivris1.github.io/web-game-portal-siggraph-task/](https://srivris1.github.io/web-game-portal-siggraph-task/)

## About Me

* **Name:** Rishit Srivastava  
* **Reg No:** RA2511003012006  
* **Branch:** CSE (Core)

## What's in here

The main page is a game hub with an interactive particle background and some nice glassmorphism cards for each game. Clicking a card takes you to that game's page where you can play it right in the browser. 

There are 3 games right now:

* **Space Odyssey** — A 3D game made with Three.js. You fly a spaceship and dodge asteroids that get procedurally generated. The difficulty ramps up the longer you survive. You can use WASD or arrow keys.
* **Neon Snake** — The classic snake game, but with a glowing neon look. The snake leaves a fading trail and there are particle explosions when you eat food. Gets faster as you grow longer. Works with swipes on phones too.
* **Asteroid Blitz** — A top-down space shooter where you rotate your ship and shoot asteroids to break them apart. Has a lives system, screen shake on hits, and explosion effects.

### 🤫 Secret Easter Egg (Konami Code)
As an "out-of-the-box" bonus feature, I added a secret **Rave Mode**. If you type the classic Konami code (`Up, Up, Down, Down, Left, Right, Left, Right, B, A`) anywhere on the hub page, the whole UI shifts into a pulsing neon disco mode!

## The Tech Stuff

I tried to keep it vanilla and not overcomplicate the build process:
* **HTML/CSS/JS**: Vanilla all the way, no React or big frameworks.
* **Three.js**: Used this for the 3D game (loaded via CDN).
* **HTML Canvas**: Powered the 2D games and the particle effects on the hub.
* **Firebase Firestore**: Integrated this for the global leaderboard (this was one of the bonus points!). It syncs in real-time. If it goes offline, it falls back to `localStorage`.
* **Web Audio API**: Generated all the retro sound effects in code, so there are no external audio files to load.

## Setup / Running Locally

Everything is in separate files to keep it clean. You don't need `npm` or any build tools to run this.

1. Clone the repo:
   ```bash
   git clone https://github.com/srivris1/web-game-portal-siggraph-task.git
   ```
2. Just open `index.html` in your browser. If you're using VS Code, running it with the "Live Server" extension is best.

To get the Firebase leaderboard working on your own fork, you'll need to drop your config into `js/firebase-config.js`.

---
*Made for the ACM SIGGRAPH 2026 recruitment task.*
