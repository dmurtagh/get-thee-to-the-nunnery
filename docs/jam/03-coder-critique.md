# 03 — Coder Critique of the Designer Pitch (debate round 1)

Short version: Concept A with recoil is the right game and the shotgun spec is excellent. But the pitch is ~40 hours and **MUST alone eats the weekend.**

---

## 1. Your seven open questions

1. **120 Hz sim vs variable dt.** Neither: **fixed 60 Hz, accumulator, dt clamped to 100 ms, max 5 steps/frame.** 120 Hz doubles collision cost for nothing visible at 60 Hz render. Hitstop is counted in ticks (40 ms = 2, 70 ms = 4).
2. **Hitstop.** Freeze (skip sim ticks), do not scale to 0.05: scaling still moves things and muddies sweep tests. Input stays live and `justPressed` is buffered, so a click mid-freeze fires on the next tick. Shake, kick and flashes run on render time, so the screen still shudders. Same-tick kills take the **max**, not the sum; cap 80 ms.
3. **Budget.** 400 particles, 60 casings, decal canvas: yes on a 2019 Air, given `fillRect` not `arc`, no `shadowBlur`, DPR capped at 2. Better: when a casing or chunk stops moving, **stamp it to the decal canvas and delete it**. Persistent casings then cost zero and need no cap.
4. **Voices.** Node count is not the problem; clipping and GC churn are. Rule: max 4 instances per sound per 50 ms; extras skip and raise the batch gain by `sqrt(n)`. Compressor catches the rest; no pooling for one-shots. "Click to begin" is a perfect unlock: create and `resume()` the context in that handler, and keep resuming on any input until `state === 'running'`.
5. **Collision.** N-squared is noise: 60 x 80 = 4,800 distance checks. No spatial hash unless enemies pass ~150. Separation I trust: after movement, push each overlapping pair apart by half the overlap, weighted by inverse mass (Gravedigger 4, Yorick 0.5), one pass, then wall clamp. Your crowd ripple comes free if a shoved enemy (speed > 200) transfers 30% of its velocity on contact. About 25 lines.
6. **Cursor leaving canvas.** No pointer lock (Escape ejects, permission prompt, breaks the harness). Listen for `mousemove`/`mouseup` on `window`; aim = cursor minus nun, so a cursor over the letterbox bars still aims. Reticle clamped to the arena; `cursor:none` on the canvas only.
7. **DPR and file://.** Fractional CSS scale with a DPR-aware backing store; integer scaling gives 1x on a 1440x900 laptop, a postage stamp. Procedural art is resolution-independent, so no softness. `file://` localStorage works in Chrome and Firefox (shared origin, so we namespace `nunnery.v1`); Safari may not persist, hence try/catch. The real `file://` trap: **no `type="module"`, `import` or `fetch`.** Plain script tag.

---

## 2. Feature verdicts

| Feature | Hours | Verdict |
|---|---|---|
| Core (loop, states, input, scaling, save, debug API) | 3 | BUILD |
| Shotgun spec incl. both knockbacks, pump, shell-by-shell interruptible reload | 3 | BUILD. Reload is a 3-state machine (READY/PUMPING/LOADING), ~40 lines. Keep the **R** key; it is three of them. |
| Restless, Yoricks, Gravedigger | 1.5 | BUILD. One steering function, three stat lines, mass on the Gravedigger. |
| **R&G ranged pair** (arcing goblets, slowing puddles, hover, partner panic) | 3 | **CUT.** Four new systems: fake-z projectile, ground hazard, orbit AI, partner link. If Sunday runs ahead: BUILD-SIMPLER as one "Rosencrantz" who keeps distance and lobs a goblet that hurts where it lands; no puddle, no pair (1.5 h). |
| **Ghost** | 1.5 | BUILD-SIMPLER; better value than R&G. "Inside stone" is `!inBounds`, immunity is one check, spawn at the wall behind the player's facing, no wall clamp, 50% alpha. |
| Wall-splat +3 damage and decal | 1 | BUILD. `hitWallThisTick && speed > 180`. |
| 8 stat Blessings (Buckshot, Sawn-Off, Litany, Hail Mary, Vespers, Quickening, Wrath, Grace) + card screen | 2 | BUILD. Cards are the cost; each Blessing is a line in a table. |
| Old Testament, Ricochet Psalm, Last Rites, Thunderclap | 1.5 | BUILD, SHOULD tier. Cheap because the arena is axis-aligned: pierce is a per-pellet hit list, ricochet negates `vx` or `vy` once, the other two are counters. |
| Curtain Call (crowned Gravedigger, HP 40) + win screen + Encore | 1.5 | BUILD and **promote to MUST**: the brief requires a win. Encore is a "keep spawning" flag. |
| 4 unlockable Blessings | 0.5 | BUILD. This is the brief's "reason to come back" at half an hour. |
| Gate telegraphs | 0.5 | BUILD. |
| Persisting casings | 0.5 | BUILD via decal stamping. |
| Veil trail | 0.5 | BUILD late. Three stored positions, one tapering polygon. |
| Act title card | 0.5 | BUILD. One `fillText`, tweened scale. |
| Combo callouts | 0.5 | BUILD, one on screen at a time. |
| Reactive reticle | 0.25 | BUILD. We already compute nearest-enemy distance. |
| fillText volume | 0 | **I concede.** My fear was per-frame count: play HUD is ~3 texts/frame, card screen ~10 static. Georgia is a system font, CSP-safe. Rules: shells and hearts are icons; no per-pellet numbers; no speech bubbles. |
| Claudius boss, touch, gamepad, cosmetics, run history, desaturation, dust motes, full music | 8+ | CUT. |

