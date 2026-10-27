// test/helpers/session.js
// Login / logout helpers shared by the specs.
//  - ensureLoggedOut(): silent cleanup (no screenshots) – use in beforeEach / afterEach
//  - logOutSteps():     logout as recorded evidence steps – use at the end of a test

import LoginPage from '../pageobjects/LoginPage.js';
import HomePage from '../pageobjects/HomePage.js';
import ProfilePage from '../pageobjects/ProfilePage.js';
import MenuPage from '../pageobjects/MenuPage.js';
import { denyPermissionPopupIfShown } from './permissions.js';
import { step, saveDebugSource } from './evidence.js';

// ---------------------------------------------------------------------------
// Where is the app right now?
// ---------------------------------------------------------------------------

/**
 * Wait until the app shows a screen we recognise, and say which one.
 * Waiting matters: right after launch the splash screen shows none of them,
 * and checking too early is what made the session look "logged out" when it wasn't.
 */
export async function currentScreen(timeout = 30000) {
  let screen = null;
  try {
    await browser.waitUntil(async () => {
      if (await MenuPage.dialogPrimaryBtn.isDisplayed())       screen = 'dialog';      // Save login info? / Log out?
      else if (await LoginPage.notNowBtn.isDisplayed())        screen = 'saveLogin';   // after login
      else if (await LoginPage.usernameInput.isDisplayed())    screen = 'loginForm';
      else if (await LoginPage.useAnotherProfileBtn.isDisplayed()) screen = 'profilePicker';
      else if (await HomePage.isLoaded())                      screen = 'home';
      else if (await ProfilePage.isLoaded())                   screen = 'profile';
      else if (await MenuPage.isLoaded())                      screen = 'menu';
      else if (await HomePage.isInMainApp())                   screen = 'mainApp';     // some other tab
      else screen = null;
      return screen !== null;
    }, { timeout, interval: 700 });
  } catch {
    const file = await saveDebugSource(`reports/debug/unknown-screen-${Date.now()}.xml`);
    let where = '';
    try { where = ` (package=${await driver.getCurrentPackage()}, activity=${await driver.getCurrentActivity()})`; } catch {}
    throw new Error(`App is not on any known screen${where}. Page source saved to reports/debug/${file}`);
  }
  return screen;
}

const LOGGED_OUT = new Set(['loginForm', 'profilePicker']);

// ---------------------------------------------------------------------------
// Silent cleanup
// ---------------------------------------------------------------------------

/** Log out if a session is active. Ends on the profile picker or the login form. */
export async function ensureLoggedOut() {
  for (let attempt = 0; attempt < 4; attempt++) {
    await denyPermissionPopupIfShown();
    const screen = await currentScreen();
    if (LOGGED_OUT.has(screen)) return;

    switch (screen) {
      case 'saveLogin':
        await LoginPage.notNowBtn.click();
        break;
      case 'dialog': {
        const primary = (await MenuPage.dialogPrimaryBtn.getText()).trim().toLowerCase();
        await (primary === 'log out' ? MenuPage.dialogPrimaryBtn : MenuPage.dialogNegativeBtn).click();
        break;
      }
      case 'menu':
        await MenuPage.logOut();
        break;
      case 'home':
      case 'profile':
      case 'mainApp':
        await MenuPage.open();
        await MenuPage.logOut();
        break;
    }
    await driver.pause(1000);
  }
  // Last resort: restart the app and check once more
  await driver.terminateApp('com.instagram.android');
  await driver.activateApp('com.instagram.android');
  if (!LOGGED_OUT.has(await currentScreen())) throw new Error('Could not log out');
}

/** Log in silently (for specs that only need a session, not login evidence). */
export async function ensureLoggedIn(user) {
  const screen = await currentScreen();
  if (LOGGED_OUT.has(screen)) await LoginPage.loginAs(user);
  else if (screen === 'saveLogin') await LoginPage.notNowBtn.click();
  await HomePage.waitForLoad(45000);
}

// ---------------------------------------------------------------------------
// Logout as evidence steps
// ---------------------------------------------------------------------------

/** Log out via Profile → Options → Log out, with a screenshot after every action. */
export async function logOutSteps() {
  await step('Open Profile tab', () => ProfilePage.open(), {   // same path as the forced logout
    waitFor: () => ProfilePage.waitForLoad(),
  });

  await step('Open Options menu', () => ProfilePage.openOptions(), {
    waitFor: () => MenuPage.waitForLoad(),
  });

  await step('Scroll menu to bottom', () => MenuPage.scrollToBottom(), {
    waitFor: () => MenuPage.logOutBtn.waitForDisplayed(),
  });

  await step('Tap "Log out"', () => MenuPage.logOutBtn.click(), {
    waitFor: () => MenuPage.dialogPrimaryBtn.waitForDisplayed({ timeout: 15000 }),
  });

  // Up to two dialogs, in either order: "Save your login info?" and "Log out?"
  for (let i = 0; i < 2; i++) {
    if (!(await MenuPage.dialogPrimaryBtn.isDisplayed())) break;
    const primary = (await MenuPage.dialogPrimaryBtn.getText()).trim();

    if (/^save$/i.test(primary)) {
      await step('Tap "Not now" on save login info', () => MenuPage.dialogNegativeBtn.click(), {
        waitFor: () => browser.waitUntil(async () =>
          !(await MenuPage.dialogPrimaryBtn.isDisplayed())
          || !/^save$/i.test(await MenuPage.dialogPrimaryBtn.getText()), { timeout: 15000 }),
      });
    } else if (/^log out$/i.test(primary)) {
      await step('Confirm "Log out"', () => MenuPage.dialogPrimaryBtn.click(), {
        waitFor: () => LoginPage.waitForLoad(45000),
      });
    } else {
      throw new Error(`Unexpected dialog button "${primary}"`);
    }
  }

  await step('Logged out – login screen shown', null, {
    waitFor: () => LoginPage.waitForLoad(45000),
  });
}