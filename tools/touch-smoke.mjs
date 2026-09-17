// tools/touch-smoke.mjs — headless MOBILE smoke test for Get Thee To A Nunnery.
// Usage: node tools/touch-smoke.mjs [path/to/index.html] [--shots DIR]
// Phone-landscape viewport + CDP touch emulation. Checks the full-viewport canvas, the floating
// sticks over the letterbox bars, FLICK-to-fire (drag, release, cancel), tap-to-fire, aim assist,
// HOLD mode, the screen-space buttons, the pause-screen FIRE pill (and that it survives a reload),
// and the portrait ROTATE prompt. Fails loudly on any console error.
import { launch, sleep } from './cdp.mjs';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const html = resolve(args.find((a) => !a.startsWith('--')) || 'index.html');
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const SHOTS = resolve(opt('--shots', 'tools/shots'));
mkdirSync(SHOTS, { recursive: true });

// iPhone-ish landscape
const W = 844, H = 390, DSF = 3;
const b = await launch({ width: W, height: H, deviceScaleFactor: DSF, mobile: true, touch: true });
const fails = [];
const fail = (msg) => { fails.push(msg); console.log('  FAIL: ' + msg); };
const ok = (msg) => console.log('  ok: ' + msg);
const shot = async (name) => { const p = `${SHOTS}/${name}.png`; await b.screenshot(p, { x: 0, y: 0, width: W, height: H }); console.log('  shot: ' + p); };
const G = (expr) => b.eval(`(() => { const G = window.GAME; if (!G) return undefined; return (${expr}); })()`);
const J = (expr) => b.eval(`JSON.stringify((() => { const G = window.GAME; return (${expr}); })())`).then((s) => JSON.parse(s));
const checkErrors = (label) => { if (b.errors.length) { fail(`${label}: ${b.errors.length} error(s): ` + b.errors.slice(0, 3).join(' | ')); b.errors.length = 0; } else ok(`${label}: no console errors`); };
async function waitFor(label, expr, timeoutMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { if (await G(expr)) return true; await sleep(50); }
  fail(`timeout waiting for ${label} (${expr})`); return false;
}
const DEG = Math.PI / 180;
const angDelta = (a, c) => { let d = (a - c) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; return d; };
const near = (a, c, tol) => Math.abs(angDelta(a, c)) <= tol;

// logical (960x540) -> CSS px of the SCREEN, through the game's own letterbox maths
let vp = { scale: 1, offsetX: 0, offsetY: 0 };
let L = (lx, ly) => ({ x: vp.offsetX + lx * vp.scale, y: vp.offsetY + ly * vp.scale });
const readViewport = async () => { vp = await J('G.viewport'); L = (lx, ly) => ({ x: vp.offsetX + lx * vp.scale, y: vp.offsetY + ly * vp.scale }); return vp; };

console.log('== load ' + html + `  (${W}x${H} @${DSF}x, touch)`);
await b.goto('file://' + html);
await sleep(700);
checkErrors('load');
if (!(await G('true'))) fail('window.GAME missing');
await readViewport();
console.log('  viewport ' + JSON.stringify(vp));
if (await G('G.touchMode')) ok('a coarse pointer boots straight into touchMode (touch title card)');
else fail('touchMode off on a phone viewport: the title would show the WASD hint');
await shot('touch2-title');

console.log('== the canvas fills the viewport, the arena is letterboxed INSIDE it');
const rect = await J(`(() => { const r = document.getElementById('c').getBoundingClientRect(); return { x: r.x, y: r.y, w: Math.round(r.width), h: Math.round(r.height) }; })()`);
if (Math.abs(rect.w - W) <= 2 && Math.abs(rect.h - H) <= 2 && Math.abs(rect.x) <= 1 && Math.abs(rect.y) <= 1)
  ok(`the canvas is the whole glass: ${JSON.stringify(rect)}`);
