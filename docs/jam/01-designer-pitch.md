# 01 — Designer Pitch: GET THEE TO A NUNNERY

*She took the advice. Now the dead of Elsinore want in.*

## 1. Three concepts

**A. CLOISTER — arena wave shooter.** Top-down, one walled courtyard, Nuclear Throne tempo at Vampire Survivors readability. Sister Ophelia holds the cloister while the restless dead of Elsinore claw out of four gates in waves. WASD moves, mouse aims, click fires a pump-action shotgun that hurls corpses across the flagstones and kicks *her* backwards. Pick one of three gun-mutating Blessings between waves. Ten Acts, then an endless Encore. No level gen, no camera, one screen: every hour goes into the gun.

**B. THE WELL — vertical descent.** Downwell in a habit. Ophelia drops into the drowned crypt beneath the nunnery; the shotgun fires down, recoil is your jump, shells are the economy, skulls line the shaft. Score = depth x combo. One-button purity, but fixed aim turns a shotgun into a boot, and a scrolling camera plus procedural shaft generation eats a day we do not have. Also Downwell exists and is perfect.

**C. POLTERGUN — recoil-only locomotion.** Ophelia drowned. She is back as a ghost and cannot walk; she moves only by shotgun recoil. Aim at the danger, fire, fly away. Ice physics, wall bounces, enemies as bumpers. Weird and on-theme, but "cannot walk" fails the 5-second test: first-timers bounce off a wall three times and close the tab. It is a Blessing, not a game.

## 2. The pick

**A, with C's heart transplanted in.** One screen and three inputs means you are playing in two seconds. A 360-degree mouse-aimed cone shows off a shotgun best: you *see* the pattern, you *see* eight things fly. Waves plus Blessings give in-run progression for free; the Act counter is a natural high score. And it is all circles colliding with circles, the least buggy thing you can build in a weekend. The steal from C: **recoil moves the nun.** Every shot is also a dodge. That is our signature and it costs one vector add.

## 3. Full pitch

### Elevator pitch
Ophelia took Hamlet's advice, and the restless dead of Elsinore followed her to the nunnery. Hold the cloister with a pump-action shotgun that throws corpses across the courtyard and throws you backwards, picking Blessings between Acts until the gun is a holy weapon of absurd proportions.

### The loops
- **Every 2 seconds:** aim at the nearest cluster, let them get *too* close, fire. Eight things fly. The recoil hops you out of the pincer. Pump. Sidestep. Fire. Four shells, then the *shk-shk-shk-shk* reload under pressure while you circle.
- **Every 30 seconds:** an Act is a ~25s wave. Read the gate telegraphs, herd the swarm into a cone, shove the Gravedigger into the wall for the splat, exhale on the bell. Pick one of three Blessing cards (~5s). Next Act.
- **The run:** 10 Acts, 5 to 7 minutes. I to II teach the gun; III adds skulls (spread rewarded); IV to VI add pressure and habit-punishers; X is Curtain Call, everything at once plus a crowned Gravedigger. Then win screen or death screen, and one keypress puts you back on the flagstones in under a second.

### Controls
**WASD / arrows** move (170 px/s; sensible shoes). **Mouse** aims, cursor hidden, reticle drawn. **LMB** fires; hold to fire at pump rate. **R** top-up reload (optional; an empty tube reloads itself). **Esc / P** pause. **Any key or click** starts and retries. No dash button. The shotgun is the dash.

### THE SHOTGUN
This is the game. Starting numbers, all live-tunable:

- **Pellets:** 8 in a **22-degree cone**, *stratified*: split the cone into 8 slots, jitter each pellet within its slot. Looks random, never rolls a dud.
- **Range:** 900 px/s, 0.3s lifetime (~270 px). Full damage for the first 60% of life, half after; pellets shrink and fade. A *close-range* gun. The reticle fills solid when an enemy is inside kill range and goes hollow beyond: distance taught without a tutorial.
- **Damage:** 1 per pellet. Rushers have 3 HP: point-blank one-shots, mid-range needs two. That gap is the whole risk/reward.
- **Knockback (enemies):** 260 px/s impulse per pellet along its direction, decaying over 0.25s. A full hit sends a Rusher four body-lengths. Enemies shoved into walls take **+3 splat damage** and leave a decal. Knocked enemies shove neighbours: the crowd *ripples*.
- **Knockback (nun):** 180 px/s impulse opposite to aim, same decay, roughly a 40px hop. Fire while retreating and you move at 2x; fire into your own movement and you stall.
- **Rhythm:** pump-action, 4-shell tube. Fire, 0.45s pump (pump block slides on the barrel, casing ejects), ready. An empty tube auto-reloads **shell by shell at 0.35s each**, and you can fire mid-reload the instant one shell is in (the Doom/Halo rule). Reload is a cadence, not a skill check: BOOM chk-chk, BOOM chk-chk, BOOM chk-chk, BOOM... shk, shk, BOOM.
- **Screen:** 6px shake decaying over 0.12s **plus** an 8px camera kick opposite to aim. Hitstop 40ms on any kill, 70ms on 3+. Muzzle flash: one frame of white wedge, two frames of warm radial light on the stones.
- **Ejecta:** brass casing pops sideways with gravity, bounces, *tink*, stays on the floor (cap 60). Three grey smoke puffs.
- **Sound:** three layers. A 60 Hz thump with a fast pitch drop; a white-noise burst lowpass-swept 4 kHz to 400 Hz over 120ms; a 5ms click transient. 200ms later, the pump: two short filtered noise clicks at different pitches. Random pitch +/-6% on every layer so it never sounds like a sample.

