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

## Debug keys

Add `?debug=1` to the URL, or press the backtick key, to toggle the debug overlay (fps, frame ms, entity counts). While the overlay is on, in play:

`G` god mode · `N` skip wave · `K` kill all · `L` force the card screen · `B` spawn Claudius · `1`–`4` time scale (0.25 / 0.5 / 1 / 2) · `F1` stress test (200 enemies + 2000 particles)

`window.GAME` is the same handle the test harness drives: `startRun()`, `skipToWave(n)`, `spawn(type, n)`, `spawnAt(type, x, y)`, `killAll()`, `forceCards()`, `pickCard(i)`, `setGod(b)`, `setTimeScale(x)`, `snapshot()`.

## Tests

Node 22+ and Google Chrome, no npm dependencies:

```bash
node tools/check.mjs                          # single-file / CSP / syntax rules -> "check ok"
node tools/smoke.mjs index.html --seconds 40  # headless Chrome end-to-end -> "ALL SMOKE CHECKS PASSED"
```

The smoke test loads the page, plays it through real input, forces the card screen, stress-tests 80 enemies, dies, retries, and reloads to check the high score survived. It fails on any console error and writes screenshots to `tools/shots/`.

## Credits

Built in a weekend jam by a Designer, a Coder and a Director (Claude agents).