else fail(`the canvas does not fill the viewport (want ${W}x${H} at 0,0): ${JSON.stringify(rect)}`);
if (vp.full) ok('viewport.full is set (touch layout)'); else fail('viewport.full false on a phone');
{
  const wantScale = Math.min(W / 960, H / 540);
  const aw = 960 * vp.scale, ah = 540 * vp.scale;
  if (Math.abs(vp.scale - wantScale) < 0.01) ok(`arena scaled to fit the glass: ${vp.scale.toFixed(3)} (arena ${Math.round(aw)}x${Math.round(ah)})`);
  else fail(`arena scale ${vp.scale} != ${wantScale.toFixed(3)}`);
  if (Math.abs(vp.offsetX * 2 + aw - W) <= 2 && Math.abs(vp.offsetY * 2 + ah - H) <= 2) ok(`letterboxed inside the canvas: bars ${vp.offsetX}px x ${vp.offsetY}px`);
  else fail(`bad letterbox offsets: ${JSON.stringify(vp)}`);
  const c = await J(`G.toScreen(480, 270)`);
  if (Math.abs(c.x - W / 2) <= 2 && Math.abs(c.y - H / 2) <= 2) ok('GAME.toScreen still lands the arena centre at the screen centre');
  else fail('toScreen is wrong: ' + JSON.stringify(c));
}

console.log('== the fullscreen button');
{
  const av = await G('G.fullscreenAvailable');
  const ids = (await J('G.touchButtons')).map((x) => x.id);
  if (av && ids.indexOf('fullscreen') >= 0) ok('document.fullscreenEnabled, and the ⛶ button is drawn: ' + ids.join(','));
  else if (!av && ids.indexOf('fullscreen') < 0) ok('fullscreen unavailable (iOS-style): the button is hidden, buttons = ' + ids.join(','));
  else fail(`fullscreen button/availability disagree (available=${av}, buttons=${ids.join(',')})`);
}

console.log('== tap to begin');
const mid = { x: W / 2, y: H / 2 };
await b.tap(mid.x, mid.y);
if (await waitFor('PLAYING after tap', `G.state === 'PLAYING'`, 4000)) ok('a tap starts the run');
if (await G('G.touchMode === true')) ok('touchMode latched by the first touch'); else fail('GAME.touchMode did not become true');
if ((await G('G.touchFireMode')) === 'flick') ok('flick is the default fire mode'); else fail('default fire mode is ' + (await G('G.touchFireMode')));
await G('G.setGod(true)');   // the checks below are about input, not survival
await sleep(200);

console.log('== move stick in the LEFT BAR (x=30, outside the arena)');
{
  const p0 = await J('G.player');
  await b.touch([{ x: 30, y: 300, id: 1 }], 'touchStart');
  await sleep(80);
  const st0 = await J('G.sticks');
  if (st0.move && !st0.aim) ok('a touch on the dead bar still spawns the MOVE stick'); else fail('no move stick from the bar: ' + JSON.stringify(st0));
  await b.touch([{ x: 160, y: 300, id: 1 }], 'touchMove');
  await sleep(550);
  const p1 = await J('G.player');
  if (p1.x - p0.x > 30) ok(`the nun walked right: x ${Math.round(p0.x)} -> ${Math.round(p1.x)}`);
  else fail(`move stick did not move the nun: ${Math.round(p0.x)} -> ${Math.round(p1.x)}`);
  await b.touch([], 'touchEnd');
  await sleep(120);
  if (!(await G('G.sticks.move'))) ok('lifting the finger drops the move stick'); else fail('move stick survived touchEnd');
}

