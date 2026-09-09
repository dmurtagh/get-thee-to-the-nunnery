# GET THEE TO A NUNNERY — Locked Design Doc

**Date:** 2026-09-09 · **Status:** LOCKED for build · **Sources:** `docs/jam/00-brief.md`, `01-designer-pitch.md`, `02-coder-tech-memo.md`, `03-coder-critique.md`, `03-designer-response.md`, `04-director-rulings.md`.

All numbers are starting values living in a single `CONFIG` block and are expected to move during the feel test (§16). Everything else here is fixed.

---

## 1. Concept

*She took the advice.* Ophelia went to the nunnery. The restless dead of Elsinore followed. One walled courtyard, one pump-action shotgun, ten waves, a boss, and an Encore.

Top-down one-screen arena wave shooter. WASD moves, mouse aims, click fires a shotgun that hurls enemies across the flagstones **and kicks the nun backwards**. Between waves, pick one of three Blessings; every Blessing changes how the gun feels. Ten waves named as Acts and Scenes, Claudius as the Act V finale, then Encore for score.

**Signature:** recoil moves the nun. Every shot is also a dodge.

**Deliverable:** a single self-contained `index.html` (vanilla JS, Canvas 2D, Web Audio, no assets, no network) that runs from `file://` and under a strict CSP.

## 2. Player experience goals

1. Playing within 5 seconds: title, one click, in. The click is also the AudioContext unlock.
2. Firing feels amazing: you *see* the eight-pellet cone, you *see* eight things fly, you feel the hop, you hear BOOM chk-chk.
3. Kills are deletion, not damage: point-blank one-shots, hitstop, white pop, confetti, a floor decal, and the wall-splat.
4. A run is 5–7 minutes. Retry is one keypress. Run two differs from run one (unlocks).

## 3. Controls

| Input | Action |
|---|---|
| WASD / arrows | Move, 170 px/s. No dash: the shotgun is the dash. |
| Mouse | Aim. Cursor hidden over the canvas; a reticle is drawn. Listeners on `window`, so aiming works over the letterbox bars. |
| LMB (hold) | Fire at pump rate. Auto-pump. No pump input. |
| R | Top-up reload (interruptible, same shell cadence as auto-reload). |
| Esc / P | Pause overlay. |
| M | Mute toggle (persisted). |
| Any click / Enter / Space | Start, retry, pick Encore. |
| 1 / 2 / 3 or click | Pick a Blessing card. |

Focus loss (`blur`, `visibilitychange`) clears held keys and pauses.

## 4. The Shotgun

| Property | Value |
|---|---|
| Pellets | 8, **stratified**: cone split into 8 slots, one pellet jittered inside each. |
| Spread | 22° cone. |
| Pellet speed / life | 1100 px/s, 0.22 s (~240 px reach). Pellets shrink and fade over life. |
| Damage | 1 per pellet for the first 0.13 s of life, 0.5 after. Point-blank one-shots a Restless (HP 3); ~150 px is a coin flip; ~240 px takes 2–3 shots. |
| Tube | 4 shells. HUD shows shell pips. |
| Cadence | Fire → 0.45 s pump (pump block slides, casing ejects, "chk-chk") → ready. |
| Reload | Empty tube auto-reloads **shell by shell at 0.35 s each**; the player may fire the instant one shell is in (interruptible). R starts a top-up any time. 3-state machine: READY / PUMPING / LOADING. |
| Enemy knockback | Impulse along pellet direction, friction 0.85/tick. Target: a point-blank full hit moves a Restless ~120 px. Shoved enemies (speed > 200) transfer 30% velocity to enemies they touch: the crowd ripples. |
| Nun recoil | Impulse opposite to aim, same friction. Target: one shot at rest moves her ~40 px; four shots ~150 px. Firing while retreating ≈ 2x speed; firing into your movement stalls you. |
| Wall-splat | An enemy that would be carried past the arena border at > 200 px/s takes +3 damage, sparks, thud, decal. |
| Reticle | Ring whose radius = distance × tan(11°), clamped 6–60 px, so the ring *is* the spread. Solid/bright when an enemy is inside kill range, hollow beyond. |
| Screen | Shake tuned to ~6 px peak on fire, decaying ~0.12 s, plus an 8 px camera kick opposite to aim that springs back. Muzzle flash: 1 frame white wedge + 2 frames warm radial light on the stones (`lighter`). |
| Hitstop | 2 ticks on any kill, 4 ticks on 3+ kills in one shot; same-tick takes the max; cap 5. Sim freezes, render continues (shake still moves), input buffered. |
| Ejecta | Brass casing pops sideways with gravity, one bounce, *tink*, then stamped to the decal canvas. Three grey smoke puffs. |

