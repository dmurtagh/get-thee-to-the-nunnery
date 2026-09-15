# GET THEE TO A NUNNERY

*She took the advice.* Ophelia went to the nunnery; the restless dead of Elsinore followed her there.
One walled courtyard, one pump-action shotgun, ten waves, a boss, and an Encore.

The shotgun kicks her backwards. **Every shot is also a dodge** — retreat and fire and you fly, charge and fire and you stall.

## Play

Open `index.html` in any modern browser (double-click it — it runs straight from `file://`, no server, no build step,
no assets). Click once to begin; the click also unlocks the audio.

The only network call in the whole game is **THE PLAYBILL**, the global top ten (see below). Off `file://` it is
simply not there — the game is still the same single file with nothing to install.

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
| A–Z, 0–9, Backspace, Enter, Esc | Initials entry on the end card — type, submit, or skip |

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
| ⏸ / speaker / ⛶ buttons | Pause · Mute · Fullscreen — top right in play, top **left** on the title (THE PLAYBILL has the right shoulder of the poster). Fullscreen is hidden where the browser has no Fullscreen API |
| FIRE: FLICK ⇄ HOLD pill on the pause card | Switch to the old hold-to-fire trigger (persisted) |
| Tap anywhere | Start, pick a Blessing, resume, retry, take the Encore |
| Tap an initials slot on the end card | Raises the on-screen keyboard; SUBMIT / SKIP are pills |

Both sticks float: they appear where your thumb lands, so there is nothing to reach for and nothing
on screen until you touch it. **Flick to fire** is the default because holding the aim stick down
meant firing — and therefore recoiling — non-stop: now the drag is pure aim and the release is the
trigger. Released and tapped shots get a small aim assist (10°, inside pellet range) so a thumb-wide
aim still connects. Short haptic taps on firing, on the release shot, and on taking a hit (off while
muted).

## THE PLAYBILL — the global leaderboard

The title poster carries a pinned bill of the **global top ten**: rank · initials · score · wave.
Beat your own best, or anything that would make that ten, and the GAME OVER (and ENCORE) card asks
for three arcade initials — A–Z and 0–9, prefilled with the last ones you used. Type and press Enter
on a keyboard; on a phone, tap a slot to raise the on-screen keyboard and use the SUBMIT / SKIP
pills. One submission per run, and the card then tells you where you landed:
*YOU PLACED #3 ON THE PLAYBILL*.

It is **Cloud Firestore over its plain REST API** — no SDK, no bundler, still one file. Two calls,
both to `firestore.googleapis.com` and nowhere else: a `:runQuery` for the top ten (cached 60 s,
in-flight deduped, abandoned after 6 s by an `AbortController`) and a POST that *creates* one score
document. The project id and API key in `CONFIG.LEADERBOARD` are public by design — the server's
security rules are the real guard: anyone may read, anyone may create exactly
`{name: /^[A-Z0-9]{1,3}$/, score: 0…2,000,000, wave: 1…200, v: int}`, and nothing may ever be
changed or deleted.

Three rules hold the whole thing together, and `tools/lb-smoke.mjs` enforces them:

- **gameplay never waits on the network.** Every call is fire-and-forget; the frame loop only ever
  reads values that are already there.
- **it fails silently.** From `file://`, offline, behind a captive portal or with the host blocked,
  the bill just reads `OFFLINE` and the game is untouched. One `console.warn` per session at most —
  never a `console.error`, never an uncaught rejection.
- **one host.** `tools/check.mjs` extracts every absolute URL from the script and fails the build if
  any host other than `firestore.googleapis.com` appears; `fetch(` is only permitted while that list
  is clean.

The bill reads `…` while loading, `OFFLINE` when there is no board to reach, and `BE THE FIRST` when
nobody has placed yet.

## Debug keys

Add `?debug=1` to the URL, or press the backtick key, to toggle the debug overlay (fps, frame ms, entity counts). While the overlay is on, in play:

`G` god mode · `N` skip wave · `K` kill all · `L` force the card screen · `B` spawn Claudius · `1`–`4` time scale (0.25 / 0.5 / 1 / 2) · `F1` stress test (200 enemies + 2000 particles)

`window.GAME` is the same handle the test harness drives: `startRun()`, `skipToWave(n)`, `spawn(type, n)`, `spawnAt(type, x, y)`, `killAll()`, `forceCards()`, `pickCard(i)`, `setGod(b)`, `setTimeScale(x)`, `snapshot()`, plus `touchMode` (get/set), `touchFireMode` (get/set: `'flick'` | `'hold'`), `sticks`, `touchButtons`, `firePill`, `fullscreen`, `fullscreenAvailable` and `rotatePrompt` for the touch build.
For the leaderboard: `leaderboard` (`{available, status, top, lastError}`), `leaderboardCollection` (get/set),
`refreshLeaderboard(force)`, `submitScore(name, score, wave)`, `nameEntry`, `entryUI`, `initials`, and
`forceGameOver(score, wave)` to land straight on an end card with a chosen score.

## Tests

Node 22+ and Google Chrome, no npm dependencies:

```bash
node tools/check.mjs                          # single-file / CSP / syntax rules -> "check ok"
node tools/smoke.mjs index.html --seconds 40  # headless Chrome end-to-end -> "ALL SMOKE CHECKS PASSED"
node tools/touch-smoke.mjs index.html         # phone-landscape touch pass -> "ALL TOUCH SMOKE CHECKS PASSED"
node tools/lb-smoke.mjs                       # THE PLAYBILL -> "ALL LEADERBOARD CHECKS PASSED"
node tools/lb-smoke.mjs --live                # ...and the same, plus a real round trip to `scores_test`
```

The smoke test loads the page, plays it through real input, forces the card screen, stress-tests 80 enemies, dies, retries, and reloads to check the high score survived. The touch test runs an 844×390 phone viewport with CDP touch emulation: it checks the canvas fills the glass and the arena is letterboxed inside it, drives a move stick planted on a letterbox bar, flicks to fire (and cancels), taps to fire, checks the aim assist snaps onto a body 6° off the drag, runs the hold-mode trigger, uses the screen-space buttons and the pause-card FIRE pill (which must survive a reload), and checks the portrait rotate prompt. The leaderboard test serves `index.html` from a throwaway localhost server (the board only exists over http(s)) and
installs a `fetch` mock that answers `:runQuery` with a canned top ten and records every submit. It checks the title
panel, the initials entry on both the keyboard and the touch path (the hidden `<input>` really does take focus, and its
value mirrors into the slots), that a small score gets no entry, that SKIP sends nothing, that exactly one document is
POSTed per run with exactly the four expected fields, and that going offline — or having the host blocked outright — is
completely silent. `--live` adds a real read of the live board and one write into the `scores_test` collection, read
back independently from Node.

All three fail on any console error and write screenshots to `tools/shots/`.

## Credits

Built in a weekend jam by a Designer, a Coder and a Director (Claude agents).
