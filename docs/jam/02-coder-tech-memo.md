# GET THEE TO A NUNNERY — Coder Tech Memo

**Author:** Coder. **Audience:** Designer, Director. **Status:** constraints for the design pitch. No code written yet.

The one sentence: a single `index.html`, fixed-step sim, one arena, one shotgun, three enemy types, pixel sprites blitted at 3x, synth audio through a compressor. Everything below is in service of the shotgun feeling incredible at a locked 60fps.

---

## 1. Stack & architecture

**Loop: fixed 60 Hz timestep with an accumulator, render every rAF, no interpolation.** Justification: knockback, friction (`vel *= 0.85`), tweens, hitstop and screen shake all become exact and tunable as per-tick constants instead of `Math.pow(0.85, dt*60)` maths I'll get wrong at 2am. Deterministic sim also makes bugs reproducible. Interpolation isn't worth it: on a 60 Hz monitor it's invisible; on 144 Hz we redraw the same state and nobody notices in a shooter. Frame dt is clamped to 100 ms and max 5 sim steps per frame (tab-switch protection). `timeScale` multiplies dt going into the accumulator, so slow-mo and hitstop are free. On `visibilitychange` hidden → pause state, mute-fade audio.

**State machine:** a plain object per state with `enter / update / draw / exit`, switched via `setState(name)`. States: `TITLE, PLAYING, UPGRADE, GAMEOVER, PAUSED`. `UPGRADE` runs on top of a frozen `PLAYING` draw (dimmed) so the arena stays visible. Priority rule to avoid softlocks: death beats level-up; if both fire the same tick, we go to `GAMEOVER`.

**Entities:** plain arrays per kind (`enemies, pellets, particles, pickups, texts`), swap-remove on death. No inheritance, factory functions returning flat objects with `x, y, vx, vy, r, hp, flash, dead`. The only pool is particles: a pre-allocated fixed-size array with a write cursor that overwrites the oldest. Pellets are fast short-lived projectiles (~1200 px/s, 0.15 s life), not hitscan: the visible spread cone *is* the juice. Swept-circle vs circle test so they don't tunnel.

**Tween/timer helper:** ~30 lines. `after(secs, fn)`, `tween(obj, key, to, secs, ease)`, ticked from the sim. Most "animation" will just be per-entity countdown fields (`flash`, `squash`, `hitstop`) decremented each tick — cheaper and easier to grep than a tween system.

**Input:** `keys` as a `Set` of `e.code`; `mouse = {x, y, down, justDown}`; a `justPressed` set cleared at the end of each update. `window.blur` clears everything (no stuck-key sprinting after alt-tab). Mouse position is un-transformed through the letterbox scale. `contextmenu` prevented on the canvas, right-click available as a button.

**Canvas:** fixed logical **960x540**, CSS-scaled to fit the window with letterboxing (black bars, centered). Backing store is `960 * scale * min(devicePixelRatio, 2)`; one `setTransform` per frame. Sprites live on offscreen canvases; the main ctx has `imageSmoothingEnabled = false` so 3x pixels stay crisp.

**File organisation** (one `<script>`, banner comments so `Cmd-F // ==== AUDIO` jumps there):

```
CONFIG   (all tuning constants — the Designer edits this block and nothing else)
UTIL     (rand, lerp, clamp, angle helpers, easing)
INPUT
AUDIO    (ctx, buses, one function per sound)
SPRITES  (pixel strings -> offscreen canvases, white-flash variants)
FX       (particles, shake/trauma, floating text, flashes)
ENTITIES (player, enemies, pellets, pickups: spawn + update + draw each)
WAVES    (spawn tables, difficulty curve)
UPGRADES (data table + apply functions)
STATES
MAIN     (loop, resize, boot)
```

Each section is an IIFE or plain namespace object. No build step, no modules, no classes hierarchy. ~2500 lines is fine if the sections are honest.

---

## 2. Juice menu — cheap in Canvas 2D

Cost key: **F** free (<0.1 ms), **C** cheap, **M** medium (budget it).

