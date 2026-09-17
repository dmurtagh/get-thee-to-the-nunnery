// tools/lb-smoke.mjs — headless test for THE HOLY ORDER (the Firestore REST leaderboard).
// Usage: node tools/lb-smoke.mjs [path/to/index.html] [--shots DIR] [--live]
//
// The board only exists over http(s), so this serves index.html from a throwaway localhost server
// and installs a fetch MOCK (Page.addScriptToEvaluateOnNewDocument) that answers :runQuery with a
// canned top ten, :runAggregationQuery with a canned count, and records every submit POST.
//
// It checks: the title panel, the twelve-character name field on the keyboard AND on the phone
// (where the ONLY thing that mirrors is the `input` event — a virtual keyboard's keydown is 229),
// the keyboard-aware layout, one POST per run with a name the server regex will accept, the exact
// rank from the aggregation call, the board on the game-over card with the player's row picked out,
// the TITLE pill, the "no entry for a small score" rule, the skip path, and that offline is silent.
// --live skips the mock and talks to the real backend.
import { launch, sleep } from './cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const html = resolve(args.find((a) => !a.startsWith('--')) || 'index.html');
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const SHOTS = resolve(opt('--shots', 'tools/shots'));
mkdirSync(SHOTS, { recursive: true });

// the server rule, verbatim: the client must never send anything this would bounce
const SERVER_RE = /^[A-Z0-9][A-Z0-9 ]{0,11}$/;

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
// so the board the game reads back after a submit is the board a real backend would have given it.
// The aggregation query always answers 36, so the exact rank must come out as #37.
// [name, score, wave, c] - c is 0 (nun), 1 (priest) or null for a row written before characters
// existed, which must read as a SISTER. Two rows carry a title of their own and must keep it.
const CANNED = [
  ['ROS', 98450, 11, 1], ['GUILDENSTERN', 87310, 10, 0], ['OPH', 76220, 10, 1], ['HAM', 64100, 9, 0], ['LAE', 51880, 8, null],
  ['FR BERNARDO', 42330, 7, 1], ['HOR', 31200, 6, 1], ['FOR', 18770, 5, 0], ['MOTHER GERT', 9410, 4, 0], ['BER', 1000, 2, 1],
];
const AGG_COUNT = 36;
const MOCK = `
window.__lb = { posts: [], queries: 0, aggs: [], submits: [], urls: [] };
window.__realFetch = window.fetch;
const CANNED = ${JSON.stringify(CANNED)};
const reply = (o, status) => Promise.resolve(new Response(JSON.stringify(o), { status: status || 200, headers: { 'Content-Type': 'application/json' } }));
window.fetch = function (u, o) {
  u = String(u);
  window.__lb.urls.push(u);
  if (u.indexOf(':runAggregationQuery') >= 0) {
    window.__lb.aggs.push({ url: u, body: JSON.parse(o.body) });
    return reply([{ result: { aggregateFields: { c: { integerValue: '${AGG_COUNT}' } } }, readTime: '1970-01-01T00:00:00Z' }]);
  }
  if (u.indexOf(':runQuery') >= 0) {
    window.__lb.queries++;
    const rows = CANNED.map((r) => ({ name: r[0], score: r[1], wave: r[2], c: r[3] })).concat(window.__lb.submits)
      .sort((a, b) => b.score - a.score).slice(0, 10)
      .map((r) => { const f = {
        name: { stringValue: r.name }, score: { integerValue: String(r.score) },
        wave: { integerValue: String(r.wave) }, v: { integerValue: '1' } };
        if (r.c === 0 || r.c === 1) f.c = { integerValue: String(r.c) };
        return { document: { name: 'documents/scores/x', fields: f } }; });
    rows.push({ readTime: '1970-01-01T00:00:00Z' });   // a row with no document: the parser must skip it
    return reply(rows);
  }
  if (/\\/documents\\/[A-Za-z0-9_]+\\?key=/.test(u)) {
    const b = JSON.parse(o.body);
    window.__lb.posts.push({ url: u, body: b, raw: String(o.body) });
    window.__lb.submits.push({ name: b.fields.name.stringValue, score: +b.fields.score.integerValue, wave: +b.fields.wave.integerValue, c: b.fields.c ? +b.fields.c.integerValue : null });
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
  // put a value into the hidden <input> exactly the way a virtual keyboard does: no keydown at all,
  // just the element's value and one `input` event.
  const typeInput = async (value) => {
    await b.eval(`(() => { const el = document.activeElement; el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(200);
  };
  return { G, J, shot, checkErrors, waitFor, typeInput };
}

