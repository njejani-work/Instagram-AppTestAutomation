// tools/export-locators.mjs
// Builds a locator catalogue from the page objects (the locators the tests actually use)
// and cross-checks each one against the captured screen dumps.
//
//   node tools/export-locators.mjs [outDir] [dumpsDir]
//   defaults: deliverables/04-locators   deliverables/04-locators/screen-dumps
//
// Output: LOCATOR-CATALOG.md + locator-catalog.csv

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const OUT = path.resolve(process.argv[2] || 'deliverables/04-locators');
const DUMPS = path.resolve(process.argv[3] || path.join(OUT, 'screen-dumps'));
const SOURCES = [
  'test/pageobjects/BasePage.js',
  'test/pageobjects/LoginPage.js',
  'test/pageobjects/HomePage.js',
  'test/pageobjects/ProfilePage.js',
  'test/pageobjects/MenuPage.js',
  'test/helpers/permissions.js',
];

export const SCREENS = {
  1: 'Login form',
  2: '"Save your login info?" after login',
  3: 'Home feed',
  4: 'Own profile',
  5: 'Settings menu – top',
  6: 'Settings menu – bottom',
  7: '"Save your login info?" during log out',
  8: '"Log out?" confirmation',
  9: 'Profile picker ("Continue as …")',
  10: 'Android notification-permission popup',
};

