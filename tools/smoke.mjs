// tools/smoke.mjs — headless smoke test for Get Thee To A Nunnery.
// Usage: node tools/smoke.mjs [path/to/index.html] [--shots DIR] [--seconds N]
// Drives the game through window.GAME (debug API) plus real key/mouse events and
// fails loudly on any console error, uncaught exception, softlock, or fps collapse.
import { launch, sleep } from './cdp.mjs';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const html = resolve(args.find((a) => !a.startsWith('--')) || 'index.html');
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const SHOTS = resolve(opt('--shots', 'tools/shots'));
const PLAY_SECONDS = Number(opt('--seconds', 20));
mkdirSync(SHOTS, { recursive: true });

const W = 1280, H = 720;
const b = await launch({ width: W, height: H });
const fails = [];
const fail = (msg) => { fails.push(msg); console.log('  FAIL: ' + msg); };
const ok = (msg) => console.log('  ok: ' + msg);
const shot = async (name) => { const p = `${SHOTS}/${name}.png`; await b.screenshot(p); console.log('  shot: ' + p); };
const G = (expr) => b.eval(`(() => { const G = window.GAME; if (!G) return undefined; return (${expr}); })()`);
async function waitFor(label, expr, timeoutMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { if (await G(expr)) return true; await sleep(50); }
  fail(`timeout waiting for ${label} (${expr})`); return false;
}
const snapshot = () => G(`JSON.stringify({state:G.state, wave:G.wave, score:G.score, hp:G.hp, shells:G.shells, enemies:G.enemies, pellets:G.pellets, particles:G.particleCount, fps:Math.round(G.fps||0)})`);
const checkErrors = (label) => { if (b.errors.length) { fail(`${label}: ${b.errors.length} error(s): ` + b.errors.slice(0, 3).join(' | ')); b.errors.length = 0; } else ok(`${label}: no console errors`); };

console.log('== load ' + html);
await b.goto('file://' + html);
await sleep(600);
await shot('01-title');
checkErrors('load');
if (!(await G('true'))) fail('window.GAME debug API missing');
else ok('window.GAME present: ' + (await snapshot()));

console.log('== start run via click');
await b.click(W / 2, H / 2);
if (await waitFor('PLAYING after click', `G.state === 'PLAYING'`, 4000)) ok('in game after a click');
await sleep(400);
await shot('02-first-seconds');

console.log(`== play randomly for ${PLAY_SECONDS}s`);
const moves = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
let held = null; const fpsSamples = []; let lastState = null;
const t0 = Date.now(); let nextShot = 5000;
while (Date.now() - t0 < PLAY_SECONDS * 1000) {
  const st = await G('G.state');
  if (st !== lastState) { console.log(`  state -> ${st} @${((Date.now() - t0) / 1000).toFixed(1)}s`); lastState = st; }
  if (st === 'UPGRADE') { await b.press('Digit1'); await sleep(120); await b.click(W / 2 - 300, H / 2); continue; }
  if (st === 'GAMEOVER' || st === 'WIN') { await sleep(300); await b.press('Enter'); await b.click(W / 2, H / 2); await sleep(300); continue; }
  if (held) await b.keyUp(held);
  held = moves[Math.floor(Math.random() * moves.length)];
  await b.keyDown(held);
  const mx = W / 2 + (Math.random() - 0.5) * 900, my = H / 2 + (Math.random() - 0.5) * 500;
  await b.mouseMove(mx, my);
  await b.mouseDown(mx, my); await sleep(120 + Math.random() * 200); await b.mouseUp(mx, my);
  const fps = await G('G.fps'); if (typeof fps === 'number') fpsSamples.push(fps);
  if (Date.now() - t0 > nextShot) { await shot(`03-play-${Math.round(nextShot / 1000)}s`); nextShot += 5000; }
}
if (held) await b.keyUp(held);
console.log('  ' + (await snapshot()));
if (fpsSamples.length) {
  const min = Math.min(...fpsSamples), avg = fpsSamples.reduce((a, c) => a + c, 0) / fpsSamples.length;
  console.log(`  fps min ${min.toFixed(0)} avg ${avg.toFixed(0)} (headless; treat as relative)`);
  if (avg < 30) fail(`average fps ${avg.toFixed(0)} too low`);
}
checkErrors('random play');

