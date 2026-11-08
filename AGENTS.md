# AGENTS.md

## Overview

Zero-dependency HTML5 canvas Asteroids clone. `game.js` holds all game logic; `index.html` only hosts the canvas and loads the script. No package.json, bundler, build, lint, typecheck, or tests exist.

Verify changes by opening `index.html` directly in a browser, or `npx serve .` and playing. There is no automated check to fall back on.

## Gotchas

- Canvas size is duplicated: `width="800" height="600"` in `index.html` and `W`/`H` in `game.js`. Change both together.
- Asteroid sizes are `1` = small, `2` = medium, `3` = large. `RADII`, `SPEEDS`, and `POINTS` are indexed by size with index `0` as an unused placeholder; splitting decrements size until `1`.
- `game.js` is a classic script, not an ES module: top-level `const`/`let`/classes share global scope and there are no imports/exports. Keep it loadable via a plain `<script src="game.js">`.
- Movement is toroidal: positions must go through `wrap(v, W|H)`. Bullets, ship, asteroids, and power-ups all wrap.
- Input splits into held state (`keys`) and consumed one-shot presses (`justPressed` + `pressed()`). Use `pressed()` for actions that must fire once, such as shooting and restart.
- Game states are `playing | dead | gameover`; timers (`deadTimer`, `ship.invincible`, `ship.speedTimer`, cooldowns) are in seconds and decremented by `dt`. The loop clamps `dt` to 0.05s.
- Destroying any asteroid has a 15% chance to drop a `PowerUp` (max 2 on screen). Collecting it sets `ship.speedTimer = 5`, which doubles `THRUST` only. Timer is cleared by `Ship.reset()`, so the boost is lost on death or level change.
- The shield is manual: `S` (`KeyS`) calls `ship.activateShield()` only when `shieldTimer` and `shieldCooldown` are both 0. It lasts 8s, then sets a 10s cooldown; `Ship.reset()` clears both. While `shieldTimer > 0`, ship–asteroid collisions (including the streak) are absorbed: the asteroid is pushed radially outward to `ship.radius + a.radius * 0.82 + 2`, keeps its speed (minimum 140), and is not destroyed, split, or scored. `Ship.drawShield()` is called separately from `Ship.draw()` so the ring does not blink with respawn invincibility. The HUD shows the shield status in Spanish.
- `Asteroid` takes an optional `opts` argument. `{ streak: true }` creates a "estrella fugaz": size 1, 3x speed, `ttl` of 7–10s, no splitting, cyan trail and blinking before it expires. `spawnStreak()` keeps at most one alive and spawns it from a side edge when `streakTimer` reaches 0; that timer is reset in `initGame()` and `nextLevel()`. It counts toward level completion, so if it is the last asteroid the level waits for it to expire. Current entities are `Ship`, `Bullet`, `Asteroid`, `PowerUp`, and `Particle`.

## Conventions

- User-facing text (HUD, overlays, README) is Spanish; keep new player-visible strings in Spanish.
- Gameplay tuning values are inline constants at their point of use (e.g. `ROT`, `THRUST`, `DRAG` in `Ship.update`) rather than centralized config.
