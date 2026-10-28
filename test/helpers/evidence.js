// test/helpers/evidence.js
// Step-by-step evidence for every test: screenshot, status, duration, log lines and error details.
//
//   await step('Tap Log in', () => LoginPage.logInBtn.click(), {
//     waitFor: () => LoginPage.notNowBtn.waitForDisplayed(),   // "result has loaded"
//   });
//
// Each step: run action → wait for its result → wait until the UI stops changing → screenshot.
// Tests are started/finished automatically from wdio.conf.js hooks (no per-spec setup needed).
//
// Output per run (see run.js):
//   reports/runs/<RUN_ID>/<suite>/suite.json             data for the dashboard
//   reports/runs/<RUN_ID>/<suite>/<test>/NN-step.png     screenshot after every step
//   reports/runs/<RUN_ID>/<suite>/<test>/NN-step.xml     page source of failed steps

import fs from 'node:fs';
import path from 'node:path';
import { RUN_DIR, relToReports } from './run.js';
import { denyPermissionPopupIfShown } from './permissions.js';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'x';
const iso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Secrets – never written to logs, screenshots names or reports
// ---------------------------------------------------------------------------

const secrets = new Set();
export function registerSecrets(values = []) {
  for (const v of values) if (v && String(v).length >= 3) secrets.add(String(v));
}
export function mask(text) {
  let s = text == null ? '' : String(text);
  for (const v of secrets) s = s.split(v).join('••••••');
  return s;
}

// ---------------------------------------------------------------------------
// State (one worker process = one spec file)
// ---------------------------------------------------------------------------

const suites = new Map();   // suite title → suite record
let currentTest = null;     // test record
let currentStep = null;     // step record while step() runs
let capturing = false;      // guard against re-entry (screenshot during screenshot)

function getSuite(title, file) {
  if (suites.has(title)) return suites.get(title);
  let dirName = slug(title);
  let attempt = 1;
  while (fs.existsSync(path.join(RUN_DIR, dirName))) {   // spec-file retry or duplicate describe name
    attempt += 1;
    dirName = `${slug(title)}-attempt-${attempt}`;
  }
  const dir = path.join(RUN_DIR, dirName);
  fs.mkdirSync(dir, { recursive: true });

  const caps = (globalThis.driver && driver.capabilities) || {};
  const suite = {
    title, file: file ? path.relative(process.cwd(), file).split(path.sep).join('/') : undefined,
    dir, dirName, attempt, startedAt: iso(), finishedAt: null,
    device: {
      name: caps.deviceName || caps['appium:deviceName'],
      model: [caps.deviceManufacturer, caps.deviceModel].filter(Boolean).join(' ') || undefined,
      platform: caps.platformName,
      platformVersion: caps.platformVersion || caps['appium:platformVersion'],
      udid: caps.deviceUDID || caps.udid,
      screen: caps.deviceScreenSize,
      app: caps.appPackage || caps['appium:appPackage'],
    },
    tests: [],
  };
  suites.set(title, suite);
  return suite;
}

