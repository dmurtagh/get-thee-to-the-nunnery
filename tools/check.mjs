// tools/check.mjs — extract the inline <script> from index.html and syntax-check it with node.
// Also asserts the single-file / strict-CSP / file:// rules from the design doc.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const file = process.argv[2] || 'index.html';
const html = readFileSync(file, 'utf8');
const problems = [];
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
if (scripts.length !== 1) problems.push(`expected exactly 1 <script>, found ${scripts.length}`);
for (const [, attrs] of scripts) { if (/\bsrc=/.test(attrs)) problems.push('external <script src>'); if (/type\s*=\s*["']module/.test(attrs)) problems.push('type="module" breaks file://'); }
if ((html.match(/<style\b/gi) || []).length !== 1) problems.push('expected exactly 1 <style>');
if (/<link\b[^>]*rel=["']?stylesheet/i.test(html)) problems.push('external stylesheet');
if (/\bon[a-z]+\s*=\s*["']/i.test(html.replace(/<script[\s\S]*?<\/script>/i, ''))) problems.push('inline on*= handler attribute (CSP)');
const js = scripts[0]?.[2] || '';
for (const [re, why] of [[/\bimport\s*\(/, 'dynamic import'], [/^\s*import\s/m, 'import statement'], [/\beval\s*\(/, 'eval'], [/new\s+Function\s*\(/, 'new Function'], [/new\s+Worker\s*\(/, 'Worker'], [/shadowBlur\s*=\s*[1-9]/, 'ctx.shadowBlur (banned)']]) if (re.test(js)) problems.push(why);
// The game may talk to exactly ONE host (the leaderboard's Firestore REST endpoint) and to nothing
// else. So: pull every absolute URL out of the script, and fail on any host but that one. fetch() is
// allowed only while that list is clean - one stray CDN or analytics URL bans it again.
const ALLOWED_HOST = 'firestore.googleapis.com';
const urls = [...js.matchAll(/https?:\/\/[^'"\s`]+/g)].map((m) => m[0]);
const hosts = [...new Set(urls.map((u) => (/^https?:\/\/([^/?#'"\s]+)/.exec(u) || [, ''])[1]))];
const badHosts = hosts.filter((h) => h !== ALLOWED_HOST);
if (badHosts.length) problems.push(`non-allowlisted host(s) in script: ${badHosts.join(', ')} (only ${ALLOWED_HOST} is permitted)`);
if (/\bfetch\s*\(/.test(js) && badHosts.length) problems.push(`fetch() is only allowed while ${ALLOWED_HOST} is the script's only host`);
const tmp = join(mkdtempSync(join(tmpdir(), 'nunnery-check-')), 'game.js');
writeFileSync(tmp, js);
try { execFileSync('node', ['--check', tmp], { stdio: 'pipe' }); } catch (e) { problems.push('SYNTAX: ' + String(e.stderr).split('\n').slice(0, 6).join('\n')); }
console.log(`${file}: ${js.split('\n').length} script lines, ${(html.length / 1024).toFixed(0)} KB`);
if (problems.length) { console.log('PROBLEMS:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log('check ok');
