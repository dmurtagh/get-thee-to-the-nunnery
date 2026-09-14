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

On a touch device the canvas is the **whole viewport**: the 960×540 courtyard is letterboxed inside
it, the bars are darkened stone rather than dead space, and the thumb sticks and buttons are drawn in
screen space so they can sit anywhere, bars included. The first tap that starts a run also asks for
real fullscreen and a landscape lock. (iOS Safari has no Fullscreen API: it gets a one-line
*add to home screen* prompt on the title instead, dismissible and remembered.)

| Input | Action |
|---|---|
| Left thumb, anywhere on the left half of the screen | Floating move stick — 360°, analog speed |
| Right thumb, anywhere on the right half | Floating aim stick — she turns, the ring rides the aim at kill range, a thin line shows the shot |
| Lift the right thumb while aimed | **Fire one shell** down that line (flick to fire) |
| Pull the right thumb back to the middle, then lift | Cancel — no shot |
| Tap the right half | One shell down the current aim |
| ⏸ / speaker / ⛶ buttons, top right of the screen | Pause · Mute · Fullscreen (hidden where the browser has no Fullscreen API) |
| FIRE: FLICK ⇄ HOLD pill on the pause card | Switch to the old hold-to-fire trigger (persisted) |
| Tap anywhere | Start, pick a Blessing, resume, retry, take the Encore |

Both sticks float: they appear where your thumb lands, so there is nothing to reach for and nothing
on screen until you touch it. **Flick to fire** is the default because holding the aim stick down
meant firing — and therefore recoiling — non-stop: now the drag is pure aim and the release is the
trigger. Released and tapped shots get a small aim assist (10°, inside pellet range) so a thumb-wide
aim still connects. Short haptic taps on firing, on the release shot, and on taking a hit (off while
muted).

## Debug keys

Add `?debug=1` to the URL, or press the backtick key, to toggle the debug overlay (fps, frame ms, entity counts). While the overlay is on, in play:

`G` god mode · `N` skip wave · `K` kill all · `L` force the card screen · `B` spawn Claudius · `1`–`4` time scale (0.25 / 0.5 / 1 / 2) · `F1` stress test (200 enemies + 2000 particles)

`window.GAME` is the same handle the test harness drives: `startRun()`, `skipToWave(n)`, `spawn(type, n)`, `spawnAt(type, x, y)`, `killAll()`, `forceCards()`, `pickCard(i)`, `setGod(b)`, `setTimeScale(x)`, `snapshot()`, plus `touchMode` (get/set), `touchFireMode` (get/set: `'flick'` | `'hold'`), `sticks`, `touchButtons`, `firePill`, `fullscreen`, `fullscreenAvailable` and `rotatePrompt` for the touch build.

## Tests

Node 22+ and Google Chrome, no npm dependencies:

```bash
node tools/check.mjs                          # single-file / CSP / syntax rules -> "check ok"
node tools/smoke.mjs index.html --seconds 40  # headless Chrome end-to-end -> "ALL SMOKE CHECKS PASSED"
node tools/touch-smoke.mjs index.html         # phone-landscape touch pass -> "ALL TOUCH SMOKE CHECKS PASSED"
```

The smoke test loads the page, plays it through real input, forces the card screen, stress-tests 80 enemies, dies, retries, and reloads to check the high score survived. The touch test runs an 844×390 phone viewport with CDP touch emulation: it checks the canvas fills the glass and the arena is letterboxed inside it, drives a move stick planted on a letterbox bar, flicks to fire (and cancels), taps to fire, checks the aim assist snaps onto a body 6° off the drag, runs the hold-mode trigger, uses the screen-space buttons and the pause-card FIRE pill (which must survive a reload), and checks the portrait rotate prompt. Both fail on any console error and write screenshots to `tools/shots/`.

## Credits

Built in a weekend jam by a Designer, a Coder and a Director (Claude agents).
