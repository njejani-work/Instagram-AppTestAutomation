// tools/setup.mjs – check the prerequisites and create missing project files.
// Usage: npm run setup
//   ✓ Node ≥ 20   ✓ JAVA_HOME + java   ✓ ANDROID_HOME + adb   ✓ device connected   ✓ node_modules / appium driver
//   creates .env (from .env.example) and .gitignore when missing – never overwrites

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { ensureRootFiles } from './build-deliverables.mjs';

const win = process.platform === 'win32';
const results = [];
const ok = (name, detail) => results.push(['✓', name, detail]);
const bad = (name, detail, fix) => results.push(['✖', name, detail, fix]);
const warn = (name, detail, fix) => results.push(['!', name, detail, fix]);
const run = (cmd) => {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 }).toString().trim(); } catch (e) {
    return e.stderr?.toString().trim() || e.stdout?.toString().trim() || null;
  }
};
const exe = (dir, name) => path.join(dir, 'bin', win ? `${name}.exe` : name);

// Node
const major = Number(process.versions.node.split('.')[0]);
major >= 20 ? ok('Node.js', process.version) : bad('Node.js', process.version, 'Install Node 20 LTS or newer');

// Java
const javaHome = process.env.JAVA_HOME;
const candidates = win
  ? ['C:\\Program Files\\Android\\Android Studio\\jbr', 'C:\\Program Files\\Android\\Android Studio\\jre']
  : ['/Applications/Android Studio.app/Contents/jbr/Contents/Home', '/opt/android-studio/jbr', path.join(os.homedir(), 'android-studio/jbr')];
if (javaHome && fs.existsSync(exe(javaHome, 'java'))) {
  ok('JAVA_HOME', javaHome);
} else {
  const found = candidates.find((c) => fs.existsSync(exe(c, 'java')));
  bad('JAVA_HOME', javaHome ? `set but no java in ${javaHome}` : 'not set',
    win
      ? `[Environment]::SetEnvironmentVariable("JAVA_HOME", "${found || 'C:\\path\\to\\jdk-17'}", "User")  → then open a NEW terminal`
      : `export JAVA_HOME="${found || '/path/to/jdk-17'}"  (add to ~/.zshrc or ~/.bashrc)`);
}

// Android SDK + adb
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const defaultSdk = win ? path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
  : process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Android/sdk') : path.join(os.homedir(), 'Android/Sdk');
if (sdk && fs.existsSync(sdk)) ok('ANDROID_HOME', sdk);
else bad('ANDROID_HOME', sdk ? `set but missing: ${sdk}` : 'not set',
  win ? `[Environment]::SetEnvironmentVariable("ANDROID_HOME", "${defaultSdk}", "User")` : `export ANDROID_HOME="${defaultSdk}"`);

const adbVersion = run('adb version');
if (adbVersion && /Android Debug Bridge/.test(adbVersion)) {
  ok('adb', adbVersion.split('\n')[0]);
  const devices = (run('adb devices') || '').split('\n').slice(1).filter((l) => /\tdevice$/.test(l)).map((l) => l.split('\t')[0]);
  devices.length ? ok('Device', devices.join(', ')) : bad('Device', 'none connected', 'Start the emulator (Android Studio → Device Manager), then: npm run devices');
  const want = process.env.DEVICE_NAME;
  if (want && devices.length && !devices.includes(want)) warn('DEVICE_NAME', `${want} not in ${devices.join(', ')}`, 'Fix DEVICE_NAME in .env');
} else {
  bad('adb', 'not found on PATH', `Add ${path.join(sdk || defaultSdk, 'platform-tools')} to PATH`);
}

// Project
fs.existsSync('node_modules') ? ok('node_modules', 'installed') : bad('node_modules', 'missing', 'npm install');
const globalAppium = run('appium -v') || '';
const appium = fs.existsSync(path.join('node_modules', 'appium')) ? 'local (node_modules)' : (/^\d+\.\d+/.test(globalAppium) ? `global ${globalAppium}` : null);
appium ? ok('Appium', appium) : bad('Appium', 'not installed', 'npm i -D appium');
const drivers = run(win ? 'npx appium driver list --installed 2>&1' : 'npx appium driver list --installed 2>&1') || '';
/uiautomator2/i.test(drivers) ? ok('UiAutomator2 driver', 'installed')
  : warn('UiAutomator2 driver', 'not confirmed', 'npm run appium:driver');

const made = ensureRootFiles();
if (made.length) ok('Project files', `created ${made.join(', ')}`);
if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
  fs.copyFileSync('.env.example', '.env');
  warn('.env', 'created from .env.example', 'Fill in IG_VALID_USERNAME / IG_VALID_PASSWORD');
} else if (fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf8');
  /IG_VALID_PASSWORD=(your_test_password)?\s*$/m.test(env) ? warn('.env', 'present, password not filled in', 'Edit .env') : ok('.env', 'present');
}

// Report
const w = Math.max(...results.map((r) => r[1].length));
console.log('\nSetup check\n');
for (const [s, name, detail, fix] of results) {
  console.log(` ${s}  ${name.padEnd(w)}  ${detail}`);
  if (fix) console.log(`    ${' '.repeat(w)}  → ${fix}`);
}
const failed = results.filter((r) => r[0] === '✖').length;
console.log(failed ? `\n${failed} problem(s) – fix them, open a new terminal, run "npm run setup" again.\n`
  : '\nAll required checks passed. Next: npm run check && npm run test:valid\n');
process.exitCode = failed ? 1 : 0;