Sound: MUST list is right, but ship **one death sound pitched by enemy mass** first; three bespoke deaths are a Sunday luxury. Drone plus distant bell (1 h) stays in SHOULD as you have it; full music stays COULD.

---

## 3. Art style

Your case is better than I expected. Pixel strings win on **predictability**: I know a 12x14 nun reads, it is 40 lines, and the white-flash variant is automatic. They lose on everything your pitch depends on: **rotation, squash, lean and the veil trail look bad on 3x pixel art**, and fractional scaling shimmers. Procedural shapes handle all of that, variants (crowned Gravedigger, translucent Ghost) are parameters, and once pre-rendered at boot the per-frame cost is identical: one `drawImage`.

So it is hours and the tiebreaker. **I concede, gated by a one-hour test:** in hour 6 your nun goes on a scratch canvas at 28 px and four people look for one second. All say "nun" and we ship it. Still fiddling after 45 minutes and we switch to pixel strings, I own it, no further debate. The coif-ring silhouette convinced me; keep "3/4 top-down" *slight*, meaning y-sorted draw order and nothing more.

---

## 4. Hours versus the weekend

As pitched: **MUST ~19.5 h, SHOULD ~12 h, COULD ~8 h, total ~40 h** against 16 to 20 productive hours. MUST alone is the weekend, before bugs and tuning.

**Proposed plan (~17 h MUST, ~3 h of SHOULD picks):**

- MUST as pitched except: 8 stat Blessings not 6 (same cost); one death sound; **Curtain Call + win + Encore moves in**; procedural art via the hour-6 gate.
- SHOULD, strictly in order, take what fits: Ghost (1.5) → 4 system Blessings + unlocks (2) → callouts, reticle, Act card (1) → drone (1) → simplified R&G (1.5, probably will not make it).
- CUT: R&G puddles and pair logic, boss, touch, gamepad, cosmetics, bubbles, run list, desaturation, motes, full music.

**First six hours:**

- **H1** Skeleton: canvas + scaling, fixed loop, five states with rect placeholders, input, `window.GAME` stub, `?debug=1` overlay, file:// check. Rect nun moves.
- **H2** Shotgun v1: stratified cone, range fade, nun recoil, pump, shells + interruptible reload, muzzle flash, shake, kick, blast sound v1. **The gun is tuned with sound on from hour two.**
- **H3** Restless: spawn, steer, separation, knockback, chunks, wall-splat + decal canvas, hitstop. Play 30 minutes and tune. This is the "does firing feel amazing" checkpoint; we do not leave until yes.
- **H4** Yoricks, Gravedigger, gates, budget spawner, Acts I to X, hearts, i-frames, hurt, death screen, retry, high score. **Loop closed.**
- **H5** Card screen + 8 Blessings; casings, pump slide, hit-flash white.
- **H6** Art pass and the nun test. Commit, tag `good-1`, first zero-explanation playtest.

---

## 5. Fight-for items

**Agree on all three.** Recoil-moves-nun is one vector add and it is the game. Interruptible reload is a 40-line state machine. Hitstop + wall-splat is under an hour combined.

Where I disagree: **five enemy types.** Three plus the Ghost; R&G is a third of the enemy hours for a quarter of the roster, and ranged enemies are, as you say, the buggiest thing in a jam. **120 Hz sim**: no, see Q1. **MUST size**: it shrinks or Sunday has no bug time.

---

## 6. Director's technical requirements (folded in, not debated)

**Debug API.** `window.GAME` exposes plain values via getters: `state, act, wave, score, hp, shells, enemies, pellets, particleCount, fps, timeScale, god, version`, plus `startRun(), skipToAct(n), spawn(type, n), setGod(bool), setTimeScale(x)`. Two additions for the harness: `snapshot()` returning flat JSON so one `Runtime.evaluate` reads everything, and `viewport` `{scale, offsetX, offsetY}` + `toScreen(x, y)` so `tools/cdp.mjs` can click logical coordinates through the letterbox. Input listeners live on `window` and never consult `document.hasFocus()`, so CDP events land without canvas focus. Game logic never awaits audio; `--mute-audio` and headless are fine.

**Strict CSP.** One inline `<script>` and one `<style>` so a hash or nonce covers them. No external fonts, images or scripts; no `eval`, `new Function`, inline `on*=` attributes, `javascript:` URLs or `data:` fonts. Georgia via the system stack. Web Audio and localStorage are unaffected.

**file://.** Plain script tag (no modules), no `fetch`, no Workers, no `import`. localStorage try/catch with in-memory fallback.
