# 05 — Coder report at the M3 feel checkpoint

Commits: `e1c8d34` M1 skeleton · `db562ae` M2 shotgun · `f115322` M3 the Restless. Smoke test fully green, zero console errors.

## Built
- **M1:** 960x540 letterboxed canvas, DPR cap 2; fixed 60 Hz accumulator loop (dt clamp 100 ms, max 5 steps; hitstop consumes whole ticks with input buffered); states TITLE/PLAYING/UPGRADE/GAMEOVER/WIN/PAUSED; window-level input with focus-loss clearing; `nunnery.v1` persistence in try/catch; full `window.GAME` API incl. `spawnAt(type,x,y,hp)`, `snapshot()`, `viewport`, `toScreen`, `dummies` (stationary harmless enemies for feel tests); `?debug=1`/backtick overlay and keys.
- **M2:** 8 stratified pellets, 22°, 1100 px/s, 0.22 s life, dmg 1 → 0.5 after 0.13 s, swept collision; READY/PUMPING/LOADING gun with shell-by-shell interruptible reload and R top-up; recoil derived from friction; ~6 px shake, 8 px kick, muzzle flash + pre-rendered glow, smoke, sparks, casings that bounce/tink/stamp to the floor; audio chain sfx → tanh → compressor → master with voice cap and ±6% jitter; blast, pump, shell-in, tink, hit, mass-pitched death, thud, hurt, bell.
- **M3:** steer/lunge, inverse-mass separation with 30% ripple transfer, friction knockback, wall-splat (+3, sparks, thud, smear, rebound), white flash + squash on hit, kill = pop + chunks + confetti + decal + hitstop (2 ticks, 4 on 3+, cap 5), combo on 1.5 s timer only, contact damage → hurt (i-frames, 60 px shove, red vignette, 0.25x slow-mo), GAMEOVER with quote and one-key retry, temporary spawner.

## Measured (harness, dummies mode)
- **Recoil ruler:** one shot −40.0 px; four shots −160 px (target 150 ± 20). Retreat-fire 1.5x walking speed; advance-fire 0.5x. Cadence: four BOOM-pumps at 0.47 s then LOADING at 0.35 s/shell, shot lands the tick after a shell arrives; zero dropped inputs.
- **Knockback:** point-blank full hit moves a Restless 119 px (4/4 trials, target 120).
- **Dummy clump (20):** one point-blank shot kills 2; survivors scatter mean 21 px, top five 41/40/40/37/33 px; hitstop 2 ticks.
- **Range ladder:** damage per shot 8.0 @ 60 px, 4.4 @ 150 px, 1.1 @ 240 px → 1 / 1 / 3 shots to kill. First-shot kill odds 8/8 at 130–150 px, 1/8 at 160, 0/8 at 170+: a cliff at ~155 px that plays as a coin flip against a moving target.
- **Wall-splat:** hp 100 → 89 (8 pellets + 3), rebounds 7 px with a smear.

## Deviations
1. `GAME.enemies` / `GAME.pellets` return counts (smoke test compares numerically); `enemyList` / `pelletList` expose detail.
2. Pellet life measured from the nun, not the muzzle, so the Designer's locked range numbers mean what they say.
3. Corpse shove added (`CORPSE_TRANSFER: 0.6`, `TRANSFER_DAMP: 0.9`): a dying body hands its knock to whoever it touches.
4. **"3+ kills, ~120 px scatter" on a clump is unreachable at base stats by arithmetic:** 8 pellets × 1 = 8 damage = two Restless (HP 3) + a wounded third; 3 kills needs 9. Needs a Designer ruling.
5. Title-click hold latch (a held button on entering PLAYING no longer fires at run start); decals clipped to the arena; `spawnAt` returns the id and accepts an hp override.

## If the gun feels weak (in this order)
Sound (thump peak, noise body; `sfx.gain` 0.7 has headroom) → `HITSTOP_KILL` 2→3 → `KICK_PX` 8→10 → `KNOCK_PX` 120→140 → `CHUNKS` 8→12 → `PUMP_T` 0.45→0.40. Never pellet count or spread first. Clump feel lever: `CORPSE_TRANSFER` 0.6 (~40 px on the row behind) → 1.0 (~70 px).
