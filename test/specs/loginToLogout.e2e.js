// test/specs/loginToLogout.e2e.js
// End-to-end flow: login → home → profile → settings menu → log out, screenshot after every action.
// Evidence → reports/screenshots/login-to-logout/index.html

import LoginPage from '../pageobjects/LoginPage.js';
import HomePage from '../pageobjects/HomePage.js';
import ProfilePage from '../pageobjects/ProfilePage.js';
import MenuPage from '../pageobjects/MenuPage.js';
import { users } from '../data/users.js';
import { useEvidence, step, checkpoint } from '../helpers/evidence.js';
import { ensureLoggedOut } from '../helpers/session.js';

describe('Login to logout', function () {
  this.timeout(8 * 60 * 1000);
  useEvidence('Login to logout');

  before(async () => {
    await ensureLoggedOut();
  });

  it('logs in, visits home and profile, then logs out', async () => {
    // ---------- Login ----------
    await checkpoint('App opened on login screen');

    await step('Tap "Use another profile"', () => LoginPage.chooseAnotherProfile(), {
      waitFor: () => LoginPage.usernameInput.waitForDisplayed(),
    });

    await step('Enter username', () => LoginPage.usernameInput.setValue(users.valid.username), {
      waitFor: async () => expect(LoginPage.usernameInput).toHaveText(users.valid.username),
    });

    await step('Enter password', () => LoginPage.passwordInput.setValue(users.valid.password));

    await step('Hide keyboard', async () => {
      if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    });

    await step('Tap "Log in"', () => LoginPage.logInBtn.click(), {
      waitFor: () => browser.waitUntil(
        async () => (await LoginPage.notNowBtn.isDisplayed()) || (await HomePage.isInMainApp()),
        { timeout: 45000, timeoutMsg: 'Neither the save-login prompt nor the home feed appeared after login' },
      ),
    });

    if (await LoginPage.notNowBtn.isDisplayed()) {
      await step('Tap "Not now" on save login info', () => LoginPage.notNowBtn.click(), {
        waitFor: () => HomePage.waitForLoad(45000),
      });
    } else {
      await step('Home feed loaded', null, { waitFor: () => HomePage.waitForLoad(45000) });
    }

    // ---------- Profile ----------
    // No feed scrolling here: pulling the feed down (or tapping Home at the top) starts a
    // feed refresh, and the Profile tap gets lost while it's refreshing.
    await step('Open Profile tab', () => ProfilePage.open(), {   // same path as the forced logout
      waitFor: () => ProfilePage.waitForLoad(),
    });

    const stats = await ProfilePage.getStats();
    console.log('Logged in as:', stats);
    expect(stats.username).not.toBe('');

    // ---------- Settings menu ----------
    await step('Open Options menu', () => ProfilePage.openOptions(), {
      waitFor: () => MenuPage.waitForLoad(),
    });

    await step('Scroll menu to bottom', () => MenuPage.scrollToBottom(), {
      waitFor: () => MenuPage.logOutBtn.waitForDisplayed(),
    });

    // ---------- Log out ----------
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

    // ---------- Back on login ----------
    await step('Logged out – login screen shown', null, {
      waitFor: () => LoginPage.waitForLoad(45000),
    });
    expect(await HomePage.isLoaded()).toBe(false);
  });
});