function writeSuite(suite) {
  const { dir, ...data } = suite;
  const passed = suite.tests.filter((t) => t.status === 'passed').length;
  data.totals = { tests: suite.tests.length, passed, failed: suite.tests.length - passed };
  fs.writeFileSync(path.join(dir, 'suite.json'), JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Logging: console output + WebDriver actions, attached to the running step/test
// ---------------------------------------------------------------------------

function pushLog(level, msg) {
  const entry = { t: iso(), level, msg: mask(msg).slice(0, 2000) };
  if (currentStep) currentStep.log.push(entry);
  else if (currentTest) currentTest.log.push(entry);
}

export const log = {
  info: (m) => pushLog('info', m),
  warn: (m) => pushLog('warn', m),
  error: (m) => pushLog('error', m),
};

let loggingInstalled = false;
/** Call once per worker (wdio.conf.js → before). Mirrors console.* into the report. */
export function installLogging() {
  if (loggingInstalled) return;
  loggingInstalled = true;
  for (const [fn, level] of [['log', 'info'], ['info', 'info'], ['warn', 'warn'], ['error', 'error']]) {
    const orig = console[fn].bind(console);
    console[fn] = (...args) => {
      orig(...args);
      try {
        pushLog(level, args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
      } catch { /* never break the test for logging */ }
    };
  }

  // Element-level actions with their selector (protocol commands only know element ids)
  for (const cmd of ['click', 'doubleClick', 'setValue', 'addValue', 'clearValue']) {
    browser.overwriteCommand(cmd, async function (orig, ...args) {
      const what = cmd === 'setValue' || cmd === 'addValue' ? ` "${mask(args[0])}"` : '';
      const t0 = Date.now();
      try {
        const r = await orig(...args);
        pushLog('action', `${cmd}${what} → ${this.selector} (${Date.now() - t0} ms)`);
        return r;
      } catch (err) {
        pushLog('error', `${cmd}${what} → ${this.selector} FAILED: ${err.message}`);
        throw err;
      }
    }, true);
  }
}

/** wdio.conf.js → afterCommand. Logs device-level actions (gestures, back, app control). */
export function logCommand(commandName, args = [], result, error) {
  if (!currentTest) return;
  let line;
  switch (commandName) {
    case 'performActions': {
      const pts = (args[0]?.[0]?.actions || []).filter((a) => a.type === 'pointerMove');
      line = pts.length >= 2
        ? `gesture (${pts[0].x},${pts[0].y}) → (${pts.at(-1).x},${pts.at(-1).y})`
        : 'gesture';
      break;
    }
    case 'executeScript':
      if (!String(args[0]).startsWith('mobile:')) return;
      line = `${args[0]} ${JSON.stringify(args[1]?.[0] ?? {})}`;
      break;
    case 'back': line = 'press Back'; break;
    case 'hideKeyboard': line = 'hide keyboard'; break;
    case 'activateApp': line = `activate app ${args[0] ?? ''}`; break;
    case 'terminateApp': line = `terminate app ${args[0] ?? ''}`; break;
    default: return;
  }
  pushLog(error ? 'error' : 'action', error ? `${line} FAILED: ${error.message}` : line);
}

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

// ---------------------------------------------------------------------------
// Steps & screenshots
// ---------------------------------------------------------------------------

const errorInfo = (err) => err && {
  message: mask(err.message || String(err)),
  stack: mask((err.stack || '').split('\n').slice(0, 15).join('\n')),
};

function newStep(name, kind = 'step') {
  const n = String(currentTest.steps.length + 1).padStart(2, '0');
  const s = { n, name: mask(name), kind, status: 'running', startedAt: iso(), durationMs: 0, log: [] };
  currentTest.steps.push(s);
  return s;
}

async function finishStep(s, status, err, t0) {
  s.status = status;
  s.durationMs = Date.now() - (t0 ?? Date.parse(s.startedAt));
  if (err) s.error = errorInfo(err);
  const base = path.join(currentTest.dir, `${s.n}-${slug(s.name)}`);
  capturing = true;
  try {
    await driver.saveScreenshot(`${base}.png`);
    s.screenshot = relToReports(`${base}.png`);
  } catch (e) {
    s.log.push({ t: iso(), level: 'warn', msg: `Screenshot failed: ${e.message}` });
  }
  if (status === 'failed') {
    const xml = await saveDebugSource(`${base}.xml`);
    if (xml) s.source = relToReports(`${base}.xml`);
  }
  capturing = false;
}

/**
 * Run one test action and record a screenshot once its result has loaded.
 * Outside a running test (e.g. in before/beforeEach hooks) the action just runs, unrecorded.
 * @param {string}   name      Shown in the report. Passwords are masked automatically.
 * @param {Function} action    The action, e.g. () => btn.click(). null = screenshot only.
 * @param {object}   opts
 * @param {Function} opts.waitFor   Waits for the result of the action (element shown, screen changed…)
 * @param {boolean}  opts.settle    Also wait for the UI to stop changing (default true)
 * @param {number}   opts.settleTimeout
 */
export async function step(name, action, { waitFor, settle = true, settleTimeout = 4000 } = {}) {
  if (!currentTest || currentStep) {          // not in a test, or nested step → just run it
    const r = action ? await action() : undefined;
    if (waitFor) await waitFor(r);
    return r;
  }
  const s = newStep(name);
  currentStep = s;
  const t0 = Date.now();
  try {
    await denyPermissionPopupIfShown();                 // popup would block the action
    const result = action ? await action() : undefined;
    if (waitFor) await waitFor(result);
    if (settle) await waitForUiIdle({ timeout: settleTimeout });
    await denyPermissionPopupIfShown();                 // popup appeared as a result of the action
    currentStep = null;
    await finishStep(s, 'passed', null, t0);
    return result;
  } catch (err) {
    currentStep = null;
    await finishStep(s, 'failed', err, t0);
    err.evidenceRecorded = true;
    throw err;
  } finally {
    currentStep = null;
  }
}

/** Screenshot the current screen without performing an action. */
export const checkpoint = (name, opts) => step(name, null, opts);

/**
 * Extra screenshot recorded as its own entry (used for system popups).
 * Throws outside a test so callers can ignore it.
 */
export async function snapshot(name) {
  if (!currentTest) throw new Error('No test running');
  if (capturing) return;
  const parent = currentStep;
  const s = newStep(name, 'auto');
  currentStep = s;
  try { await finishStep(s, 'passed'); } finally { currentStep = parent; }
}

// ---------------------------------------------------------------------------
// Test lifecycle – called from wdio.conf.js hooks
// ---------------------------------------------------------------------------

export function startTest(test) {
  const suite = getSuite(test.parent || 'Tests', test.file);
  let dirName = slug(test.title);
  if (suite.tests.some((t) => t.dirName === dirName)) dirName += `-${suite.tests.length + 1}`;
  const dir = path.join(suite.dir, dirName);
  fs.mkdirSync(dir, { recursive: true });
  currentTest = {
    title: test.title, fullTitle: test.fullTitle || `${test.parent} ${test.title}`,
    dirName, dir, suite, status: 'running', startedAt: iso(), durationMs: 0, steps: [], log: [],
  };
}

export async function endTest(test, { error, passed, duration } = {}) {
  if (!currentTest) return;
  const t = currentTest;
  t.status = passed ? 'passed' : 'failed';
  t.durationMs = duration ?? Date.now() - Date.parse(t.startedAt);
  t.finishedAt = iso();
  if (!passed) {
    t.error = errorInfo(error) || { message: 'Test failed' };
    // Failure outside a step (e.g. an expect) → capture the final screen as a failed step
    if (!error?.evidenceRecorded) {
      const s = newStep('Failure', 'auto');
      await finishStep(s, 'failed', error || new Error('Test failed'));
    }
  } else if (t.steps.length === 0) {
    const s = newStep('Final screen', 'auto');
    await finishStep(s, 'passed');
  }
  const { dir, suite, ...record } = t;
  suite.tests.push(record);
  suite.finishedAt = iso();
  writeSuite(suite);
  currentTest = null;
  currentStep = null;
}

/** A before/after hook failed (the test itself never ran or its cleanup broke). */
export async function recordHookFailure(test, hookName, error) {
  const title = `"${hookName}" hook${test?.title && !hookName.includes(test.title) ? `: ${test.title}` : ''}`;
  startTest({ title, parent: test?.parent || 'Hooks', file: test?.file });
  currentTest.kind = 'hook';
  await endTest(null, { error, passed: false });
}

/** Write every suite once more (wdio.conf.js → after). */
export function flushSuites() {
  for (const s of suites.values()) writeSuite(s);
}

/** Kept for older specs – tests are now recorded automatically via wdio.conf.js hooks. */
export function useEvidence() {}