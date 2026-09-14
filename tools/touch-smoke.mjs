// tools/touch-smoke.mjs — headless MOBILE smoke test for Get Thee To A Nunnery.
// Usage: node tools/touch-smoke.mjs [path/to/index.html] [--shots DIR]
// Phone-landscape viewport + CDP touch emulation: taps to start, drives both floating sticks,
// fires by deflecting the aim stick and by tapping, uses the on-canvas pause button, and checks
// the portrait ROTATE prompt. Fails loudly on any console error.
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

console.log('== load ' + html + `  (${W}x${H} @${DSF}x, touch)`);
await b.goto('file://' + html);
await sleep(700);
checkErrors('load');
if (!(await G('true'))) { fail('window.GAME missing'); }

// logical (960x540) -> CSS px, through the game's own letterbox maths
let vp = await J('G.viewport');
const L = (lx, ly) => ({ x: vp.offsetX + lx * vp.scale, y: vp.offsetY + ly * vp.scale });
console.log('  viewport ' + JSON.stringify(vp));
if (await G('G.touchMode')) ok('a coarse pointer boots straight into touchMode (touch title card)');
else fail('touchMode off on a phone viewport: the title would show the WASD hint');
await shot('t1-title');

console.log('== tap to begin');
const c0 = L(480, 320);
await b.tap(c0.x, c0.y);
if (await waitFor('PLAYING after tap', `G.state === 'PLAYING'`, 4000)) ok('a tap starts the run');
if (await G('G.touchMode === true')) ok('touchMode latched by the first touch'); else fail('GAME.touchMode did not become true');
await G('G.setGod(true)');   // the checks below are about input, not survival
await sleep(200);

console.log('== move stick (left half)');
const mvA = L(120, 420), mvB = L(220, 420);
const p0 = await J('G.player');
await b.touch([{ x: mvA.x, y: mvA.y, id: 1 }], 'touchStart');
await sleep(80);
const st0 = await J('G.sticks');
if (st0.move && !st0.aim) ok('left-half touch made the MOVE stick'); else fail('no move stick: ' + JSON.stringify(st0));
await b.touch([{ x: mvB.x, y: mvB.y, id: 1 }], 'touchMove');
await sleep(550);
const p1 = await J('G.player');
if (p1.x - p0.x > 30) ok(`the nun walked right: x ${Math.round(p0.x)} -> ${Math.round(p1.x)}`);
else fail(`move stick did not move the nun: ${Math.round(p0.x)} -> ${Math.round(p1.x)}`);
await b.touch([], 'touchEnd');
await sleep(120);
if (!(await G('G.sticks.move'))) ok('lifting the finger drops the move stick'); else fail('move stick survived touchEnd');

console.log('== aim stick past the fire threshold (right half)');
await waitFor('gun ready', `G.gun === 'READY' && G.shells > 0`, 6000);
const shells0 = await G('G.shells');
const amA = L(760, 300), amB = L(760, 160);   // deflect straight up: aim ~ -PI/2
await b.touch([{ x: amA.x, y: amA.y, id: 2 }], 'touchStart');
await sleep(60);
await b.touch([{ x: amB.x, y: amB.y, id: 2 }], 'touchMove');
let sawPellets = false, sawFire = false;
for (let i = 0; i < 16; i++) {
  const s = await J('({fire: G.sticks.fire, pellets: G.pellets, aim: G.player.aim, shells: G.shells})');
  if (s.fire) sawFire = true;
  if (s.pellets > 0) sawPellets = true;
  if (i === 2 && Math.abs(s.aim + Math.PI / 2) > 0.3) fail('aim did not follow the stick: ' + s.aim.toFixed(2));
  await sleep(50);
}
const shells1 = await G('G.shells');
if (sawFire) ok('aim stick past STICK_FIRE holds the trigger'); else fail('stick deflection never set the fire flag');
if (sawPellets) ok('pellets spawned while the stick was held'); else fail('no pellets from a held aim stick');
if (shells1 < shells0) ok(`shells spent by holding: ${shells0} -> ${shells1}`); else fail(`shells did not drop (${shells0} -> ${shells1})`);
await b.touch([], 'touchEnd');
await sleep(100);
const afterLift = await J('G.sticks');
if (!afterLift.aim && !afterLift.fire) ok('lifting stops the fire but keeps the aim angle: ' + afterLift.aimAngle.toFixed(2));
else fail('aim stick did not clear: ' + JSON.stringify(afterLift));

