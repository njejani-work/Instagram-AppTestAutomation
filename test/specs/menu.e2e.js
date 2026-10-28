// test/specs/menu.e2e.js
// Settings and activity menu: options, scrolling, search, log out.
// Every action is a step → screenshot + log on the dashboard.

import LoginPage from '../pageobjects/LoginPage.js';
import MenuPage, { MENU } from '../pageobjects/MenuPage.js';
import { users } from '../data/users.js';
import { step } from '../helpers/evidence.js';
import { ensureLoggedIn } from '../helpers/session.js';

const openMenu = () => step('Open settings menu (Profile → Options)', () => MenuPage.open(), {
  waitFor: () => MenuPage.waitForLoad(),
});

describe('Settings menu', function () {
  this.timeout(8 * 60 * 1000);

  before(async () => {
    await ensureLoggedIn(users.valid);
  });

  it('opens each top-level option and returns', async () => {
    await openMenu();
    for (const label of [MENU.saved, MENU.archive, MENU.yourActivity, MENU.timeManagement, MENU.about]) {
      await step(`Open "${label}"`, () => MenuPage.selectOption(label), {
        waitFor: () => browser.waitUntil(async () => !(await MenuPage.option(label).isDisplayed()), {
          timeout: 15000, timeoutMsg: `"${label}" did not open`,
        }),
      });
      await step(`Back from "${label}"`, () => driver.back(), {
        waitFor: () => MenuPage.waitForLoad(),
      });
    }
  });

  it('scrolls to the bottom and back to the top', async () => {
    await openMenu();
    await step('Scroll to bottom', () => MenuPage.scrollToBottom(), {
      waitFor: async () => {
        await expect(MenuPage.logOutBtn).toBeDisplayed();
        await expect(MenuPage.addProfileBtn).toBeDisplayed();
      },
    });
    await step('Scroll to top', () => MenuPage.scrollToTop(), {
      waitFor: () => expect(MenuPage.searchInput).toBeDisplayed(),
    });
  });

  it('searches the menu', async () => {
    await openMenu();
    await step('Search "Saved"', () => MenuPage.search('Saved'), {
      waitFor: () => expect(MenuPage.option('Saved')).toBeDisplayed(),
    });
    await step('Clear search', () => MenuPage.clearSearch());
  });

  it('cancels log out, then logs out without saving login info', async () => {
    await openMenu();
    await step('Tap "Log out", then cancel', () => MenuPage.cancelLogOut(), {
      waitFor: () => expect(MenuPage.logOutBtn).toBeDisplayed(),
    });
    await step('Log out ("Not now" on save info, confirm)', () => MenuPage.logOut({ saveLoginInfo: false }), {
      waitFor: () => LoginPage.waitForLoad(45000),
    });
  });
});