### Enemies (one job each)
1. **The Restless** (rusher). Green rotting courtier, Elizabethan ruff. HP 3, 90 px/s, lunges at 300 px/s inside 90px. Dies as 8 chunks, bone confetti, floor splat. Sixty percent of everything you shoot.
2. **Yoricks** (swarm). Skulls. HP 1, 140 px/s, packs of 8 to 12, chattering. Exist to be one-shotted six at a time; pop with a tooth spray and a brittle *tok*. "ALAS, POOR YORICK" on a 5+ multikill.
3. **The Gravedigger** (tank). 60 px/s, HP 14, 0.3x knockback. Walks in front of the swarm and eats your tube. Get behind him or wall-splat him: point-blank 8 pellets against stone is his death. Falls in a slow heap with a shovel bounce.
4. **Rosencrantz & Guildenstern** (ranged pair). HP 4 each, hover at 220px, lob poisoned goblets in slow arcs that leave a slowing puddle. Kill one and the other panics and rushes. Punishes standing still.
5. **The Ghost** (habit-punisher). The old king, translucent, armoured. Ignores walls, 70 px/s, immune while inside stone. Camp a corner and he arrives *behind* you. HP 6.

### Progression within a run
Ten Acts, budget-spawned from four gates that glow and burst dirt half a second before each emergence. Budget = 8 + 4n. Costs: Restless 1, Yorick pack 3, R&G pair 4, Gravedigger 6, Ghost 5. Schedule: I to II Restless; III Yoricks; IV R&G; V Gravedigger; VI Ghost; X Curtain Call. Enemy speed +3% per Act.

After every Act, **one of three Blessings**, every one of which changes how the gun feels. Twelve total, stackables starred:

**Holy Buckshot\*** +3 pellets. **Sawn-Off Sermon** +12 degrees spread, +50% knockback, -20% range. **Litany** -8 degrees spread, +40% range. **Hail Mary\*** +2 shells. **Speedy Vespers** pump 30% faster. **Quickening** reload 40% faster. **Wrath** nun recoil +60% (a *movement* upgrade). **Old Testament** pellets pierce one body. **Ricochet Psalm** pellets bounce once. **Last Rites** kill with your last shell and 2 shells load instantly. **Thunderclap** every 4th shot doubles knockback with a big shake. **Grace\*** +1 heart (max 5), heal to full.

By Act VIII a Buckshot x2, Sawn-Off, Wrath build is a 14-pellet, 34-degree wall of holy hate that launches you across the courtyard on every trigger pull. That is the payoff, and why every Blessing is a gun Blessing.

### Progression across runs (localStorage, tiny)
High score, best Act, total Souls Shriven. Four Blessings start locked and join the pool on milestones: reach Act V for Ricochet Psalm, 500 kills for Thunderclap, a win for Last Rites, three runs for Wrath. The death screen announces "NEW BLESSING: ...". Small, but run two differs from run one.

### Health, difficulty, endings
Three hearts: **Faith, Hope, Charity.** A hit costs one, then 1s of i-frames, a red vignette, 200ms slow-mo. No regen; Grace heals. Clear Act X for the win screen ("THE REST IS SILENCE... or is it?"), then **Bow** (end, bank score) or **Encore** (endless, +10% score multiplier per Act, budget keeps climbing). Death is a quote, the numbers, and one keypress back in.

### Tone
Dry, Shakespearean, PG-13. Ophelia is not tragic; she is *done*. Gore is cartoon: green ectoplasm and bone confetti, no red. Score is "Souls Shriven". Waves are "ACT III, Scene i". Death quotes rotate: "Goodnight, sweet nun." "Alas, poor Ophelia." "Get thee BACK to a nunnery." "Frailty, thy name is three hearts." "Something is rotten in the state of Denmark. Mostly you." Multikill callouts: ALAS! ZOUNDS! PERCHANCE! POOR YORICK! Title subtitle: *"She took the advice."*

