# Get Thee to a Nunnery — Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a polished single-file HTML arena wave shooter where a nun with a recoil-driven shotgun survives ten waves, a boss, and an Encore, with between-wave Blessings and persistent unlocks.

**Architecture:** One `index.html` with one `<style>` and one `<script>`, organised in banner-commented sections (`CONFIG · UTIL · INPUT · AUDIO · SPRITES · FX · ENTITIES · WAVES · BLESSINGS · STATES · DEBUG · MAIN`). Fixed 60 Hz sim with an accumulator, plain arrays of flat entity objects, all collisions circles, procedural sprites pre-rendered to offscreen canvases at boot, all audio synthesized through one compressor. A `window.GAME` debug API lets the headless harness drive and inspect the game.

**Tech Stack:** Vanilla JS (ES2020, no modules), Canvas 2D, Web Audio, localStorage. QA: Node ≥ 22 + Google Chrome headless via `tools/cdp.mjs` (DevTools Protocol, no npm deps).

**Spec:** `docs/superpowers/specs/2026-09-09-get-thee-to-a-nunnery-design.md` (read it first; this plan argues from it). Rulings: `docs/jam/04-director-rulings.md`.

## Global Constraints

- Single self-contained `index.html`: exactly one `<style>`, exactly one `<script>`; no external fonts/scripts/images/stylesheets; no `type="module"`, `import`, `fetch`, Workers, `eval`, `new Function`, inline `on*=` attributes, `data:` fonts. Must run from `file://` and under a strict CSP. `node tools/check.mjs` enforces this.
- Logical resolution 960x540, letterboxed, DPR capped at 2. 60 Hz fixed timestep, dt clamped to 100 ms, max 5 steps/frame, no interpolation.
- Budgets alive at once: 80 enemies, 120 pellets, 500 particles (ring buffer, `fillRect` only), 30 pickups, 20 texts. `ctx.shadowBlur` banned. No per-frame gradient construction.
- All tuning numbers live in the `CONFIG` block and nowhere else.
- State names: `'TITLE' | 'PLAYING' | 'UPGRADE' | 'GAMEOVER' | 'WIN' | 'PAUSED'`. Enemy type keys: `'restless' | 'yorick' | 'gravedigger' | 'claudius' | 'ghost'`. Blessing ids: `'buckshot' | 'sawnoff' | 'hailmary' | 'vespers' | 'wrath' | 'grace' | 'oldtestament' | 'ricochet' | 'lastrites' | 'thunderclap'`.
- localStorage key `nunnery.v1` → `{ hi:0, bestWave:0, kills:0, runs:0, wins:0, unlocks:[], mute:false }`, read/written in try/catch with an in-memory fallback.
- Text is exactly the strings in spec §10. Serif moments use `bold Georgia, "Times New Roman", serif`; everything else the system sans stack.
- Palette is spec §11 verbatim. Cartoon gore only: white pop, green/bone confetti, dark-green decals. No red except the hurt vignette.
- Verification after every task: `node tools/check.mjs` then `node tools/smoke.mjs index.html --seconds 15 --shots tools/shots`, then Read the PNGs in `tools/shots/` and look at them. Commit after every task.

## File Structure

| Path | Responsibility |
|---|---|
| `index.html` | The game. Sections listed above. Created in Task 1, grown by every task. |
| `tools/cdp.mjs` | Headless Chrome driver (exists). `launch({width,height}) → { goto, eval, screenshot(path, clip?), keyDown/keyUp/press(code), mouseMove/mouseDown/mouseUp/click(x,y), logs, errors, close }`. |
| `tools/smoke.mjs` | End-to-end smoke test (exists). Drives via `window.GAME` + real input. Exits 1 on any console error or check failure. |
| `tools/check.mjs` | Single-file / CSP / syntax checker (exists). |
| `docs/jam/art/sprites-scratch.html` | Designer's procedural sprite recipes (in progress, separate agent). Task 6 lifts its `draw*` functions verbatim. |

Screenshot one-liner used throughout (run from repo root; replace WIDTHxHEIGHT/OUT as needed):

```bash
node -e "import('./tools/cdp.mjs').then(async({launch})=>{const b=await launch({width:1280,height:720});await b.goto('file://'+process.cwd()+'/index.html');await new Promise(r=>setTimeout(r,500));await b.click(640,360);await new Promise(r=>setTimeout(r,800));await b.screenshot('tools/shots/manual.png');console.log('errors',JSON.stringify(b.errors));await b.close();})"
```

---

### Task 1: Skeleton (M1)

