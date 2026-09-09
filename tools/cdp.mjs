// tools/cdp.mjs — tiny zero-dependency headless Chrome driver over the DevTools Protocol.
// Used by the playtest/smoke scripts. Requires Node >= 22 (global WebSocket, fetch).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// code -> { key, vk } for Input.dispatchKeyEvent
const KEYS = {};
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') KEYS['Key' + c] = { key: c.toLowerCase(), vk: c.charCodeAt(0) };
for (let d = 0; d <= 9; d++) KEYS['Digit' + d] = { key: String(d), vk: 48 + d };
Object.assign(KEYS, {
  Space: { key: ' ', vk: 32 }, Enter: { key: 'Enter', vk: 13 }, Escape: { key: 'Escape', vk: 27 }, Tab: { key: 'Tab', vk: 9 },
  ArrowUp: { key: 'ArrowUp', vk: 38 }, ArrowDown: { key: 'ArrowDown', vk: 40 }, ArrowLeft: { key: 'ArrowLeft', vk: 37 }, ArrowRight: { key: 'ArrowRight', vk: 39 },
  ShiftLeft: { key: 'Shift', vk: 16 }, ShiftRight: { key: 'Shift', vk: 16 }, ControlLeft: { key: 'Control', vk: 17 }, AltLeft: { key: 'Alt', vk: 18 },
  Backquote: { key: '`', vk: 192 }, Backspace: { key: 'Backspace', vk: 8 }, F1: { key: 'F1', vk: 112 }, F2: { key: 'F2', vk: 113 },
});

export async function launch({ width = 1280, height = 720, port = 9400 + Math.floor(Math.random() * 400), headless = true } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'nunnery-chrome-'));
  const args = [
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-timer-throttling',
    '--autoplay-policy=no-user-gesture-required', `--window-size=${width},${height}`,
    '--hide-scrollbars', '--allow-file-access-from-files', '--mute-audio', 'about:blank',
  ];
  if (headless) args.unshift('--headless=new');
  const proc = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (d) => (stderr += d));

  let targets = null;
  for (let i = 0; i < 150; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await r.json();
      if (list.some((t) => t.type === 'page')) { targets = list; break; }
    } catch {}
    await sleep(100);
  }
  if (!targets) { proc.kill(); throw new Error('Chrome did not start:\n' + stderr); }
  const page = targets.find((t) => t.type === 'page');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = (e) => rej(new Error('ws error')); });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) || []) fn(msg.params);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++nextId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
  });
  const on = (method, fn) => { if (!listeners.has(method)) listeners.set(method, []); listeners.get(method).push(fn); };

  const logs = []; const errors = [];
  on('Runtime.consoleAPICalled', (p) => {
    const text = p.args.map((a) => (a.value !== undefined ? String(a.value) : a.description || '')).join(' ');
    logs.push({ type: p.type, text });
    if (p.type === 'error') errors.push('console.error: ' + text);
  });
  on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text));
  on('Log.entryAdded', (p) => { if (p.entry.level === 'error') errors.push('log: ' + p.entry.text); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  const api = {
    logs, errors, send, on, sleep,
    async goto(url) {
      const loaded = new Promise((r) => on('Page.loadEventFired', r));
      await send('Page.navigate', { url });
      await loaded;
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    },
    async screenshot(path, clip) {
      const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
      writeFileSync(path, Buffer.from(r.data, 'base64'));
      return path;
    },
    async keyDown(code) {
      const k = KEYS[code] || { key: code };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k.key, windowsVirtualKeyCode: k.vk, text: k.key && k.key.length === 1 ? k.key : undefined });
    },
    async keyUp(code) {
      const k = KEYS[code] || { key: code };
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k.key, windowsVirtualKeyCode: k.vk });
    },
    async press(code, ms = 60) { await api.keyDown(code); await sleep(ms); await api.keyUp(code); },
    async mouseMove(x, y, buttons = 0) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons }); },
    async mouseDown(x, y, button = 'left') { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: 1, buttons: button === 'left' ? 1 : 2 }); },
    async mouseUp(x, y, button = 'left') { await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1, buttons: 0 }); },
    async click(x, y, button = 'left') { await api.mouseMove(x, y); await api.mouseDown(x, y, button); await sleep(40); await api.mouseUp(x, y, button); },
    async close() { try { ws.close(); } catch {} proc.kill(); await sleep(150); rmSync(profile, { recursive: true, force: true }); },
  };
  return api;
}
