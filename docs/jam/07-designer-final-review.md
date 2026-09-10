# 07 — Designer final review

**Build:** `main` @ `6a352eb`, `index.html` v`1.0.0-m8`. Nothing in `index.html` or `tools/` touched.

## Method

Headless Chrome at 960x540 (true 1x, `viewport.scale 1`, DPR 1) through `tools/cdp.mjs`, eleven sessions,
zero console errors in every one of them and 60.0 fps with 49 bodies alive. I looked at every pixel of
twenty-odd captures (all in `tools/shots/dr-*.png`): title, the wave-card slam, the opening 15 s of wave 1
sampled every 250 ms, a point-blank blast into a 16-body clump caught at 45 ms and 125 ms, the same shot
with the payoff build (11 pellets / 6 shells / Wrath), the cone in open air at `setTimeScale(0.12)`, the
Blessing cards, wave 6 with a Ghost alive, Claudius, WIN, GAMEOVER, the pause overlay, and a 120x120 clip
of the nun at 1x. Pacing and roster mix were measured, not eyeballed: an in-page bot (synthetic
`window` events, 30 Hz) played a real run to death, and a god-mode probe let each wave's whole budget
come through the gates without anything dying, to count what the wave is actually made of.

I could not hear it. The audio numbers from `06` are all in `CONFIG` (`COMP_THRESH -8`, `COMP_RATIO 4`,
`BLAST_SINE_DUR 0.30`, `BLAST_SINE_PEAK 1.3`, `BLAST_NOISE_DUR 0.30`); the Director still owes us §16.6,
the sixty-second stranger with sound on. Nothing below touches audio.

## The three questions

**Does firing feel like the pitch?** `dr-blast.png` is the answer and it is a yes: white wedge, warm
radial wash on the flagstones, the whole front row lit amber, `ALAS!` popping in at the kill centroid,
hitstop holding the frame. Everything the M3 review asked for was applied and it shows —
`SHAKE_FIRE_PX 9`, `HITSTOP_KILL 3`, `CORPSE_TRANSFER 1.0`, `PELLET_SPEED_JITTER 0.08`, `FIRE_BUFFER_T 0.10`.
The one part of "see it" that under-delivers is the cone itself (fix 6).

**Is a kill a deletion?** Yes. `dr-blessed-after.png`: seven bodies gone, a wall of shade-green chunks and
bone confetti travelling along the aim axis, chain 7, x1.7. Even at base stats the two-pop-one-wounded
rhythm I ruled for at M3 plays exactly as ruled.

**Does wave 1 read as a warm-up?** Perfectly. Measured: 1 body at 2.8 s, 2 at 5.3, 4 at 7.6, 6 at 9.9,
8 at 12.2, wave cleared at 24.3 s by a mediocre bot. That is a textbook ramp and I would not move a
number in it except the first beat (fix 3).

**Is there a grin in the first 30 seconds?** Yes, at about 4 seconds — the gate flares, the dirt bursts,
one green courtier walks out, one BOOM deletes him and hops her backwards. It arrives ~1 s later than it
should, and it arrives while the player cannot reliably see herself. Those are fixes 3 and 1.

## Spec §10 string check

Every string in §10 is in the build and on screen, verbatim, with §10's own "sans stack, bold, uppercase"
rule applied to the non-serif lines. **Nothing is missing and nothing is altered.** Confirmed on screen:
`GET THEE TO` / `A NUNNERY`, `She took the advice.`, `WASD MOVE · MOUSE AIM · CLICK TO BEGIN`,
`BEST 0 · WAVE 0`, the `M` keycap + `MUTE`, the `HARD HABIT` toggle (`dr-title-hard.png`),
`ACT I · SCENE I` / `ACT III · SCENE II` / `ACT V · SCENE II`, `CURTAIN CALL` (source, `waveSub`),
`ENCORE ` + roman (source, `waveName`), `ALAS!` (`dr-blast.png`) and `ZOUNDS!` (`dr-poor-yorick-clip.png`),
`SCORE` / `BEST` / `CLICK TO RETRY` and all six death quotes (`Alas, poor Ophelia.`,
`The rest is silence. Until you click.`, `Goodnight, sweet nun.` seen; all six present in `QUOTES`),
`THE REST IS SILENCE.` / `ENCORE?  CLICK   ·   ESC TO BOW` (`dr-win.png`), and the ten Blessing names and
lines verbatim in `BLESSINGS` (three of them on screen in `dr-cards.png`).

One observation, not a defect: `POOR YORICK!` needs eight kills from one shot (`CALLOUT_YORICK 8`) and I
never got past seven in testing, because eight pellets in a 22° cone rarely find eight skulls. See fix 13.

---

## Fixes, ranked by player impact

### 1. The player disappears. — **Critical**