console.log('== FLICK: drag aims but does not fire, release fires exactly one shell');
await waitFor('gun ready', `G.gun === 'READY' && G.shells > 0`, 6000);
{
  const shells0 = await G('G.shells');
  const from = { x: 640, y: 300 }, to = { x: 640, y: 170 };   // straight up: aim ~ -PI/2
  await b.drag(from, to, { steps: 5, ms: 150, id: 2, release: false });
  await sleep(250);
  const mid1 = await J('({shells: G.shells, pellets: G.pellets, aim: G.player.aim, sticks: G.sticks})');
  if (mid1.shells === shells0 && mid1.pellets === 0) ok(`holding the drag fires nothing (shells still ${shells0})`);
  else fail(`the drag fired on its own: shells ${shells0} -> ${mid1.shells}, pellets ${mid1.pellets}`);
  if (near(mid1.aim, -Math.PI / 2, 0.25)) ok(`she turned to the stick: aim ${mid1.aim.toFixed(2)}`); else fail('aim did not follow the drag: ' + mid1.aim);
  if (mid1.sticks.aimed) ok('the stick reads as aimed (amber knob + shot line)'); else fail('sticks.aimed false past the dead zone');
  await b.touch([], 'touchEnd');
  await sleep(160);
  const after = await J('({shells: G.shells, pellets: G.pellets, shots: G.snapshot().state})');
  if (after.shells === shells0 - 1) ok(`release fired exactly one shell: ${shells0} -> ${after.shells}`);
  else fail(`release spent ${shells0 - after.shells} shells (expected 1)`);
  if (after.pellets > 0) ok(`one shot's pellets in the air: ${after.pellets}`); else fail('no pellets after the release shot');
}

console.log('== FLICK CANCEL: drag out, pull back inside the dead zone, release');
await waitFor('gun ready', `G.gun === 'READY' && G.shells > 0`, 8000);
{
  const shells0 = await G('G.shells');
  const home = { x: 640, y: 300 };
  await b.drag(home, { x: 640, y: 180 }, { steps: 4, ms: 120, id: 3, release: false });
  await b.drag(home, home, { steps: 1, ms: 10, id: 3, release: false });   // (re-seeds nothing: the id is live)
  await b.touch([{ x: 643, y: 302, id: 3 }], 'touchMove');                  // back inside the dead zone
  await sleep(120);
  const st = await J('G.sticks');
  if (st.aim && !st.aimed) ok('pulled back inside the dead zone: not aimed'); else fail('stick still reads aimed: ' + JSON.stringify(st.aim));
  await b.touch([], 'touchEnd');
  await sleep(250);
  const shells1 = await G('G.shells');
  if (shells1 === shells0) ok(`cancelled: no shell spent (${shells0})`); else fail(`a cancelled flick still fired: ${shells0} -> ${shells1}`);
}

console.log('== TAP the right half = one shell down the current aim');
await waitFor('gun ready', `G.gun === 'READY' && G.shells > 0`, 8000);
{
  const shells0 = await G('G.shells');
  await b.tap(700, 300, 70, 4);
  await sleep(250);
  const shells1 = await G('G.shells');
  if (shells1 === shells0 - 1) ok(`a tap fired exactly one shell: ${shells0} -> ${shells1}`);
  else fail(`tap-to-fire spent ${shells0 - shells1} shells (expected 1)`);
}
checkErrors('flick / tap');

console.log('== AIM ASSIST: a body 6° off the drag is taken');
await G('G.startRun()');
await sleep(250);
await G('G.setGod(true)');
await waitFor('gun ready', `G.gun === 'READY' && G.shells > 0`, 8000);
{
  const p = await J('G.player');
  const dragAng = -Math.PI / 2;                       // the drag points straight up
  const want = dragAng + 6 * DEG;                     // the body sits 6° off it, 200 px out
  const ex = p.x + Math.cos(want) * 200, ey = p.y + Math.sin(want) * 200;
  await G(`G.spawnAt('restless', ${ex.toFixed(1)}, ${ey.toFixed(1)})`);
  await sleep(60);
  const from = { x: 640, y: 300 }, to = { x: 640, y: 180 };
  await b.drag(from, to, { steps: 4, ms: 120, id: 5, release: false });
  await sleep(120);
  const before = await J('({aim: G.player.aim, p: G.player, e: G.enemyList[0]})');
  await b.touch([], 'touchEnd');
  await sleep(180);
  const aim = await G('G.snapshot().player.aim');
  const target = before.e ? Math.atan2(before.e.y - before.p.y, before.e.x - before.p.x) : null;
  if (target == null) fail('the test body never spawned');
  else if (near(aim, target, 3 * DEG) && !near(aim, dragAng, 1 * DEG))
    ok(`the shot snapped onto the body: drag ${(dragAng / DEG).toFixed(1)}° -> aim ${(aim / DEG).toFixed(1)}° (body ${(target / DEG).toFixed(1)}°)`);
  else fail(`no aim assist: drag ${(dragAng / DEG).toFixed(1)}°, aim ${(aim / DEG).toFixed(1)}°, body ${(target / DEG).toFixed(1)}°`);
}