// ---------------------------------------------------------------------------
// Screen dumps → lookup sets
// ---------------------------------------------------------------------------
function loadDumps() {
  const idx = { byId: new Map(), byDesc: new Map(), byText: new Map(), bySel: new Map() };
  if (!fs.existsSync(DUMPS)) return idx;
  const add = (map, k, n) => { if (!k) return; if (!map.has(k)) map.set(k, new Set()); map.get(k).add(n); };
  for (const f of fs.readdirSync(DUMPS).filter((x) => x.endsWith('.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(DUMPS, f), 'utf8'));
    const n = j.screen ?? Number(f.match(/\d+/)?.[0]);
    for (const d of Object.values(j.details || {})) {
      add(idx.byId, d.resourceId, n); add(idx.byDesc, d.contentDesc, n); add(idx.byText, d.text, n);
      add(idx.byDesc, d.label, n); add(idx.byText, d.label, n);
      add(idx.bySel, d.selector, n); for (const a of d.alternatives || []) add(idx.bySel, a, n);
    }
  }
  return idx;
}

function seenIn(sel, idx) {
  const hits = new Set(idx.bySel.get(sel) || []);
  const take = (map, k) => (map.get(k) || []).forEach((n) => hits.add(n));
  let m;
  if ((m = sel.match(/^id=(.+)$/))) take(idx.byId, m[1]);
  if ((m = sel.match(/^~(.+)$/))) take(idx.byDesc, m[1]);
  if ((m = sel.match(/\.resourceId\("([^"]+)"\)/))) take(idx.byId, m[1]);
  if ((m = sel.match(/\.description\("([^"]+)"\)/))) take(idx.byDesc, m[1]);
  if ((m = sel.match(/\.text\("([^"]+)"\)/))) take(idx.byText, m[1]);
  for (const x of sel.matchAll(/@content-desc='([^']+)'/g)) take(idx.byDesc, x[1]);
  for (const x of sel.matchAll(/@text='([^']+)'/g)) take(idx.byText, x[1]);
  return [...hits].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Page-object parsing
// ---------------------------------------------------------------------------
function balanced(src, start) {           // src[start] === '(' ; understands strings + nested templates
  const stack = [{ mode: 'code', depth: 0 }];
  for (let i = start; i < src.length; i++) {
    const top = stack.at(-1); const c = src[i];
    if (top.mode === 'str') {
      if (c === '\\') { i++; continue; }
      if (c === top.q) stack.pop();
      continue;
    }
    if (top.mode === 'tpl') {
      if (c === '\\') { i++; continue; }
      if (c === '`') { stack.pop(); continue; }
      if (c === '$' && src[i + 1] === '{') { stack.push({ mode: 'code', depth: 0, inTpl: true }); i++; }
      continue;
    }
    // code
    if (c === '"' || c === "'") { stack.push({ mode: 'str', q: c }); continue; }
    if (c === '`') { stack.push({ mode: 'tpl' }); continue; }
    if (top.inTpl) {
      if (c === '{') top.depth++;
      if (c === '}') { if (top.depth === 0) { stack.pop(); continue; } top.depth--; }
    }
    if (c === '(') top.depth++;
    if (c === ')') { top.depth--; if (stack.length === 1 && top.depth === 0) return src.slice(start + 1, i); }
  }
  return null;
}

function makeContext() {
  const ctx = vm.createContext({ JSON });
  vm.runInContext(`
    var ID = (id) => 'id=com.instagram.android:id/' + id;
    var ui = (s) => 'android=new UiSelector()' + s;
    var str = (s) => JSON.stringify(s);
    var xq = (s) => (s.includes("'") ? '"' + s + '"' : "'" + s + "'");`, ctx);
  return ctx;
}

function strategyOf(sel) {
  if (sel.startsWith('~')) return 'accessibility id';
  if (sel.startsWith('id=')) return 'resource-id';
  if (sel.startsWith('android=')) return 'UiAutomator';
  if (sel.startsWith('//') || sel.startsWith('(')) return 'XPath';
  return 'class name';
}

function stabilityOf(sel, dynamic) {
  if (/\.instance\(\d+\)/.test(sel)) return 'fragile – position based';
  if (/Matches\(/.test(sel)) return 'pattern – verify wording';
  if (sel.startsWith('//')) return /ancestor/.test(sel) ? 'medium – XPath via label' : 'medium – XPath';
  if (sel.startsWith('android.widget.')) return 'medium – only one on screen';
  return dynamic ? 'stable (parameterised)' : 'stable';
}

function parseFile(rel) {
  const src = fs.readFileSync(rel, 'utf8');
  const ctx = makeContext();

  // file-level constants: arrow helpers, strings, objects (e.g. POST = {...})
  for (const m of src.matchAll(/^(?:export )?const (\w+) = ([\s\S]*?);\s*$/gm)) {
    if (/^(new |BasePage|\$)/.test(m[2])) continue;
    try { vm.runInContext(`var ${m[1]} = ${m[2]};`, ctx); } catch { /* not evaluable – skip */ }
  }
  for (const m of src.matchAll(/^const (\w+) = (\{[\s\S]*?^\});/gm)) {
    try { vm.runInContext(`var ${m[1]} = ${m[2]};`, ctx); } catch { /* skip */ }
  }
  // static class fields (LoginPage.ERROR_RE)
  const cls = src.match(/class (\w+)/)?.[1];
  if (cls) {
    vm.runInContext(`var ${cls} = {};`, ctx);
    for (const m of src.matchAll(/static (\w+) = ('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*");/g)) {
      vm.runInContext(`${cls}.${m[1]} = ${m[2]};`, ctx);
    }
  }

  // members: getters and methods
  const members = [];
  const memberRe = /\n\s*(?:get\s+(\w+)\s*\(\)|(?:async\s+)?(\w+)\s*\(([^)]*)\))\s*\{/g;
  for (const m of src.matchAll(memberRe)) {
    const name = m[1] || m[2];
    if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return'].includes(name)) continue;
    members.push({ name, getter: Boolean(m[1]), params: (m[3] || '').split(',').map((p) => p.split('=')[0].replace(/[{}]/g, '').trim()).filter(Boolean), at: m.index });
  }

  const rows = [];
  for (const m of src.matchAll(/return (\$\$?)\(/g)) {
    const owner = members.filter((x) => x.at < m.index).at(-1);
    if (!owner || rows.some((r) => r.element === owner.name)) continue;
    const expr = balanced(src, m.index + m[0].length - 1);
    if (!expr) continue;
    const line = src.slice(0, m.index).split('\n').length;
    for (const p of owner.params) vm.runInContext(`var ${p} = '<${p}>';`, ctx);
    const body = src.slice(owner.at, m.index);
    for (const lc of body.matchAll(/const (\w+) = ([^;]+);/g)) {
      try { vm.runInContext(`var ${lc[1]} = ${lc[2]};`, ctx); } catch { /* skip */ }
    }
    let sel, dynamic = owner.params.length > 0;
    try { sel = String(vm.runInContext(expr, ctx)); } catch { sel = expr; dynamic = true; }
    rows.push({
      page: path.basename(rel, '.js'), element: owner.name, kind: m[1] === '$$' ? 'list' : 'single',
      params: owner.params.join(', '), selector: sel, strategy: strategyOf(sel),
      stability: stabilityOf(sel, dynamic), source: `${rel}:${line}`,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const NOTES = [
  [/row_feed_button/, 'Below the first post – not in a dump yet. Confirm after one scroll.'],
  [/column/, 'Grid posts – profile had 0 posts when dumped. Confirm on a profile with posts.'],
  [/incorrect/, 'Invalid-login message – not dumped yet. Adjust the wording pattern if needed.'],
  [/\(ok\|try again/, 'Error dialog button – not dumped yet.'],
  [/permission_deny_button/, 'First-time variant of "Don\'t allow" (screen 10 shows the repeat variant).'],
  [/permission_message/, 'Popup text – present on the popup, not listed in the dump (not clickable).'],
  [/'s story/, 'Story buttons: content-desc is "<user>\'s story, N of M, …" – matched by prefix, so it works for any user (screen 3).'],
  [/starts-with\(@text/, 'Menu rows have no id/desc of their own – matched by the start of their label (screens 5, 6). Labels: MENU in MenuPage.js.'],
];

const idx = loadDumps();
const rows = SOURCES.filter((f) => fs.existsSync(f)).flatMap(parseFile).map((r) => {
  const screens = seenIn(r.selector, idx);
  const note = NOTES.find(([re]) => re.test(r.selector))?.[1] || '';
  return { ...r, screens: screens.join(' '), note };
});

fs.mkdirSync(OUT, { recursive: true });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const cols = ['page', 'element', 'kind', 'params', 'strategy', 'selector', 'stability', 'screens', 'note', 'source'];
fs.writeFileSync(path.join(OUT, 'locator-catalog.csv'),
  '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n'));

const md = (s) => String(s ?? '').replace(/\|/g, '\\|');
const pages = [...new Set(rows.map((r) => r.page))];
let out = `# Locator catalogue

Generated from the page objects by \`npm run locators:catalog\` – regenerate after changing a page object.
**Screens** = screen dumps in which the element was found (see the screen index below). Empty = not seen in any dump yet.

| Total locators | Seen in a dump | Not yet seen | Position-based (fragile) |
|---|---|---|---|
| ${rows.length} | ${rows.filter((r) => r.screens).length} | ${rows.filter((r) => !r.screens).length} | ${rows.filter((r) => r.stability.startsWith('fragile')).length} |

## Screen index

| # | Screen | Dump |
|---|---|---|
${Object.entries(SCREENS).map(([n, s]) => `| ${n} | ${s} | [screen-${n}.json](screen-dumps/screen-${n}.json) |`).join('\n')}

`;
for (const p of pages) {
  out += `## ${p}\n\n| Element | Kind | Strategy | Selector | Stability | Screens | Notes |\n|---|---|---|---|---|---|---|\n`;
  for (const r of rows.filter((x) => x.page === p)) {
    out += `| \`${md(r.element)}${r.params ? `(${md(r.params)})` : ''}\` | ${r.kind} | ${r.strategy} | \`${md(r.selector)}\` | ${r.stability} | ${r.screens || '–'} | ${md(r.note)} |\n`;
  }
  out += '\n';
}
fs.writeFileSync(path.join(OUT, 'LOCATOR-CATALOG.md'), out);
console.log(`${rows.length} locators → ${path.join(OUT, 'LOCATOR-CATALOG.md')} + locator-catalog.csv`);
console.log(`  seen in dumps: ${rows.filter((r) => r.screens).length}, not yet seen: ${rows.filter((r) => !r.screens).length}`);