## 5. Enemies (contact damage only; no enemy projectiles)

| Name | Job | Stats | Look | Death |
|---|---|---|---|---|
| **The Restless** | Rusher, ~60% of spawns | HP 3, 90 px/s, lunges at 300 px/s inside 90 px. Mass 1. | Sick-green rotting courtier, white Elizabethan ruff, dark eye sockets, 2-frame walk. | 8 chunks, bone confetti, dark-green floor splat. |
| **Yoricks** | Swarm | HP 1, 140 px/s, packs of 8–12, sine wobble. Mass 0.5. | Bone-white skull, dark sockets, small jaw. | Pop with tooth spray, brittle *tok*. |
| **The Gravedigger** | Tank, blocks the cone | HP 14, 60 px/s, radius 2x, knockback 0.3x. Mass 4. 30% chance to drop a heart. | Fat grey-green brute with a shovel. | Slow heap, shovel bounces. |
| **Claudius** (boss, wave 10) | Finale | HP 80, 45 px/s, knockback 0.1x. Every 4 s spawns 6 Yoricks at the border. Health bar at top. | Gravedigger at 3x, purple robe, gold crown, goblet. | Long slow-mo, crown flies off, huge confetti, bell toll → WIN. |
| **The Ghost** (SHOULD, wave 6+) | Punishes tunnel vision | HP 5, 55 px/s, knockback 0x, skips separation. Spawns at the border point directly behind the player's aim. | 50%-alpha cyan Restless silhouette with a crown outline; wavers. | Dissolves upward. |

Steering: straight at the player plus one-pass separation (push overlapping pairs apart by half the overlap, weighted by inverse mass), then clamp to arena. No pathfinding, no physics, all circles.

## 6. Waves

- **10 waves**, named `ACT I · SCENE I` … `ACT V · SCENE II`. Wave 10 is Claudius (`CURTAIN CALL`). Encore waves are `ENCORE I`, `ENCORE II`, …
- **Budget** = 8 + 4n spent over the wave in bursts every 2–3 s from random gates. Costs: Restless 1, Yorick pack 3, Gravedigger 6, Ghost 5. Enemy speed +3% per wave.
- **Schedule:** waves 1–2 Restless only; 3+ Yorick packs; 5+ Gravedigger; 6+ Ghost (if built); 10 Claudius + his Yoricks (no budget spawns).
- **Gates:** four, at the midpoints of the border edges. Glow amber and burst dirt 0.5 s before an emergence.
- **Wave end:** budget spent and zero enemies alive → last kill triggers 0.4 s slow-mo → bell toll → UPGRADE screen. The UPGRADE state only enters with zero enemies alive, so death and level-up can never race.
- **Wave start:** title card slams in (`ACT III · SCENE I`), fades over 1 s, spawning begins.
- **Win:** kill Claudius → WIN screen → **Encore** (continue from wave 11, budget keeps climbing, all enemy types, +10% score multiplier per Encore wave) or Bow (bank score, back to title).

## 7. Blessings (pick 1 of 3 after every wave)

Ten total. `*` stackable (cap in brackets). `[S]` = small new system, all cheap on an axis-aligned arena.

| # | Name | Card line | Effect |
|---|---|---|---|
| 1 | HOLY BUCKSHOT `*[3]` | Three more pellets. Denser sermon. | +3 pellets |
| 2 | SAWN-OFF SERMON | Wider, harder, shorter. Get closer. | +12° spread, +50% enemy knockback, −20% range |
| 3 | HAIL MARY `*[2]` | Two more shells in the tube. | +2 shells |
| 4 | SPEEDY VESPERS `*[2]` | Pump and reload faster. Amen. | Pump and reload 25% faster |
| 5 | WRATH | Recoil throws you further. Fly. | Nun recoil +60% |
| 6 | GRACE `*` | One more heart. Fully healed. | +1 max heart (cap 5), heal to full |
| 7 | OLD TESTAMENT `[S]` | Pellets pass through one body. | Pierce 1 |
| 8 | RICOCHET PSALM `[S]` | Pellets bounce off the walls. | Reflect off border once |
| 9 | LAST RITES `[S]` | Last-shell kills reload two shells. | Kill with the final shell → 2 shells load instantly |
| 10 | THUNDERCLAP `[S]` | Every fourth shot: double knockback. | Every 4th shot: 2x knockback, extra shake |

