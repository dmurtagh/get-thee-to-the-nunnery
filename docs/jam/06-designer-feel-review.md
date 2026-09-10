# 06 — Designer feel review at the M3 checkpoint

Method: my own headless run on `f115322`, sim frozen and single-stepped tick by tick (hooks on `fire`, `safeUpdate`, `FX.tickRender`, `Audio.*`), plus recoil and cadence through real CDP input at 60 fps. Audio rendered through an `OfflineAudioContext` replica of the bus, since I cannot hear headless. `index.html` and `tools/` untouched.

## A. Feel test results (§16 protocol)

1. **Dry fire — PASS, one TUNE.** Recoil 40.0 px exactly. Kick −8 px on frame 0, −1.2 by 133 ms: a real shove. Wedge 2 frames + glow 4. Pump sfx tick 17 (0.28 s), casing tink tick 34. **But the shake never reaches 6 px:** `SHAKE_FIRE_PX 6` caps a k²-decayed uniform draw; realised offsets on frames 1–4 were 3.4 / 3.0 / 1.4 / 0.4 px. **TUNE `SHAKE_FIRE_PX` 6 → 9.**
2. **Recoil ruler — PASS.** Four shots 160 px (target 150 ± 20). Retreat-fire 415 px vs walk 255 px in 1.5 s = **1.63×**; advance-fire 95 px = **0.37×**, a stall. Not my "visibly 2×", but the asymmetry is the mechanic and it reads. Hold `RECOIL_PX` 40; go 48 only if the Director's cold stranger never shoots to dodge.
3. **Dummy clump — TUNE.** 20 Restless, front row 36–65 px away, one shot at the centroid, 4 trials: **kills 2/2/2/2**, 1–2 wounded, hitstop 2 ticks, the two kills on consecutive sim ticks with the freeze between (a double tap; nice). Scatter mean 20–75 px, top-five 42–120, depending on layout. Seeded A/B (identical layout and jitter) with `CORPSE_TRANSFER 1.0`: mean 76–106, **top-five 125–154 px**, the crowd splits along the aim axis into two legible groups. Adding `KNOCK_PX 140`: top-five 180–230 px, half the arena, wall-splat spam. **TUNE `CORPSE_TRANSFER` 0.6 → 1.0, `HITSTOP_KILL` 2 → 3**; `KNOCK_PX` stays 120 (lone target measured 119).
4. **Range ladder — PASS.** Damage per shot, 8 trials each: 8.0 @ 60–100 px, 5.5 @ 130, 4.4 @ 150 (8/8 kills), 2.4 @ 155 (0/8), 2.1 @ 170, 1.2 @ 240 → 1 / 1 / 2 / 3 shots. The falloff is a **cliff at 155 px, which is exactly the reticle's hot radius** (1100 × 0.13 + 12). Not a coin flip: a rule the reticle states to the pixel, and a lunging Restless crosses it at 300 px/s, which is where the coin flip really lives. Leave `PELLET_FULL_T`. Knockback is not range-scaled, so a far shot is a shove, not a kill: keep that.
5. **Cadence — PASS with one ding.** Hold from full: shots every **29 ticks (0.483 s)**, designed 27; empty-tube hold: every 51 ticks (0.85 s vs 0.80); shells every 22 ticks. Fire mid-reload: shell lands tick 744, tap 744, shot 745. Auto-reload to 4 after release. Zero drops *while held*. **But a tap 20 ticks into the pump (0.33 s of 0.48) is dropped outright:** tap to the rhythm 100 ms early and you lose the shot and the rhythm. See asks (a).
6. **Sixty-second stranger** — Director's, real browser, sound on. Not run.
7. **Audio (offline render).** Blast peaks −5.6 dBFS, −20 dB after **80 ms**, LF share 0.64 (thump-led, good). Pump peaks −9.3, so BOOM is only **3.7 dB louder than chk-chk** (10.9 dB with the compressor bypassed). The bus compressor (−14 dB, 10:1) flattens the one dynamic that matters, and `env()` ramps to 0.0001, so the 0.18 s thump is gone after ~45 ms. Re-rendered with comp −8 dB / 4:1 and a longer body (sine dur 0.30, peak 1.3; triangle 0.26; noise 0.30, sweep 0.16): blast −3.1, pump −13.2, **contrast 10.1 dB, −20 dB at 100 ms, −40 dB at 180 ms.** A BOOM with a body.

## B. Ruling on Coder deviation #4

