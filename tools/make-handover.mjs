// tools/make-handover.mjs
// Packs the project + deliverables into handover/instagram-appium-tests-handover.zip
//   - leaves out node_modules, reports, logs, allure-results, locators/, .env, previous handovers
//   - replaces test/data/users.js with the credential-free template (deliverables/05-test-data/users.example.js)
//   - refreshes the locator catalogue first
// Usage: npm run handover

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'handover');
const ZIP = path.join(OUT_DIR, 'instagram-appium-tests-handover.zip');
const PREFIX = 'instagram-appium-tests/';
const EXCLUDE_DIRS = new Set(['node_modules', 'reports', 'logs', 'allure-results', 'locators', 'handover', '.git']);
const EXCLUDE_FILES = new Set(['.env', 'clickables.json', 'extract-clickables.js']);
const REPLACE = { 'test/data/users.js': 'deliverables/05-test-data/users.example.js' };

// keep the catalogue in sync with the code
try { execFileSync(process.execPath, ['tools/export-locators.mjs'], { stdio: 'inherit' }); } catch { /* optional */ }

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return EXCLUDE_DIRS.has(d.name) ? [] : walk(p);
    return EXCLUDE_FILES.has(d.name) ? [] : [p];
  });
}

// --- minimal ZIP writer (deflate) ---------------------------------------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
});
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function dosTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function zip(entries) {
  const locals = []; const centrals = []; let offset = 0;
  for (const { name, data, mtime } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data); const { time, date } = dosTime(mtime);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, comp);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cdSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

// --- collect ------------------------------------------------------------
const files = walk(ROOT).map((abs) => path.relative(ROOT, abs).split(path.sep).join('/')).sort();
const entries = files.map((rel) => {
  const src = REPLACE[rel] ? path.join(ROOT, REPLACE[rel]) : path.join(ROOT, rel);
  return { name: PREFIX + rel, data: fs.readFileSync(src), mtime: fs.statSync(src).mtime };
});

// safety check: no known secret values in the package
const envSecrets = ['IG_VALID_PASSWORD', 'IG_INVALID_PASSWORD'].map((k) => process.env[k]).filter((v) => v && v.length >= 4);
for (const e of entries) {
  for (const s of envSecrets) if (e.data.includes(s)) throw new Error(`Secret found in ${e.name} – aborting`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(ZIP, zip(entries));
console.log(`${entries.length} files → ${ZIP} (${(fs.statSync(ZIP).size / 1024).toFixed(0)} KB)`);
console.log(`users.js replaced with the credential-free template.`);