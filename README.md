# GET THEE TO A NUNNERY

*She took the advice.* Ophelia went to the nunnery; the restless dead of Elsinore followed her there.
One walled courtyard, one pump-action shotgun, ten waves, a boss, and an Encore.

The shotgun kicks her backwards. **Every shot is also a dodge** — retreat and fire and you fly, charge and fire and you stall.

## Play

Open `index.html` in any modern browser (double-click it — it runs straight from `file://`, no server, no build step, no assets, no network). Click once to begin; the click also unlocks the audio.

## Controls

| Input | Action |
|---|---|
| WASD / arrow keys | Move |
| Mouse | Aim (the reticle ring *is* the shot spread) |
| Left mouse (hold) | Fire — auto-pumps at the shotgun's own rate |
| R | Top-up reload (interruptible: fire the instant one shell is in) |
| 1 / 2 / 3 or click | Pick a Blessing between waves |
| Esc / P | Pause |
| M | Mute (persisted) |
| H | HARD HABIT toggle on the title screen (unlocked by winning) |
| Enter / Space / click | Start, retry, take the Encore |

### Touch (phones and tablets)

Landscape only — hold it upright and the courtyard asks you to rotate. The first touch switches the
game to the touch build; a mouse move switches it back, so a laptop with a touchscreen keeps both.

| Input | Action |
|---|---|
| Left thumb, anywhere on the left half | Floating move stick — 360°, analog speed |
| Right thumb, anywhere on the right half | Floating aim stick — the ring follows your aim at kill range |
| Push the aim stick past the inner ring | Fire and hold (auto-pumps, same as holding LMB) |
| Tap the right half | One shell down the current aim |
| ⏸ / speaker buttons, top right | Pause · Mute |
| Tap anywhere | Start, pick a Blessing, resume, retry, take the Encore |

Both sticks float: they appear where your thumb lands, so there is nothing to reach for and nothing
on screen until you touch it. Short haptic taps on firing and on taking a hit (off while muted).

## Debug keys

Add `?debug=1` to the URL, or press the backtick key, to toggle the debug overlay (fps, frame ms, entity counts). While the overlay is on, in play:

`G` god mode · `N` skip wave · `K` kill all · `L` force the card screen · `B` spawn Claudius · `1`–`4` time scale (0.25 / 0.5 / 1 / 2) · `F1` stress test (200 enemies + 2000 particles)

`window.GAME` is the same handle the test harness drives: `startRun()`, `skipToWave(n)`, `spawn(type, n)`, `spawnAt(type, x, y)`, `killAll()`, `forceCards()`, `pickCard(i)`, `setGod(b)`, `setTimeScale(x)`, `snapshot()`, plus `touchMode` (get/set), `sticks` and `rotatePrompt` for the touch build.

## Tests

Node 22+ and Google Chrome, no npm dependencies:

```bash
node tools/check.mjs                          # single-file / CSP / syntax rules -> "check ok"
node tools/smoke.mjs index.html --seconds 40  # headless Chrome end-to-end -> "ALL SMOKE CHECKS PASSED"
node tools/touch-smoke.mjs index.html         # phone-landscape touch pass -> "ALL TOUCH SMOKE CHECKS PASSED"
```

The smoke test loads the page, plays it through real input, forces the card screen, stress-tests 80 enemies, dies, retries, and reloads to check the high score survived. The touch test runs an 844×390 phone viewport with CDP touch emulation: taps to start, drives both floating sticks, fires by deflection and by tapping, uses the pause and mute buttons, and checks the portrait rotate prompt. Both fail on any console error and write screenshots to `tools/shots/`.

## Credits

Built in a weekend jam by a Designer, a Coder and a Director (Claude agents).
