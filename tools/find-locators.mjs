// tools/find-locators.mjs
//
// Live mode (Appium running):   node tools/find-locators.mjs
//   Enter        = dump current screen → locators/screen-N.xml / .png / .json
//   <selector>   = test a selector on the live screen
//   q            = quit
//
// Offline mode (no device):     node tools/find-locators.mjs --file locators/screen-1.xml
//   Builds the JSON from a saved page-source XML.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

const CAPS = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'emulator-5554',
  'appium:appPackage': 'com.instagram.android',          // com.wdiodemoapp
  'appium:appActivity': '.activity.MainTabActivity',     // .MainActivity   (no "package/" prefix here)
  'appium:appWaitActivity': '*',
  'appium:noReset': true,
  'appium:newCommandTimeout': 600,
};

// ---------- XML → tree ----------
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, '\n').replace(/&amp;/g, '&');

function parseTree(xml) {
  const root = { children: [] };
  const stack = [root];
  const all = [];
  const tagRe = /<(\/?)([A-Za-z][\w.$]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;
  for (const [, closing, tag, attrs, selfClose] of xml.matchAll(tagRe)) {
    if (closing) { stack.pop(); continue; }
    const el = { cls: tag, children: [], parent: stack.at(-1) };
    for (const [, k, v] of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) el[k] = decode(v);
    el.cls = el.class || tag;
    stack.at(-1).children.push(el);
    all.push(el);
    if (!selfClose) stack.push(el);
  }
  return all.filter((e) => e.cls !== 'hierarchy');
}

const descendants = (el) => el.children.flatMap((c) => [c, ...descendants(c)]);
const isClickable = (e) => e.clickable === 'true' || e['long-clickable'] === 'true';
const isInput = (e) => /EditText|TextField|SearchView/.test(e.cls);

// ---------- selector builders ----------
const xq = (s) => (s.includes("'") ? `"${s}"` : `'${s}'`);   // XPath string literal
const js = (s) => JSON.stringify(s);                         // UiSelector string literal

// First visible text inside an element (button labels, field placeholders)
function childLabel(el) {
  for (const d of descendants(el)) {
    if (d.text) return { attr: 'text', value: d.text };
    if (d['content-desc']) return { attr: 'content-desc', value: d['content-desc'] };
  }
  return null;
}

// Build every candidate locator for an element and count its matches in the tree
function candidates(el, all) {
  const cls = el.cls;
  const desc = el['content-desc'];
  const id = el['resource-id'];
  const text = el.text;
  const out = [];
  const add = (strategy, selector, matches) => out.push({ strategy, selector, matches: matches.length });

  if (desc) add('accessibility id', `~${desc}`, all.filter((e) => e['content-desc'] === desc));
  if (id) add('id', `id=${id}`, all.filter((e) => e['resource-id'] === id));
  if (id && desc) add('uiautomator', `android=new UiSelector().resourceId(${js(id)}).description(${js(desc)})`,
    all.filter((e) => e['resource-id'] === id && e['content-desc'] === desc));
  if (desc) add('uiautomator', `android=new UiSelector().className(${js(cls)}).description(${js(desc)})`,
    all.filter((e) => e.cls === cls && e['content-desc'] === desc));
  if (text) add('uiautomator', `android=new UiSelector().className(${js(cls)}).text(${js(text)})`,
    all.filter((e) => e.cls === cls && e.text === text));
  if (isInput(el)) {
    const pw = el.password === 'true' ? 'true' : 'false';
    add('xpath', `//${cls}[@password=${xq(pw)}]`, all.filter((e) => e.cls === cls && (e.password || 'false') === pw));
  }
  // Clickable container without own attributes → nearest clickable ancestor of its label
  const lbl = !desc && !id && !text ? childLabel(el) : null;
  if (lbl) {
    const hits = all.filter((e) => e[lbl.attr] === lbl.value)
      .map((e) => { let p = e.parent; while (p && p.cls && !isClickable(p)) p = p.parent; return p; })
      .filter((p) => p === el);
    add('xpath', `//*[@${lbl.attr}=${xq(lbl.value)}]/ancestor::*[@clickable='true'][1]`, hits);
  }
  // Last resort: class + instance index
  const sameCls = all.filter((e) => e.cls === cls);
  add('uiautomator (index, fragile)', `android=new UiSelector().className(${js(cls)}).instance(${sameCls.indexOf(el)})`, [el]);

  return { out, lbl };
}

// ---------- naming ----------
const SUFFIX = { Button: 'Btn', ImageButton: 'Btn', EditText: 'Input', CheckBox: 'Checkbox', Switch: 'Switch',
  RadioButton: 'Radio', ImageView: 'Img', TextView: 'Text', Spinner: 'Dropdown' };

function camel(s) {
  const words = s.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).slice(0, 4);
  return words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('') || 'element';
}

