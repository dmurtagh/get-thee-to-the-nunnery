// tools/lb-smoke.mjs — headless test for THE PLAYBILL (the Firestore REST leaderboard).
// Usage: node tools/lb-smoke.mjs [path/to/index.html] [--shots DIR] [--live]
//
// The board only exists over http(s), so this serves index.html from a throwaway localhost server
// and installs a fetch MOCK (Page.addScriptToEvaluateOnNewDocument) that answers :runQuery with a
// canned top ten and records every submit POST. Checks the title panel, the arcade initials entry
// on both the keyboard and the touch path, the "no entry for a small score" rule, the skip path,
// and that going offline is silent. --live skips the mock and talks to the real backend.
import { launch, sleep } from './cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const html = resolve(args.find((a) => !a.startsWith('--')) || 'index.html');
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const SHOTS = resolve(opt('--shots', 'tools/shots'));
mkdirSync(SHOTS, { recursive: true });

const fails = [];
const fail = (msg) => { fails.push(msg); console.log('  FAIL: ' + msg); };
const ok = (msg) => console.log('  ok: ' + msg);

// ---- the page has to come off http(s): file:// has no leaderboard at all, by design
const body = readFileSync(html);
const srv = createServer((q, s) => { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); s.end(body); });
srv.listen(0, '127.0.0.1');
await new Promise((r) => srv.on('listening', r));
const URL = `http://127.0.0.1:${srv.address().port}/index.html`;
console.log('== serving ' + html + ' at ' + URL);

// ---- the mock. Ten canned rows; every submit is recorded AND folded back into the query result,
// so the rank the game reads back after a submit is the rank a real backend would have given it.
const CANNED = [
  ['ROS', 98450, 11], ['GUI', 87310, 10], ['OPH', 76220, 10], ['HAM', 64100, 9], ['LAE', 51880, 8],
  ['POL', 42330, 7], ['HOR', 31200, 6], ['FOR', 18770, 5], ['MAR', 9410, 4], ['BER', 1000, 2],
];
const MOCK = `
window.__lb = { posts: [], queries: 0, submits: [], urls: [] };
window.__realFetch = window.fetch;
const CANNED = ${JSON.stringify(CANNED)};
const reply = (o, status) => Promise.resolve(new Response(JSON.stringify(o), { status: status || 200, headers: { 'Content-Type': 'application/json' } }));
window.fetch = function (u, o) {
  u = String(u);
  window.__lb.urls.push(u);
  if (u.indexOf(':runQuery') >= 0) {
    window.__lb.queries++;
    const rows = CANNED.map((r) => ({ name: r[0], score: r[1], wave: r[2] })).concat(window.__lb.submits)
      .sort((a, b) => b.score - a.score).slice(0, 10)
      .map((r) => ({ document: { name: 'documents/scores/x', fields: {
        name: { stringValue: r.name }, score: { integerValue: String(r.score) },
        wave: { integerValue: String(r.wave) }, v: { integerValue: '1' } } } }));
    rows.push({ readTime: '1970-01-01T00:00:00Z' });   // a row with no document: the parser must skip it
    return reply(rows);
  }
  if (/\\/documents\\/[A-Za-z0-9_]+\\?key=/.test(u)) {
    const b = JSON.parse(o.body);
    window.__lb.posts.push({ url: u, body: b });
    window.__lb.submits.push({ name: b.fields.name.stringValue, score: +b.fields.score.integerValue, wave: +b.fields.wave.integerValue });
    return reply({ name: 'documents/scores/new', fields: b.fields }, 200);
  }
  return reply({ error: { message: 'unexpected ' + u } }, 404);
};`;
const OFFLINE = `try { Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }); } catch (e) {}`;

// ---- helpers bound to a browser
function bind(b) {
  const G = (expr) => b.eval(`(() => { const G = window.GAME; if (!G) return undefined; return (${expr}); })()`);
  const J = (expr) => b.eval(`JSON.stringify((() => { const G = window.GAME; return (${expr}); })())`).then((s) => JSON.parse(s));
  const shot = async (name, clip) => { const p = `${SHOTS}/${name}.png`; await b.screenshot(p, clip); console.log('  shot: ' + p); return p; };
  const checkErrors = (label) => {
    if (b.errors.length) { fail(`${label}: ${b.errors.length} error(s): ` + b.errors.slice(0, 3).join(' | ')); b.errors.length = 0; }
    else ok(`${label}: no console errors / uncaught rejections`);
  };
  const waitFor = async (label, expr, timeoutMs = 6000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) { if (await G(expr)) return true; await sleep(60); }
    fail(`timeout waiting for ${label} (${expr})`); return false;
  };
  return { G, J, shot, checkErrors, waitFor };
}