**Files:** Create `index.html`.

**Interfaces — Produces:**
- `const CONFIG = { W:960, H:540, TICK:1/60, NUN_SPEED:170, NUN_R:11, FRICTION:0.85, ... }` — every number the later tasks tune.
- `const G = { state:'TITLE', t:0, timeScale:1, hitstop:0, player, enemies:[], pellets:[], casings:[], pickups:[], texts:[], wave:0, score:0, ... }` rebuilt by `newGame()`.
- `setState(name)` calling `STATES[old].exit?.()` then `STATES[name].enter?.()`; each `STATES[name] = { enter, update(dt), draw(ctx), exit }`.
- `Input`: `keys: Set<code>`, `justPressed: Set<code>`, `mouse: { x, y, down, justDown }` in logical coordinates; listeners on `window`; cleared on `blur`/`visibilitychange`.
- `window.GAME` getters `state, wave, act, score, hp, maxHp, shells, maxShells, enemies, pellets, particleCount, fps, timeScale, god, hiScore, combo, version` and functions `startRun(), skipToWave(n), spawn(type, n), killAll(), forceCards(), setGod(bool), setTimeScale(x), snapshot()`, plus `viewport {scale, offsetX, offsetY}` and `toScreen(x, y)`. Stubs are fine where the system does not exist yet, but every name must exist from Task 1 so the harness never throws.
- `?debug=1` or Backquote toggles a debug overlay (fps, frame ms, counts) and keys G/N/K/L/B/1-4/F1.

- [ ] **Step 1:** Write `index.html` with the `<style>` (black page, centered canvas, `cursor:none` on canvas, no margins), `<canvas id="c">`, and the script sections with banners. Implement canvas scaling (`resize()` computing `viewport`), the fixed-step loop (`requestAnimationFrame` → accumulate `min(dt,0.1)*timeScale` → up to 5 `update(TICK)` → `draw()`), `Input`, `setState`, five states drawing coloured rects and text placeholders (TITLE: title + "click to begin"; PLAYING: rect nun moving with WASD, clamped to the arena inside a 16 px border; UPGRADE/GAMEOVER/WIN: placeholder text and a click/Enter to leave), `newGame()`, `window.GAME`, and the debug overlay.
- [ ] **Step 2:** `node tools/check.mjs` → `check ok`.
- [ ] **Step 3:** `node tools/smoke.mjs index.html --seconds 5` → the load/click/state sections pass (later sections may fail on missing systems; that is expected). Read `tools/shots/01-title.png` and `02-first-seconds.png`.
- [ ] **Step 4:** `git add index.html && git commit -m "M1: skeleton — loop, states, input, scaling, debug API"`.

### Task 2: Shotgun v1 (M2)

**Files:** Modify `index.html` (CONFIG, AUDIO, FX, ENTITIES/player, STATES.PLAYING).

**Interfaces — Produces:**
- `CONFIG`: `PELLETS:8, SPREAD_DEG:22, PELLET_SPEED:1100, PELLET_LIFE:0.22, PELLET_FULL_T:0.13, PUMP_T:0.45, SHELLS:4, SHELL_T:0.35, RECOIL_PX:40, KNOCK_PX:120, SHAKE_FIRE_PX:6, KICK_PX:8`.
- `fire()` → spawns stratified pellets `{x,y,vx,vy,life,age,dmg,pierce,bounced,hit:Set}`; applies nun recoil impulse `v = RECOIL_PX / (TICK / (1-FRICTION))` opposite to aim; adds shake and camera kick; plays `Audio.blast()`.
- Gun state machine `player.gun = { state:'READY'|'PUMPING'|'LOADING', timer, shells }` — LMB held fires when READY and shells>0; after firing → PUMPING for PUMP_T → READY; shells==0 or R pressed → LOADING adds one shell every SHELL_T until full; a fire request while LOADING with shells>0 fires immediately (interruptible).
- `Audio`: context created on first pointerdown/keydown, `sfx → WaveShaper(tanh) → DynamicsCompressor → master`; `blast()`, `pump()`, `shellIn()`; voice cap 4 per 50 ms; mute persisted.
- `FX`: `shake(px)`, `kick(dx,dy)`, particles ring buffer `FX.spawn(x,y,vx,vy,life,color,size)`, muzzle flash record `{x,y,angle,t}` drawn with `globalCompositeOperation='lighter'`.

