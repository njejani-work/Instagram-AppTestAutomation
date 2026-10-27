// test/specs/login.e2e.js
// Login suite: valid + invalid credentials, with a screenshot after every action.
// Every test starts logged out and leaves the app logged out (Instagram keeps the session otherwise).
// Evidence → reports/screenshots/login/index.html

import LoginPage from '../pageobjects/LoginPage.js';
import HomePage from '../pageobjects/HomePage.js';
import { users } from '../data/users.js';
import { useEvidence, step, checkpoint } from '../helpers/evidence.js';
import { ensureLoggedOut, logOutSteps } from '../helpers/session.js';

/** Shared steps: profile picker → login form → type credentials (no tap on Log in). */
async function enterCredentials(user, label = '') {
  await checkpoint('App opened on login screen');

  await step('Tap "Use another profile"', () => LoginPage.chooseAnotherProfile(), {
    waitFor: () => LoginPage.usernameInput.waitForDisplayed(),
  });

  await step(`Enter ${label}username`, () => LoginPage.usernameInput.setValue(user.username), {
    waitFor: async () => expect(LoginPage.usernameInput).toHaveText(user.username),
  });

  await step(`Enter ${label}password`, () => LoginPage.passwordInput.setValue(user.password));

  await step('Hide keyboard', async () => {
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
  });
}

describe('Login', function () {
  this.timeout(6 * 60 * 1000);
  useEvidence('Login');

  // Start every test from the login screen
  beforeEach(async () => {
    await ensureLoggedOut();
  });

  // Safety net: if a test failed before its own logout steps, log out here
  // so the next test doesn't land on the home feed.
  afterEach(async () => {
    try {
      await ensureLoggedOut();
    } catch (err) {
      console.warn(`Cleanup logout failed: ${err.message}`);
    }
  });

  it('logs in with valid credentials', async () => {
    await enterCredentials(users.valid);

    await step('Tap "Log in"', () => LoginPage.logInBtn.click(), {
      // Either the "Save your login info?" prompt or the home feed comes next
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
      await checkpoint('Save login info prompt not shown');
    }

    await step('Home feed loaded', null, { waitFor: () => HomePage.waitForLoad(45000) });
    expect(await HomePage.isInMainApp()).toBe(true);
    await expect(LoginPage.usernameInput).not.toBeDisplayed();

    // Log out so the next test starts from the login screen
    await logOutSteps();
    expect(await HomePage.isInMainApp()).toBe(false);
  });

  it('shows an error for invalid credentials', async () => {
    await enterCredentials(users.invalid, 'invalid ');

    let message;
    await step('Tap "Log in"', () => LoginPage.logInBtn.click(), {
      waitFor: async () => { message = await LoginPage.waitForLoginError(45000); },
    });
    console.log(`Login error shown: "${message}"`);

    await step('Dismiss error', () => LoginPage.dismissLoginError(), {
      waitFor: () => LoginPage.usernameInput.waitForDisplayed(),
    });

    await checkpoint('Still on login screen');
    await expect(LoginPage.usernameInput).toBeDisplayed();
    expect(await HomePage.isLoaded()).toBe(false);
    // Not logged in → nothing to log out (afterEach checks anyway)
  });
});