console.log('== a mid-fight frame: both sticks, the aim line, the bars');
await G(`G.spawn('restless', 12)`);
await sleep(400);
await waitFor('gun ready', `G.gun === 'READY' && G.shells > 0`, 8000);
{
  await b.touch([{ x: 120, y: 300, id: 6 }], 'touchStart');
  await b.touch([{ x: 175, y: 255, id: 6 }], 'touchMove');
  await b.touch([{ x: 175, y: 255, id: 6 }, { x: 640, y: 300, id: 7 }], 'touchStart');
  await b.touch([{ x: 175, y: 255, id: 6 }, { x: 700, y: 195, id: 7 }], 'touchMove');
  await sleep(160);
  const both = await J('G.sticks');
  if (both.move && both.aim && both.aimed) ok('both sticks live at once, the aim stick armed'); else fail('two fingers did not make two armed sticks: ' + JSON.stringify(both));
  await shot('touch2-fight');
  await b.touch([], 'touchEnd');
  await sleep(200);
}
checkErrors('sticks');

console.log('== HOLD mode: deflection past the threshold keeps firing');
await G(`G.touchFireMode = 'hold'`);
await waitFor('gun ready', `G.gun === 'READY' && G.shells > 0`, 8000);
{
  await G('G.skipToWave(1)');
  await sleep(200);
  const shells0 = await G('G.shells');
  await b.drag({ x: 640, y: 300 }, { x: 640, y: 170 }, { steps: 4, ms: 120, id: 8, release: false });
  await sleep(1200);
  const shells1 = await G('G.shells');
  await b.touch([], 'touchEnd');
  await sleep(150);
  if (shells0 - shells1 >= 2) ok(`hold mode fires continuously: ${shells0} -> ${shells1} over 1.2 s`);
  else fail(`hold mode did not auto-fire: ${shells0} -> ${shells1}`);
  if (!(await G('G.sticks.fire'))) ok('lifting stops the trigger'); else fail('the trigger stayed down after touchEnd');
}

console.log('== pause button, the FIRE pill, and the mute button');
{
  const btns = await J('G.touchButtons');
  const pause = btns.find((x) => x.id === 'pause'), mute = btns.find((x) => x.id === 'mute');
  if (!pause) fail('no pause button in PLAYING');
  else {
    await b.tap(pause.x, pause.y);
    await sleep(250);
    if (await G(`G.state === 'PAUSED'`)) ok(`the screen-space pause button paused the run (at ${Math.round(pause.x)},${Math.round(pause.y)})`);
    else fail('pause button did not pause: ' + (await G('G.state')));
  }
  await shot('touch2-pause');
  const pill = await J('G.firePill');
  const pc = L(pill.x + pill.w / 2, pill.y + pill.h / 2);
  await b.tap(pc.x, pc.y);
  await sleep(250);
  const mode = await G('G.touchFireMode');
  if (mode === 'flick') ok('tapping the pill toggled the fire mode back to FLICK');
  else fail('the FIRE pill did not toggle: ' + mode);
  if (await G(`G.state === 'PAUSED'`)) ok('the pill eats its own tap (still PAUSED)'); else fail('the pill tap leaked through and resumed');
  await b.tap(mid.x, mid.y);
  await sleep(250);
  if (await G(`G.state === 'PLAYING'`)) ok('a tap resumed the run'); else fail('tap did not resume: ' + (await G('G.state')));
  if (mute) {
    const muted0 = await G('G.snapshot().muted');
    await b.tap(mute.x, mute.y);
    await sleep(200);
    const muted1 = await G('G.snapshot().muted');
    if (muted1 !== muted0) ok(`the mute button toggled audio (${muted0} -> ${muted1})`); else fail('mute button did nothing');
    await b.tap(mute.x, mute.y); await sleep(150);
    if (await G(`G.state === 'PLAYING'`)) ok('the buttons eat their own taps (still PLAYING)'); else fail('a button tap leaked into the game');
  }
}
checkErrors('touch UI');

