# GET THEE TO A NUNNERY

*She took the advice.* Ophelia went to the nunnery; the restless dead of Elsinore followed her there.
One walled courtyard, one pump-action shotgun, ten waves, a boss, and an Encore.

Two of the Order can hold that shotgun: **SISTER OPHELIA**, and **FATHER HORATIO**, a priest in a black
cassock and a white collar. Starting a run from the title raises **TAKE YOUR VOWS** — two cards, one each,
and you tap or click the one you want. It is **cosmetic only** — same gun, same stats, same waves — and the
choice is remembered, so a retry never asks again.

The shotgun kicks her backwards. **Every shot is also a dodge** — retreat and fire and you fly, charge and fire and you stall.

## Play

Open `index.html` in any modern browser (double-click it — it runs straight from `file://`, no server, no build step,
no assets). Click once to begin, then take your vows; the click also unlocks the audio.

The only network call in the whole game is **THE HOLY ORDER**, the global top ten (see below). Off `file://` it is
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
| ← → (or A / D), 1 / 2, Enter, Esc | TAKE YOUR VOWS — move the highlight, pick outright, confirm, or go back to the poster |
| H | HARD HABIT toggle on the title screen (unlocked by winning) |
| Enter / Space / click | Start (which raises TAKE YOUR VOWS), retry, take the Encore |
| A–Z, 0–9, space, Backspace, Enter, Esc | Name entry on the end card — type, submit (Enter), or skip (Esc) |
| Esc, or the TITLE pill | Leave the end card for the title poster (and the full board) |

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
| Tap a card on TAKE YOUR VOWS | Choose SISTER OPHELIA or FATHER HORATIO and start the run — one tap, no confirm |
| ⏸ / speaker / ⛶ buttons | Pause · Mute · Fullscreen — top right in play, top **left** on the title (THE HOLY ORDER has the right shoulder of the poster). Fullscreen is hidden where the browser has no Fullscreen API |
| FIRE: FLICK ⇄ HOLD pill on the pause card | Switch to the old hold-to-fire trigger (persisted) |
| Tap anywhere | Start (which raises the vows), pick a Blessing, resume, retry, take the Encore |
| Tap the name field (or TAP TO TYPE) on the end card | Raises the on-screen keyboard; SUBMIT / SKIP are pills, and *done* on the keyboard submits |
| Tap the TITLE pill on the end card | Back to the title poster, and the full board |

Both sticks float: they appear where your thumb lands, so there is nothing to reach for and nothing
on screen until you touch it. **Flick to fire** is the default because holding the aim stick down
meant firing — and therefore recoiling — non-stop: now the drag is pure aim and the release is the
trigger. Released and tapped shots get a small aim assist (10°, inside pellet range) so a thumb-wide
aim still connects. Short haptic taps on firing, on the release shot, and on taking a hit (off while
muted).

## The two of the Order

The player is **SISTER OPHELIA** (default) or **FATHER HORATIO**, and the choice is made on the way in.
Start a run from the title — click, tap, Enter or Space — and the poster dims behind **TAKE YOUR VOWS**:
a serif head under an amber rule, and two large cards side by side in the Blessing-card style (cream for
her, amber for him). Each carries its hero drawn big, facing the middle of the screen with the shotgun in
hand and breathing, the name, and the line: *She took the advice.* / *He took the advice.* They fly in on
the Blessing cards' own 400 ms entrance and answer nothing until it lands, and the character you chose
last starts highlighted.

Taking a vow is one tap (`vow:nun` / `vow:priest` in the canvas tap layer, so it is a press **and** a
release on the same card, and a finger held across the transition is dead): she goes up in a puff of
bone with a soft tick, the choice is saved (`save.character`), and the run starts on the same gesture —
which is also the gesture that asks for fullscreen on a phone. On a keyboard, ← → (or A / D) move the
highlight, `1` / `2` pick outright, Enter confirms and Esc goes back to the poster. **A retry never comes
through here**: TAP TO RETRY keeps whoever just died. The TITLE pill goes back to the poster, and the next
start asks again. The poster's hero is now only a portrait of the last vow taken.

The priest is drawn by the same procedural recipe as the nun, at the same pivot, in the same tones: black
cassock with her bell silhouette, a **white clerical collar with a dark notch** where she has her white
coif ring, short dark-brown hair, a gold pectoral cross on the cloth, two dark shoes — and no veil to
trail behind him. He is pre-rendered the same way (both frames plus a white silhouette, at 2x) and reads
as a priest at 1x in a crowd (`tools/shots/char-1x.png` puts the two side by side on the flagstones).

