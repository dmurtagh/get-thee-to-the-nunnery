# 08 — Code review: run-breaking bugs

**1 Critical · 1 Important · 7 Minor.** Line numbers are as of commit `6a352eb`. Every Critical and
Important finding below was reproduced headless via `tools/cdp.mjs`; the Minors are code-read
findings unless marked otherwise. Nothing in this document has been fixed — the Coder fixes, the
Producer commits.

> **Line-number drift.** While this review was running, `index.html` picked up uncommitted edits from
> the Designer-07 pass (footprint ring, tracer render, callout threshold, burst timing), shifting the
> file by about +10 lines. Both non-Minor findings survive unchanged in that working tree — C1 is now
> at `1238` / `1256` / (swap-remove) `1281`, and I1 at `1812`. The headings below keep the `6a352eb`
> numbers as briefed.

---

## CRITICAL

### C1. Point-blank shots pass straight through — an enemy standing on you cannot be hit
`index.html:1228`, `index.html:1246`

**Symptom (player).** A skull that has reached you and is chewing on your habit takes *zero* damage
no matter how many times you fire into it. In god mode (debug `G`) the last enemy of a wave can park
itself on the nun and become permanently unkillable — the budget is spent, the courtyard never
empties, and the wave never ends.

**Mechanism.** `fire()` spawns each pellet **at the muzzle**, 30 px (`MUZZLE_OFF`) along the aim, and
seeds its previous position to the same point (`px: mx, py: my`, line 1228). `updatePellets` then
overwrites `b.px/b.py` with the current position at the *top* of every tick (line 1246), so the
swept-circle test on line 1263 always starts at the muzzle and travels outward. Everything inside the
muzzle offset is behind the sweep and is never tested. The blind radius is
`MUZZLE_OFF − (enemy.r + PELLET_R)`.

Measured (fire straight at a stationary dummy, count HP lost from one 8-pellet shot):

| type | r | blind out to | contact at (`e.r + 11`) |
|---|---|---|---|
| yorick | 7 | **20 px** | 18 px — *a Yorick in contact is always invulnerable* |
| restless | 12 | 15 px | 23 px |
| ghost | 12 | 15 px | 23 px |
| gravedigger | 24 | 0 px | 35 px |

**Reproduced.**
- Normal run, no god, wave 4, standing still while a Yorick pack arrives: minimum enemy-to-nun centre
  distance reaches **0.3 px** — far inside the 20 px hole — before she dies.
- God mode + random play: wave 1, `spent 8 / budget 8`, `telegraphs 0`, a single Restless at (932, 28)
  with the nun at (933, 27) survived 220 fuzz iterations (~100 s of sim time at `timeScale 4`) at full
  HP. The wave can never end.
- Ladder test at 0/5/10/14 px = 0 damage, 16 px+ = 8 damage (Restless).

**Smallest correct fix.** Make the first swept segment start at the nun, not the muzzle — which is
what the comment on line 1227 already claims ("measured from the nun, not the muzzle"). Three edits:

1. line 1228 — `px: mx, py: my,` → `px: p.x, py: p.y - 1,`
2. line 1246 — drop the leading assignment: `b.px = b.x; b.py = b.y; b.x += …` → `b.x += …`
3. line 1271 — record the position for the *next* tick just before the swap-remove:
   `b.px = b.x; b.py = b.y;` on the line above `if (dead) { … }`

Verified on a copy of the file: all four enemy types then take the full 8 pellets at every distance
from 10 px outward, and nothing else in the smoke path changes. (Fixing only line 1228 does nothing —
line 1246 throws the seed away on the first tick.)

---

## IMPORTANT

### I1. A saved `unlocks` value that is an object throws on the title screen and dumps you into GAME OVER
`index.html:1802` (root cause `index.html:212`)

**Symptom (player).** With a corrupt or hostile save, the game boots to a blank title and immediately
shows the GAME OVER screen before a single key is pressed — and silently banks a bogus run.

**Mechanism.** `Save.load` validates shape with `typeof o[k] === typeof d[k]` (line 212), and
`typeof {} === typeof []` — so `{"unlocks": {}}` is accepted as the unlocks list. `unlocked()`
(line 1802) then calls `u.indexOf(...)` on a plain object: `TypeError: u.indexOf is not a function`.
It is reached from `hardUnlocked()` (1834) in **both** `TITLE.update` (2040) and `TITLE.draw` (2067),
so `safeUpdate`'s catch (2383) fires `setState('GAMEOVER')` on the first tick, and `draw()` (2391)
logs the same error every frame with no recovery. `checkUnlocks` (1823) then repairs the array as a
side effect, so it self-heals *after* dumping the player out of the title. §14 requires localStorage
to fall back in memory and never throw.

**Reproduced.** `localStorage.setItem('nunnery.v1','{"unlocks":{}}')` then reload → `GAME.state` is
`GAMEOVER` at boot, `console.error: draw failed TypeError: u.indexOf is not a function`. All other
hostile inputs tested are already clean: `{{{`, `null`, `[]`, `{"unlocks":null}`, `{"unlocks":"abc"}`,
`{"hi":"NaN"}`, `{"hi":1e308}`.

**Smallest correct fix.** Line 1802:
`return Array.isArray(u) && u.indexOf(id) >= 0;`
(Belt and braces at line 212: skip a key when `Array.isArray(d[k]) !== Array.isArray(o[k])`.)

---

## MINOR

### M1. The lifted card's click box does not move with it
`index.html:1854` vs `index.html:1844`
Hovering raises the card art by `CARD_LIFT` (10 px), but `cardAt` hit-tests the unlifted
`cardRect(i)`. The top 10 px of a hovered card is dead, and the 10 px of empty space under it is
live. Fix: subtract the same lift inside `cardAt` when `i === G.cardHover`.