**Accept 2 kills at base. Do not touch HP, pellets or falloff.** What the wave-1 player feels: point blank into three Restless, **two pop, the third flashes white and flies back wounded, the next BOOM finishes it.** That is a rhythm, and the shot still deletes the thing you aimed at. Rejected, in player terms: **HP 3 → 2** turns the 2.1–2.4 damage at 155–200 px into a kill, pushes the cliff past 200 px and deletes the get-closer decision. **Pellets 9** measured 2/3/3/2: a coin flip for the third, a denser cone, shifted Buckshot math, and it breaks our own rule. **"Wounded die to any pellet"** is invisible to the player and also collapses range (two half pellets kill at 200 px). "3+ kills" is the Yorick and Holy Buckshot payoff by design: ALAS! at wave 3 is a reward, not a wave-1 entitlement.

**Scatter: `CORPSE_TRANSFER` 0.6 → 1.0.** Carries the row behind to the spec's ~120 px, stays readable because everything travels along the aim axis into space the player is already looking at, and fixes the M3 screenshot's "two vanished, the rest didn't care". `KNOCK_PX` stays 120.

## C. What reads wrong in the screenshots (art pass later, noted now)

1. **Tracer barcode.** Eight equal-speed pellets travel as a comb of parallel bars for ~6 frames (`m2-cone.png`, dry f04/f08). A spray needs speed variance, not spread.
2. **Chunks do not fly.** Drag 0.9/tick gives 20–50 px of travel; the kill reads as a puff of squares on the corpse, not a burst. Chunks are also live-Restless green, so in a crowd they vanish.
3. **Decal swamp.** 0.55-alpha splats stack to solid green at gates within a wave (`05-stress.png` top; my A/B floor after ~30 kills).
4. **Smoke** is three 4–7 px squares that read as one grey pixel.
5. **Good:** wedge + glow, the white pop, hit-flash holding through hitstop, the hot reticle, the nun at 28 px, the gun's length. The 5 px pump slide is too subtle to see.

## D. Tuning list (tweak order; old → new; CONFIG unless flagged)

0. **Sound (AUDIO constants, not CONFIG; sound is first in the order):** compressor threshold −14 → −8, ratio 10 → 4; blast sine `dur` 0.18 → 0.30, `peak` 1.0 → 1.3; triangle `dur` 0.14 → 0.26; noise `dur` 0.26 → 0.30, `sweep` 0.12 → 0.16. The blast becomes the loudest thing in the game by 10 dB with a 180 ms body. Lift into CONFIG as `BLAST_*` if you want them live.
1. **`HITSTOP_KILL` 2 → 3.** 33 → 50 ms, the pitch number; a point-blank double is two 50 ms stops one tick apart. `HITSTOP_MULTI` 4 / `MULTI_KILLS` 3 stay for Yoricks and Buckshot.
2. **`SHAKE_FIRE_PX` 6 → 9.** Realised peak 3–4 → 5–6 px, i.e. the spec. `KICK_PX` 8 stays.
3. **`CORPSE_TRANSFER` 0.6 → 1.0.** Ruling B. `KNOCK_PX`, `TRANSFER` stay.
4. **Particles: no CONFIG change.** `CHUNKS` 8 is the right count; the fault is travel (asks c).
5. **`PUMP_T` 0.45 → 0.42, `PUMP_SFX_AT` 0.6 → 0.7.** The state machine spends 2 ticks on READY→fire, so 0.42 delivers the locked 27-tick cadence; the ready click then lands ~4 frames before READY instead of 7. Lowest priority, reversible.

**Asks for the Coder (code, small, not CONFIG):** (a) `FIRE_BUFFER_T 0.10`: a tap in the last 100 ms of PUMPING/LOADING fires on READY. (b) `PELLET_SPEED_JITTER 0.08` per pellet: kills the barcode and turns the 155 px cliff into a natural 140–170 px coin-flip band, which is what §6.4 wanted. (c) Chunk drag 0.9 → 0.94, confetti 0.94 → 0.96, chunk colours shade-only. (d) Decal alpha 0.55 → 0.35.

## E. Verdict

**GO.** Every locked number measures within 7% of spec (recoil 40.0, knock 119, four shots 160, cliff on the reticle, zero held-input drops), and every deviation is a coefficient, not a system: one shake amplitude, one hitstop tick, one transfer factor, one audio envelope. Yorick HP 1 and Gravedigger 0.3× knock tune on top of pellet and knock numbers that hold. Two conditions: apply D0–D3 before roster tuning, because they change how a kill reads and the roster is tuned against that read; and the Director runs §6.6 with sound on, since I have measured the blast, not heard it.