In `drawWorld` (line ~1936) the nun is pushed into the y-sorted `bodies` array, so every enemy standing
below her draws over her; a Gravedigger (68 px sprite) hides her and Claudius (180 px) erases her
completely. Then `FX.drawFlashes` blits a 160 px `lighter` glow centred 30 px in front of her on every
single shot, whiting her out at the exact instant she needs to know where she is. I could not find the
player character in `dr-wave6-ghost.png`, `dr-wave8-crowd.png`, `dr-claudius.png` or `dr-preblast.png`.
A shoot-to-dodge game where the player cannot see herself is not shipping.

**Fix (code, ~6 lines, no CONFIG):** keep the y-sort for enemies only — remove `bodies.push(p)` and the
`if (b === p)` branch from the loop — and move the player block (i-frame alpha blink included) to after
`FX.drawFlashes(c)` and before `drawTexts(c)`. Then, in `drawNunSprite`, immediately before
`drawShadow`, stroke a cream ellipse ring around her feet: `rx 15, ry 5.5, lineWidth 1.5,
strokeStyle = rgba(PAL.cream, 0.3)`. Her footprint stays readable even with a body standing on it.

### 2. The reticle lies about range. — **Critical**

`drawPlayerReticle` (line ~1969) sets `hot` when **any** enemy is within kill range of the **nun**,
whatever the mouse is pointing at. `dr-reticle-hot.png`: a solid amber, cross-ticked, in-range reticle
sitting on bare stone 500 px from the nearest body, because one Restless happens to be beside her. From
wave 3 on it is lit almost permanently. The reticle is the game's only teacher of the get-closer
decision — the whole risk/reward — and right now it teaches noise.

**Fix (code, ~4 lines):** inside the loop also require the enemy to be inside the shot cone before
setting `hot`:
`const [ex, ey] = norm(e.x - p.x, e.y - p.y); if (d < killRange + e.r && ex * p.aimX + ey * p.aimY > Math.cos(((p.stats.spread / 2) + 6) * Math.PI / 180)) { hot = true; break; }`
The +6° pad keeps it from flickering at the cone edge, and it stays correct when SAWN-OFF widens the spread.

### 3. Nothing happens for the first 2.8 seconds. — **Important**

`BURST_FIRST 2.0` plus `TELEGRAPH_T 0.5` puts the first body on the flagstones at 2.5–2.8 s (measured
2.8). For a game whose pitch is "playing within five seconds", the opening beat is a second late and the
stranger spends it looking at an empty courtyard.

**CONFIG: `BURST_FIRST` 2.0 → 1.3.** First gate flare at 1.3 s, first courtier at ~1.8 s, walking out of
the dirt while the wave card is still fading — which is a better shot than silence. Every later beat is
untouched (`BURST_MIN 2` / `BURST_MAX 3` and the whole burst-cap ramp stay).

### 4. The Ghost is invisible. — **Important**

`ENEMY_DEFS.ghost` (line 1321) draws at `alpha: 0.5`. Cyan at half alpha over `#1b1f3a` at 1x is a
smudge — bottom-right of `dr-wave8-crowd.png`, left edge of `dr-wave6-ghost.png`. Its entire job is to
punish tunnel vision, and that only works if turning round rewards you with a visible dead king.

**Value: `ENEMY_DEFS.ghost.alpha` 0.5 → 0.72.** (The `alpha: 0.5` on `SPRITE_BOX.ghost` line 911 is dead
code and must not be touched — changing both would double the effect.)

### 5. The ramp is more skulls, not more danger. — **Important**

Full-budget composition, measured with nothing dying: wave 3 = 9 Restless + 9 Yoricks; wave 5 = 13 + 24
and **one** Gravedigger; wave 8 = 10 + 36, **one** Gravedigger, 2 Ghosts. `planBurst` weights options by
`1/cost`, so at cost 6 the Gravedigger is picked ~10% of the time and eats a sixth of the budget when he
is. The result: the best thing in the game to shoot — the only body that blocks the cone, the only
wall-splat worth the name, the only heart drop — appears once per wave for the whole run, and escalation
reads as more confetti rather than more threat.

**CONFIG: `COST_GRAVEDIGGER` 6 → 4.** He becomes ~1.5x more likely per pick and 1.5x cheaper: two to
four of him in the late waves. Leave `COST_YORICK_PACK 4` and `COST_GHOST 5` alone — the swarm is the
Buckshot payoff and I do not want it thinned.

### 6. You barely see the eight-pellet cone. — **Important**

`dr-cone-b.png` (sim at 0.12x, so the frame is catchable) proves the cone is correct and stratified. At
1x/60 fps it is eight 16 px hairlines, 1–3.2 px wide, alive for ~13 frames. Promise #1 of the pitch is
"you *see* the eight-pellet cone", and today you mostly see the muzzle flash and then the result.

**Fix (render only, three numbers in `drawPellets`, lines 1278–1280).** Do **not** touch pellet count,
spread, speed or life — those are locked and they measure right. Fatten the tracer:
`len = lerp(16, 6, t)` → `lerp(24, 9, t)`; `lineWidth = lerp(3.2, 1, t)` → `lerp(4.5, 1.6, t)`; and hold
the hot muzzle colour longer, `t < 0.5` → `t < 0.55`.