// ---------------------------------------------------------------------------------------------
// The Blessing card screen. The bug this guards: the wave ends under two planted thumbs, the card
// screen arrives, and the thumb (or its release) is read as a pick. Nothing held across a state
// change may ever choose anything, a tap is a press AND a release on the same card, the cards are
// dead while they fly in, and on a phone the first tap only SELECTS.
// ---------------------------------------------------------------------------------------------
console.log('== the card screen: the entrance, and the thumb that must not pick for you');
await readViewport();
const cardCentre = async (i) => { const r = (await J('G.cardRects'))[i]; return L(r.x + r.w / 2, r.y + r.h / 2); };
const freshCards = async (keepIntro) => {
  await G('G.startRun()'); await sleep(220); await G('G.setGod(true)');
  await G(keepIntro ? 'G.forceCardsReal()' : 'G.forceCards()');
  return waitFor('UPGRADE', `G.state === 'UPGRADE'`, 4000);
};

// (a) a thumb planted for the whole transition, lifted over a card
{
  await G('G.startRun()'); await sleep(220); await G('G.setGod(true)');
  await b.touch([{ x: 660, y: 300, id: 20 }], 'touchStart');     // the aim thumb, mid-wave
  await sleep(140);
  if (await G('G.sticks.aim')) ok('the aim thumb is planted before the wave ends'); else fail('no aim stick to hold');
  await G('G.forceCardsReal()');                                 // ...and the wave ends under it
  await waitFor('UPGRADE', `G.state === 'UPGRADE'`, 4000);
  const u = await J('G.ui');
  if (u.stale >= 1) ok(`(a) the held thumb is STALE on the new screen (${u.stale} pointer)`);
  else fail('(a) nothing went stale across the transition: ' + JSON.stringify(u));
  if (!(await G('G.sticks.aim'))) ok('(a) ...and both sticks were dropped leaving play');
  else fail('(a) a stick survived into UPGRADE');
  const c1 = await cardCentre(1);
  await sleep(600);                                              // long past the entrance
  await b.touch([{ x: c1.x, y: c1.y, id: 20 }], 'touchMove');    // drag it onto a Blessing
  await sleep(90);
  await b.touch([], 'touchEnd');                                 // and let go right on the card
  await sleep(260);
  const st = await J('({state: G.state, sel: G.cardSelection, picks: Object.keys(G.picks).length})');
  if (st.state === 'UPGRADE' && st.sel === -1 && st.picks === 0) ok('(a) the held thumb chose NOTHING: ' + JSON.stringify(st));
  else fail('(a) a thumb held across the wave end picked a Blessing: ' + JSON.stringify(st));
}

// the entrance, caught mid-flight (staggered scale/slide/fade)
{
  await freshCards(true);
  await sleep(170);
  await shot('cards-intro');
}