- Cards show a coloured border, the name, and the one line. Three distinct picks respecting caps. Pool exhausted → GRACE.
- **Unlocked from run one:** 1, 2, 3, 4, 6, 7, 9. **Locked** (see §8): 5, 8, 10.
- By wave 8 a Buckshot x2 + Sawn-Off + Wrath build is a 14-pellet, 34° wall that launches the nun across the courtyard. That is the payoff.

## 8. Health, score, combo, persistence

- **Hearts:** 3 (Faith, Hope, Charity), max 5. Hit: −1 heart, 1.0 s i-frames, shoved 60 px away, red edge vignette flash, `timeScale 0.25` for 0.2 s. No regen. Heart pickups from the Gravedigger; GRACE heals.
- **Score** (kills only): Yorick 5, Restless 10, Ghost 30, Gravedigger 50, Claudius 500, × combo multiplier. Wave clear bonus = wave × 100. Encore: +10% per Encore wave.
- **Combo:** kills within 1.5 s extend the chain; multiplier = min(1 + 0.1 × chain, 5). Resets on the timer **only**. One big pop-scaling counter in the HUD, no per-pellet numbers.
- **Multikill callouts** (one floating text per shot): 3 kills `ALAS!`, 5 `ZOUNDS!`, 8+ `POOR YORICK!`.
- **localStorage** key `nunnery.v1`: `{ hi, bestWave, kills, runs, wins, unlocks: [], mute }`. Load/save in try/catch with in-memory fallback; save at game over, win, and mute toggle.
- **Unlocks** (announced on the death/win screen as `NEW BLESSING: …`): reach wave 5 → RICOCHET PSALM; 500 lifetime kills → THUNDERCLAP; 3 runs → WRATH; first win → **HARD HABIT** mode (title toggle: start at wave 4, 2 hearts, 1.5x score).

## 9. Game flow and states

`TITLE → PLAYING ⇄ UPGRADE → GAMEOVER | WIN → (Encore: PLAYING | Bow: TITLE)`, plus a `PAUSED` overlay drawn over the frozen game. Each state is `{ enter, update, draw, exit }`. `UPGRADE` draws over the dimmed, frozen arena. `newGame()` rebuilds the whole run state from scratch; nothing is patched onto an old state.

## 10. Text (the complete list)

Serif moments use `bold Georgia, "Times New Roman", serif`. Everything else uses the system sans stack, bold, uppercase, small.

- **Title:** `GET THEE TO A NUNNERY` / `She took the advice.` / `WASD move · mouse aim · click to begin` / `BEST 12,340 · WAVE 7` / `M mute` / `HARD HABIT` toggle when unlocked.
- **Wave card:** `ACT III · SCENE I`, and `CURTAIN CALL` under `ACT V · SCENE II`; `ENCORE I`…
- **Callouts:** `ALAS!` `ZOUNDS!` `POOR YORICK!`
- **Game over:** `SCORE 8,120` / `BEST 12,340` / one of: “Goodnight, sweet nun.” · “Alas, poor Ophelia.” · “Get thee BACK to a nunnery.” · “Frailty, thy name is three hearts.” · “Something is rotten in Denmark. Mostly you.” · “The rest is silence. Until you click.” / `click to retry`
- **Win:** `THE REST IS SILENCE.` / `ENCORE? click · Esc to bow`
- **Cards:** name + one line (§7). **HUD:** score, multiplier `x2.4`, wave name small at top; hearts and shells are icons.
- **Boss:** a health bar, no name text beyond the wave card.

## 11. Art (procedural, pre-rendered)

Flat shapes, thick dark outlines (2 px), two-tone shading (one highlight tone per body), slight 3/4 top-down meaning y-sorted draw order and a flat dark ellipse shadow under every body. All sprites are drawn once at boot to offscreen canvases (at 2x for crispness) and blitted with `drawImage`; a white-silhouette variant of every sprite is generated at boot for hit flashes. Squash/stretch via `scale()` around the feet pivot.

**Palette:** floor `#1b1f3a` · flagstone lines `#151830` · border `#5a6078` · gate amber `#ffb347` · dead green `#7bd389` (shade `#4f9a5c`) · bone `#f4f0e6` · ghost cyan `#8fe3ff` · muzzle `#fff3c4` · UI cream `#f4f0e6` · boss purple `#7b3fa0` + gold `#ffd166` · brass `#d9a441`.