// =====================================================================================
// 1. DESKTOP: the title panel, the initials entry, the keyboard path, the rules
// =====================================================================================
const W = 1280, H = 720;
const b = await launch({ width: W, height: H });
{
  const { G, J, shot, checkErrors, waitFor } = bind(b);
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: MOCK });
  await b.goto(URL);
  await sleep(900);
  checkErrors('load');

  console.log('== the title shows THE PLAYBILL');
  if (!(await G(`G.state === 'TITLE'`))) fail('not on the title');
  const lb = await J('G.leaderboard');
  if (lb.available) ok('GAME.leaderboard.available over http'); else fail('leaderboard unavailable over http: ' + JSON.stringify(lb));
  if (lb.top && lb.top.length === 10) ok('the top ten came back: ' + lb.top.map((r) => r.name).join(','));
  else fail('GAME.leaderboard.top is not ten rows: ' + JSON.stringify(lb.top));
  if (lb.top && lb.top[0].name === 'ROS' && lb.top[0].score === 98450 && lb.top[0].wave === 11) ok('row 1 parsed: ROS 98,450 W11');
  else fail('row 1 parsed wrong: ' + JSON.stringify(lb.top && lb.top[0]));
  if (lb.lastError === null) ok('no lastError'); else fail('lastError set: ' + lb.lastError);
  await shot('lb-title');

  console.log('== the 60 s cache + in-flight dedupe');
  {
    const q0 = await b.eval('window.__lb.queries');
    await G(`G.startRun()`); await sleep(120);
    await b.eval(`GAME.forceGameOver(0, 1)`); await sleep(120);
    await b.eval(`(() => { const G = window.GAME; return G.leaderboard.available; })()`);
    // back to the title three times: the cache must answer, not the network
    for (let i = 0; i < 3; i++) { await G(`G.refreshLeaderboard(false)`); await sleep(80); }
    const q1 = await b.eval('window.__lb.queries');
    if (q1 === q0) ok(`the cache held: still ${q1} :runQuery call(s)`); else fail(`cache leaked ${q1 - q0} extra queries`);
  }

  console.log('== a qualifying score raises the initials entry');
  await b.eval(`GAME.forceGameOver(123456, 7)`);
  await sleep(400);
  const e0 = await J('G.nameEntry');
  if (e0.active) ok('the entry is up: ' + JSON.stringify(e0.chars)); else fail('no entry UI for 123,456: ' + JSON.stringify(e0));
  if (e0.name === 'AAA') ok('prefilled from save.initials: AAA'); else fail('bad prefill: ' + e0.name);
  await shot('lb-entry');

  console.log('== type A B C and press Enter');
  await b.press('KeyA'); await sleep(70);
  await b.press('KeyB'); await sleep(70);
  await b.press('KeyC'); await sleep(70);
  const typed = await J('G.nameEntry');
  if (typed.name === 'ABC') ok('the slots read ABC'); else fail('typing gave ' + typed.name);
  await b.press('Enter');
  if (!(await waitFor('the submit to settle', `!G.nameEntry.pending && G.nameEntry.msg`, 6000))) { /* reported */ }
  await sleep(250);

  const posts = await b.eval('JSON.stringify(window.__lb.posts)').then(JSON.parse);
  if (posts.length === 1) ok('exactly one POST'); else fail(`${posts.length} POST(s), expected 1`);
  if (posts[0]) {
    const f = posts[0].body.fields;
    const want = { name: 'ABC', score: '123456', wave: '7', v: '1' };
    const got = { name: f.name && f.name.stringValue, score: f.score && f.score.integerValue, wave: f.wave && f.wave.integerValue, v: f.v && f.v.integerValue };
    if (JSON.stringify(got) === JSON.stringify(want)) ok('the document is exactly ' + JSON.stringify(got));
    else fail('wrong fields: ' + JSON.stringify(got) + ' want ' + JSON.stringify(want));
    if (Object.keys(f).length === 4) ok('four fields and no more'); else fail('extra fields: ' + Object.keys(f).join(','));
    if (/\/documents\/scores\?key=/.test(posts[0].url)) ok('POSTed to /documents/scores?key=');
    else fail('wrong submit URL: ' + posts[0].url);
  }
  const placed = await J('G.nameEntry');
  if (/YOU PLACED #1\b/.test(placed.msg)) ok('the card says: ' + placed.msg); else fail('bad placement line: ' + JSON.stringify(placed));
  if (placed.rank === 1) ok('rank 1 (1 + the count of scores strictly greater)'); else fail('rank ' + placed.rank);
  if ((await G('G.initials')) === 'ABC') ok('save.initials remembered ABC'); else fail('initials not saved: ' + (await G('G.initials')));
  await shot('lb-placed');
  checkErrors('submit');

  console.log('== the retry flow is back');
  await b.click(W / 2, H / 2);
  await sleep(300);
  if (await G(`G.state === 'PLAYING'`)) ok('a click retries once the entry is done'); else fail('still stuck: ' + (await G('G.state')));

  console.log('== a small score gets no entry (under the 10th AND under her own best)');
  await b.eval(`GAME.forceGameOver(500, 2)`);
  await sleep(300);
  const small = await J('G.nameEntry');
  const board = await J('G.leaderboard.top');
  if (!small.active) ok(`no entry for 500 (10th is ${board[9].score}, best is 123,456)`); else fail('entry shown for a 500-point run');
  const n1 = await b.eval('window.__lb.posts.length');
  if (n1 === 1) ok('nothing else was sent'); else fail(`${n1} posts after the small run`);

  console.log('== ESC skips, and sends nothing');
  await b.click(W / 2, H / 2); await sleep(250);
  await b.eval(`GAME.forceGameOver(200000, 9)`);
  await sleep(300);
  if (await G('G.nameEntry.active')) ok('a new personal best raises the entry again'); else fail('no entry for 200,000');
  await b.press('Escape');
  await sleep(300);
  const sk = await J('G.nameEntry');
  const n2 = await b.eval('window.__lb.posts.length');
  if (!sk.active && sk.done && !sk.sent) ok('skipped: done, never sent'); else fail('bad skip state: ' + JSON.stringify(sk));
  if (n2 === 1) ok('ESC sent nothing (still 1 POST total)'); else fail(`skip sent something: ${n2} posts`);
  await b.press('Enter'); await sleep(300);
  if (await G(`G.state === 'PLAYING'`)) ok('the retry flow works straight after a skip'); else fail('skip left the card stuck');
  checkErrors('skip');

  console.log('== a run worth nothing never asks for initials');
  await b.eval(`GAME.forceGameOver(0, 1)`);
  await sleep(250);
  if (!(await G('G.nameEntry.active'))) ok('no entry for a zero score'); else fail('entry shown for 0 points');
  checkErrors('desktop');
}