- [ ] **Step 1:** Implement the above. Pellets shrink/fade over life, damage is 1 before `PELLET_FULL_T` and 0.5 after. Reticle ring radius `clamp(dist*tan(11°),6,60)`.
- [ ] **Step 2:** `node tools/check.mjs`; screenshot one-liner while holding fire: add `await b.mouseDown(900,360); await new Promise(r=>setTimeout(r,120));` before the screenshot. Confirm the cone is visible and the flash draws. Read the PNG.
- [ ] **Step 3:** Recoil ruler via harness: `GAME.startRun()`, read `GAME.snapshot()` player x, fire four times at rest aiming right, read x again: expect ≈ 150 px displacement (±20). Adjust `RECOIL_PX` derivation until it is.
- [ ] **Step 4:** Commit `"M2: shotgun — pellets, recoil, pump, interruptible reload, blast audio"`.

### Task 3: The Restless and the feel checkpoint (M3)

**Files:** Modify `index.html` (ENTITIES/enemies, FX decals, WAVES stub).

**Interfaces — Produces:**
- `spawnEnemy(type, x, y)` → `{type,x,y,vx,vy,r,hp,maxHp,speed,mass,knock,flash,squash,frame,dead}`; `ENEMY_DEFS.restless = { hp:3, speed:90, r:12, mass:1, knock:1, lunge:{range:90,speed:300}, score:10 }`.
- `updateEnemies(dt)`: steer to player (lunge inside range), integrate with friction on knock velocity, one-pass separation weighted by inverse mass, velocity transfer 30% when speed>200, clamp to arena with wall-splat (`speed>200 → hp-=3, sparks, Audio.thud(), decal`).
- `hitEnemy(e, pellet)` → damage, white flash 2 frames, knock impulse along pellet dir scaled by `e.knock`, `Audio.hit()`; `killEnemy(e)` → chunks (8 fillRect particles), bone confetti, decal on the floor canvas, hitstop ticks (2, or 4 if ≥3 kills this shot; max; cap 5), `Audio.death(mass)`, score += def.score × combo multiplier, combo chain +1 (1.5 s timer).
- Floor canvas: offscreen 960x540 with flagstone grid drawn once; decals and stopped casings stamped onto it; drawn first every frame.
- Contact damage: enemy overlapping nun with no i-frames → `hurt()`: hp-1, i-frames 1.0 s, shove 60 px, red edge flash, `timeScale=0.25` for 0.2 s, `Audio.hurt()`; hp<=0 → GAMEOVER.

- [ ] **Step 1:** Implement the above with a temporary spawner: every 2 s spawn 2 Restless at a random border midpoint while `GAME.debugSpawn` is on; `GAME.spawn('restless', n)` spawns n in a clump at a random gate.
- [ ] **Step 2:** `node tools/check.mjs && node tools/smoke.mjs index.html --seconds 20`. Random-play and stress sections must show zero errors. Read `03-play-*.png` and `05-stress.png`.
- [ ] **Step 3:** Feel checkpoint (spec §16) via harness: dummy clump `GAME.spawn('restless',20)` with `GAME.setTimeScale(0)` is not possible, so instead `GAME.setGod(true)`, walk into the clump, fire once point-blank, screenshot within 100 ms and read enemies count before/after: expect ≥3 dead and survivors scattered ≥100 px. Range ladder: place via `GAME.spawnAt('restless', x, y)` (add it) at 60/150/240 px and count shots to kill. Report the numbers in the commit message.
- [ ] **Step 4:** Commit `"M3: the Restless — steering, separation, knockback, wall-splat, hitstop, decals, hurt"`. STOP for Director + Designer feel review before Task 4.

### Task 4: Loop closed (M4)

**Files:** Modify `index.html` (ENTITIES defs, WAVES, STATES).

**Interfaces — Produces:**
- `ENEMY_DEFS.yorick = { hp:1, speed:140, r:7, mass:0.5, knock:1, wobble:true, score:5 }`, `gravedigger = { hp:14, speed:60, r:24, mass:4, knock:0.3, heartDrop:0.3, score:50 }`, `claudius = { hp:80, speed:45, r:36, mass:8, knock:0.1, spawnYoricks:{every:4, n:6}, score:500, boss:true }`.
- `WAVES`: `waveBudget(n) = 8 + 4*n`; costs `{restless:1, yorickPack:3, gravedigger:6, ghost:5}`; allowed types by wave (`yorickPack` ≥3, `gravedigger` ≥5, `ghost` ≥6 when built); spawner spends the budget in bursts every 2–3 s from random gates with a 0.5 s amber telegraph; wave 10 spawns only Claudius; `waveName(n)` → `ACT I · SCENE I` … `ACT V · SCENE II` (+ `CURTAIN CALL`), `ENCORE n` beyond 10. Enemy speed × (1 + 0.03·(n−1)).
- Wave end: budget spent and `enemies.length===0` → 0.4 s slow-mo → `Audio.bell()` → `setState('UPGRADE')` (Task 5 fills the cards; for now UPGRADE shows "click to continue" and advances the wave).
- Claudius death → `setState('WIN')`. WIN: `THE REST IS SILENCE.` / `ENCORE? click · Esc to bow`; click → `G.encore=true`, wave 11+ continue with all types and +10% multiplier per Encore wave; Esc → save and TITLE.
- GAMEOVER: score, best, one of the six quotes, `click to retry`; Enter/Space/click → `newGame()`+PLAYING within one frame. Save `{hi, bestWave, kills, runs}`.
- Heart pickup entity (`pickups`), heals 1 up to `maxHp`. HUD: hearts and shell pips as icons, score + `x2.4` multiplier, wave name small at top, boss health bar.