Nothing about him is a stat: the gun, the recoil, the hearts and the Blessings are identical. What
changes is flavour — the subtitle, and two of the six game-over quotes (*Goodnight, sweet nun.* becomes
*Goodnight, padre.*; *Alas, poor Ophelia.* becomes *Alas, poor Horatio.*). The score you post carries a
quiet `c` flag saying which of them played it; the board still shows the name you typed and nothing else.

## THE HOLY ORDER — the global leaderboard

The title poster carries a pinned bill of the **global top ten**: rank · name · score · wave, under a
Georgia head and a small sans **LEADERBOARD** rule. Beat your own best, or anything that would make
that ten, and the GAME OVER (and ENCORE) card asks for a name — **1 to 12 characters, A–Z, 0–9 and
single spaces**, uppercased, trimmed, no leading space, prefilled with the last one you used. Type
and press Enter on a keyboard; on a phone, tap the field to raise the on-screen keyboard and use
*done*, or the SUBMIT / SKIP pills.

**The board then stays on the card.** After SUBMIT or SKIP — and straight away when there is no entry
to offer — the same top-ten panel is drawn on the end card with your row picked out in amber, and
under it the exact rank: *YOU PLACED #37 IN THE HOLY ORDER*, true even when you are nowhere near
tenth. TAP TO RETRY still retries; a **TITLE** pill (or Esc) goes back to the poster, so the board is
reachable at any time and a retry never skips past it. One submission per run.

**The on-screen keyboard.** A virtual keyboard does not resize the window — it shrinks the *visual*
viewport and leaves the layout viewport alone, so `window.visualViewport` is the only thing that sees
it. When the visible height drops below 75% of the layout height the whole entry block (title, field,
pills, hint) is redrawn in **screen space** inside what is left of the glass, centred, stacked from
the top, with the rest of the card dimmed behind it; the hidden `<input>` follows the drawn field so
iOS has no reason to scroll the page, and the page is pinned at `scrollTop 0` besides. Close the
keyboard and the block goes back where it was.

That hidden `<input type="text" maxlength="12" enterkeyhint="done">` is the whole mobile story: a
virtual keyboard fires `keydown` with keyCode 229 and tells you nothing, so the field is driven by
the **`input` event** (and `compositionend`) — read `el.value`, uppercase it, drop anything that is
not `A–Z 0–9 space`, collapse runs of spaces, cut to twelve, write the cleaned value back only when
it differs, and leave the caret at the end. Enter, the `insertLineBreak` input type and `change` all
submit; SUBMIT and SKIP blur it again.

It is **Cloud Firestore over its plain REST API** — no SDK, no bundler, still one file. Three calls,
all to `firestore.googleapis.com` and nowhere else: a `:runQuery` for the top ten (cached 60 s,
in-flight deduped, abandoned after 6 s by an `AbortController`), a POST that *creates* one score
document, and a `:runAggregationQuery` that counts the scores strictly above yours so the card can
name an exact rank (rank = count + 1; if it fails, the top ten answers instead). The project id and
API key in `CONFIG.LEADERBOARD` are public by design — the server's security rules are the real
guard: anyone may read, anyone may create exactly
`{name: /^[A-Z0-9][A-Z0-9 ]{0,11}$/, score: 0…2,000,000, wave: 1…200, v: int, c: 0|1 optional}`, and
nothing may ever be changed or deleted. The client enforces that same name regex before it posts.

Three rules hold the whole thing together, and `tools/lb-smoke.mjs` enforces them:

- **gameplay never waits on the network.** Every call is fire-and-forget; the frame loop only ever
  reads values that are already there.
- **it fails silently.** From `file://`, offline, behind a captive portal or with the host blocked,
  the board just reads `OFFLINE` and the game is untouched. One `console.warn` per session at most —
  never a `console.error`, never an uncaught rejection.
- **one host.** `tools/check.mjs` extracts every absolute URL from the script and fails the build if
  any host other than `firestore.googleapis.com` appears; `fetch(` is only permitted while that list
  is clean.

The board reads `…` while loading, `OFFLINE` when there is nothing to reach, and
`BE THE FIRST OF THE ORDER` when nobody has placed yet.

## Debug keys

Add `?debug=1` to the URL, or press the backtick key, to toggle the debug overlay (fps, frame ms, entity counts). While the overlay is on, in play:

`G` god mode · `N` skip wave · `K` kill all · `L` force the card screen · `B` spawn Claudius · `1`–`4` time scale (0.25 / 0.5 / 1 / 2) · `F1` stress test (200 enemies + 2000 particles)

