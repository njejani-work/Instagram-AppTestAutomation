// tools/build-dashboard.mjs
// Builds reports/dashboard/index.html from every run kept in reports/runs/.
// Runs automatically at the end of each test run (wdio.conf.js → onComplete).
// Manual:  node tools/build-dashboard.mjs        (or: npm run dashboard)
//
// The dashboard is static: index.html + data.js. Open it straight from disk (file://),
// no server needed. Screenshots/logs are linked relative to reports/.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const rel = (root, p) => path.relative(root, p).split(path.sep).join('/');

function listFiles(dir, root) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return listFiles(p, root);
    return [{ name: rel(dir, p), path: rel(root, p), size: fs.statSync(p).size }];
  });
}

function loadRun(reportsDir, runDir) {
  const runId = path.basename(runDir);
  const meta = readJson(path.join(runDir, 'run.json')) || { runId, status: 'unknown' };

  const suites = fs.readdirSync(runDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(runDir, d.name, 'suite.json')))
    .map((d) => readJson(path.join(runDir, d.name, 'suite.json')))
    .filter(Boolean)
    .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));

  const tests = suites.flatMap((s) => s.tests);
  const steps = tests.flatMap((t) => t.steps);
  const totals = {
    suites: suites.length,
    tests: tests.length,
    passed: tests.filter((t) => t.status === 'passed').length,
    failed: tests.filter((t) => t.status !== 'passed').length,
    steps: steps.length,
    stepsPassed: steps.filter((s) => s.status === 'passed').length,
    stepsFailed: steps.filter((s) => s.status === 'failed').length,
  };

  let status = meta.status;
  if (status === 'running' && !meta.finishedAt) status = 'incomplete';   // crashed / interrupted
  if (status === 'passed' && totals.failed) status = 'failed';
  if ((status === 'unknown' || !status) && totals.tests) status = totals.failed ? 'failed' : 'passed';

  const durationMs = meta.durationMs ?? tests.reduce((n, t) => n + (t.durationMs || 0), 0);
  return {
    ...meta, runId, status, durationMs, totals,
    device: suites.find((s) => s.device?.name)?.device,
    logs: listFiles(path.join(runDir, 'logs'), reportsDir),
    junit: listFiles(path.join(runDir, 'junit'), reportsDir),
    suites,
  };
}

export function buildDashboard({ reportsDir = path.resolve('reports') } = {}) {
  const runsDir = path.join(reportsDir, 'runs');
  const outDir = path.join(reportsDir, 'dashboard');
  fs.mkdirSync(outDir, { recursive: true });

  const runs = fs.existsSync(runsDir)
    ? fs.readdirSync(runsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name).sort().reverse()          // newest first (ids are timestamps)
      .map((id) => loadRun(reportsDir, path.join(runsDir, id)))
    : [];

  const data = { project: 'Instagram Android – Appium tests', generatedAt: new Date().toISOString(), runs };
  // data.js (not .json) so the page also works when opened via file://
  fs.writeFileSync(path.join(outDir, 'data.js'),
    `window.DASHBOARD = ${JSON.stringify(data).replace(/</g, '\\u003c')};\n`);
  fs.writeFileSync(path.join(outDir, 'index.html'), TEMPLATE);
  return path.join(outDir, 'index.html');
}

// ---------------------------------------------------------------------------
// Page template
// ---------------------------------------------------------------------------