- **The nun (~28 px body height):** black bell-shaped habit; **white coif ring** (an ellipse ring wider than the head) framing a peach face with two dark eye pixels; black veil behind the head, trailing 3 stored positions as a tapering polygon; white scapular strip; small gold cross; two dark shoes. Leans into recoil, stretches along aim on fire. The coif ring is the silhouette and is non-negotiable.
- **The shotgun:** too long on purpose, ~1.3x her height. Dark barrel, brown stock, grey pump block that slides back 5 px on fire and springs forward. Pivot at her hand, rotated to the mouse. Drawn over the body when aiming down, under when aiming up. Body flips horizontally when aim crosses vertical.
- **Enemies:** distinct by silhouette and colour (§5). The Gravedigger is visibly ~2x; Claudius is the Gravedigger at 3x with a purple recolour and a crown.
- **Arena:** indigo floor with a subtle flagstone grid drawn once to a persistent offscreen "floor" canvas that also receives decals (splats, casings, sparks). 16 px moon-grey border wall. Four gates with pre-rendered amber glow blobs that flicker. A pre-rendered vignette over everything. `ctx.shadowBlur` is banned.
- **Fallback gate:** if the pre-rendered nun does not read as a nun in the first art-pass screenshot, switch to 12x14 palette-indexed pixel strings blitted at 3x.

## 12. Audio (all synthesized)

Master chain: `sfxBus → WaveShaper(tanh) → DynamicsCompressor → masterGain → destination`; music on its own gain into the same compressor, ducked on fire. One 2 s noise buffer generated at boot. Voice rule: max 4 instances of a sound per 50 ms, extras skipped and batch gain raised by √n. ±6% pitch jitter on everything. `AudioContext` created and resumed on the first `pointerdown`/`keydown` and re-resumed on any input until running. Mute persisted.

| Sound | Recipe |
|---|---|
| Blast (spend the time here) | noise burst, bandpass 1800→250 Hz over 120 ms; sine thump 120→38 Hz over 90 ms + triangle 55 Hz body; 4 ms highpassed click transient; tanh grit |
| Pump | two filtered noise clicks 90 ms apart, second pitched lower; the second click means "ready" |
| Shell insert | soft click |
| Casing tink | short high metallic ping |
| Enemy hit | square 220→90 Hz over 60 ms + noise tick |
| Death | one death sound pitched by mass (Yorick high brittle *tok*, Restless *splat*, Gravedigger sub *thud*) |
| Wall-splat | wet thump, lower |
| Multikill | small bell, pitch steps with chain |
| Nun hurt | dissonant organ stab + heartbeat |
| Wave clear | one church bell toll |
| Blessing pick | detuned choir chord |
| Game over | descending organ, slow bell |
| Boss | low drone swell on spawn |
| Music | minor-key organ pedal drone (two detuned saws, lowpass) + scheduled 16th-note triangle arpeggio (i–VI–III–VII), 100 ms look-ahead scheduler. Drone only on title and card screen; arpeggio joins in play; lowpass cutoff and density rise with wave. ~12 dB under sfx. |

## 13. Juice (priority order)

1. Muzzle flash, shake, camera kick · 2. Knockback both ways · 3. Hitstop on kill · 4. Death chunks, confetti, persistent decals · 5. Casing eject and tink · 6. Pump slide animation and sound · 7. Enemy white hit-flash and squash · 8. Combo counter pop and callouts · 9. Hurt vignette and slow-mo · 10. Gate spawn telegraph · 11. Reactive reticle · 12. Nun lean/stretch on recoil, veil trail · 13. Wave card slam with bell · 14. Torch flicker · 15. Low-HP heartbeat.

## 14. Technical architecture

- **Loop:** fixed 60 Hz sim with accumulator, `dt` clamped to 100 ms, max 5 steps per frame, render every rAF, no interpolation. `timeScale` multiplies dt into the accumulator (slow-mo); hitstop skips whole ticks. Shake, kick and flashes advance on render time.
- **Canvas:** logical 960x540, CSS-scaled to fit with letterboxing; backing store scaled by `min(devicePixelRatio, 2)`; one `setTransform` per frame. Mouse un-transformed through the letterbox.
- **Entities:** plain arrays per kind (`enemies, pellets, particles, pickups, texts, casings`), swap-remove; flat objects from factory functions; particles in a fixed ring buffer (budget 500, `fillRect` only). Circle collisions, swept for pellets; N² is fine under 150 enemies.
- **Budgets:** 80 enemies, 120 pellets, 500 particles, 30 pickups, 20 texts alive.
- **File layout:** one `<style>`, one `<script>`, banner-commented sections: `CONFIG · UTIL · INPUT · AUDIO · SPRITES · FX · ENTITIES · WAVES · BLESSINGS · STATES · DEBUG · MAIN`. No modules, no `import`, no `fetch`, no Workers, no `eval`/`new Function`, no inline `on*=` attributes, no `data:` fonts, no external anything (strict-CSP and `file://` safe).
- **Robustness:** player clamped every tick; zero-length vectors guarded (one NaN ends a run); pellets/enemies culled off-arena; upgrade screen always has 3 valid cards; `hp <= 0` reaches GAMEOVER within one tick; `update()` wrapped so an exception logs and goes to GAMEOVER instead of freezing the tab.

