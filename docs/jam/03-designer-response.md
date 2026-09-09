# 03 — Designer Response (Debate Round 1)

I agree with most of the memo. Every disagreement below is about the player, not the code. Numbered for point-by-point reply.

## 1. Locked answers to Section 9

- **1.1 Arena:** yes. Fixed 960x540, drawn border, everything clamped inside. No scrolling.
- **1.2 Aim:** WASD + mouse, cursor hidden. **Reticle, no laser.** Ring radius = distance x tan(11 deg), clamped 6 to 60px, so the ring *is* the spread; bright with an enemy in kill range, hollow beyond.
- **1.3 Shotgun:** 4-shell tube, **auto-pump**, hold LMB for one shot per 0.45s. No pump input, no pump-cancel, no perfect-pump. Empty tube auto-reloads shell by shell at 0.35s; firing allowed the instant one shell is in. R top-up is COULD.
- **1.4 Pellets:** 8, 22 deg cone, stratified (8 slots, jitter within slot). **1100 px/s, 0.22s life (~240px)**; damage 1 for the first 0.13s, 0.5 after. Recoil pushes the nun: yes. Specify as displacement, not impulse: **one shot at rest moves her ~40px, four shots ~150px**; a point-blank full hit moves a Restless ~120px. Derive impulses from your 0.85 friction.
- **1.5 Progression:** between waves. Last kill, 0.4s slow-mo, pick 1 of 3. No XP, no gems.
- **1.6 Enemies:** 3 + boss, contact damage only, no enemy bullets. Roster in 1.12.
- **1.7 Win:** kill the wave-10 boss, win screen (MUST), then **Encore** (waves continue, +10% multiplier per wave) or Esc. Encore is SHOULD.
- **1.8 Health:** 3 hearts, max 5, contact only. Hit: lose 1, 1.0s i-frames, shoved 60px, red flash, timeScale 0.25 for 0.2s. No regen. One pickup: heart, 30% drop from the Gravedigger. Grace heals.
- **1.9 Score and unlocks:** kills only. Yorick 5, Restless 10, Ghost 30, Gravedigger 50, boss 500. Chain: kills within 1.5s extend it; multiplier = min(1 + 0.1 x chain, 5); resets on the timer, **never on a missed shot** (7.3). Wave clear = wave x 100. **Unlocks (4):** wave 5 adds Ricochet Psalm; 500 lifetime kills adds Thunderclap; 3 runs adds Wrath; first win unlocks **HARD HABIT** (start wave 4, 2 hearts, 1.5x score; a params preset).
- **1.10 Tone:** **no red.** Kill = white flash pop + green/bone fillRect confetti + dark-green floor decal.
- **1.11 Upgrades, capped at 10.** Stackable starred; non-stat systems flagged [S].
  1. HOLY BUCKSHOT* +3 pellets
  2. SAWN-OFF SERMON +12 deg spread, +50% enemy knockback, -20% range
  3. HAIL MARY* +2 shells
  4. SPEEDY VESPERS* pump and reload 25% faster (max 2)
  5. WRATH nun recoil +60%
  6. GRACE* +1 max heart, heal to full
  7. OLD TESTAMENT pellets pierce one body [S: pierce counter, ~10 lines]
  8. RICOCHET PSALM pellets reflect off the border once [S: ~8 lines]
  9. LAST RITES kill with your last shell, 2 shells load instantly [S: one check in the kill handler]
  10. THUNDERCLAP every 4th shot: 2x knockback, +0.3 trauma [S: a counter]

  Locked from run one: 5, 8, 10. Pool-exhausted fallback: Grace.
- **1.12 Roster:**
  - **The Restless** (rusher, ~60% of spawns): straight at you, 90 px/s; inside 90px, lunge at 300. HP 3.
  - **Yoricks** (swarm): packs of 8 to 12, 140 px/s, HP 1, sine wobble. Exists to die six at a time.
  - **The Gravedigger** (tank): 60 px/s, HP 14, radius 2x, 0.3x knockback. Blocks the cone.
  - **Claudius** (boss, wave 10): Gravedigger sprite at 3x, purple/gold palette. HP 80, 45 px/s, 0.1x knockback; every 4s spawns 6 Yoricks at the border.
  - **The Ghost** (SHOULD, wave 6+): see 2.2.

## 2. Your refusals vs my pitch

- **2.1 No walls** hurts one thing: wall-splat. Redesign: the clamp *is* the wall. Knockback that would carry an enemy past the border at over 200 px/s: +3 damage, sparks, thud. Four lines in the clamp. I want this; it is the best kill in the game.
- **2.2 The Ghost** without stone: a 50%-alpha palette-shifted Restless that **spawns at the border point directly behind your aim**, 55 px/s, HP 5, 0x knockback, skips separation. Job: punish tunnel vision. SHOULD; cut without asking if Sunday is tight.
- **2.3 Rosencrantz & Guildenstern: cut.** An enemy-bullet type and a puddle for one enemy. Everything else on your refusal list I never wanted.

## 3. Art style

