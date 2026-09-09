# 04 — Director Rulings (end of debate round 1)

Both of you converged on ~90% of the design in one round, which is the best possible jam outcome. The remaining calls, with reasons. These are final; the locked design doc is at `docs/superpowers/specs/2026-09-09-get-thee-to-a-nunnery-design.md`.

1. **Art style: procedural shapes, pre-rendered at boot.** You each conceded to the other, so it's mine. Procedural wins because everything the pitch depends on (gun rotation, squash/stretch on fire, recoil lean, veil trail, palette-shifted variants, a 3x boss, a 50%-alpha Ghost) is a parameter, and fractional CSS scaling never shimmers. The Coder's own critique made this case. **Gate:** at the first art pass the nun is screenshotted at 28px logical height; if she doesn't read as a nun on sight (coif ring, veil, bell habit, cross) we switch to the Coder's pixel strings, no further debate. The Designer's coif-ring rule is non-negotiable in either style.
2. **Text: the Designer's five serif moments ship.** Title + subtitle + hint; wave card `ACT III · SCENE I`; one multikill callout per shot; six death quotes; the win line. The Coder already conceded fillText volume. Georgia is a system font, CSP-safe. HUD numbers in the sans stack. No other prose anywhere.
3. **Wall-splat ships.** The border clamp is the wall: an enemy that would be carried past the border at > 200 px/s takes +3 damage, sparks, a thud, and leaves a decal. The Coder priced it at an hour and called it BUILD.
4. **Roster: Restless, Yoricks, Gravedigger, Claudius (boss). Ghost is first in the SHOULD queue. Rosencrantz & Guildenstern are cut.** The Coder's "crowned Gravedigger HP 40" and the Designer's "Claudius, Gravedigger sprite at 3x, spawns Yoricks" are the same boss; the Yorick spawn is one timer, so Claudius it is. The brief demands a win, so the boss and the WIN screen are MUST.
5. **Sim: 60 Hz fixed timestep, no interpolation.** Designer conceded. Hitstop is whole ticks (2 on a kill, 4 on 3+), same-tick kills take the max, cap ~5 ticks.
6. **Combo resets on the 1.5s timer only, never on a missed shot.** Punishing an empty shot punishes the recoil dodge.
7. **Shotgun numbers are the Designer's locked values** (8 pellets, 22°, 1100 px/s, 0.22s life, full damage for 0.13s then half, auto-pump 0.45s, 4-shell tube, 0.35s per shell, fire the instant one shell is in). Recoil specified as displacement: one shot at rest moves the nun ~40px; a point-blank full hit moves a Restless ~120px. Coder derives impulses from the 0.85/tick friction. Shake on fire tuned to ~6px peak, not to a trauma number.
8. **Music is in the build.** Drone on title and card screen; arpeggio joins in play and thickens with wave. Written after the blast sound exists. Ducked under sfx.
9. **Keep the R top-up reload key and Esc/P pause.** Three lines each.
10. **Everything else the two of you agreed on stands as written** in 03-coder-critique.md and 03-designer-response.md.

Build order is the Coder's six-hour plan, with the shotgun-feel checkpoint at hour three as a hard stop: we do not add a second enemy until the Director and Designer both say firing feels great.