// =====================================================================================
// 2. OFFLINE: navigator.onLine false, then the host blocked. Both must be silent.
// =====================================================================================
{
  const { G, J, shot, checkErrors } = bind(b);
  console.log('== offline: navigator.onLine === false');
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: OFFLINE });
  await b.goto(URL);
  await sleep(900);
  const off = await J('G.leaderboard');
  if (!off.available && off.status === 'off') ok('the board reads OFFLINE and never dials out');
  else fail('offline board still available: ' + JSON.stringify(off));
  if (off.top === null) ok('top is null'); else fail('top is not null offline');
  const tried = await b.eval('window.__lb ? window.__lb.queries : -1');
  if (tried === 0) ok('zero network calls while offline'); else fail(`${tried} calls made while offline`);
  await shot('lb-offline');
  checkErrors('offline');

  console.log('== the host blocked outright (no mock): errors are swallowed');
  await b.send('Network.enable');
  await b.send('Network.setBlockedURLs', { urls: ['*firestore.googleapis.com*'] });
  await b.goto(URL);   // the OFFLINE + MOCK scripts still run; drop the mock for this one
  await sleep(300);
  await b.eval('window.fetch = window.__realFetch;');   // the real one, which the blocker will refuse
  await b.eval(`Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });`);
  await b.eval('GAME.refreshLeaderboard(true)');
  await sleep(2500);
  const bad = await J('G.leaderboard');
  if (bad.top === null) ok('a blocked host leaves the board empty, not broken'); else fail('rows appeared from a blocked host');
  if (bad.status === 'error' || bad.status === 'off') ok('status = ' + bad.status + ' (the panel draws OFFLINE)');
  else fail('status after a blocked fetch: ' + bad.status);
  // a blocked request logs a Network failure in Chrome's own log, which is not the game's doing:
  // what matters is that the GAME never wrote console.error and never left a rejection unhandled.
  const ours = b.errors.filter((e) => !/net::ERR_BLOCKED_BY_CLIENT|Failed to load resource/i.test(e));
  if (!ours.length) ok('no console.error and no uncaught rejection from the game');
  else fail('the game shouted: ' + ours.slice(0, 3).join(' | '));
  b.errors.length = 0;
  await b.send('Network.setBlockedURLs', { urls: [] });
}
await b.close();