console.log('== mid-fight frame with both sticks');
await G(`G.spawn('restless', 14)`);
await sleep(500);
await waitFor('gun ready', `G.gun === 'READY' && G.shells > 0`, 6000);
const f1 = L(150, 400), f2 = L(720, 380), f2b = L(660, 250);
await b.touch([{ x: f1.x, y: f1.y, id: 3 }], 'touchStart');
await b.touch([{ x: f1.x + 60, y: f1.y - 40, id: 3 }], 'touchMove');
await b.touch([{ x: f1.x + 60, y: f1.y - 40, id: 3 }, { x: f2.x, y: f2.y, id: 4 }], 'touchStart');
await b.touch([{ x: f1.x + 60, y: f1.y - 40, id: 3 }, { x: f2b.x, y: f2b.y, id: 4 }], 'touchMove');
await sleep(110);
const both = await J('G.sticks');
if (both.move && both.aim) ok('both sticks live at once'); else fail('two fingers did not make two sticks: ' + JSON.stringify(both));
await shot('touch-fight');
await b.touch([], 'touchEnd');
await sleep(150);
checkErrors('sticks');

console.log('== tap the right half = one shot');
await waitFor('gun ready', `G.gun === 'READY' && G.shells > 0`, 8000);
const shellsT = await G('G.shells');
const tp = L(800, 360);
await b.touch([{ x: tp.x, y: tp.y, id: 5 }], 'touchStart');
await sleep(80);
await b.touch([], 'touchEnd');
await sleep(120);
const shellsT2 = await G('G.shells');
if (shellsT2 === shellsT - 1) ok(`a tap fired exactly one shell: ${shellsT} -> ${shellsT2}`);
else fail(`tap-to-fire spent ${shellsT - shellsT2} shells (expected 1)`);

console.log('== pause / mute buttons');
const pb = L(910, 74);
await b.tap(pb.x, pb.y);
await sleep(200);
if (await G(`G.state === 'PAUSED'`)) ok('the pause button paused the run'); else fail('pause button did not pause: ' + (await G('G.state')));
await shot('t2-paused');
await b.tap(c0.x, c0.y);
await sleep(250);
if (await G(`G.state === 'PLAYING'`)) ok('a tap resumed the run'); else fail('tap did not resume: ' + (await G('G.state')));
const mb = L(910 - 68, 74);
const muted0 = await G('G.snapshot().muted');
await b.tap(mb.x, mb.y);
await sleep(200);
const muted1 = await G('G.snapshot().muted');
if (muted1 !== muted0) ok(`the mute button toggled audio (${muted0} -> ${muted1})`); else fail('mute button did nothing');
await b.tap(mb.x, mb.y); await sleep(150);
if (await G(`G.state === 'PLAYING'`)) ok('the buttons eat their own taps (still PLAYING)'); else fail('a button tap leaked into the game');
checkErrors('touch UI');

console.log('== portrait: the rotate prompt');
await b.setViewport({ width: H, height: W, deviceScaleFactor: DSF, mobile: true });
await sleep(600);
const por = await J('({portrait: G.viewport.portrait, prompt: G.rotatePrompt, touch: G.touchMode, state: G.state})');
if (por.portrait && por.prompt) ok('portrait raises the ROTATE prompt: ' + JSON.stringify(por));
else fail('no rotate prompt in portrait: ' + JSON.stringify(por));
const frozen0 = await J('({x: G.player.x, y: G.player.y, enemies: G.enemies})');
await sleep(700);
const frozen1 = await J('({x: G.player.x, y: G.player.y, enemies: G.enemies})');
if (frozen0.x === frozen1.x && frozen0.y === frozen1.y) ok('the sim is frozen behind the prompt');
else fail('the sim kept running in portrait');
await b.screenshot(`${SHOTS}/touch-portrait.png`, { x: 0, y: 0, width: H, height: W });
console.log(`  shot: ${SHOTS}/touch-portrait.png`);

console.log('== back to landscape');
await b.setViewport({ width: W, height: H, deviceScaleFactor: DSF, mobile: true });
await sleep(600);
if (!(await G('G.rotatePrompt'))) ok('the prompt auto-hides in landscape'); else fail('rotate prompt stuck after rotating back');
vp = await J('G.viewport');
const resumed = await J('({x: G.player.x})');
await sleep(400);
if ((await G('G.state')) === 'PLAYING') ok('the run survived the rotation (state PLAYING, x ' + Math.round(resumed.x) + ')');
else fail('lost the run on rotation: ' + (await G('G.state')));
checkErrors('rotation');

console.log('== a mouse move hands control back to the desktop path');
await sleep(800);   // past TOUCH_MOUSE_LOCK
await b.mouseMove(300, 200);
await b.mouseMove(320, 210);
await sleep(150);
if ((await G('G.touchMode')) === false) ok('a real mouse move clears touchMode'); else fail('touchMode stuck on after a mouse move');
checkErrors('mouse handback');

await b.close();
console.log(fails.length ? `\n${fails.length} FAILURE(S):\n - ` + fails.join('\n - ') : '\nALL TOUCH SMOKE CHECKS PASSED');
process.exit(fails.length ? 1 : 0);