## 15. Debug API and QA

`window.GAME` (plain getters): `state, wave, act, score, hp, maxHp, shells, maxShells, enemies, pellets, particleCount, fps, timeScale, god, hiScore, combo, version`, and functions `startRun(), skipToWave(n), spawn(type, n), setGod(bool), setTimeScale(x), snapshot()` (flat JSON of all of the above), `viewport` `{scale, offsetX, offsetY}` and `toScreen(x, y)`.

`?debug=1` or backtick toggles the overlay (fps, frame ms, entity counts) and debug keys: G god, N skip wave, K kill all, L force card screen, B spawn boss, 1–4 timeScale, F1 stress test (200 enemies + 2000 particles must stay green).

**Smoke test** (`node tools/smoke.mjs`) runs after every build: load → click → PLAYING in < 5 s; 20 s of random play with no console errors; card screen entered and exited by click and by key; 80-enemy stress; death → GAMEOVER → retry resets state; high score survives reload. Plus human/Director checks: alt-tab 30 s and return (no teleport, no stuck keys, audio resumes); resize mid-run (aim still lines up).

## 16. Shotgun feel test (hard checkpoint after milestone 3)

In order: **(1) dry fire** 30 s against nothing must feel good (flash, kick, ~6 px shake, casing, pump slide, ready click); **(2) recoil ruler** four shots ≈ 150 px, retreat-fire visibly 2x, advance-fire stalls; **(3) dummy clump** of 20 stationary Restless: one point-blank shot kills 3+, scatters the rest ~120 px, hitstop, pops, confetti; **(4) range ladder** at 60 / 150 / 240 px = 1 shot / coin flip / 2–3 shots; **(5) cadence** empty the tube, fire mid-reload, zero dropped inputs; **(6) sixty-second stranger** plays cold. Tweak order when weak: sound → hitstop → camera kick → enemy knockback → particles → pump time. Never pellet count or spread first.

## 17. Scope

**MUST:** title/click/play; arena; move/aim/fire; the full shotgun spec incl. both knockbacks, pump, interruptible shell reload, wall-splat; Restless, Yoricks, Gravedigger, Claudius; waves 1–10 with budget spawner and gates; hearts, hurt, i-frames; card screen with the 7 unlocked-from-start Blessings; GAMEOVER with score, quote, high score, one-key retry; WIN screen; localStorage; sounds: blast, pump, hit, death, hurt, wave clear; juice 1–7; debug API; smoke test passing.

**SHOULD (in order):** Ghost · the 3 locked Blessings + unlocks + HARD HABIT · combo counter, callouts, reactive reticle, wave card · music drone + arpeggio · pause · Encore · juice 8–13 · casing decals · veil trail.

**COULD:** touch controls, gamepad, run history, juice 14–15, a returning Claudius in Encore, cosmetics.

**CUT:** Rosencrantz & Guildenstern, enemy projectiles, puddles, scrolling, second weapon, pathfinding, physics, speech bubbles, lore text, external assets.

## 18. Build milestones

| # | Milestone | Done when |
|---|---|---|
| M1 | Skeleton | Canvas + scaling, fixed loop, five states with rect placeholders, input, `window.GAME`, debug overlay. Rect nun moves. Smoke test's load/click/state checks pass. |
| M2 | Shotgun v1 | Stratified cone, range fade, nun recoil, pump, shells, interruptible reload, muzzle flash, shake, kick, blast + pump sounds. |
| M3 | Restless + feel | Spawn, steer, separation, knockback, chunks, wall-splat + decal canvas, hitstop, hit-flash. **Feel checkpoint (§16).** |
| M4 | Loop closed | Yoricks, Gravedigger, gates, budget spawner, waves 1–10, Claudius, hearts/i-frames/hurt, GAMEOVER, retry, high score, WIN. Full smoke test passes. |
| M5 | Blessings | Card screen, 10 Blessings (3 locked), unlocks, HARD HABIT, casings, pump slide. |
| M6 | Art pass | Procedural sprites, the nun test, HUD, title, wave card, callouts, reticle. Tag `good-1`. |
| M7 | Should list | Ghost, music, pause, Encore, remaining juice. |
| M8 | Tune and polish | Playtests via harness + Designer review; balance; bug pass. Tag `good-2`. |