- **Screen shake (trauma):** `trauma` 0–1, offset = `trauma² * 12px` random each frame plus `±trauma² * 2°` rotation; decays 1.5/s. Shotgun adds 0.4, kill adds 0.15, player hit 0.7. One `translate/rotate`. **F**
- **Hitstop:** `hitstop = 0.04` on kill skips sim steps but keeps rendering (shake still moves). Stacks to a cap of 0.08. **F**
- **Slow-mo:** `timeScale = 0.25` on level-up trigger and last-enemy-of-wave, ease back over 0.4 s. **F**
- **Particles:** `fillRect` only, no `arc`, no per-particle `save/restore`, colour set once per batch. Budget **500 alive**, ~40 per shotgun impact. **C** (arc would triple it).
- **Muzzle flash:** 2 frames: bright cone polygon + circle at barrel under `globalCompositeOperation='lighter'`, plus a 1-frame radial light blob pre-rendered to an offscreen canvas. **F**
- **Damage flash (white-out):** pre-render a white silhouette of every sprite at load (`source-in` fill). Swap sprite for 2 frames. **F** — doing the composite per frame would be **M**, so we don't.
- **Squash & stretch:** `scale(1+k, 1-k)` around the feet pivot, `k` decays; fire = stretch along aim, land/spawn = squash. **F**
- **Knockback with friction:** `vel += dir*force; vel *= 0.85` per tick. Recoil pushes the nun back too. **F**
- **Trails:** pellets drawn as a line from `pos` to `pos - vel*0.02` with alpha fade — one `lineTo` per pellet, no position history. **F**
- **Floating numbers:** `fillText` is the slowest primitive here. Cap 20 alive; I'd rather show one combo counter than per-pellet numbers (8 pellets x 40 enemies = noise). **M**
- **Camera kick:** camera offset `-= aim * 8px` on fire, springs back with `*0.8`. **F**
- **Colour flash:** full-screen `fillRect` with `'lighter'` (white/red on hit) or `'multiply'` (dark pulse). One rect. **F**. *Real* chromatic aberration (3 full-screen channel-masked redraws) is **M-to-expensive** and I'll fake it with a 1-frame red/cyan fringe rect at the edges if the Designer insists.
- **Vignette:** radial gradient rendered once to an offscreen canvas, `drawImage` per frame. **C**. Never build a gradient per frame.
- **Flash-on-kill:** white sprite 1 frame + `scale 1.3` pop + burst + hitstop. **F**
- **Bonus, always worth it:** shell casing eject (tiny rect with gravity and one bounce), pellet sparks on wall hit, enemy drop shadow as a flat dark ellipse, ground splat decal (draw to a persistent offscreen "floor" canvas; free forever after). All **C**.

---

## 3. Expensive or risky — what I refuse