console.log('== upgrade screen via forceCards');
if (await G(`typeof G.startRun === 'function' && typeof G.forceCards === 'function'`)) {
  await G('G.startRun()'); await sleep(200);
  await G('G.setGod && G.setGod(true)');
  await G('G.forceCards()');
  if (await waitFor('UPGRADE state', `G.state === 'UPGRADE'`, 6000)) {
    await sleep(500); await shot('04-upgrade');
    await b.click(W / 2 - 300, H / 2); await sleep(200);
    if (await G(`G.state === 'UPGRADE'`)) { await b.press('Digit1'); await sleep(200); }
    if (await G(`G.state !== 'UPGRADE'`)) ok('left upgrade screen by picking a card'); else fail('stuck on upgrade screen after click + key 1');
  }
  checkErrors('upgrade');
} else fail('GAME.startRun / GAME.forceCards missing');

console.log('== stress: spawn 80 enemies, fire for 5s');
if (await G(`typeof G.spawn === 'function'`)) {
  await G('G.setGod && G.setGod(true)');
  await G("G.spawn('restless', 80)"); await sleep(300);
  const stressFps = [];
  for (let i = 0; i < 25; i++) { const x = W / 2 + Math.cos(i) * 300, y = H / 2 + Math.sin(i) * 200; await b.mouseMove(x, y); await b.mouseDown(x, y); await sleep(100); await b.mouseUp(x, y); await sleep(100); const f = await G('G.fps'); if (typeof f === 'number') stressFps.push(f); }
  await shot('05-stress');
  console.log('  ' + (await snapshot()));
  if (stressFps.length) console.log(`  stress fps min ${Math.min(...stressFps).toFixed(0)}`);
  checkErrors('stress');
} else fail('GAME.spawn missing');

console.log('== death and restart');
await G('G.setGod && G.setGod(false)');
await G("G.spawn('restless', 40)");
if (await waitFor('GAMEOVER', `G.state === 'GAMEOVER'`, 30000)) {
  await sleep(600); await shot('06-gameover');
  const hi = await G('G.hiScore');
  await b.press('Enter'); await sleep(200);
  if (!(await G(`G.state === 'PLAYING' || G.state === 'TITLE'`))) await b.click(W / 2, H / 2);
  if (await waitFor('restart', `G.state === 'PLAYING' || G.state === 'TITLE'`, 4000)) {
    const s = JSON.parse(await snapshot());
    if (s.state === 'TITLE') { await b.click(W / 2, H / 2); await waitFor('PLAYING after title', `G.state === 'PLAYING'`, 4000); }
    const s2 = JSON.parse(await snapshot());
    if (s2.hp > 0 && (s2.score === 0 || s2.score === undefined) && s2.enemies <= 20) ok('restart reset state: ' + JSON.stringify(s2)); else fail('restart did not reset cleanly: ' + JSON.stringify(s2));
    if (hi !== undefined) ok('hiScore exposed: ' + hi);
  }
  checkErrors('death/restart');
}

console.log('== reload persists high score');
await b.goto('file://' + html); await sleep(500);
const hi2 = await G('G.hiScore');
if (hi2 !== undefined && hi2 !== null) ok('hiScore after reload: ' + hi2); else fail('hiScore missing after reload');
checkErrors('reload');

await b.close();
console.log(fails.length ? `\n${fails.length} FAILURE(S):\n - ` + fails.join('\n - ') : '\nALL SMOKE CHECKS PASSED');
process.exit(fails.length ? 1 : 0);