// (b) dead during the entrance; then tap to select, tap again to confirm
{
  await freshCards(true);
  if (!(await G('G.cardsReady'))) ok('(b) the cards are not interactive while they fly in');
  else fail('(b) the entrance was over before it began');
  const c0 = await cardCentre(0);
  await b.tap(c0.x, c0.y, 40, 21);                               // a FRESH tap, mid-entrance
  await sleep(140);
  const midT = await J('({state: G.state, sel: G.cardSelection})');
  if (midT.state === 'UPGRADE' && midT.sel === -1) ok('(b) a tap during the entrance does nothing');
  else fail('(b) the entrance answered a tap: ' + JSON.stringify(midT));
  await sleep(500);
  if (await G('G.cardsReady')) ok('(b) the entrance is over inside 500 ms'); else fail('(b) still not armed after 500 ms');
  await b.tap(c0.x, c0.y, 50, 22);                               // first tap: SELECT
  await sleep(220);
  const sel = await J('({state: G.state, sel: G.cardSelection, pill: G.chooseRect, picks: Object.keys(G.picks).length})');
  if (sel.state === 'UPGRADE' && sel.sel === 0 && sel.picks === 0) ok('(b) the first tap SELECTS, it does not buy');
  else fail('(b) the first tap was taken as a pick: ' + JSON.stringify(sel));
  if (sel.pill && sel.pill.h * vp.scale >= 48) ok(`(b) the CHOOSE pill is ${Math.round(sel.pill.h * vp.scale)} css px tall (>= 48)`);
  else fail('(b) the CHOOSE pill is missing or too small: ' + JSON.stringify(sel.pill));
  await shot('cards-selected');
  const want = (await J('G.cards'))[0];
  await b.tap(c0.x, c0.y, 50, 23);                               // second tap on the same card: CONFIRM
  await sleep(320);
  const done = await J('({state: G.state, picks: G.picks})');
  if (done.state !== 'UPGRADE' && done.picks[want] === 1) ok(`(b) the second tap took ${want} and left the card screen`);
  else fail('(b) the second tap did not confirm: ' + JSON.stringify(done));
}

// (c) the selection moves to whichever card you tap, and CHOOSE commits it
{
  await freshCards(false);
  const cA = await cardCentre(0), cB = await cardCentre(2);
  await b.tap(cA.x, cA.y, 50, 24); await sleep(200);
  if ((await G('G.cardSelection')) === 0) ok('(c) card A selected'); else fail('(c) card A did not select: ' + (await G('G.cardSelection')));
  await b.tap(cB.x, cB.y, 50, 25); await sleep(200);
  const moved = await J('({state: G.state, sel: G.cardSelection})');
  if (moved.sel === 2 && moved.state === 'UPGRADE') ok('(c) tapping card B moved the selection, and bought nothing');
  else fail('(c) the selection did not move cleanly: ' + JSON.stringify(moved));
  const want = (await J('G.cards'))[2], pr = await J('G.chooseRect');
  const pc = L(pr.x + pr.w / 2, pr.y + pr.h / 2);
  await b.tap(pc.x, pc.y, 50, 26); await sleep(320);
  const done = await J('({state: G.state, picks: G.picks})');
  if (done.state !== 'UPGRADE' && done.picks[want] === 1) ok(`(c) the CHOOSE pill took card B (${want})`);
  else fail('(c) CHOOSE did not confirm: ' + JSON.stringify(done));
}

// (d) press a card, slide off it, let go
{
  await freshCards(false);
  const c0 = await cardCentre(0);
  await b.touch([{ x: c0.x, y: c0.y, id: 27 }], 'touchStart');
  await sleep(90);
  await b.touch([{ x: c0.x, y: H - 8, id: 27 }], 'touchMove');   // off the bottom of the card
  await sleep(90);
  await b.touch([], 'touchEnd');
  await sleep(260);
  const st = await J('({state: G.state, sel: G.cardSelection})');
  if (st.state === 'UPGRADE' && st.sel === -1) ok('(d) press-and-slide-off picks nothing: ' + JSON.stringify(st));
  else fail('(d) a slide-off was taken as a tap: ' + JSON.stringify(st));
}
checkErrors('card screen');