// =====================================================================================
// 1. DESKTOP: the title panel, the name field, the keyboard path, the board on the card
// =====================================================================================
const W = 1280, H = 720;
const b = await launch({ width: W, height: H });
{
  const { G, J, shot, checkErrors, waitFor } = bind(b);
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: MOCK });
  await b.goto(URL);
  await sleep(900);
  checkErrors('load');

  console.log('== the title shows THE HOLY ORDER');
  if (!(await G(`G.state === 'TITLE'`))) fail('not on the title');
  const lb = await J('G.leaderboard');
  if (lb.available) ok('GAME.leaderboard.available over http'); else fail('leaderboard unavailable over http: ' + JSON.stringify(lb));
  if (lb.top && lb.top.length === 10) ok('the top ten came back: ' + lb.top.map((r) => r.name).join(','));
  else fail('GAME.leaderboard.top is not ten rows: ' + JSON.stringify(lb.top));
  if (lb.top && lb.top[0].name === 'ROS' && lb.top[0].score === 98450 && lb.top[0].wave === 11 && lb.top[0].c === 1) ok('row 1 parsed: ROS 98,450 W11, c 1');
  else fail('row 1 parsed wrong: ' + JSON.stringify(lb.top && lb.top[0]));
  if (lb.top && lb.top[1].name === 'GUILDENSTERN') ok('a twelve-character name survives the parser: GUILDENSTERN');
  else fail('a long name did not survive parseRows: ' + JSON.stringify(lb.top && lb.top[1]));
  if (lb.lastError === null) ok('no lastError'); else fail('lastError set: ' + lb.lastError);
  await shot('lb2-title');

  console.log('== the name rules match the server regex ^[A-Z0-9][A-Z0-9 ]{0,11}$');
  const cases = [
    ['sister mary  9x!', 'SISTER MARY'],
    ['   leading', 'LEADING'],
    ['a', 'A'],
    ['abcdefghijklmnop', 'ABCDEFGHIJKL'],
    ['o\'hara-smith', 'OHARASMITH'],
  ];
  for (const [raw, want] of cases) {
    const got = await b.eval(`window.GAME.cleanName(${JSON.stringify(raw)})`);
    if (got !== want) { fail(`cleanName(${JSON.stringify(raw)}) = ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); continue; }
    if (!SERVER_RE.test(got)) { fail(`cleanName(${JSON.stringify(raw)}) = ${JSON.stringify(got)} fails the server regex`); continue; }
    ok(`cleanName(${JSON.stringify(raw)}) -> ${JSON.stringify(got)} (server regex ok)`);
  }
  if ((await b.eval(`window.GAME.validName('')`)) === false) ok('the empty name is rejected'); else fail('validName("") was true');

  console.log('== SISTER / FATHER in front of a name (never on the wire, only on the board)');
  for (const [args, want] of [
    [`'DAVE', 1`, 'FATHER DAVE'],
    [`'DAVE', 0`, 'SISTER DAVE'],
    [`'DAVE'`, 'SISTER DAVE'],
    [`'FR DAVE', 0`, 'FR DAVE'],
    [`'SISTER MARY', 1`, 'SISTER MARY'],
    [`'MOTHER GERT', 1`, 'MOTHER GERT'],
    [`'FRIAR TUCK', 0`, 'FRIAR TUCK'],
    [`'SR ANNE', 1`, 'SR ANNE'],
    [`'SISTERS', 1`, 'FATHER SISTERS'],
    [`'dave', 1`, 'FATHER DAVE'],
  ]) {
    const got = await b.eval(`window.GAME.displayName(${args})`);
    if (got === want) ok(`displayName(${args}) -> ${JSON.stringify(got)}`);
    else fail(`displayName(${args}) = ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }

  console.log('== the board draws the mixed titles, and the names still fit the rows');
  {
    const rows = await J('G.leaderboard.top');
    const wantDisplay = ['FATHER ROS', 'SISTER GUILDENSTERN', 'FATHER OPH', 'SISTER HAM', 'SISTER LAE', 'FR BERNARDO', 'FATHER HOR', 'SISTER FOR', 'MOTHER GERT', 'FATHER BER'];
    const got = rows.map((r) => r.display);
    if (JSON.stringify(got) === JSON.stringify(wantDisplay)) ok('the panel reads: ' + got.join(' · '));
    else fail('the board titles are wrong: ' + JSON.stringify(got));
    if (rows[4].c === 0) ok('a row with no c field at all is a SISTER'); else fail('a c-less row came back as ' + rows[4].c);
    // the panel itself, so a human can see that SISTER GUILDENSTERN fits between the rank and the score
    const pr = await J(`G.toScreen(${652 - 8}, ${34 - 8})`);
    await shot('char-board', { x: Math.round(pr.x), y: Math.round(pr.y), width: Math.round(300 * (await J('G.viewport.scale'))), height: Math.round(298 * (await J('G.viewport.scale'))) });
  }

  console.log('== the 60 s cache + in-flight dedupe');
  {
    const q0 = await b.eval('window.__lb.queries');
    await G(`G.startRun()`); await sleep(120);
    await b.eval(`GAME.forceGameOver(0, 1)`); await sleep(120);
    for (let i = 0; i < 3; i++) { await G(`G.refreshLeaderboard(false)`); await sleep(80); }
    const q1 = await b.eval('window.__lb.queries');
    if (q1 === q0) ok(`the cache held: still ${q1} :runQuery call(s)`); else fail(`cache leaked ${q1 - q0} extra queries`);
  }

  console.log('== a qualifying score raises the name entry');
  await b.eval(`GAME.forceGameOver(123456, 7)`);
  await sleep(400);
  const e0 = await J('G.nameEntry');
  if (e0.active) ok('the entry is up, prefilled: ' + JSON.stringify(e0.name)); else fail('no entry UI for 123,456: ' + JSON.stringify(e0));
  if (e0.name === 'SISTER') ok('prefilled from save.playerName: SISTER'); else fail('bad prefill: ' + e0.name);
  const ui = await J('G.entryUI');
  if (ui.field && ui.field.w > 200 && !ui.slots) ok(`one wide field, not three slots: ${ui.field.w}x${ui.field.h}`);
  else fail('the entry is not a single wide field: ' + JSON.stringify(ui));
  await shot('lb2-entry');

  console.log('== desktop typing: letters, digits, a space, backspace, and the 12-char ceiling');
  // one per frame: two keydowns of the SAME code inside one tick are one entry in the pressed Set
  for (let i = 0; i < 8; i++) { await b.press('Backspace', 25); await sleep(45); }
  if ((await G('G.nameEntry.name')) === '') ok('backspace emptied the field'); else fail('backspace left ' + (await G('G.nameEntry.name')));
  await b.press('Space', 30);
  if ((await G('G.nameEntry.name')) === '') ok('a leading space is refused'); else fail('a leading space got in');
  for (const c of 'ABCDEFGHIJKLMN') await b.press(c >= '0' && c <= '9' ? 'Digit' + c : 'Key' + c, 25);
  const capped = await G('G.nameEntry.name');
  if (capped === 'ABCDEFGHIJKL') ok('typing past twelve is ignored: ' + capped); else fail('the 12-char ceiling leaked: ' + capped);
  for (let i = 0; i < 6; i++) { await b.press('Backspace', 25); await sleep(45); }
  await b.press('Space', 30);
  await b.press('Digit9', 30);
  const spaced = await G('G.nameEntry.name');
  if (spaced === 'ABCDEF 9' && SERVER_RE.test(spaced)) ok('a single interior space and a digit: ' + spaced);
  else fail('space/digit typing gave ' + JSON.stringify(spaced));

  console.log('== ESC skips, sends nothing, and the board takes the card');
  await b.press('Escape');
  await sleep(900);   // the card holds still for LB_ENTRY_LOCK so the Esc that skipped is not a retry
  const sk = await J('G.nameEntry');
  if (!sk.active && sk.done && !sk.sent) ok('skipped: done, never sent'); else fail('bad skip state: ' + JSON.stringify(sk));
  if ((await b.eval('window.__lb.posts.length')) === 0) ok('ESC sent nothing'); else fail('the skip posted something');
  const card = await J('G.endCard');
  if (card.board) ok('the board is on the game-over card straight after a skip'); else fail('no board after a skip');
  if (card.highlight === -1) ok('nothing is highlighted (she never submitted)'); else fail('a row is lit after a skip: ' + card.highlight);
  if (card.rect.y + card.rect.h <= 540 && card.rect.y > 100) ok(`the board fits the 960x540 card: y ${card.rect.y}..${card.rect.y + card.rect.h}`);
  else fail('the board does not fit the card: ' + JSON.stringify(card.rect));
  checkErrors('desktop entry');

  console.log('== the TITLE pill, and Esc, go back to the board on the poster');
  const tp = card.titlePill;
  const sp = await J(`G.toScreen(${tp.x + tp.w / 2}, ${tp.y + tp.h / 2})`);
  await b.click(sp.x, sp.y);
  await sleep(350);
  if (await G(`G.state === 'TITLE'`)) ok('the TITLE pill went back to the title'); else fail('the TITLE pill did nothing: ' + (await G('G.state')));
  await b.eval(`GAME.forceGameOver(400, 2)`); await sleep(300);
  await b.press('Escape'); await sleep(300);
  if (await G(`G.state === 'TITLE'`)) ok('Esc on the game-over card goes to the title too'); else fail('Esc did not reach the title: ' + (await G('G.state')));

  console.log('== a small score gets no entry, but still gets the board');
  await b.eval(`GAME.forceGameOver(500, 2)`);
  await sleep(400);
  const small = await J('G.nameEntry');
  const board = await J('G.leaderboard.top');
  if (!small.active) ok(`no entry for 500 (10th is ${board[9].score}, best is 123,456)`); else fail('entry shown for a 500-point run');
  if (await G('G.endCard.board')) ok('...and the board is drawn immediately'); else fail('no board when no entry was offered');
  if ((await b.eval('window.__lb.posts.length')) === 0) ok('nothing has been sent all session'); else fail('something was posted');

  console.log('== FATHER HORATIO puts c = 1 on the wire');
  {
    const before = await b.eval('window.__lb.posts.length');
    await b.eval(`GAME.character = 'priest'`);
    if ((await G('G.character')) === 'priest') ok('GAME.character = priest'); else fail('the character did not change');
    const sent = await b.eval(`window.GAME.submitScore('LATIN PADRE', 4321, 6)`);
    if (sent === true) ok('the submit resolved true'); else fail('the priest submit resolved ' + sent);
    const posts = await b.eval('JSON.stringify(window.__lb.posts)').then(JSON.parse);
    const last = posts[posts.length - 1];
    if (posts.length === before + 1) ok('exactly one more POST'); else fail(`${posts.length - before} POSTs for one submit`);
    if (last && last.raw.indexOf('"c":{"integerValue":"1"}') >= 0) ok('the body carries "c":{"integerValue":"1"}');
    else fail('no priest flag in the body: ' + (last && last.raw));
    // ...and back to the nun, which is a 0 and not a missing field
    await b.eval(`GAME.character = 'nun'`);
    await b.eval(`window.GAME.submitScore('PLAIN SISTER', 4320, 6)`);
    await sleep(200);
    const p2 = await b.eval('JSON.stringify(window.__lb.posts)').then(JSON.parse);
    const nun = p2[p2.length - 1];
    if (nun && nun.raw.indexOf('"c":{"integerValue":"0"}') >= 0) ok('...and the nun sends "c":{"integerValue":"0"}');
    else fail('the nun flag is wrong: ' + (nun && nun.raw));
    if ((await b.eval(`window.GAME.displayName('LATIN PADRE', 1)`)) === 'FATHER LATIN PADRE') ok('the board will call him FATHER LATIN PADRE');
    else fail('bad display for the priest row');
    await b.eval(`GAME.refreshLeaderboard(true)`);
    await sleep(400);
  }

  console.log('== a run worth nothing never asks for a name');
  await b.eval(`GAME.forceGameOver(0, 1)`);
  await sleep(250);
  if (!(await G('G.nameEntry.active'))) ok('no entry for a zero score'); else fail('entry shown for 0 points');
  await b.click(W / 2, H - 60);
  await sleep(300);
  if (await G(`G.state === 'PLAYING'`)) ok('a click still retries'); else fail('retry broke: ' + (await G('G.state')));
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
  await b.eval(`GAME.forceGameOver(123456, 7)`); await sleep(300);
  if (!(await G('G.nameEntry.active'))) ok('no entry to offer with no board to reach'); else fail('the entry came up offline');
  await shot('lb2-offline');
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
// 3. TOUCH: the phone path. Tap the field -> the hidden <input> takes focus -> `input` events
//    mirror -> the keyboard-aware layout -> Enter ("done") submits -> the rank and the board.
// =====================================================================================
{
  const TW = 844, TH = 390;
  const t = await launch({ width: TW, height: TH, deviceScaleFactor: 3, mobile: true, touch: true });
  const { G, J, shot, checkErrors, waitFor, typeInput } = bind(t);
  const clip = { x: 0, y: 0, width: TW, height: TH };
  await t.send('Page.addScriptToEvaluateOnNewDocument', { source: MOCK });
  await t.goto(URL);
  await sleep(900);
  console.log('== phone: the title panel and the buttons that must not sit on it');
  if (await G('G.touchMode')) ok('booted into touch mode'); else fail('not in touch mode on a phone viewport');
  const btns = await J('G.touchButtons.map((x) => ({ id: x.id, L: G.toLogical(x.x, x.y) }))');
  const panel = { x: 652, y: 34, w: 284, h: 282 };
  const clash = btns.filter((x) => x.L.x > panel.x - 34 && x.L.x < panel.x + panel.w + 34 && x.L.y > panel.y - 34 && x.L.y < panel.y + panel.h + 34);
  if (!clash.length) ok('the title buttons clear the board: ' + btns.map((x) => x.id + '@' + Math.round(x.L.x)).join(' '));
  else fail('a button sits on the board: ' + JSON.stringify(clash));
  if ((await J('G.leaderboard.top')).length === 10) ok('ten rows on the phone too'); else fail('phone board did not load');
  await shot('lb2-title-touch', clip);
  checkErrors('phone load');

  console.log('== phone: a qualifying run raises the entry');
  await t.eval(`GAME.forceGameOver(123456, 7)`);
  await sleep(400);
  if (await G('G.nameEntry.active')) ok('the entry is up'); else fail('no entry on the phone');
  await shot('lb2-entry-touch', clip);

  console.log('== tapping the field focuses the hidden <input>');
  const ui = await J('G.entryUI');
  const f = ui.field;
  const p = await J(`G.toScreen(${f.x + f.w / 2}, ${f.y + f.h / 2})`);
  await t.tap(p.x, p.y);
  await sleep(300);
  const act = await t.eval('document.activeElement ? document.activeElement.tagName : "none"');
  if (act === 'INPUT') ok('document.activeElement is the hidden INPUT (the keyboard would be up)');
  else fail('the tap did not focus an input, activeElement = ' + act);
  const box = await t.eval(`JSON.stringify((() => { const el = document.activeElement, r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), max: el.getAttribute('maxlength'), cap: el.getAttribute('autocapitalize'), auto: el.getAttribute('autocomplete'), corr: el.getAttribute('autocorrect'), spell: el.getAttribute('spellcheck'), hint: el.getAttribute('enterkeyhint') }; })())`).then(JSON.parse);
  const want = await J(`G.toScreen(${f.x}, ${f.y})`);
  if (Math.abs(box.x - want.x) <= 2 && Math.abs(box.y - want.y) <= 2 && box.w > 40 && box.h > 20)
    ok('it is parked over the drawn field: ' + JSON.stringify({ x: box.x, y: box.y, w: box.w, h: box.h }));
  else fail('the input is not over the field: ' + JSON.stringify(box) + ' want ' + JSON.stringify(want));
  if (box.max === '12' && box.cap === 'characters' && box.auto === 'off' && box.corr === 'off' && box.spell === 'false' && box.hint === 'done')
    ok('maxlength=12, autocapitalize=characters, autocomplete/autocorrect off, spellcheck false, enterkeyhint=done');
  else fail('bad input attributes: ' + JSON.stringify(box));

  console.log('== an `input` event (and nothing else) drives the field');
  await typeInput('sister mary  9x!');
  const mir = await J('G.nameEntry');
  if (mir.name.length <= 12) ok(`the field is <= 12 chars: ${JSON.stringify(mir.name)} (${mir.name.length})`);
  else fail('the field is ' + mir.name.length + ' chars: ' + JSON.stringify(mir.name));
  if (mir.name === 'SISTER MARY ') ok('uppercased, filtered, the double space collapsed, truncated at 12');
  else fail('mirroring gave ' + JSON.stringify(mir.name) + ', want "SISTER MARY "');
  const elv = await t.eval('document.activeElement.value');
  if (elv === mir.name) ok('the cleaned value was written back into the element: ' + JSON.stringify(elv));
  else fail('element value ' + JSON.stringify(elv) + ' != field ' + JSON.stringify(mir.name));
  const caret = await t.eval('document.activeElement.selectionStart');
  if (caret === elv.length) ok('the caret stayed at the end (' + caret + ')'); else fail('the caret jumped to ' + caret);
  const cleaned = await t.eval(`window.GAME.cleanName(window.GAME.nameEntry.name)`);
  if (SERVER_RE.test(cleaned)) ok(`what will go on the wire is ${JSON.stringify(cleaned)} and the server regex accepts it`);
  else fail(`${JSON.stringify(cleaned)} would be refused by ^[A-Z0-9][A-Z0-9 ]{0,11}$`);
  await shot('lb2-entry-touch-typed', clip);

  console.log('== the keyboard-aware layout: the entry moves into what is left of the screen');
  const kb = await J(`G.debugKeyboardRect(150)`);
  if (kb.on && kb.layout) ok('a 150 px visible viewport (of ' + (await G('G.keyboard.layoutH')) + ') reads as keyboard-up');
  else fail('a shrunken visual viewport did not register: ' + JSON.stringify(kb));
  await sleep(250);
  const L = await J('G.keyboard.layout');
  if (L) {
    const bottom = Math.max(L.field.y + L.field.h, L.submit.y + L.submit.h, L.skip.y + L.skip.h);
    if (L.field.y >= 150 - 150 && bottom <= 150) ok(`the whole block sits inside the visible 150 px: title ${Math.round(L.titleY)}, field ${Math.round(L.field.y)}, pills to ${Math.round(bottom)}`);
    else fail('the block runs past the visible area: ' + JSON.stringify(L));
    if (Math.abs((L.field.x + L.field.w / 2) - TW / 2) <= 2) ok('centred horizontally');
    else fail('not centred: field cx ' + (L.field.x + L.field.w / 2) + ' of ' + TW);
    if (L.field.y - L.rect.y <= 40) ok(`stacked from the top of the visible area (${Math.round(L.field.y - L.rect.y)} px in)`);
    else fail('the block is not stacked from the top: ' + JSON.stringify(L.field));
    const ibox = await t.eval(`JSON.stringify((() => { const el = document.querySelector('input'), r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }; })())`).then(JSON.parse);
    if (Math.abs(ibox.x - L.field.x) <= 2 && Math.abs(ibox.y - L.field.y) <= 2)
      ok('the hidden input followed the field into the visible area: ' + JSON.stringify(ibox));
    else fail('the input did not follow: ' + JSON.stringify(ibox) + ' vs ' + JSON.stringify(L.field));
  }
  const ovf = await t.eval(`document.documentElement.style.overflow`);
  if (ovf === 'hidden') ok("documentElement.style.overflow is pinned to 'hidden'"); else fail('overflow is ' + JSON.stringify(ovf));
  await shot('lb2-keyboard', clip);
  await t.eval(`GAME.debugKeyboardRect(0)`);
  await sleep(200);
  if (!(await G('G.keyboard.entryUp'))) ok('the block returns to the card when the keyboard closes');
  else fail('the block is still in screen space with the keyboard down');
  checkErrors('keyboard layout');

  console.log('== Enter on the keyboard submits exactly one document');
  await t.eval(`document.querySelector('input').focus()`);
  await sleep(120);
  await t.press('Enter');
  if (!(await waitFor('the submit to settle', `!G.nameEntry.pending && G.nameEntry.msg`, 8000))) { /* reported */ }
  await sleep(300);
  const posts = await t.eval('JSON.stringify(window.__lb.posts)').then(JSON.parse);
  if (posts.length === 1) ok('exactly one POST'); else fail(`${posts.length} POST(s), expected 1`);
  if (posts[0]) {
    const fl = posts[0].body.fields;
    const got = { name: fl.name && fl.name.stringValue, score: fl.score && fl.score.integerValue, wave: fl.wave && fl.wave.integerValue, v: fl.v && fl.v.integerValue, c: fl.c && fl.c.integerValue };
    const wantDoc = { name: 'SISTER MARY', score: '123456', wave: '7', v: '1', c: '0' };
    if (JSON.stringify(got) === JSON.stringify(wantDoc)) ok('the document is exactly ' + JSON.stringify(got));
    else fail('wrong fields: ' + JSON.stringify(got) + ' want ' + JSON.stringify(wantDoc));
    if (SERVER_RE.test(got.name)) ok('the submitted name passes the server regex'); else fail('the submitted name would be refused: ' + got.name);
    if (Object.keys(fl).length === 5) ok('five fields and no more'); else fail('extra fields: ' + Object.keys(fl).join(','));
    if (/\/documents\/scores\?key=/.test(posts[0].url)) ok('POSTed to /documents/scores?key=');
    else fail('wrong submit URL: ' + posts[0].url);
  }
  const hidden = await t.eval(`(() => { const el = document.querySelector('input'); return el ? el.style.display + '/' + String(document.activeElement === el) : 'gone'; })()`);
  if (hidden === 'none/false') ok('the hidden input is blurred and put away'); else fail('the input is still live: ' + hidden);

  console.log('== the exact rank comes from one :runAggregationQuery');
  const aggs = await t.eval('JSON.stringify(window.__lb.aggs)').then(JSON.parse);
  if (aggs.length === 1) ok('exactly one aggregation call'); else fail(`${aggs.length} aggregation call(s), expected 1`);
  if (aggs[0]) {
    if (/firestore\.googleapis\.com/.test(aggs[0].url) && /:runAggregationQuery\?key=/.test(aggs[0].url)) ok('...to the same host: ' + aggs[0].url.split('?')[0].split('/v1')[1]);
    else fail('bad aggregation URL: ' + aggs[0].url);
    const q = aggs[0].body.structuredAggregationQuery;
    const ff = q && q.structuredQuery && q.structuredQuery.where && q.structuredQuery.where.fieldFilter;
    if (ff && ff.op === 'GREATER_THAN' && ff.field.fieldPath === 'score' && ff.value.integerValue === '123456') ok('it counts scores GREATER_THAN 123456');
    else fail('bad aggregation body: ' + JSON.stringify(aggs[0].body));
    if (q && q.aggregations && q.aggregations[0].alias === 'c' && q.aggregations[0].count) ok('one count aggregation aliased c');
    else fail('bad aggregations: ' + JSON.stringify(q && q.aggregations));
  }
  const placed = await J('G.nameEntry');
  if (placed.msg === 'YOU PLACED #37 IN THE HOLY ORDER') ok('the card says: ' + placed.msg);
  else fail(`bad rank line ${JSON.stringify(placed.msg)} (count ${AGG_COUNT} must give #${AGG_COUNT + 1})`);
  if (placed.rank === AGG_COUNT + 1) ok('rank ' + placed.rank + ' = the server count + 1'); else fail('rank ' + placed.rank);
  if ((await G('G.playerName')) === 'SISTER MARY') ok('save.playerName remembered SISTER MARY'); else fail('the name was not saved: ' + (await G('G.playerName')));

  console.log('== the board is on the game-over card with her row lit');
  const card = await J('G.endCard');
  const top = await J('G.leaderboard.top');
  if (card.board) ok('the board is drawn on the card'); else fail('no board after a submit');
  if (card.highlight === 0 && top[0].name === 'SISTER MARY' && top[0].score === 123456)
    ok('her row is row 1 and it is the highlighted one');
  else fail(`highlight ${card.highlight}, row 1 is ${JSON.stringify(top[0])}`);
  if (card.rankLine === placed.msg) ok('the rank line is drawn under the board');
  else fail('rank line mismatch: ' + JSON.stringify(card.rankLine));
  if (card.rect.y + card.rect.h <= 540) ok(`everything fits 960x540: board to y ${card.rect.y + card.rect.h}, rank/pills below`);
  else fail('the board overflows the card: ' + JSON.stringify(card.rect));
  await shot('lb2-gameover', clip);
  checkErrors('touch submit');

  console.log('== the TITLE pill on the phone');
  const tp2 = card.titlePill;
  const sp2 = await J(`G.toScreen(${tp2.x + tp2.w / 2}, ${tp2.y + tp2.h / 2})`);
  await t.tap(sp2.x, sp2.y);
  await sleep(400);
  if (await G(`G.state === 'TITLE'`)) ok('a tap on TITLE goes back to the poster board');
  else fail('the TITLE pill did nothing on touch: ' + (await G('G.state')));

  console.log('== SKIP still sends nothing, even with the input focused');
  await t.eval(`GAME.forceGameOver(300000, 9)`);
  await sleep(400);
  if (await G('G.nameEntry.active')) ok('a new personal best raises the entry again'); else fail('no entry for 300,000');
  const ui2 = await J('G.entryUI');
  const fp = await J(`G.toScreen(${ui2.field.x + ui2.field.w / 2}, ${ui2.field.y + ui2.field.h / 2})`);
  await t.tap(fp.x, fp.y); await sleep(250);
  await typeInput('nope');
  const kp = await J(`G.toScreen(${ui2.skip.x + ui2.skip.w / 2}, ${ui2.skip.y + ui2.skip.h / 2})`);
  await t.tap(kp.x, kp.y);
  await sleep(900);   // ...and the same beat before the card will listen for a retry again
  const sk2 = await J('G.nameEntry');
  if (!sk2.active && sk2.done && !sk2.sent) ok('SKIP skipped, even though the blur fires a change event');
  else fail('SKIP did the wrong thing: ' + JSON.stringify(sk2));
  if ((await t.eval('window.__lb.posts.length')) === 1) ok('still exactly one POST this session');
  else fail('SKIP posted something: ' + (await t.eval('window.__lb.posts.length')));
  await t.tap(TW / 2, TH - 40);
  await sleep(400);
  if (await G(`G.state === 'PLAYING'`)) ok('a tap retries straight after a skip'); else fail('the card is stuck: ' + (await G('G.state')));
  checkErrors('touch');
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

  console.log('== LIVE: write a twelve-character name into scores_test');
  await l.eval(`GAME.leaderboardCollection = 'scores_test'`);
  const sent = await l.eval(`window.GAME.submitScore('LIVE TEST', 2, 1)`);
  if (sent === true) ok("GAME.submitScore('LIVE TEST', 2, 1) resolved true (the CREATE was accepted)");
  else fail("GAME.submitScore('LIVE TEST', 2, 1) resolved " + sent + ' — lastError ' + (await G('G.leaderboard.lastError')));
  console.log('== LIVE: and one from FATHER HORATIO, with the character flag on it');
  await l.eval(`GAME.character = 'priest'`);
  const padre = await l.eval(`window.GAME.submitScore('LIVE PADRE', 4, 1)`);
  if (padre === true) ok("GAME.character='priest'; GAME.submitScore('LIVE PADRE', 4, 1) resolved true");
  else fail("the priest's CREATE was refused: " + padre + ' - lastError ' + (await G('G.leaderboard.lastError')));
  await l.eval(`GAME.character = 'nun'`);
  await l.eval(`GAME.refreshLeaderboard(true)`);
  await waitFor('the test board to come back', `G.leaderboard.top !== null`, 8000);
  console.log('  scores_test (through the game) = ' + JSON.stringify(await J('G.leaderboard.top')));
  checkErrors('live write');
  await l.close();

  // ...and independently, straight from Node: the row, and the aggregation endpoint the rank uses
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
  const mine = docs.filter((d) => d.document.fields.name.stringValue === 'LIVE TEST');
  if (mine.length) ok(`the LIVE TEST row is on the server: ${JSON.stringify(mine[mine.length - 1].document.fields)}`);
  else fail('no LIVE TEST row in scores_test');
  const padreRows = docs.filter((d) => d.document.fields.name.stringValue === 'LIVE PADRE');
  const withC = padreRows.filter((d) => d.document.fields.c && d.document.fields.c.integerValue === '1');
  if (withC.length) ok(`the LIVE PADRE row went in with c = 1: ${JSON.stringify(withC[withC.length - 1].document.fields)}`);
  else fail('no LIVE PADRE row with c = 1 in scores_test (rows seen: ' + padreRows.length + ')');

  const a = await fetch(`${BASE}:runAggregationQuery?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: 'scores_test' }], where: { fieldFilter: { field: { fieldPath: 'score' }, op: 'GREATER_THAN', value: { integerValue: '1' } } } }, aggregations: [{ alias: 'c', count: {} }] } }),
  });
  if (a.ok) {
    const j = await a.json();
    const cnt = j && j[0] && j[0].result && j[0].result.aggregateFields && j[0].result.aggregateFields.c;
    if (cnt) ok(`the live :runAggregationQuery answers count = ${cnt.integerValue} (rank would be ${+cnt.integerValue + 1})`);
    else fail('the live aggregation came back in an unexpected shape: ' + JSON.stringify(j).slice(0, 200));
  } else fail(`the live aggregation query failed: HTTP ${a.status}`);
}

srv.close();
console.log(fails.length ? `\n${fails.length} FAILURE(S):\n - ` + fails.join('\n - ') : '\nALL LEADERBOARD CHECKS PASSED');
process.exit(fails.length ? 1 : 0);