// =====================================================================================
// 3. TOUCH: tap a slot -> the hidden <input> takes focus -> its value mirrors -> SUBMIT
// =====================================================================================
{
  const TW = 844, TH = 390;
  const t = await launch({ width: TW, height: TH, deviceScaleFactor: 3, mobile: true, touch: true });
  const { G, J, shot, checkErrors, waitFor } = bind(t);
  const clip = { x: 0, y: 0, width: TW, height: TH };
  await t.send('Page.addScriptToEvaluateOnNewDocument', { source: MOCK });
  await t.goto(URL);
  await sleep(900);
  console.log('== phone: the title panel and the buttons that must not sit on it');
  if (await G('G.touchMode')) ok('booted into touch mode'); else fail('not in touch mode on a phone viewport');
  const btns = await J('G.touchButtons.map((x) => ({ id: x.id, L: G.toLogical(x.x, x.y) }))');
  const panel = { x: 652, y: 34, w: 284, h: 282 };
  const clash = btns.filter((x) => x.L.x > panel.x - 34 && x.L.x < panel.x + panel.w + 34 && x.L.y > panel.y - 34 && x.L.y < panel.y + panel.h + 34);
  if (!clash.length) ok('the title buttons clear the bill: ' + btns.map((x) => x.id + '@' + Math.round(x.L.x)).join(' '));
  else fail('a button sits on the playbill: ' + JSON.stringify(clash));
  if ((await J('G.leaderboard.top')).length === 10) ok('ten rows on the phone too'); else fail('phone board did not load');
  await shot('lb-title-touch', clip);
  checkErrors('phone load');

  console.log('== phone: a qualifying run raises the entry');
  await t.eval(`GAME.forceGameOver(123456, 7)`);
  await sleep(400);
  if (await G('G.nameEntry.active')) ok('the entry is up'); else fail('no entry on the phone');
  await shot('lb-entry-touch', clip);

  console.log('== tapping a slot focuses the hidden <input>');
  const ui = await J('G.entryUI');
  const s1 = ui.slots[1];
  const p = await J(`G.toScreen(${s1.x + s1.w / 2}, ${s1.y + s1.h / 2})`);
  await t.tap(p.x, p.y);
  await sleep(300);
  const act = await t.eval('document.activeElement ? document.activeElement.tagName : "none"');
  if (act === 'INPUT') ok('document.activeElement is the hidden INPUT (the keyboard would be up)');
  else fail('the tap did not focus an input, activeElement = ' + act);
  const box = await t.eval(`JSON.stringify((() => { const el = document.activeElement, r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), max: el.getAttribute('maxlength'), cap: el.getAttribute('autocapitalize'), auto: el.getAttribute('autocomplete') }; })())`).then(JSON.parse);
  const want = await J(`G.toScreen(${ui.slots[0].x}, ${ui.slots[0].y})`);
  if (Math.abs(box.x - want.x) <= 2 && Math.abs(box.y - want.y) <= 2 && box.w > 40 && box.h > 20)
    ok('it is parked over the slots: ' + JSON.stringify(box));
  else fail('the input is not over the slots: ' + JSON.stringify(box) + ' want ' + JSON.stringify(want));
  if (box.max === '3' && box.cap === 'characters' && box.auto === 'off') ok('maxlength=3, autocapitalize=characters, autocomplete=off');
  else fail('bad input attributes: ' + JSON.stringify(box));

  console.log('== its value mirrors into the slots');
  await t.eval(`(() => { const el = document.activeElement; el.value = 'XYZ'; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(250);
  const mir = await J('G.nameEntry');
  if (mir.name === 'XYZ') ok('the slots read XYZ'); else fail('mirroring failed: ' + JSON.stringify(mir.chars));
  await shot('lb-entry-touch-typed', clip);

  console.log('== tap SUBMIT');
  const sb = await J(`G.toScreen(${ui.submit.x + ui.submit.w / 2}, ${ui.submit.y + ui.submit.h / 2})`);
  await t.tap(sb.x, sb.y);
  await waitFor('the submit to settle', `!G.nameEntry.pending && G.nameEntry.msg`, 6000);
  await sleep(250);
  const tposts = await t.eval('JSON.stringify(window.__lb.posts)').then(JSON.parse);
  if (tposts.length === 1) ok('exactly one POST from the touch path'); else fail(`${tposts.length} POST(s) from a tap`);
  if (tposts[0] && tposts[0].body.fields.name.stringValue === 'XYZ') ok('it carried XYZ');
  else fail('the tap submitted ' + JSON.stringify(tposts[0] && tposts[0].body.fields.name));
  const tmsg = await G('G.nameEntry.msg');
  if (/PLAYBILL/.test(tmsg)) ok('the card says: ' + tmsg); else fail('no placement line: ' + tmsg);
  const hidden = await t.eval(`(() => { const el = document.querySelector('input'); return el ? el.style.display : 'gone'; })()`);
  if (hidden === 'none') ok('the hidden input is put away again'); else fail('the input is still live: ' + hidden);
  await shot('lb-placed-touch', clip);
  checkErrors('touch submit');
  await t.close();
}

// =====================================================================================
// 4. --live: no mock at all. Reads the real board, then writes one row into `scores_test`
//    (never `scores`) and reads it straight back out of Node to prove the round trip.
// =====================================================================================
if (args.includes('--live')) {
  const l = await launch({ width: W, height: H });
  const { G, J, checkErrors, waitFor } = bind(l);
  console.log('== LIVE: the real Firestore backend, no mock');
  await l.goto(URL);
  await sleep(3000);
  const live = await J('G.leaderboard');
  console.log('  GAME.leaderboard = ' + JSON.stringify(live));
  if (live.available) ok('available'); else fail('the live board says unavailable: ' + JSON.stringify(live));
  if (live.status === 'ready' || live.status === 'empty') ok(`the live read came back: status ${live.status}, ${live.top ? live.top.length : 0} row(s)`);
  else fail(`the live read failed: status ${live.status}, lastError ${live.lastError}`);
  checkErrors('live read');

  console.log('== LIVE: write one row into scores_test');
  await l.eval(`GAME.leaderboardCollection = 'scores_test'`);
  const sent = await l.eval(`window.GAME.submitScore('TST', 1, 1)`);
  if (sent === true) ok('GAME.submitScore resolved true (the CREATE was accepted)');
  else fail('GAME.submitScore resolved ' + sent + ' — lastError ' + (await G('G.leaderboard.lastError')));
  await l.eval(`GAME.refreshLeaderboard(true)`);
  await waitFor('the test board to come back', `G.leaderboard.top !== null`, 8000);
  console.log('  scores_test (through the game) = ' + JSON.stringify(await J('G.leaderboard.top')));
  checkErrors('live write');
  await l.close();

  // ...and independently, straight from Node
  const BASE = 'https://firestore.googleapis.com/v1/projects/nunnery-leaderboard-232e/databases/(default)/documents';
  const KEY = 'AIzaSyAut-bwOoEea341fxUBXuyw19eTKYlpt1o';
  const r = await fetch(`${BASE}:runQuery?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'scores_test' }], orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit: 10 } }),
  });
  const rows = r.ok ? await r.json() : null;
  const docs = (rows || []).filter((x) => x.document);
  if (r.ok && docs.length) ok(`read back ${docs.length} row(s) from scores_test over plain Node fetch (HTTP ${r.status})`);
  else fail(`could not read scores_test back: HTTP ${r.status}`);
  const mine = docs.filter((d) => d.document.fields.name.stringValue === 'TST');
  if (mine.length) ok(`the TST row is on the server: ${JSON.stringify(mine[mine.length - 1].document.fields)}`);
  else fail('no TST row in scores_test');
}

srv.close();
console.log(fails.length ? `\n${fails.length} FAILURE(S):\n - ` + fails.join('\n - ') : '\nALL LEADERBOARD CHECKS PASSED');
process.exit(fails.length ? 1 : 0);