- [ ] **Step 1:** Implement. Yorick packs spawn 8–12 in a burst with sine wobble in steering.
- [ ] **Step 2:** `node tools/check.mjs && node tools/smoke.mjs index.html --seconds 25` → **all sections pass** (this is the first time the full smoke test must be green). Read every PNG.
- [ ] **Step 3:** Harness run-through: `GAME.setGod(true); GAME.skipToWave(10)`, fire at Claudius until WIN, screenshot WIN; click → Encore wave 11 name is `ENCORE I`. Then `GAME.setGod(false)`, die, confirm GAMEOVER, retry, confirm fresh state and hi score persisted after reload.
- [ ] **Step 4:** Commit `"M4: full loop — Yoricks, Gravedigger, gates, waves 1-10, Claudius, hearts, game over, win, encore, persistence"`.

### Task 5: Blessings (M5)

**Files:** Modify `index.html` (BLESSINGS, STATES.UPGRADE, player stats).

**Interfaces — Produces:**
- `BLESSINGS = [{ id:'buckshot', name:'HOLY BUCKSHOT', line:'Three more pellets. Denser sermon.', max:3, color:'#ffd166', apply(p){ p.pellets += 3 } }, ...]` for all ten ids with the exact names/lines from spec §7 and caps `buckshot 3, hailmary 2, vespers 2, grace ∞, others 1`.
- `unlockedPool()` = all except `wrath, ricochet, thunderclap` unless in `save.unlocks`. `drawCards()` picks 3 distinct eligible; fallback `grace`.
- UPGRADE state: three cards over the dimmed frozen arena; hover highlight; click or 1/2/3 applies and returns to PLAYING (next wave starts after the wave card). `Audio.choir()` on pick.
- Effects: `sawnoff` spread +12°, enemy knock ×1.5, pellet life ×0.8; `vespers` pump and shell times ×0.75 per stack; `wrath` recoil ×1.6; `oldtestament` pellet `pierce=1` (per-pellet `hit` set); `ricochet` reflect `vx`/`vy` at the border once; `lastrites` on a kill with `shells===0 && gun.state!=='LOADING'` (the shot that emptied the tube) → shells = 2 instantly; `thunderclap` shot counter, every 4th shot knock ×2 and `FX.shake(10)`.
- Unlock checks at GAMEOVER/WIN: `bestWave>=5 → ricochet`, `kills>=500 → thunderclap`, `runs>=3 → wrath`, `wins>=1 → hardhabit`; new unlocks announced as `NEW BLESSING: NAME` on that screen. Title shows a `HARD HABIT` toggle when unlocked (start wave 4, 2 hearts, score ×1.5).
- Casings: eject on fire with gravity, one bounce, `Audio.tink()`, stamp to floor when stopped. Pump block slides 5 px back on fire and springs forward.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `node tools/check.mjs && node tools/smoke.mjs index.html` green; `04-upgrade.png` shows three cards with the right strings.
- [ ] **Step 3:** Harness: `forceCards()` ten times picking card 1 each time; confirm caps are respected (no fourth buckshot) and the pool never runs dry.
- [ ] **Step 4:** Commit `"M5: Blessings — cards, ten effects, unlocks, Hard Habit, casings, pump slide"`.

### Task 6: Art pass (M6)

**Files:** Modify `index.html` (SPRITES, STATES.TITLE/HUD, FX). Read `docs/jam/art/sprites-scratch.html`.

