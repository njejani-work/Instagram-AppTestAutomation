// test/helpers/evidence.js
// Step-by-step screenshot evidence for WebdriverIO + Mocha.
//
//   useEvidence('login');                         // inside describe(): registers hooks
//   await step('Tap Log in', () => LoginPage.logInBtn.click(), {
//     waitFor: () => LoginPage.notNowBtn.waitForDisplayed(),   // "result has loaded"
//   });
//
// Each step: run action → wait for its result → wait until the UI stops changing → screenshot.
// Output:  reports/screenshots/<suite>/<test>/NN-step.png
//          reports/screenshots/<suite>/index.html   (all tests + steps of the suite)
//          reports/screenshots/index.html           (links to every suite)

import fs from 'node:fs';
import path from 'node:path';
import { denyPermissionPopupIfShown } from './permissions.js';

const ROOT = path.resolve('reports/screenshots');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let suite = null;     // { name, dir, tests: [] }
let current = null;   // { title, slug, dir, steps: [], status, error, start, duration }

// ---------------------------------------------------------------------------
// "Loading complete" detection
// ---------------------------------------------------------------------------

/**
 * Wait until two consecutive page sources are identical (no spinners/animations still changing
 * the hierarchy). Gives up after `timeout` and carries on — videos in the feed never fully settle.
 */
export async function waitForUiIdle({ timeout = 4000, interval = 400 } = {}) {
  const clean = (xml) => xml.replace(/\s(focused|selected|a11y-focused)="[^"]*"/g, '');
  let prev = clean(await driver.getPageSource());
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    await driver.pause(interval);
    const cur = clean(await driver.getPageSource());
    if (cur === prev) return true;
    prev = cur;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Screenshots & steps
// ---------------------------------------------------------------------------

async function capture(name, status, error) {
  if (!current) throw new Error('step() called outside a test that uses useEvidence()');
  const n = String(current.steps.length + 1).padStart(2, '0');
  const file = `${n}-${slug(name)}.png`;
  try {
    await driver.saveScreenshot(path.join(current.dir, file));
  } catch (e) {
    console.warn(`Screenshot failed for "${name}": ${e.message}`);
  }
  const entry = { n, name, file, status, error: error?.message, at: new Date().toISOString() };
  if (status === 'failed') {
    // Save what the device was actually showing, to fix locators afterwards
    entry.xml = await saveDebugSource(path.join(current.dir, file.replace(/\.png$/, '.xml')));
  }
  current.steps.push(entry);
  return entry;
}

/** Write page source + current package/activity to a file. Returns the file name (or undefined). */
export async function saveDebugSource(filePath) {
  try {
    let header = '';
    try {
      header = `<!-- package=${await driver.getCurrentPackage()} activity=${await driver.getCurrentActivity()} -->\n`;
    } catch { /* not Android */ }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, header + await driver.getPageSource());
    return path.basename(filePath);
  } catch (e) {
    console.warn(`Could not save page source: ${e.message}`);
    return undefined;
  }
}

/**
 * Run one test action and record a screenshot once its result has loaded.
 * @param {string}   name      Shown in the report. Don't put passwords here.
 * @param {Function} action    The action, e.g. () => btn.click()
 * @param {object}   opts
 * @param {Function} opts.waitFor   Waits for the result of the action (element shown, screen changed…)
 * @param {boolean}  opts.settle    Also wait for the UI to stop changing (default true)
 * @param {number}   opts.settleTimeout
 */
export async function step(name, action, { waitFor, settle = true, settleTimeout = 4000 } = {}) {
  const t0 = Date.now();
  try {
    await denyPermissionPopupIfShown();                 // popup would block the action
    const result = action ? await action() : undefined;
    if (waitFor) await waitFor(result);
    if (settle) await waitForUiIdle({ timeout: settleTimeout });
    await denyPermissionPopupIfShown();                 // popup appeared as a result of the action
    const entry = await capture(name, 'passed');
    entry.ms = Date.now() - t0;
    return result;
  } catch (err) {
    const entry = await capture(name, 'failed', err);
    entry.ms = Date.now() - t0;
    err.evidenceRecorded = true;
    throw err;
  }
}

/** Add a screenshot to the current test's evidence (throws if no evidence test is running). */
export const snapshot = (name) => capture(name, 'passed');

/** Screenshot the current screen without performing an action. */
export const checkpoint = (name, opts) => step(name, null, opts);

// ---------------------------------------------------------------------------
// Mocha hooks
// ---------------------------------------------------------------------------

export function useEvidence(suiteName) {
  before(function () {
    const dir = path.join(ROOT, slug(suiteName));
    fs.rmSync(dir, { recursive: true, force: true });          // fresh evidence per run
    fs.mkdirSync(dir, { recursive: true });
    suite = { name: suiteName, slug: slug(suiteName), dir, tests: [], start: new Date().toISOString() };
  });

  beforeEach(function () {
    const title = this.currentTest.title;
    const dir = path.join(suite.dir, slug(title));
    fs.mkdirSync(dir, { recursive: true });
    current = { title, slug: slug(title), dir, steps: [], start: Date.now() };
  });

  afterEach(async function () {
    const t = this.currentTest;
    current.status = t.state === 'passed' ? 'passed' : 'failed';
    current.duration = Date.now() - current.start;
    if (t.state !== 'passed') {
      current.error = t.err?.message || 'Test failed';
      // Failure outside a step (e.g. an expect) → capture the final screen too
      if (!t.err?.evidenceRecorded) await capture('Failure', 'failed', t.err);
    }
    suite.tests.push(current);
    writeSuiteReport();
    current = null;
  });

  after(function () {
    writeSuiteReport();
    writeIndex();
  });
}

