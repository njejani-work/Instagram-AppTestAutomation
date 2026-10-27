// wdio.conf.js – Instagram (Android native app) on a local emulator via Appium
import fs from 'node:fs';
import path from 'node:path';
import { installPermissionGuard, denyPermissionPopupIfShown } from './test/helpers/permissions.js';

const env = process.env;

export const config = {
  // ====================
  // Runner / Appium
  // ====================
  runner: 'local',
  hostname: '127.0.0.1',
  port: 4723,

  services: [
    ['appium', {
      args: {
        address: '127.0.0.1',
        port: 4723,
        log: './logs/appium.log',
      },
    }],
  ],

  // ==================
  // Specs & suites
  // ==================
  specs: ['./test/specs/**/*.e2e.js'],
  exclude: [],

  // Run a group with:  npx wdio run wdio.conf.js --suite login
  suites: {
    login:   ['./test/specs/login.e2e.js'],
    flow:    ['./test/specs/loginToLogout.e2e.js'],
    home:    ['./test/specs/home.e2e.js'],
    profile: ['./test/specs/profile.e2e.js'],
    menu:    ['./test/specs/menu.e2e.js'],
    smoke:   ['./test/specs/login.e2e.js', './test/specs/loginToLogout.e2e.js'],
  },

  // ============
  // Capabilities
  // ============
  // One emulator + a shared logged-in state → specs must run one at a time.
  maxInstances: 1,

  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': env.DEVICE_NAME || 'emulator-5554',
    ...(env.UDID && { 'appium:udid': env.UDID }),
    ...(env.PLATFORM_VERSION && { 'appium:platformVersion': env.PLATFORM_VERSION }),

    'appium:appPackage': 'com.instagram.android',
    'appium:appActivity': '.activity.MainTabActivity',
    'appium:appWaitActivity': '*',

    'appium:noReset': true,              // keep app data (don't wipe the install)
    'appium:forceAppLaunch': true,       // but restart the app at the start of every spec
    'appium:shouldTerminateApp': true,
    'appium:autoGrantPermissions': false,  // we deny the notification popup instead (test/helpers/permissions.js)
    'appium:newCommandTimeout': 300,
    'appium:uiautomator2ServerLaunchTimeout': 90000,
    'appium:adbExecTimeout': 60000,
  }],

  // ===================
  // Test configuration
  // ===================
  logLevel: env.LOG_LEVEL || 'warn',
  outputDir: './logs',
  bail: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 180000,
  connectionRetryCount: 2,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 5 * 60 * 1000,   // login + network + per-step screenshots take a while
  },

  specFileRetries: Number(env.RETRIES || 0),

  reporters: [
    'spec',
    ['junit', {
      outputDir: './reports/junit',
      outputFileFormat: ({ cid }) => `results-${cid}.xml`,
    }],
    ['allure', {
      outputDir: './allure-results',
      disableWebdriverStepsReporting: true,      // don't log every single command
      disableWebdriverScreenshotsReporting: false, // attach every screenshot taken
    }],
  ],

  // =====
  // Hooks
  // =====

  /** Clean old results once before all workers start. */
  onPrepare() {
    for (const dir of ['./allure-results', './reports/junit', './reports/failures']) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync('./logs', { recursive: true });
  },

  /** Make sure the Instagram app is in the foreground before tests start. */
  async before() {
    await driver.setTimeout({ implicit: 0 });
    try {
      await driver.activateApp('com.instagram.android');
    } catch { /* already in foreground */ }

    // Deny the notification-permission popup whenever it appears during any wait.
    // Set DENY_ALL_PERMISSIONS=true to deny every runtime-permission popup, not just notifications.
    installPermissionGuard({ only: env.DENY_ALL_PERMISSIONS === 'true' ? null : /notif/i });
  },

  /** Also check at the start of every test (popup can be up from the previous test). */
  async beforeTest() {
    await denyPermissionPopupIfShown();
  },

  /**
   * Any failing test (also in specs without step evidence) → save a screenshot
   * to reports/failures and attach it to Allure.
   */
  async afterTest(test, context, { passed }) {
    if (passed) return;
    const dir = './reports/failures';
    fs.mkdirSync(dir, { recursive: true });
    const name = `${test.parent} - ${test.title}`.replace(/[^a-z0-9-]+/gi, '_').slice(0, 120);
    await driver.saveScreenshot(path.join(dir, `${name}.png`));
  },

  onComplete(exitCode) {
    console.log('\nScreenshot evidence: reports/screenshots/index.html');
    console.log('JUnit XML:           reports/junit/');
    console.log('Allure report:       npm run report:allure\n');
  },
};