function nameFor(el, lbl, used) {
  const raw = el['content-desc'] || el.text || el['resource-id']?.split('/').pop() || lbl?.value || el.cls.split('.').pop();
  const short = el.cls.split('.').pop();
  let base = camel(raw);
  const suf = SUFFIX[short] || (isClickable(el) && short.includes('Group') ? 'Btn' : '');
  if (suf && !base.toLowerCase().endsWith(suf.toLowerCase())) base += suf;
  let name = base, i = 2;
  while (used.has(name)) name = `${base}${i++}`;
  used.add(name);
  return name;
}

// ---------- main extraction ----------
function buildLocators(xml) {
  const all = parseTree(xml);

  // Interactive elements, minus wrapper containers that just hold another clickable/input
  const targets = all.filter((e) => (isClickable(e) || isInput(e)) && e.enabled !== 'false')
    .filter((e) => !(isClickable(e) && !isInput(e) && !e['content-desc'] && !e.text && !e['resource-id']
      && descendants(e).some((d) => isClickable(d) || isInput(d))));

  const used = new Set();
  const locators = {};
  const details = {};

  for (const el of targets) {
    const { out, lbl } = candidates(el, all);
    const best = out.find((c) => c.matches === 1) || out.at(-1);
    const name = nameFor(el, lbl, used);
    locators[name] = best.selector;
    details[name] = {
      selector: best.selector,
      strategy: best.strategy,
      unique: best.matches === 1,
      class: el.cls,
      text: el.text || undefined,
      contentDesc: el['content-desc'] || undefined,
      resourceId: el['resource-id'] || undefined,
      label: lbl?.value,
      password: el.password === 'true' || undefined,
      bounds: el.bounds,
      alternatives: out.filter((c) => c !== best && c.matches === 1).map((c) => c.selector),
    };
  }
  return { locators, details };
}

function writeJson(n, result, meta = {}) {
  fs.mkdirSync('locators', { recursive: true });
  const file = `locators/screen-${n}.json`;
  fs.writeFileSync(file, JSON.stringify({ screen: n, ...meta, capturedAt: new Date().toISOString(), ...result }, null, 2));

  console.table(Object.entries(result.details).map(([name, d]) => ({
    name,
    strategy: d.strategy,
    selector: d.selector.length > 70 ? d.selector.slice(0, 69) + '…' : d.selector,
    unique: d.unique ? '✓' : '⚠',
    verified: d.verified === undefined ? '' : d.verified ? '✓' : '✗',
  })));
  console.log('\n' + JSON.stringify(result.locators, null, 2));
  console.log(`\nSaved ${file}\n`);
}

// ---------- offline mode ----------
if (process.argv[2] === '--file') {
  const xmlFile = process.argv[3];
  const n = path.basename(xmlFile).match(/(\d+)/)?.[1] ?? 'offline';
  writeJson(n, buildLocators(fs.readFileSync(xmlFile, 'utf8')), { source: xmlFile });
  process.exit(0);
}

// ---------- live mode ----------
const { remote } = await import('webdriverio');
const driver = await remote({ hostname: '127.0.0.1', port: 4723, logLevel: 'error', capabilities: CAPS });

async function dumpScreen(n) {
  const xml = await driver.getPageSource();
  fs.mkdirSync('locators', { recursive: true });
  fs.writeFileSync(`locators/screen-${n}.xml`, xml);
  await driver.saveScreenshot(`locators/screen-${n}.png`);

  const result = buildLocators(xml);

  // Confirm each chosen selector against the live app
  for (const d of Object.values(result.details)) {
    try { d.verified = (await driver.$$(d.selector)).length === 1; } catch { d.verified = false; }
  }

  const meta = {};
  try {
    meta.package = await driver.getCurrentPackage();
    meta.activity = await driver.getCurrentActivity();
  } catch { /* not critical */ }

  writeJson(n, result, meta);
}

async function testSelector(sel) {
  try {
    const found = await driver.$$(sel);
    if (found.length === 0) return console.log('❌ Not found\n');
    console.log(`✅ Found ${found.length} element(s)${found.length > 1 ? '  ⚠ not unique' : ''}`);
    for (const el of found.slice(0, 5)) {
      console.log(`   displayed=${await el.isDisplayed()}  text="${await el.getText()}"`);
    }
    console.log();
  } catch (err) {
    console.log('⚠ Invalid selector:', err.message, '\n');
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('Enter = dump current screen | type a selector to test it | q = quit\n');
let n = 1;
while (fs.existsSync(`locators/screen-${n}.json`)) n++;   // don't overwrite earlier dumps
try {
  while (true) {
    const input = (await rl.question('> ')).trim();
    if (input === 'q') break;
    if (input === '') await dumpScreen(n++);
    else await testSelector(input);
  }
} finally {
  rl.close();
  await driver.deleteSession();
}