// ---------------------------------------------------------------------------
// HTML compilation
// ---------------------------------------------------------------------------

const CSS = `
:root{--bg:#f6f7f9;--card:#fff;--fg:#1d2330;--muted:#6b7280;--ok:#13804b;--bad:#c0262d;--line:#e3e6eb}
@media (prefers-color-scheme:dark){:root{--bg:#14161a;--card:#1d2026;--fg:#e8eaee;--muted:#9aa1ad;--ok:#3ccf83;--bad:#ff6b6b;--line:#2c3038}}
*{box-sizing:border-box}body{margin:0;font:14px/1.45 system-ui,sans-serif;background:var(--bg);color:var(--fg);padding:24px}
h1{margin:0 0 4px}h2{margin:32px 0 8px;display:flex;gap:10px;align-items:center}.muted{color:var(--muted)}
.badge{font-size:12px;padding:2px 8px;border-radius:99px;color:#fff}.passed{background:var(--ok)}.failed{background:var(--bad)}
.err{color:var(--bad);white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;margin:4px 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.step{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.step.failed{border-color:var(--bad)}.step img{width:100%;display:block;background:#000;cursor:zoom-in}
.cap{padding:8px 10px}.cap b{display:block}.cap small{color:var(--muted)}
nav a{display:block;padding:10px 12px;margin:6px 0;background:var(--card);border:1px solid var(--line);border-radius:8px;color:inherit;text-decoration:none}
dialog{border:0;padding:0;background:transparent;max-width:95vw}dialog img{max-height:92vh;max-width:95vw;display:block}
dialog::backdrop{background:rgba(0,0,0,.8)}`;

const LIGHTBOX = `<dialog id="lb" onclick="this.close()"><img id="lbi" alt=""></dialog>
<script>document.querySelectorAll('.step img').forEach(i=>i.onclick=()=>{lbi.src=i.src;lb.showModal()})</script>`;

function writeSuiteReport() {
  if (!suite) return;
  const passed = suite.tests.filter((t) => t.status === 'passed').length;
  const tests = suite.tests.map((t) => `
  <h2>${esc(t.title)} <span class="badge ${t.status}">${t.status}</span>
      <span class="muted" style="font-size:13px;font-weight:400">${(t.duration / 1000).toFixed(1)}s · ${t.steps.length} steps</span></h2>
  ${t.error ? `<div class="err">${esc(t.error)}</div>` : ''}
  <div class="grid">
    ${t.steps.map((s) => `
    <div class="step ${s.status}">
      <img src="${t.slug}/${s.file}" alt="${esc(s.name)}" loading="lazy">
      <div class="cap"><b>${s.n}. ${esc(s.name)}</b>
        <small>${s.status}${s.ms != null ? ` · ${(s.ms / 1000).toFixed(1)}s` : ''}</small>
        ${s.error ? `<div class="err">${esc(s.error)}</div>` : ''}
        ${s.xml ? `<small><a href="${t.slug}/${s.xml}">page source (XML)</a></small>` : ''}</div>
    </div>`).join('')}
  </div>`).join('\n');

  fs.writeFileSync(path.join(suite.dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(suite.name)} – evidence</title><style>${CSS}</style></head>
<body><a href="../index.html" class="muted">← all suites</a><h1>${esc(suite.name)}</h1>
<div class="muted">${passed}/${suite.tests.length} passed · run ${esc(suite.start)}</div>${tests}${LIGHTBOX}</body></html>`);

  fs.writeFileSync(path.join(suite.dir, 'summary.json'), JSON.stringify({
    name: suite.name, slug: suite.slug, start: suite.start,
    tests: suite.tests.map(({ title, status, duration, steps }) => ({ title, status, duration, steps: steps.length })),
  }, null, 2));
}

function writeIndex() {
  const suites = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(ROOT, d.name, 'summary.json')))
    .map((d) => JSON.parse(fs.readFileSync(path.join(ROOT, d.name, 'summary.json'), 'utf8')));
  const links = suites.map((s) => {
    const ok = s.tests.every((t) => t.status === 'passed');
    return `<a href="${s.slug}/index.html"><span class="badge ${ok ? 'passed' : 'failed'}">${ok ? 'passed' : 'failed'}</span>
      <b style="margin-left:8px">${esc(s.name)}</b> <span class="muted">· ${s.tests.length} tests · ${esc(s.start)}</span>
      <div class="muted" style="margin-top:4px">${s.tests.map((t) => `${t.status === 'passed' ? '✓' : '✗'} ${esc(t.title)}`).join(' &nbsp; ')}</div></a>`;
  }).join('');
  fs.writeFileSync(path.join(ROOT, 'index.html'), `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Test evidence</title><style>${CSS}</style></head>
<body><h1>Test evidence</h1><nav>${links}</nav></body></html>`);
}