const TEMPLATE = /* html */ `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test Dashboard</title>
<style>
:root{
  --bg:#f5f6f8;--panel:#fff;--panel2:#f0f2f5;--fg:#1b2130;--muted:#667085;--line:#e3e6ec;
  --ok:#14804a;--ok-bg:#e3f5ea;--bad:#c4262e;--bad-bg:#fde8e8;--warn:#a15c00;--warn-bg:#fff1db;
  --info:#2f5bd3;--accent:#3b5bdb;--mono:ui-monospace,SFMono-Regular,Consolas,monospace;
  --shadow:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.08);
}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){
  --bg:#111318;--panel:#1a1d24;--panel2:#22262f;--fg:#e7e9ee;--muted:#9aa3b2;--line:#2c313c;
  --ok:#3fcf86;--ok-bg:#163527;--bad:#ff6b6b;--bad-bg:#3a1c1f;--warn:#f5b04c;--warn-bg:#3a2c14;--info:#7aa2ff;--accent:#7c93ff;
  --shadow:none}}
:root[data-theme=dark]{
  --bg:#111318;--panel:#1a1d24;--panel2:#22262f;--fg:#e7e9ee;--muted:#9aa3b2;--line:#2c313c;
  --ok:#3fcf86;--ok-bg:#163527;--bad:#ff6b6b;--bad-bg:#3a1c1f;--warn:#f5b04c;--warn-bg:#3a2c14;--info:#7aa2ff;--accent:#7c93ff;--shadow:none}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
header{position:sticky;top:0;z-index:5;background:var(--panel);border-bottom:1px solid var(--line);
  display:flex;align-items:center;gap:16px;padding:12px 24px;flex-wrap:wrap}
header h1{font-size:16px;margin:0;font-weight:650}
header .sp{flex:1}
header select,header button,.tb input,.tb button{font:inherit;color:inherit;background:var(--panel2);
  border:1px solid var(--line);border-radius:8px;padding:6px 10px}
main{max-width:1280px;margin:0 auto;padding:24px}
.muted{color:var(--muted)}.mono{font-family:var(--mono);font-size:12.5px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
.kpi{padding:14px 16px}.kpi .l{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.kpi .v{font-size:26px;font-weight:650;margin-top:2px}.kpi .s{font-size:12.5px;color:var(--muted)}
section{margin:0 0 24px}section>h2{font-size:15px;margin:0 0 10px;font-weight:650}
.pad{padding:16px}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em}
tr.click{cursor:pointer}tr.click:hover td{background:var(--panel2)}
tbody tr:last-child td{border-bottom:0}
.badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:2px 9px;border-radius:99px;white-space:nowrap}
.badge.passed{color:var(--ok);background:var(--ok-bg)}.badge.failed{color:var(--bad);background:var(--bad-bg)}
.badge.incomplete,.badge.unknown,.badge.running{color:var(--warn);background:var(--warn-bg)}
.badge.flaky{color:var(--warn);background:var(--warn-bg)}
.dots{display:flex;gap:3px}.dot{width:12px;height:12px;border-radius:3px;background:var(--line)}
.dot.passed{background:var(--ok)}.dot.failed{background:var(--bad)}
.chart{width:100%;height:170px;display:block}
.chart rect.bar{cursor:pointer}.chart rect.bar:hover{opacity:.8}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px 24px;padding:16px}
.meta div b{display:block;font-size:12px;color:var(--muted);font-weight:600}
.tb{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 14px}
.tb input{min-width:240px}.tb button.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.suite{margin-bottom:22px}.suite h3{font-size:15px;margin:0 0 8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
details.test{margin-bottom:10px}
details.test>summary{list-style:none;cursor:pointer;display:flex;gap:12px;align-items:center;padding:12px 16px;flex-wrap:wrap}
details.test>summary::-webkit-details-marker{display:none}
details.test>summary .t{font-weight:600;flex:1;min-width:200px}
details.test>summary .chev{transition:transform .15s;color:var(--muted)}
details.test[open]>summary .chev{transform:rotate(90deg)}
.tbody{border-top:1px solid var(--line);padding:12px 16px 16px}
.err{background:var(--bad-bg);color:var(--bad);border-radius:8px;padding:10px 12px;margin:0 0 12px;white-space:pre-wrap;
  font-family:var(--mono);font-size:12.5px;overflow:auto}
.err b{font-family:system-ui,sans-serif}
.steps{display:flex;flex-direction:column;gap:8px}
.step{display:grid;grid-template-columns:96px 1fr;gap:14px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
.step.failed{border-color:var(--bad);background:linear-gradient(0deg,var(--bad-bg),var(--bad-bg))}
.step img{width:96px;height:170px;object-fit:cover;object-position:top;border-radius:6px;background:#000;cursor:zoom-in;display:block}
.step .noimg{width:96px;height:170px;border-radius:6px;background:var(--panel2);display:grid;place-items:center;font-size:12px;color:var(--muted)}
.step .h{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.step .h .n{font-family:var(--mono);color:var(--muted)}.step .h .nm{font-weight:600}
.tag{font-size:11px;padding:1px 7px;border-radius:99px;border:1px solid var(--line);color:var(--muted)}
details.log{margin-top:8px}details.log summary{cursor:pointer;color:var(--muted);font-size:12.5px}
.loglines{margin-top:6px;max-height:260px;overflow:auto;background:var(--panel2);border-radius:8px;padding:8px 10px;font-family:var(--mono);font-size:12px}
.loglines div{white-space:pre-wrap;word-break:break-word}
.lv-error{color:var(--bad)}.lv-warn{color:var(--warn)}.lv-action{color:var(--info)}
.links a{margin-right:14px;font-size:12.5px}
.empty{padding:40px;text-align:center;color:var(--muted)}
#lb{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;z-index:20;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:16px}
#lb.on{display:flex}#lb img{max-height:82vh;max-width:94vw;border-radius:8px}
#lb .cap{color:#fff;text-align:center;max-width:90vw}#lb .nav{display:flex;gap:10px}
#lb button{font:inherit;background:#ffffff22;color:#fff;border:1px solid #ffffff44;border-radius:8px;padding:6px 14px;cursor:pointer}
@media (max-width:640px){main{padding:16px}header{padding:10px 16px}.step{grid-template-columns:72px 1fr}
  .step img,.step .noimg{width:72px;height:128px}.tb input{min-width:0;flex:1}.hide-sm{display:none}}
</style>
<script src="data.js"></script>
</head>
<body>
<header>
  <h1 id="title">Test Dashboard</h1>
  <a href="#/">Overview</a>
  <span class="sp"></span>
  <select id="runSel" aria-label="Jump to run"></select>
  <button id="theme" title="Toggle light / dark">◐ Theme</button>
</header>
<main id="app"></main>
<div id="lb" role="dialog" aria-modal="true">
  <img id="lbImg" alt="">
  <div class="cap" id="lbCap"></div>
  <div class="nav"><button id="lbPrev">← Prev</button><button id="lbClose">Close (Esc)</button><button id="lbNext">Next →</button></div>
</div>
<script>
(() => {
const D = window.DASHBOARD || { runs: [] };
const R = (p) => p ? '../' + p.split('/').map(encodeURIComponent).join('/') : '';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const dur = (ms) => { if (ms == null) return '–'; const s = Math.round(ms / 1000); return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's'; };
const when = (t) => t ? new Date(t).toLocaleString() : '–';
const ago = (t) => { if (!t) return ''; const m = Math.round((Date.now() - Date.parse(t)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const badge = (st) => '<span class="badge ' + esc(st) + '">' + ({ passed: '✓ ', failed: '✗ ' }[st] || '') + esc(st) + '</span>';
const app = document.getElementById('app');
const key = (s, t) => s + ' › ' + t;
const anchor = (s) => 't-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');

document.getElementById('title').textContent = D.project || 'Test Dashboard';
const sel = document.getElementById('runSel');
sel.innerHTML = '<option value="">Jump to run…</option>' + D.runs.map((r) =>
  '<option value="' + esc(r.runId) + '">' + esc(r.runId) + ' · ' + esc(r.status) + (r.label ? ' · ' + esc(r.label) : '') + '</option>').join('');
sel.onchange = () => { if (sel.value) location.hash = '#/run/' + encodeURIComponent(sel.value); };

const th = document.getElementById('theme');
const setTheme = (t) => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
try { setTheme(localStorage.getItem('dash-theme')); } catch {}
th.onclick = () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const t = dark ? 'light' : 'dark'; setTheme(t); try { localStorage.setItem('dash-theme', t); } catch {}
};

// ---------------- overview ----------------
function overview() {
  if (!D.runs.length) { app.innerHTML = '<div class="card empty">No runs yet.<br>Run <span class="mono">npm test</span> – the dashboard rebuilds after every run.</div>'; return; }
  const last = D.runs[0];
  const window10 = D.runs.slice(0, 10);
  const rate = (r) => r.totals.tests ? r.totals.passed / r.totals.tests : 0;
  const avgRate = window10.reduce((n, r) => n + rate(r), 0) / window10.length;
  const avgDur = window10.reduce((n, r) => n + (r.durationMs || 0), 0) / window10.length;

  // test history across runs (newest first)
  const hist = new Map();
  for (const r of D.runs) for (const s of r.suites) for (const t of s.tests) {
    if (t.kind === 'hook') continue;
    const k = key(s.title, t.title);
    if (!hist.has(k)) hist.set(k, { suite: s.title, title: t.title, results: [] });
    hist.get(k).results.push({ run: r.runId, status: t.status, durationMs: t.durationMs, error: t.error, suite: s.title });
  }
  const tests = [...hist.values()].map((h) => {
    const w = h.results.slice(0, 10);
    const passed = w.filter((x) => x.status === 'passed').length;
    const lastFail = h.results.find((x) => x.status !== 'passed');
    return { ...h, w, rate: passed / w.length, flaky: passed > 0 && passed < w.length,
      avg: w.reduce((n, x) => n + (x.durationMs || 0), 0) / w.length, lastFail };
  }).sort((a, b) => a.rate - b.rate || a.suite.localeCompare(b.suite));

  // trend chart (oldest → newest)
  const chartRuns = D.runs.slice(0, 30).reverse();
  const maxT = Math.max(1, ...chartRuns.map((r) => r.totals.tests));
  const W = 1000, H = 150, gap = 4, bw = Math.max(6, Math.min(40, (W - gap * chartRuns.length) / Math.max(1, chartRuns.length)));
  const bars = chartRuns.map((r, i) => {
    const x = i * (bw + gap); const hp = (r.totals.passed / maxT) * (H - 10); const hf = (r.totals.failed / maxT) * (H - 10);
    const t = esc(r.runId + ' – ' + r.totals.passed + ' passed, ' + r.totals.failed + ' failed');
    return '<g onclick="location.hash=\\'#/run/' + encodeURIComponent(r.runId) + '\\'"><title>' + t + '</title>'
      + '<rect class="bar" x="' + x + '" y="' + (H - hp) + '" width="' + bw + '" height="' + hp + '" rx="2" fill="var(--ok)"/>'
      + '<rect class="bar" x="' + x + '" y="' + (H - hp - hf) + '" width="' + bw + '" height="' + hf + '" rx="2" fill="var(--bad)"/>'
      + (r.totals.tests ? '' : '<rect class="bar" x="' + x + '" y="' + (H - 4) + '" width="' + bw + '" height="4" fill="var(--warn)"/>') + '</g>';
  }).join('');

  app.innerHTML =
  '<div class="kpis">'
  + kpi('Last run', badge(last.status), esc(last.runId) + ' · ' + ago(last.startedAt))
  + kpi('Last run tests', last.totals.passed + '/' + last.totals.tests, last.totals.failed + ' failed · ' + last.totals.stepsFailed + ' failed steps')
  + kpi('Pass rate (last ' + window10.length + ' runs)', Math.round(avgRate * 100) + '%', 'tests passed per run, averaged')
  + kpi('Avg run duration', dur(avgDur), 'last ' + window10.length + ' runs')
  + kpi('Runs kept', D.runs.length, 'oldest ' + esc(D.runs.at(-1).runId))
  + '</div>'
  + '<section><h2>Pass / fail per run</h2><div class="card pad"><svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + bars + '</svg>'
  + '<div class="muted" style="font-size:12px;display:flex;gap:16px;margin-top:6px"><span><span class="dot passed" style="display:inline-block;vertical-align:-1px"></span> passed tests</span><span><span class="dot failed" style="display:inline-block;vertical-align:-1px"></span> failed tests</span><span>oldest → newest · click a bar to open the run</span></div></div></section>'
  + '<section><h2>Test stability</h2><div class="card" style="overflow:auto"><table><thead><tr><th>Test</th><th>Last 10 (newest →)</th><th>Pass rate</th><th class="hide-sm">Avg time</th><th>Last failure</th></tr></thead><tbody>'
  + tests.map((t) => '<tr><td><div class="muted" style="font-size:12px">' + esc(t.suite) + '</div><b>' + esc(t.title) + '</b> '
      + (t.flaky ? '<span class="badge flaky">flaky</span>' : '') + '</td>'
      + '<td><div class="dots">' + t.w.slice().reverse().map((x) => '<a class="dot ' + esc(x.status) + '" title="' + esc(x.run + ': ' + x.status)
        + '" href="#/run/' + encodeURIComponent(x.run) + '/' + anchor(key(x.suite, t.title)) + '"></a>').join('') + '</div></td>'
      + '<td>' + Math.round(t.rate * 100) + '%</td><td class="hide-sm">' + dur(t.avg) + '</td>'
      + '<td>' + (t.lastFail ? '<a href="#/run/' + encodeURIComponent(t.lastFail.run) + '/' + anchor(key(t.lastFail.suite, t.title)) + '">' + esc(t.lastFail.run) + '</a>'
        + '<div class="mono muted" style="max-width:420px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(t.lastFail.error?.message || '') + '</div>' : '<span class="muted">–</span>') + '</td></tr>').join('')
  + '</tbody></table></div></section>'
  + '<section><h2>Runs</h2><div class="card" style="overflow:auto"><table><thead><tr><th>Run</th><th>Status</th><th>Started</th><th>Duration</th><th>Scope</th><th>Tests</th><th class="hide-sm">Steps</th><th class="hide-sm">Device</th></tr></thead><tbody>'
  + D.runs.map((r) => '<tr class="click" onclick="location.hash=\\'#/run/' + encodeURIComponent(r.runId) + '\\'">'
      + '<td class="mono">' + esc(r.runId) + (r.label ? '<div class="muted">' + esc(r.label) + '</div>' : '') + '</td>'
      + '<td>' + badge(r.status) + '</td><td>' + when(r.startedAt) + '</td><td>' + dur(r.durationMs) + '</td>'
      + '<td>' + esc(r.suite ? 'suite: ' + r.suite : r.spec ? 'spec: ' + r.spec : 'all specs') + (r.grep ? '<div class="muted">grep: ' + esc(r.grep) + '</div>' : '') + '</td>'
      + '<td><b style="color:var(--ok)">' + r.totals.passed + '</b> / <b style="color:var(--bad)">' + r.totals.failed + '</b></td>'
      + '<td class="hide-sm">' + r.totals.stepsPassed + ' / ' + r.totals.stepsFailed + '</td>'
      + '<td class="hide-sm">' + esc(r.device ? [r.device.model || r.device.name, r.device.platformVersion && 'Android ' + r.device.platformVersion].filter(Boolean).join(' · ') : '–') + '</td></tr>').join('')
  + '</tbody></table></div></section>';
}
const kpi = (l, v, s) => '<div class="card kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="s">' + s + '</div></div>';

// ---------------- run detail ----------------
let lbList = [], lbIdx = 0;
function runView(id, focus) {
  const r = D.runs.find((x) => x.runId === id);
  if (!r) { app.innerHTML = '<div class="card empty">Run "' + esc(id) + '" not found (older runs are pruned – see KEEP_RUNS).</div>'; return; }
  sel.value = r.runId;
  const dev = r.device || {};
  app.innerHTML =
    '<div class="tb" style="margin-bottom:10px"><a href="#/">← Overview</a></div>'
  + '<section><div class="card"><div class="pad" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--line)">'
  + '<h2 style="margin:0;font-size:18px" class="mono">' + esc(r.runId) + '</h2>' + badge(r.status)
  + (r.label ? '<span class="tag">' + esc(r.label) + '</span>' : '')
  + '<span class="muted">' + r.totals.passed + ' passed · ' + r.totals.failed + ' failed · ' + r.totals.steps + ' steps (' + r.totals.stepsFailed + ' failed)</span></div>'
  + '<div class="meta">'
  + m('Started', when(r.startedAt)) + m('Finished', when(r.finishedAt)) + m('Duration', dur(r.durationMs))
  + m('Command', '<span class="mono">' + esc(r.command || '–') + '</span>')
  + m('Device', esc([dev.model, dev.name].filter(Boolean).join(' · ') || '–') + (dev.platformVersion ? '<div class="muted">Android ' + esc(dev.platformVersion) + (dev.screen ? ' · ' + esc(dev.screen) : '') + '</div>' : ''))
  + m('App', '<span class="mono">' + esc(dev.app || '–') + '</span>')
  + m('Machine', esc([r.user, r.host].filter(Boolean).join('@') || '–') + (r.node ? '<div class="muted">Node ' + esc(r.node) + '</div>' : ''))
  + m('Exit code', esc(r.exitCode ?? '–'))
  + '</div>'
  + ((r.logs.length || r.junit.length) ? '<div class="pad links" style="border-top:1px solid var(--line)"><b class="muted" style="font-size:12px;margin-right:10px">FILES</b>'
      + r.logs.concat(r.junit).map((f) => '<a href="' + R(f.path) + '" target="_blank">' + esc(f.name) + '</a>').join('') + '</div>' : '')
  + '</div></section>'
  + '<div class="tb"><button data-f="all" class="on">All tests</button><button data-f="failed">Failed only</button>'
  + '<input id="q" placeholder="Search tests or steps…" aria-label="Search"><span class="sp"></span>'
  + '<button id="exp">Expand all</button><button id="col">Collapse all</button></div>'
  + '<div id="suites">' + (r.suites.length ? r.suites.map(suiteHtml).join('') : '<div class="card empty">No test results recorded in this run.</div>') + '</div>';

  let filter = 'all';
  const apply = () => {
    const q = document.getElementById('q').value.trim().toLowerCase();
    document.querySelectorAll('details.test').forEach((d) => {
      const okF = filter === 'all' || d.dataset.status !== 'passed';
      const okQ = !q || d.dataset.text.includes(q);
      d.style.display = okF && okQ ? '' : 'none';
    });
    document.querySelectorAll('.suite').forEach((s) => {
      s.style.display = [...s.querySelectorAll('details.test')].some((d) => d.style.display !== 'none') ? '' : 'none';
    });
  };
  document.querySelectorAll('.tb [data-f]').forEach((b) => b.onclick = () => {
    filter = b.dataset.f; document.querySelectorAll('.tb [data-f]').forEach((x) => x.classList.toggle('on', x === b)); apply();
  });
  document.getElementById('q').oninput = apply;
  document.getElementById('exp').onclick = () => document.querySelectorAll('details.test').forEach((d) => d.open = true);
  document.getElementById('col').onclick = () => document.querySelectorAll('details.test').forEach((d) => d.open = false);
  document.querySelectorAll('img[data-lb]').forEach((img) => img.onclick = () => openLb(img.dataset.lb));

  if (focus) {
    const el = document.getElementById(focus);
    if (el) { el.open = true; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }
  } else window.scrollTo(0, 0);
}
const m = (l, v) => '<div><b>' + l + '</b>' + v + '</div>';

function suiteHtml(s) {
  const passed = s.tests.filter((t) => t.status === 'passed').length;
  return '<div class="suite"><h3>' + esc(s.title) + (s.attempt > 1 ? ' <span class="tag">attempt ' + s.attempt + '</span>' : '')
    + ' <span class="muted" style="font-weight:400;font-size:13px">' + passed + '/' + s.tests.length + ' passed'
    + (s.file ? ' · <span class="mono">' + esc(s.file) + '</span>' : '') + '</span></h3>'
    + s.tests.map((t) => testHtml(s, t)).join('') + '</div>';
}

function testHtml(s, t) {
  const id = anchor(key(s.title, t.title));
  const failedSteps = t.steps.filter((x) => x.status === 'failed').length;
  const text = (t.title + ' ' + t.steps.map((x) => x.name).join(' ') + ' ' + (t.error?.message || '')).toLowerCase();
  const group = id;
  return '<details class="test card" id="' + id + '" data-status="' + esc(t.status) + '" data-text="' + esc(text) + '"' + (t.status !== 'passed' ? ' open' : '') + '>'
    + '<summary><span class="chev">▶</span>' + badge(t.status) + '<span class="t">' + esc(t.title) + (t.kind === 'hook' ? ' <span class="tag">hook</span>' : '') + '</span>'
    + '<span class="muted">' + t.steps.length + ' steps' + (failedSteps ? ' · <b style="color:var(--bad)">' + failedSteps + ' failed</b>' : '') + ' · ' + dur(t.durationMs) + '</span></summary>'
    + '<div class="tbody">'
    + (t.error ? '<div class="err"><b>' + esc(t.error.message) + '</b>' + (t.error.stack ? '<details style="margin-top:6px"><summary style="cursor:pointer">Stack trace</summary>' + esc(t.error.stack) + '</details>' : '') + '</div>' : '')
    + (t.log?.length ? logHtml(t.log, 'Test log (outside steps)') : '')
    + '<div class="steps">' + t.steps.map((st, i) => stepHtml(st, group, i, s, t)).join('') + '</div></div></details>';
}

function stepHtml(st, group, i, s, t) {
  const lbId = group + '|' + i;
  if (st.screenshot) lbItems[lbId] = { src: R(st.screenshot), cap: s.title + ' › ' + t.title + ' › ' + st.n + '. ' + st.name, status: st.status, group };
  return '<div class="step ' + esc(st.status) + '">'
    + (st.screenshot ? '<img loading="lazy" src="' + R(st.screenshot) + '" alt="' + esc(st.name) + '" data-lb="' + esc(lbId) + '">' : '<div class="noimg">no image</div>')
    + '<div><div class="h"><span class="n">' + esc(st.n) + '</span><span class="nm">' + esc(st.name) + '</span>' + badge(st.status)
    + (st.kind === 'auto' ? '<span class="tag">auto</span>' : '') + '<span class="muted">' + dur(st.durationMs) + '</span></div>'
    + (st.error ? '<div class="err" style="margin-top:8px"><b>' + esc(st.error.message) + '</b>' + (st.error.stack ? '<details style="margin-top:6px"><summary style="cursor:pointer">Stack trace</summary>' + esc(st.error.stack) + '</details>' : '') + '</div>' : '')
    + (st.log?.length ? logHtml(st.log, 'Step log') : '<div class="muted" style="font-size:12.5px;margin-top:6px">No log lines</div>')
    + '<div class="links" style="margin-top:6px">' + (st.screenshot ? '<a href="' + R(st.screenshot) + '" target="_blank">screenshot</a>' : '')
    + (st.source ? '<a href="' + R(st.source) + '" target="_blank">page source (XML)</a>' : '') + '<span class="muted" style="font-size:12px">' + when(st.startedAt) + '</span></div>'
    + '</div></div>';
}

function logHtml(lines, label) {
  const errs = lines.filter((l) => l.level === 'error').length;
  return '<details class="log"' + (errs ? ' open' : '') + '><summary>' + label + ' (' + lines.length + (errs ? ', ' + errs + ' errors' : '') + ')</summary><div class="loglines">'
    + lines.map((l) => '<div class="lv-' + esc(l.level) + '">' + esc(new Date(l.t).toLocaleTimeString()) + '  ' + esc(l.level.toUpperCase().padEnd(6)) + ' ' + esc(l.msg) + '</div>').join('')
    + '</div></details>';
}

// ---------------- lightbox ----------------
let lbItems = {};
const lb = document.getElementById('lb'), lbImg = document.getElementById('lbImg'), lbCap = document.getElementById('lbCap');
function openLb(id) {
  const it = lbItems[id]; if (!it) return;
  lbList = Object.keys(lbItems).filter((k) => lbItems[k].group === it.group); lbIdx = lbList.indexOf(id); showLb(); lb.classList.add('on');
}
function showLb() { const it = lbItems[lbList[lbIdx]]; lbImg.src = it.src; lbCap.innerHTML = badge(it.status) + ' ' + esc(it.cap) + ' <span style="opacity:.6">(' + (lbIdx + 1) + '/' + lbList.length + ')</span>'; }
const move = (d) => { lbIdx = (lbIdx + d + lbList.length) % lbList.length; showLb(); };
document.getElementById('lbPrev').onclick = () => move(-1);
document.getElementById('lbNext').onclick = () => move(1);
document.getElementById('lbClose').onclick = () => lb.classList.remove('on');
lb.onclick = (e) => { if (e.target === lb) lb.classList.remove('on'); };
document.addEventListener('keydown', (e) => {
  if (!lb.classList.contains('on')) return;
  if (e.key === 'Escape') lb.classList.remove('on'); if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1);
});

// ---------------- router ----------------
function route() {
  lbItems = {};
  const h = decodeURIComponent(location.hash.slice(1));
  const mm = h.match(/^\\/run\\/([^/]+)(?:\\/(.+))?$/);
  if (mm) runView(mm[1], mm[2]); else { sel.value = ''; overview(); }
}
addEventListener('hashchange', route);
route();
})();
</script>
</body></html>`;

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const reportsDir = path.resolve(process.argv[2] || 'reports');
  const out = buildDashboard({ reportsDir });
  console.log(`Dashboard written: ${out}`);
}