### Visual style (procedural canvas)
Flat shapes, thick dark outlines, two-tone shading, slight 3/4 top-down. Logical 960x540 scaled to fit. **Palette:** indigo floor `#1b1f3a`, moon-grey walls `#5a6078`, torch amber `#ffb347` at the gates, cream UI `#f4f0e6` in a serif system font (Georgia is free Shakespeare), sick green `#7bd389` for the dead, bone white, ghost cyan `#8fe3ff` at 50% alpha, muzzle `#fff3c4`.

**The nun reads at 28px because of one shape:** a white oval *ring* (the coif) framing a peach face, wider than the head, black veil behind, black bell-shaped habit below, tiny gold cross. That ring is the silhouette. **The shotgun reads because it is too long:** a dark barrel 1.3x her height with a brown stock, rotated to the mouse, pump block visibly sliding on every shot. The veil trails two or three segments behind her. Pre-render sprites to offscreen canvases at boot; draw arena and decals to a persistent offscreen once.

### Audio (all synthesized)
Blast (above); pump (two clicks); shell insert (soft click); casing tink; enemy hit (short noise, pitch drop); deaths: Restless *splat* (lowpassed noise, low drop), Yorick *tok* (high, brittle), Gravedigger *thud* (sub plus rubble); wall-splat (wet thump); multikill chime (small bell); nun hurt (dissonant organ stab plus heartbeat); Act clear (one church bell toll); Blessing pick (detuned choir chord); death (descending organ, slow bell); ambient: low organ pedal drone with slow LFO, wind, a distant bell every ~20s. Voice cap with pitch variance so ten Yorick pops in one frame sound like a chorus, not a clip.

### Juice checklist (priority order)
1. Muzzle flash, shake, camera kick.
2. Knockback both ways.
3. Hitstop on kill.
4. Death chunks, confetti, persistent decals.
5. Casing eject and tink.
6. Pump slide animation and sound.
7. Enemy hit-flash white and squash.
8. Combo callouts scaling in.
9. Hurt vignette and slow-mo.
10. Gate spawn telegraph.
11. Reactive reticle.
12. Nun lean and squash on recoil; veil trail.
13. Act title card slam with bell.
14. Torch flicker, dust motes.
15. Low-HP heartbeat and desaturation.

## 4. Scope

**MUST (ships even if the weekend goes wrong):** title, click, playing; one arena; move, aim, fire; the full shotgun spec (pellets, spread, range, both knockbacks, pump, shell-by-shell interruptible reload); Restless, Yoricks, Gravedigger; Acts I to X budget spawning; three hearts; death screen with score, localStorage high score, instant retry; six Blessings; juice 1 to 6; sounds: blast, pump, hit, three deaths, hurt, Act clear.

**SHOULD:** R&G pair; the Ghost; Curtain Call win plus Encore; all 12 Blessings; Blessing unlocks; combo callouts; decals; ambient drone; pause; juice 7 to 12.

**COULD:** wimple-trim cosmetics; touch controls; Yorick speech bubbles; a true Claudius boss; last-five-runs list; gamepad; juice 13 to 15; procedural organ music.

## 5. Fight for / happily cut

**I will fight for:**
1. **Recoil moves the nun.** Shoot-to-dodge is the signature. One vector add turns a shooter into a dance.
2. **The pump-and-shell cadence with interruptible reload.** The rhythm *is* the feel; remove it and the gun is a machine gun with a cone.
3. **Hitstop plus wall-splat.** Forty milliseconds and a bonus-damage decal are the difference between "I shot it" and "I *ended* it."

**I'll happily cut:** the boss; the Ghost; R&G (ranged enemies are the buggiest thing in any jam); music; touch; cosmetics; the R key; Encore mode; anything that needs a second arena.

## 6. Open questions for the Coder
1. Fixed timestep (120 Hz sim, 60 Hz render) so knockback and hitstop feel identical everywhere, or variable dt with a clamp?
2. Hitstop: freeze the sim clock or scale it to 0.05? Keep input polling live during the freeze?
3. Particle budget: ~400 particles, 60 casings, decals on an offscreen canvas. Comfortable at 60fps on a 2019 MacBook Air?
4. Web Audio: how many simultaneous synth voices before we need pooling and stealing? Does the title's "click to begin" cleanly double as the autoplay unlock?
5. Collision is all circles, N-squared at ~60 enemies plus 80 pellets. Spatial hash, or noise? And the cheapest soft-body separation you would trust so swarms do not stack?
6. Cursor leaving the canvas mid-fight: clamp aim to last known position, or pointer lock?
7. Crisp rendering with devicePixelRatio: integer scale with letterbox, or fractional and accept softness? Any `file://` localStorage trouble when the Director double-clicks the html?