**Interfaces — Consumes:** the Designer's `drawNun(ctx,x,y,s,o)`, `drawGun(ctx,x,y,s,angle,pumpOffset)`, `drawRestless/Yorick/Gravedigger/Claudius/Ghost(ctx,x,y,s,frame)`, `drawHeart`, `drawShellPip`, `drawCasing`, `drawGate(ctx,x,y,s,side,glow)`; pivot = feet (bottom-centre); `frame` ∈ {0,1}.

- [ ] **Step 1:** Lift the draw functions verbatim into SPRITES. Pre-render each body sprite (both frames) and a white `source-in` silhouette variant to offscreen canvases at 2x at boot; blit with `drawImage` scaled by squash/stretch around the feet pivot; y-sort draw order; flat ellipse shadow under each body. Gun drawn procedurally each frame, rotated to aim, over the body when aiming down and under when aiming up; body flips when aim crosses vertical. Veil trail from 3 stored positions.
- [ ] **Step 2:** Title screen (serif title, subtitle, hint, BEST line, M mute, HARD HABIT toggle), wave card slam (`ACT III · SCENE I`, scale tween, 1 s fade), combo counter pop, callouts `ALAS!/ZOUNDS!/POOR YORICK!`, gates with flickering amber glow, pre-rendered vignette.
- [ ] **Step 3:** **Nun test:** screenshot with clip around the nun at 1x (`b.screenshot(path, {x,y,width:120,height:120})`), Read it. She must read as a nun on sight (coif ring, veil, habit, cross, long gun). If not after 45 minutes of iteration, switch to 12x14 pixel strings at 3x (Coder's fallback) and record that in the commit.
- [ ] **Step 4:** `node tools/check.mjs && node tools/smoke.mjs index.html` green. Commit `"M6: art pass — procedural sprites, title, HUD, wave card, callouts"`; `git tag good-1`.

### Task 7: Should list (M7)

**Files:** Modify `index.html`.

- [ ] **Step 1:** Ghost: `ENEMY_DEFS.ghost = { hp:5, speed:55, r:12, mass:1, knock:0, alpha:0.5, noSeparation:true, score:30 }`, spawns at the border point on the ray opposite the player's aim, from wave 6, cost 5.
- [ ] **Step 2:** Music: `Music.start()` drone (two detuned saws → lowpass, minor key), arpeggio scheduler (16ths, i–VI–III–VII on triangle oscillators, 100 ms look-ahead) active only in PLAYING, lowpass cutoff and density rising with wave; ducked 0.5 on fire for 150 ms; ~12 dB under sfx; respects mute.
- [ ] **Step 3:** Pause (Esc/P) overlay; `visibilitychange` → PAUSED with audio suspended; resume on input.
- [ ] **Step 4:** Remaining juice from spec §13 items 8–13 not yet done; low-HP heartbeat if cheap.
- [ ] **Step 5:** `node tools/check.mjs && node tools/smoke.mjs index.html` green. Commit `"M7: Ghost, music, pause, juice"`.

### Task 8: Tune and polish (M8)

- [ ] **Step 1:** Director plays via harness and reviews screenshots with the Designer; Designer returns a numbered tuning list against `CONFIG` only.
- [ ] **Step 2:** Apply tuning; fix every bug found; re-run `node tools/smoke.mjs index.html --seconds 40`.
- [ ] **Step 3:** Final checks: alt-tab simulation (`document.dispatchEvent(new Event('visibilitychange'))` with `hidden` mocked is unreliable, so instead call `window.dispatchEvent(new Event('blur'))` mid-run and confirm keys clear and state is PAUSED), resize mid-run (`Emulation.setDeviceMetricsOverride` to 800x600 then click-aim lines up), file size sane, `node tools/check.mjs` green.
- [ ] **Step 4:** Commit `"M8: tuning and polish"`; `git tag good-2`.

## Self-review

- **Spec coverage:** §3 controls → T1/T2/T7; §4 shotgun → T2 (+wall-splat T3, blessings T5); §5 enemies → T3/T4/T7; §6 waves → T4; §7 blessings → T5; §8 health/score/persistence/unlocks → T3/T4/T5; §9 states → T1/T4; §10 text → T4/T6; §11 art → T6; §12 audio → T2/T3/T4/T7; §13 juice → T2/T3/T6/T7; §14 architecture → T1; §15 debug/QA → T1 + every task; §16 feel test → T3; §17/§18 scope/milestones → task order. No gaps found.
- **Placeholder scan:** none.
- **Type consistency:** state names, enemy keys, blessing ids, `GAME` function names match the spec and `tools/smoke.mjs` (`forceCards`, `startRun`, `spawn`, `setGod`, `hiScore`, `particleCount`).