- **3.1 My case:** shapes squash, stretch, lean and recolour for free. Pixel art at 3x fights scale() and needs an artist's eye at hour 3.
- **3.2 Your case is better.** A 12x14 nun *reads*; my arcs risk a snowman. The 28px test is the tiebreaker and you pass it at 42px. **I concede: pixel sprites at 3x, procedural gun.** Conditions: (a) the **white coif ring around the face** is non-negotiable, that ring is the nun; (b) one extra palette index for a shade tone plus the 1px outline; (c) squash and stretch via scale() on the blit anyway, non-integer pixels at 60fps are invisible and a nun that does not stretch on fire is not; (d) I author the sprite strings while you write the loop.
- **3.3 Palette stays:** floor `#1b1f3a`, border `#5a6078`, gate amber `#ffb347`, dead `#7bd389`, bone `#f4f0e6`, ghost `#8fe3ff`, muzzle `#fff3c4`.

## 4. Text budget

- **4.1 Card format accepted.** Icon optional; a coloured border per card is enough. Strings: HOLY BUCKSHOT "Three more pellets. Denser sermon." | SAWN-OFF SERMON "Wider, harder, shorter. Get closer." | HAIL MARY "Two more shells in the tube." | SPEEDY VESPERS "Pump and reload faster. Amen." | WRATH "Recoil throws you further. Fly." | GRACE "One more heart. Fully healed." | OLD TESTAMENT "Pellets pass through one body." | RICOCHET PSALM "Pellets bounce off the walls." | LAST RITES "Last-shell kills reload two shells." | THUNDERCLAP "Every fourth shot: double knockback."
- **4.2 Defended, each one fillText doing UI work:**
  - Title: `GET THEE TO A NUNNERY` / `She took the advice.` / `WASD move . mouse aim . click to begin`. The subtitle is the joke; if a line must go, cut it, never the hint.
  - Wave card: `ACT III . SCENE I` (5 Acts x 2 Scenes; boss is Act V Scene II). It *is* the wave counter. Slams in, fades over 1s.
  - Multikill, **one floating text per shot**: 3 kills `ALAS!`, 5 `ZOUNDS!`, 8+ `POOR YORICK!`.
  - Game over: SCORE, BEST, one of six: "Goodnight, sweet nun." / "Alas, poor Ophelia." / "Get thee BACK to a nunnery." / "Frailty, thy name is three hearts." / "Something is rotten in Denmark. Mostly you." / "The rest is silence. Until you click."
  - Win: `THE REST IS SILENCE.` / `ENCORE? click`.
  - Font: `bold Georgia, "Times New Roman", serif` for those five moments only. System font, zero cost, does the Shakespeare for us. HUD numbers in your sans stack.
- **4.3 Dropped:** "Souls Shriven" (label is SCORE), speech bubbles, all lore.

## 5. Music

- **5.1** You are right, I was wrong: silence reads as unfinished. **Music is SHOULD, top of the list**, on two conditions: written after the blast sound and the loop exist (hour 6+), and ~12dB under sfx with your duck-on-fire. Drone only on title and upgrade screen; arpeggio joins in play and thickens with wave number.

## 6. Shotgun feel test (Saturday afternoon, this order)

- **6.1 Dry fire, no enemies, 30s.** Must feel good against nothing: 1-frame flash, camera kick, ~6px shake, casing eject, pump slide, click 2 on the ready tick. Weak: trauma on fire 0.4 to 0.7, then thump +3dB.
- **6.2 Recoil ruler.** Four shots at rest travel ~150px; walk back and fire, visibly 2x; walk into your shot, stall. Off: scale the impulse, never friction.
- **6.3 Dummy clump.** Debug-spawn 20 stationary Restless in a knot. One point-blank shot: 3+ die, the rest scatter ~120px, hitstop, flash pop, confetti. Feels like deletion: hitstop 0.04 to 0.06, pop 1.3 to 1.5, particles 40 to 60. Mushy: pump 0.45 to 0.40.
- **6.4 Range ladder.** Restless at 60 / 150 / 240px take 1 shot / coin flip / 2 to 3. Far one dies in one: life 0.22 to 0.18. Middle never dies: full-damage window 0.13 to 0.15.
- **6.5 Cadence.** Empty the tube, count the clicks, fire mid-reload, zero dropped inputs.
- **6.6 Sixty-second stranger.** Director plays cold. Never shoots to dodge: baseline recoil +20%.
- **6.7 Tweak order when weak:** sound, hitstop, camera kick, enemy knockback, particles, pump time. **Never** pellet count or spread first; those are balance.

## 7. Where the memo is wrong for the player

- **7.1 Pellet life 0.15s x 1200 = 180px.** A melee weapon on a 540px arena, cone visible for 9 frames. Lock 0.22s, 13 frames of pattern.
- **7.2 Trauma 0.4 on fire** is ~2px of shake. The most important shake in the game should be ~6px: 0.7, or change the curve.
- **7.3 Combo "resets on miss":** no. Timer only. Punishing an empty shot punishes the recoil dodge, which is the point of the gun.
- **7.4 Agreed:** hitstop stacking with a 0.08 cap; no interpolation (conceded); pellets as projectiles; combo counter over damage numbers, provided it is big and pop-scales on every increment. Between-wave picks also delete your death-vs-level-up race: the upgrade state only enters with zero enemies alive.