### 7. Casings stamp a white fog over the flagstones. — **Important**

`stampCasing` (line ~1307) stamps brass at full opacity, and all 40 of them land. `dr-reticle-hot.png`
shows the floor after ~40 shots in one place: a pale cloud that is brighter and more legible than the
enemies standing on it. Decals already went to `DECAL_ALPHA 0.35` for exactly this reason; the casings
were missed.

**Fix (one line):** inside the `Floor.stamp` callback in `stampCasing`, set `fc.globalAlpha = 0.4`
before `drawCasing`. (`stamp` already save/restores, so nothing leaks.)

### 8. The card screen never shows you what you have become. — **Important**

By wave 6 the player owns five Blessings and the game has never once shown them together. "Every
Blessing changes how the gun feels" is true — the payoff build in `dr-blessed-blast.png` is 11 pellets,
6 shells and 1.6x recoil, and it feels like a different weapon — but the *build* is invisible, so the
choice on the card screen is made blind.

**Fix (one `uiText`, no new state):** in `drawCards`, under the keycaps at
`y = CONFIG.CARD_Y + CONFIG.CARD_H + 62`, draw a centred line assembled from `G.picks`:
`OWNED   HOLY BUCKSHOT ×2   ·   WRATH   ·   HAIL MARY`, `FSANS(12)`, `rgba(PAL.cream, 0.55)`,
`{ spacing: 2 }`, skipped entirely when `G.picks` is empty. Names come from `blessingById(id).name`.

### 9. `x1.0` shouts when there is nothing to shout about. — **Nice-to-have**

`drawHUD` (line ~1997) always renders the multiplier, so the eye learns to ignore the one number that
should make you lean in when it pops to x3.5. Draw the `ms` block — and reserve its width in `totalW` —
only when `d.mult > 1.001`. The `CHAIN n` label already behaves this way; make the multiplier match.

### 10. WIN and GAMEOVER freeze live juice on the money shot. — **Nice-to-have**

Neither state's `update` calls `updateTexts` or `FX.update`, so a callout caught mid-flight hangs there
forever: `dr-win.png` has a half-faded amber callout sitting behind `SCORE 1,587`, and chunks are frozen
in mid-air. **Fix:** add `G.texts.length = 0;` to `STATES.WIN.enter` and `STATES.GAMEOVER.enter`.

### 11. The Gravedigger's heart drop is under spec. — **Nice-to-have**

`HEART_DROP: 0.25`; spec §5 and my own §1.8 ruling both say 30%. With fix 5 this becomes the run's whole
healing economy, so it should be the number we agreed. **CONFIG: `HEART_DROP` 0.25 → 0.3.**

### 12. The wave card sits on the hero. — **Nice-to-have**

`drawWaveCard` translates to `CONFIG.H * 0.42` — dead centre, exactly where the nun starts. In
`dr-wavecard.png` only her shoes show under the panel for the first second of the run. The slam is the
best piece of typography in the game and it should not be standing on her.
**Change `CONFIG.H * 0.42` → `CONFIG.H * 0.30`** in `drawWaveCard` (line ~1755).

### 13. `POOR YORICK!` almost never fires. — **Nice-to-have**

Eight kills from one shot needs eight skulls inside a 22° cone; my tightest ring of twelve Yoricks at
point blank gave seven (`dr-poor-yorick-clip.png` — `ZOUNDS!`). One of §10's three callouts is
effectively unreachable before Holy Buckshot. **CONFIG: `CALLOUT_YORICK` 8 → 7**, `CALLOUT_ZOUNDS 5` and
`CALLOUT_ALAS 3` unchanged.

### 14. The reticle hides the thing you are about to kill. — **Nice-to-have**

Under ~55 px the ring clamps to r = 6 and its 4.5 px ink stroke plus centre dot covers a Yorick outright
(`dr-wallsplat.png`: the target under the crosshair cannot be seen). **In `drawReticle`, raise the inner
clamp from 6 to 9 px** so there is always a hole to look through at point-blank, which is where this
game is played.

---

## Verdict

**NOT-YET — by two items and about twenty minutes of work.**

Everything else here is polish and I would happily ship without any of it. The build is in far better
shape than the M3 checkpoint promised: the pacing is right, the roster reads, the five serif moments all
land, §10 is complete to the character, the card screen is clean, Claudius is instantly legible, the
blast frame is a poster, and eleven headless sessions produced not one console error.

**To flip it to SHIP, fixes 1 and 2 must land:**

1. **Draw the nun on top of the y-sorted bodies and after the muzzle flash, with a cream footprint ring.**
   Right now the player character is invisible in a crowd, behind a Gravedigger, inside Claudius, and
   under her own muzzle glow. Recoil-as-dodge is our signature mechanic and it cannot be played blind.
2. **Gate the reticle's hot state on the aim cone, not on proximity to the nun.** The reticle is the only
   thing in the game that teaches range, and today it is lit when the target is 500 px away.

Land those two and I sign it. Fixes 3–8 are what I would spend the remaining hour on, in that order.