- **Pathfinding:** refused. Enemies steer straight at the player plus a separation push. Arena has no walls, so nothing to path around.
- **Real physics / rotated boxes:** refused. Everything is a circle. Overlap = push apart.
- **Entity counts I'm comfortable with per frame:** **80 enemies, 120 pellets, 500 particles, 30 pickups, 20 texts (~750 simple draws).** Pellet-vs-enemy is 10k circle tests worst case, separation is 3k: trivial. Above ~150 enemies I need a spatial hash; I'll write one only if the design demands it, and I'd rather it didn't.
- **Hand-drawn art:** sprites max **16x16**, ~10 sprites total. No cutscenes, no portraits, no big boss sprite (a boss is a big enemy sprite scaled 3x, palette-shifted).
- **Text-heavy UI:** `fillText` and `measureText` layouts eat hours. Upgrade cards = icon + 2-word name + one 6-word line. No paragraphs, no scrolling lists, no lore.
- **Shadows/lighting:** `ctx.shadowBlur` is banned outright (it's the single easiest way to lose 30 fps). No dynamic lights. Vignette + pre-rendered glow blobs is all the lighting we get.
- **Assets, fonts, network:** none. System font stack, bold, uppercase. If the title needs a look, I draw it as chunky pixel letters.
- **Scrolling world:** doable but it drags in camera, culling, off-screen spawning and "where are they" UI. Arena is a third of the code. I'll push back hard.
- **Second weapon / weapon switching:** refused. Upgrades modify *the* shotgun.

---

## 4. Procedural audio plan

Unlock: `AudioContext` created and `resume()`d on the first `pointerdown`/`keydown`; resume again on `visibilitychange`. Title screen says "click to begin" so that gesture is guaranteed.

Master chain: `sfxBus -> DynamicsCompressor(threshold -14, ratio 10, attack 3 ms, release 120 ms) -> masterGain(0.8) -> destination`. Music on its own gain feeding the same compressor, so blasts naturally duck it; plus an explicit `musicGain.setTargetAtTime(0.5, now, 0.02)` dip on fire. **M** toggles `masterGain` 0/0.8, persisted. One 2 s white-noise `AudioBuffer` generated at boot and reused; never allocate buffers per shot. Voice cap: if >6 hit sounds are requested in one tick, play one at higher gain.

- **Shotgun blast** (the whole game; I'll spend two hours here): (1) noise burst → bandpass sweeping **1800→250 Hz over 120 ms**, Q 1.2, gain instant → exponential decay to 0 by 250 ms; (2) thump: sine **120→38 Hz over 90 ms**, decay 160 ms, plus a triangle at 55 Hz for body; (3) click: 4 ms highpassed (3 kHz) noise at t=0 for mechanical transient; (4) a soft `WaveShaper` tanh curve on the sfx bus for grit; (5) `±6%` random playback rate so repeats aren't a machine gun. About 8 nodes, all `stop()`ed and GC'd.
- **Pump / reload:** two clicks 90 ms apart: highpassed noise tick + sine ping 900→600 Hz, then 650→400 Hz. "Chk-chk." Pitch of click 2 tells the player the gun is ready.
- **Enemy hit:** square 220→90 Hz pitch drop over 60 ms + tiny noise tick; random pitch.
- **Death squelch:** lowpass-swept noise 900→120 Hz over 160 ms + sine 160→45 Hz. **Pop** variant: sine 500→100 Hz in 40 ms for small enemies.
- **Pickup chime:** two triangle notes (E5, B5) 50 ms apart, 1% detune, 200 ms decay. Pitch steps up with combo count, resets on miss.
- **UI click:** 6 ms sine 1200 Hz + noise tick. Confirm = two-note.
- **Music: yes, worth ~1.5 hours.** A drone: two detuned saws through a lowpass, minor key (organ-ish, it's a nunnery), plus a scheduled 16th-note arpeggio from a chord table (i–VI–III–VII) on triangle oscillators, 100 ms look-ahead scheduler. Lowpass cutoff and arp density rise with wave number, so intensity is free. Silence is the fastest way to make a jam game feel cheap; this is dirt-cheap CPU.

---

## 5. Character rendering

**Recommendation: (c) mix, leaning pixel sprites.** Bodies are tiny palette-indexed string sprites drawn once to offscreen canvases and blitted at **3x** with smoothing off. The shotgun, pellets, particles, pickups, and UI are procedural shapes. Reason: a 12x14 pixel nun reads as a nun instantly; a stack of `arc()`s reads as a snowman in a hat, and rotating pixel art at 3x looks terrible, so the only thing that rotates (the gun) is procedural.

**The nun (12x14 → 36x42 px):** black habit as a tapering rounded silhouette; white coif framing a peach 4x4 face with two dark pixels for eyes; a white scapular/collar strip; 3x3 gold cross on the chest; two dark boot pixels. Sprite flips horizontally when the aim crosses vertical. **The shotgun:** a 16x4 dark-brown rect + 12x3 grey barrel + a pump highlight, pivoted at the nun's hand and rotated to the mouse angle, drawn *over* the sprite when aiming down and *under* when aiming up. Recoil slides it 5 px back along the aim and springs forward.

**Enemies:** 10–12 px each, **max 3 types + palette-shifted variants**, distinct by silhouette: a round imp (wide, horns), a tall thin ghoul, a fat brute. Colour-coded; the white-flash variant is generated automatically.

**Animation:** 2-frame walk (leg pixels swap) at 8 fps when moving, sine bob of 1.5 px, squash on spawn/land, stretch on fire, white flash on hit, `1.3x` pop and burst on death. That's the whole animation system; it's about 40 lines.

Sprite source format (12 lines per sprite, editable in the file):

```
'....kkkk....',
'...kwwwwk...',
'...kwppwk...',   // . transparent  k black  w white  p skin  y gold  r red
```

---

## 6. Persistence

`localStorage` key `nunnery.v1` holding `{hi, bestWave, unlocks: [], mute, runs}`. `load()` wraps `getItem + JSON.parse` in try/catch and validates types with defaults (private mode and quota errors are silent). `save()` is also try/catch and called only at game over and on mute toggle. No cloud, no leaderboard.

---

## 7. Testing / QA plan

**Debug tooling** (enabled by `?debug=1` or backtick): **F** fps + entity-count overlay (frame ms, arrays' lengths, particle count), **G** god mode, **N** skip wave, **K** kill all, **L** force upgrade screen, **B** spawn boss, **1–4** timeScale 0.25/0.5/1/2, **P** stress test (200 enemies + 2000 particles; must stay green).

**Smoke test, run after every play session:**

1. Fresh load → title → a single click puts you in the game in under 5 s.
2. Die → game over → restart, five times in a row. Entity counts on the overlay read zero at the title. Hi-score persists across reload.
3. Upgrade screen: pick with mouse, pick with keyboard, mash fire while it opens, trigger it while dying.
4. Alt-tab for 30 s and return: no teleport, no stuck keys, audio resumes.
5. Resize the window mid-run; mouse aim still lines up.
6. Chrome, Firefox, Safari. Safari audio is the usual suspect.

**"No run-breaking bugs" means, concretely:** the player is clamped inside the arena every tick; pellets and enemies are killed off-screen; `normalize()` guards zero-length vectors (one NaN in a velocity ends a run); the upgrade screen always has 3 valid cards even when the pool is exhausted (fallback: "+heal"); game over is reachable from any state within one tick of `hp <= 0`; restart calls `newGame()` which rebuilds the entire state object from scratch — we never patch fields on an old state; no exception escapes `update()` (wrapped in a try that logs and sets state to `GAMEOVER` rather than freezing the tab).

---

## 8. Jam wisdom — five ways it fails, and my rule

1. **Twelve systems, none tuned.** Rule: the shotgun is finished and feels great *before* a second enemy type exists. Saturday afternoon is shotgun-only.
2. **Playable too late.** Rule: title → play → die → restart with coloured rects by hour 6. The loop is the first milestone, not the last.
3. **2 am feature creep.** Rule: feature freeze six hours before deadline. After that only bugs, tuning, and juice that touches no new system.
4. **Nobody plays it fresh.** Rule: every two hours someone plays from the title with zero explanation while we watch. If they're confused at 5 s, we change the game, not add a tutorial.
5. **The build breaks.** Rule: `git tag good-N` after every play session; single file so shipping is a copy; no refactors after Saturday night.

---

## 9. Questions for the Designer — lock these before I write a line

1. **Arena or scrolling?** I want a fixed 960x540 arena. Say yes.
2. **Aim:** WASD + mouse aim (I assume yes). Reticle, laser line, or neither?
3. **Shotgun model:** magazine size, fire rate, **manual pump or auto?** Is pumping a rhythm/skill mechanic (pump-cancel, perfect-pump bonus)? This decides the whole input model and the core sound design.
4. **Pellets:** how many, spread angle, range falloff? Does recoil push the nun back (I want this; it turns the gun into a movement tool)?
5. **Progression:** XP → level-up pick-1-of-3 mid-wave, or between-wave choice? Send me the **full upgrade list** (cap 10). Flag anything that isn't a stat tweak (bouncing pellets, holy-water puddles, orbiting rosary) — each is a new system and costs an hour or more.
6. **Enemy roster:** three types plus one boss, one line of behaviour each. Anything that shoots needs an enemy-bullet type; fine, but count it.
7. **Win condition:** the brief demands a win. Survive N waves? Kill the wave-10 boss then endless for score? Pick one.
8. **Health model:** hit points with i-frames and health drops, or lives? Contact damage only?
9. **Score and unlocks:** what feeds score (kills, combo, time)? What unlocks (3–5 max: a start upgrade, a habit colour, a harder mode)?
10. **Tone:** red gore or holy vaporise-in-light? Both are cheap; palette decisions follow from it. Any text beyond title, one hint line, and upgrade names? (Please say no.)
