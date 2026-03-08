# Neon Jump 🕹️

An endless vertical jumping game built with **Phaser 3**.  
Jump from platform to platform, dodge enemies, collect coins and power-ups, and climb as high as you can through six neon-drenched worlds.

---

## How to Play

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move left | ← Arrow / A | ◀ button (bottom-left) |
| Move right | → Arrow / D | ▶ button (bottom-right) |
| Double-jump | ↑ Arrow / W / Space (while in air) | — |

- **Auto-jump** – your character bounces automatically whenever it lands on a platform.
- **Double-jump** – press the jump key once while in the air for an extra boost.
- **Screen wrap** – exit the left edge to appear at the right (and vice versa).

---

## Platform Types

| Colour | Type | Effect |
|--------|------|--------|
| Cyan | Normal | Standard bounce |
| Green | Moving | Slides left/right |
| Orange | Crumbling | Breaks after one touch |
| Magenta | Spring | Super-high bounce |
| Yellow | Coin | Has a collectible coin above it |

---

## Power-Ups

| Icon | Name | Effect |
|------|------|--------|
| 🛡 | Shield | Absorbs one hit (6 s) |
| 🚀 | Rocket | Rocket-propels you upward (2 s) |
| 🧲 | Magnet | Attracts nearby coins (6 s) |

---

## Enemies

| Type | Behaviour |
|------|-----------|
| Floater | Drifts horizontally |
| Bouncer | Bounces up and down |
| Shooter | Fires homing projectiles |

---

## Levels

| # | Name | Unlocks at |
|---|------|-----------|
| 1 | Neon City | Start |
| 2 | Grid Zone | 600 pts |
| 3 | Plasma Storm | 1 600 pts |
| 4 | Void Rift | 3 200 pts |
| 5 | Hyper Core | 5 500 pts |
| 6 | Singularity | 9 000 pts |

Platforms get fewer, gaps get wider, and enemies multiply as you ascend.

---

## Daily Reward

Visit the **Daily Reward** button on the main menu each day to claim bonus coins.  
Your streak grows the more consecutive days you claim, increasing the reward.

---

## Running the Game

1. Clone or download the repository.
2. Serve the folder with any static web server, for example:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```
3. Open `http://localhost:8080` (or equivalent) in a modern browser.

> **No build step required.** All assets are procedurally generated; no external images or bundler needed.

---

## Tech Stack

- [Phaser 3.90.0](https://phaser.io/) – game framework
- Vanilla JavaScript (ES5/ES6 compatible plain scripts)
- Google Fonts – Orbitron (loaded via CSS `@import`)
- `localStorage` – high score, total coins, daily reward persistence