console.log('== the same protection on the GAME OVER card');
// (e) a thumb held across the death, released on the retry area
{
  await G('G.startRun()'); await sleep(220); await G('G.setGod(true)');
  await b.touch([{ x: 660, y: 300, id: 30 }], 'touchStart');
  await sleep(140);
  await G('G.forceGameOver(0, 1)');
  await waitFor('GAMEOVER', `G.state === 'GAMEOVER'`, 4000);
  await sleep(500);
  await b.touch([{ x: mid.x, y: mid.y, id: 30 }], 'touchMove');
  await sleep(90);
  await b.touch([], 'touchEnd');                                 // released right on TAP TO RETRY
  await sleep(320);
  if (await G(`G.state === 'GAMEOVER'`)) ok('(e) a thumb held across the death does not retry');
  else fail('(e) a held thumb restarted the run: ' + (await G('G.state')));
  await b.tap(mid.x, mid.y, 60, 31);                             // a fresh tap, past UI_ARM_MS
  await sleep(400);
  if (await G(`G.state === 'PLAYING'`)) ok('(e) ...and a fresh tap still does'); else fail('(e) retry broke: ' + (await G('G.state')));
}
checkErrors('end card');

console.log('== the fire mode survives a reload');
await b.goto('file://' + html);
await sleep(700);
await readViewport();
if ((await G('G.touchFireMode')) === 'flick') ok('touchFire persisted through the reload');
else fail('fire mode lost on reload: ' + (await G('G.touchFireMode')));
checkErrors('reload');

console.log('== portrait: the rotate prompt');
await b.tap(mid.x, mid.y);
await waitFor('PLAYING', `G.state === 'PLAYING'`, 4000);
await G('G.setGod(true)');
await G(`G.spawn('restless', 6)`);
await sleep(300);
await b.setViewport({ width: H, height: W, deviceScaleFactor: DSF, mobile: true });
await sleep(600);
{
  const por = await J('({portrait: G.viewport.portrait, prompt: G.rotatePrompt, touch: G.touchMode, state: G.state})');
  if (por.portrait && por.prompt) ok('portrait raises the ROTATE prompt: ' + JSON.stringify(por));
  else fail('no rotate prompt in portrait: ' + JSON.stringify(por));
  const frozen0 = await J('G.enemyList.map((e) => e.x + "," + e.y).join("|")');
  await sleep(700);
  const frozen1 = await J('G.enemyList.map((e) => e.x + "," + e.y).join("|")');
  if (frozen0 === frozen1 && frozen0.length) ok('the sim is frozen behind the prompt');
  else fail('the sim kept running in portrait');
  await b.screenshot(`${SHOTS}/touch2-portrait.png`, { x: 0, y: 0, width: H, height: W });
  console.log(`  shot: ${SHOTS}/touch2-portrait.png`);
}

console.log('== back to landscape');
await b.setViewport({ width: W, height: H, deviceScaleFactor: DSF, mobile: true });
await sleep(600);
await readViewport();
if (!(await G('G.rotatePrompt'))) ok('the prompt auto-hides in landscape'); else fail('rotate prompt stuck after rotating back');
if ((await G('G.state')) === 'PLAYING') ok('the run survived the rotation'); else fail('lost the run on rotation: ' + (await G('G.state')));
checkErrors('rotation');

console.log('== a mouse move hands control (and the desktop canvas) back');
await sleep(800);   // past TOUCH_MOUSE_LOCK
await b.mouseMove(300, 200);
await b.mouseMove(320, 210);
await sleep(250);
if ((await G('G.touchMode')) === false) ok('a real mouse move clears touchMode'); else fail('touchMode stuck on after a mouse move');
{
  const r = await J(`(() => { const r = document.getElementById('c').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })()`);
  const v = await J('G.viewport');
  if (!v.full && r.w <= W && Math.abs(r.w - 960 * v.scale) <= 2) ok(`the desktop letterbox canvas is back: ${r.w}x${r.h}`);
  else fail(`the canvas did not go back to the desktop layout: ${JSON.stringify(r)} ${JSON.stringify(v)}`);
}
checkErrors('mouse handback');

await b.close();
console.log(fails.length ? `\n${fails.length} FAILURE(S):\n - ` + fails.join('\n - ') : '\nALL TOUCH SMOKE CHECKS PASSED');
process.exit(fails.length ? 1 : 0);