`window.GAME` is the same handle the test harness drives: `startRun()`, `skipToWave(n)`, `spawn(type, n)`, `spawnAt(type, x, y)`, `killAll()`, `forceCards()`, `pickCard(i)`, `setGod(b)`, `setTimeScale(x)`, `snapshot()`, plus `touchMode` (get/set), `touchFireMode` (get/set: `'flick'` | `'hold'`), `sticks`, `touchButtons`, `firePill`, `fullscreen`, `fullscreenAvailable` and `rotatePrompt` for the touch build.
For the leaderboard: `leaderboard` (`{available, status, top, lastError}`), `leaderboardCollection` (get/set),
`refreshLeaderboard(force)`, `submitScore(name, score, wave, c)` (`c` defaults to the current character),
`cleanName(s)`, `validName(s)`, `nameEntry`, `entryUI`,
`playerName` (`initials` is kept as an alias), `endCard` (`{board, rect, highlight, rank, rankLine, titlePill}`),
`keyboard` (`{up, entryUp, rect, layoutH, layout}`), `debugKeyboardRect(h)` to fake a shrunken visual viewport, and
`forceGameOver(score, wave)` to land straight on an end card with a chosen score. For the characters:
`character` (get/set: `'nun'` | `'priest'`), `characters`, `characterInfo` (`{id, c, name, title, subtitle,
run, hero}` — `hero` is the poster portrait's box in arena px) and `swapCharacter()`. For TAKE YOUR VOWS:
`vowsHighlight` (the lit card's index), `vowsReady` (is the entrance over) and `vowCards`
(`[{id, name, rect}]`, arena px).

## Tests

Node 22+ and Google Chrome, no npm dependencies:

```bash
node tools/check.mjs                          # single-file / CSP / syntax rules -> "check ok"
node tools/smoke.mjs index.html --seconds 40  # headless Chrome end-to-end -> "ALL SMOKE CHECKS PASSED"
node tools/touch-smoke.mjs index.html         # phone-landscape touch pass -> "ALL TOUCH SMOKE CHECKS PASSED"
node tools/lb-smoke.mjs                       # THE HOLY ORDER -> "ALL LEADERBOARD CHECKS PASSED"
node tools/lb-smoke.mjs --live                # ...and the same, plus a real round trip to `scores_test`
```

The smoke test loads the page, plays it through real input, forces the card screen, stress-tests 80 enemies, dies, retries, and reloads to check the high score survived. The touch test runs an 844×390 phone viewport with CDP touch emulation: it checks the canvas fills the glass and the arena is letterboxed inside it, drives a move stick planted on a letterbox bar, flicks to fire (and cancels), taps to fire, checks the aim assist snaps onto a body 6° off the drag, runs the hold-mode trigger, uses the screen-space buttons and the pause-card FIRE pill (which must survive a reload), walks the whole TAKE YOUR VOWS path (a tap to begin raises it, a tap during the entrance does nothing, a tap on the priest card starts the run as FATHER HORATIO, a retry goes straight back into play still as him, and the TITLE pill → poster → tap raises the vows again with his card lit, Esc backing out), and checks the portrait rotate prompt. The leaderboard test serves `index.html` from a throwaway localhost server (the board only exists over http(s)) and
installs a `fetch` mock that answers `:runQuery` with a canned top ten, `:runAggregationQuery` with a canned count of 36,
and records every submit. It checks the title panel, the name rules against the server regex, desktop typing (letters,
digits, one interior space, backspace, the twelve-character ceiling), the phone path — the hidden `<input>` really does
take focus, and a bare `input` event with `"sister mary  9x!"` really does become `SISTER MARY` on the wire — the
keyboard-aware layout (via `GAME.debugKeyboardRect(150)`, since CDP cannot shrink a real visual viewport), that Enter
submits exactly one document with exactly the four expected fields, that the one aggregation call turns a count of 36
into *#37*, that the board lands on the game-over card with her row highlighted, that the TITLE pill and Esc reach the
title, that a small score gets no entry, that SKIP sends nothing even though the blur it causes fires a `change` event,
that the character flag rides along without touching the name (a priest's submit carries
`"c":{"integerValue":"1"}`, a nun's carries `"0"`, and a row with no `c` at all reads as `0`), and that
going offline — or having the host blocked outright — is completely silent. `--live` adds a real read of the
live board, one twelve-character write into the `scores_test` collection and a real aggregation query, read back
independently from Node.

All three fail on any console error and write screenshots to `tools/shots/`.

## Credits

Built in a weekend jam by a Designer, a Coder and a Director (Claude agents).