### M2. A drained blessing pool deals three identical GRACE cards that do nothing
`index.html:1810`
Once every other card is capped and `maxHp` is already at `MAX_HEARTS`, all three cards are GRACE and
picking any of them is a no-op. Not a softlock (verified: 25 consecutive card screens, every one
dealt 3 cards and every pick returned to PLAYING), and §7 does sanction "pool exhausted → GRACE" —
but the last screens of a long Encore offer no choice at all. Fix: when the pool is empty, deal one
GRACE and label the other two as a plain "continue".

### M3. Every retry allocates a fresh 1920×1080 floor canvas
`index.html:1112`, called from `index.html:1902`
`Floor.build()` does `cv = makeCanvas(CONFIG.W * 2, CONFIG.H * 2)` — an ~8 MB backing store — on every
`startRun()`, discarding the previous one. Harmless in a 5-run session but pure churn. Fix: build the
canvas once and have `build()` only repaint it.

### M4. 80 simultaneous deaths stamp 80 clipped decals in one frame
`index.html:1481`
Each `splatDecal` does `save/clip/ellipse + 5 arcs` on the 2x floor canvas. Measured worst rAF gap
during an 80-body `killAll()`: **21.5 ms** — one dropped frame, headless, on this machine. Fine as
shipped; if it bites on weaker hardware, cap the decals stamped per frame.

### M5. A `draw()` exception has no recovery path
`index.html:2391`
`safeUpdate` recovers into GAMEOVER, but `draw()` only `console.error`s. A persistently throwing draw
leaves a blank floor-coloured screen forever while the sim keeps running underneath (this is what
makes I1 look like a hang before the state flips). Fix: on a draw throw, set a flag and fall back to
the GAMEOVER draw, or at minimum stop re-throwing every frame.

### M6. The music keeps the previous run's wave on the title screen
`index.html:484`, called from `index.html:2405`
`Music.set(mode, G.wave)` guards with `if (waveN)`, and `G.wave` is `0` on TITLE — so the drone's arp
cutoff and density stay wherever the last run left them. Cosmetic. Fix: `if (waveN != null) wave = waveN;`
and pass `G.wave || 1`.

### M7. `waveName` hardcodes the boss wave number
`index.html:1598`
`if (n > 10) return 'ENCORE ' + roman(n - 10)` uses a literal 10 where the rest of the file uses
`CONFIG.BOSS_WAVE`. The numbering is correct as shipped (verified: wave 10 = `ACT V · SCENE II` +
`CURTAIN CALL`, wave 11 = `ENCORE I`), but it silently desyncs the moment `BOSS_WAVE` is retuned.

---

## Checked and clean

These were hunted specifically and found sound — recorded so nobody re-spends the time:

- **NaN / Infinity.** 220-iteration random fuzz plus a 30-iteration 80-enemy soak at `timeScale 4`:
  no non-finite value in `snapshot()`, `player` or `enemyList`. `norm()` (line 120) guards every
  zero-length vector; separation guards `d2 < 1e-4` (1382); the swept test guards `len2 || 1e-6`
  (1260); `resolveShots` divides by a kill count that is always ≥ 1; `setTimeScale` coerces junk to 0,
  not NaN. A 0-scale viewport degrades to a safe `[1, 0, 0]` aim rather than NaN.
- **Listener leaks.** Identical counts (`resize/keydown/keyup/mousemove/mousedown/mouseup/contextmenu/blur`
  = 1 each) at boot and after 5 die-and-retry cycles. All listeners are registered once at module scope;
  `newGame()` adds none.
- **Softlocks.** PAUSED is enterable and leavable by Esc, P, click and Space, and via `blur` and
  `visibilitychange`; held keys are cleared on focus loss; audio suspends and resumes. `timeScale`
  always returns to base after hurt slow-mo, wave-end slow-mo and boss-win slow-mo (the restore in
  `frame()` at 2407 runs in every state). `hitstop` never stranded. WIN → Encore → `ENCORE I`,
  budget 58, ×1.1 multiplier; Escape bows back to TITLE. GAMEOVER → retry resets the run.
- **Wave/budget arithmetic.** `planBurst` can never overspend (`o.cost <= left - spent`), so `left`
  always reaches 0; the fallback on 1661 never leaves an unspendable remainder. Boss wave never runs
  `endWave`, so the `else if` on 2411 can't strand `winT`.
- **Swap-removes.** Every one (pellets, casings, pickups, texts, enemies, telegraphs, pendingShots)
  iterates backwards, so the element swapped in has already been visited. No skipped entities.
- **Arrays and budgets.** enemies ≤ 80, pellets ≤ 120, particles are a fixed 500-slot ring, texts ≤ 20,
  casings ≤ 40, pickups ≤ 30, telegraphs cleared on `startWave`, `pendingShots` drained within
  `SHOT_RESOLVE_T`. No unbounded growth found.
- **Performance.** No `ctx.shadowBlur` anywhere. All four gradients are built once in `FX.prerender()`;
  no gradient, canvas or sprite is created per frame. 80 enemies + firing: min 52 fps, max frame 0.95 ms
  headless.
- **Audio.** Every public call is wrapped (line 419). The music scheduler never schedules in the past
  (`if (nextT < t)` reset, line 499), schedules nothing while suspended/muted/paused, and tears its two
  long-lived oscillators down after `MUSIC_IDLE`. Suspend-on-hide then resume-on-input verified.
- **file:// and CSP.** No `fetch`, no modules, no `eval`, no external URLs, no `data:` fonts, no inline
  `on*` attributes. Loads and plays from `file://`; localStorage access is inside try/catch.
- **`node tools/smoke.mjs`** passes end to end on `6a352eb`.
