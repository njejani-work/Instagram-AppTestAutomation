// test/pageobjects/MenuPage.js
// Instagram "Settings and activity" menu (Profile → ☰ Options).
// Long vertical list of options + search box, ending with "Add profile" / "Log out".
// Also covers the two log-out dialogs: "Save your login info?" (screen 7) and "Log out?" (screen 8).

import BasePage, { ID, ui, str } from './BasePage.js';
import ProfilePage from './ProfilePage.js';

const xq = (s) => (s.includes("'") ? `"${s}"` : `'${s}'`);

/**
 * Menu options, as their label starts on screen (top → bottom).
 * Rows have no id/content-desc of their own, so they are found by their label text.
 */
export const MENU = {
  // screen 5 (top of menu)
  metaAccount:         'Meta Account',          // "Meta Account, Password, security, personal details…"
  saved:               'Saved',
  archive:             'Archive',
  yourActivity:        'Your activity',
  notifications:       'Notifications',
  timeManagement:      'Time management',
  instagramForTablets: 'Instagram for tablets',
  // screen 6 (bottom of menu)
  accountStatus:       'Account Status',
  about:               'About',
  metaAi:              'Meta AI',
  threads:             'Threads',
  edits:               'Edits',
  moreFromMeta:        'More from Meta',
};

class MenuPage extends BasePage {
  // ---------- Header ----------
  get backBtn()          { return $('~Back'); }
  get searchInput()      { return $('android.widget.EditText'); }   // the only EditText on the screen

  // ---------- Bottom of the list ----------
  get addProfileBtn()    { return $(ui('.className("android.widget.Button").text("Add profile")')); }
  get logOutBtn()        { return $(ui('.className("android.widget.Button").text("Log out")')); }

  // ---------- Dialogs (screens 7 & 8 share the same ids) ----------
  get dialogPrimaryBtn()  { return $(ID('primary_button')); }    // "Save"   | "Log out"
  get dialogNegativeBtn() { return $(ID('negative_button')); }   // "Not now"| "Cancel"

  /**
   * A menu row by its label. Matches the start of the text/content-desc, so
   * option('Meta Account') finds "Meta Account, Password, security, …".
   */
  option(label) {
    const l = xq(label);
    return $(`//*[starts-with(@text, ${l}) or starts-with(@content-desc, ${l})]/ancestor-or-self::*[@clickable='true'][1]`);
  }

  // =====================================================================
  // Page state / navigation
  // =====================================================================

  async waitForLoad(timeout = 15000) {
    await this.backBtn.waitForDisplayed({ timeout, timeoutMsg: 'Settings menu did not load' });
  }

  async isLoaded() {
    if (!(await this.backBtn.isDisplayed())) return false;
    return (await this.searchInput.isExisting()) || (await this.logOutBtn.isExisting());
  }

  /** Open the menu from anywhere in the main app (goes via the Profile tab). */
  async open() {
    await ProfilePage.open();
    await ProfilePage.openOptions();
    await this.waitForLoad();
  }

  async goBack() {
    await this.backBtn.click();
  }

  // =====================================================================
  // Scrolling (no tab bar here: list runs from below the Back button to the screen bottom)
  // =====================================================================

  async #listArea() {
    // The list runs to the very bottom of the screen – the old "height - 40" area let the swipe
    // start inside the Home-gesture zone. safeArea() (in swipe) now trims the bottom/sides off.
    const s = await this.systemInsets();
    let top = s.statusBar;
    if (await this.backBtn.isDisplayed()) {
      const back = await this.rect(this.backBtn);
      top = back.y + back.height;
    }
    return { left: 0, top, width: s.width, height: s.height - top };
  }

  async scrollDown(times = 1) {
    const area = await this.#listArea();
    for (let i = 0; i < times; i++) await this.swipe(area, 'up');
  }

  async scrollUp(times = 1) {
    const area = await this.#listArea();
    for (let i = 0; i < times; i++) await this.swipe(area, 'down');
  }

  async scrollToTop(maxSwipes = 15) {
    const area = await this.#listArea();
    await this.scrollUntil(() => this.searchInput, area, { direction: 'down', maxSwipes, label: 'Top of menu' });
  }

  async scrollToBottom(maxSwipes = 15) {
    const area = await this.#listArea();
    await this.scrollUntil(() => this.logOutBtn, area, { maxSwipes, label: 'Log out button' });
  }

  /**
   * Bring an option into view. Searches downward first, then upward,
   * so it works wherever the list is currently scrolled.
   */
  async scrollToOption(label, maxSwipes = 12) {
    const area = await this.#listArea();
    const get = () => this.option(label);
    try {
      return await this.scrollUntil(get, area, { direction: 'up', maxSwipes, label: `"${label}"` });
    } catch {
      return this.scrollUntil(get, area, { direction: 'down', maxSwipes, label: `"${label}"` });
    }
  }

  // =====================================================================
  // Selecting options
  // =====================================================================

  /** Scroll to an option and tap it. Use a MENU constant or any label text. */
  async selectOption(label) {
    const row = await this.scrollToOption(label);
    await row.click();
  }

  /** Select an option, then come back to the menu (handy for smoke-checking every entry). */
  async openAndReturn(label) {
    await this.selectOption(label);
    await driver.pause(1000);
    await driver.back();
    await this.waitForLoad();
  }

  /** Type into the "Search" box at the top of the menu. */
  async search(text) {
    await this.scrollToTop();
    await this.searchInput.click();
    await this.searchInput.setValue(text);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
  }

  async clearSearch() {
    await this.searchInput.clearValue();
  }

  // Shortcuts for common options
  async openSaved()          { await this.selectOption(MENU.saved); }
  async openArchive()        { await this.selectOption(MENU.archive); }
  async openYourActivity()   { await this.selectOption(MENU.yourActivity); }
  async openNotifications()  { await this.selectOption(MENU.notifications); }
  async openTimeManagement() { await this.selectOption(MENU.timeManagement); }
  async openMetaAccount()    { await this.selectOption(MENU.metaAccount); }
  async openAccountStatus()  { await this.selectOption(MENU.accountStatus); }
  async openAbout()          { await this.selectOption(MENU.about); }

  async addProfile() {
    await this.scrollToBottom();
    await this.addProfileBtn.click();
  }

  // =====================================================================
  // Log out
  // =====================================================================

  /**
   * Tap "Log out" and get through the dialogs:
   *  - "Save your login info?"  (Save / Not now) → depends on saveLoginInfo
   *  - "Log out?"               (Log out / Cancel) → Log out
   * The order and presence of these dialogs varies, so each one is handled as it shows up.
   */
  async logOut({ saveLoginInfo = false, timeout = 15000 } = {}) {
    await this.scrollToBottom();
    await this.logOutBtn.click();

    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (!(await this.dialogPrimaryBtn.isDisplayed())) {
        // No dialog → either still animating, or we're already logged out
        if (!(await this.backBtn.isDisplayed())) return;
        await driver.pause(500);
        continue;
      }
      const primary = (await this.dialogPrimaryBtn.getText()).trim().toLowerCase();
      if (primary === 'save') {
        await (saveLoginInfo ? this.dialogPrimaryBtn : this.dialogNegativeBtn).click();
      } else if (primary === 'log out') {
        await this.dialogPrimaryBtn.click();
      } else {
        throw new Error(`Unexpected dialog with primary button "${primary}"`);
      }
      await driver.pause(800);
    }
    throw new Error('Log out did not complete');
  }

  /** Open the "Log out?" confirmation and back out of it. */
  async cancelLogOut() {
    await this.scrollToBottom();
    await this.logOutBtn.click();
    await this.dialogPrimaryBtn.waitForDisplayed();
    const primary = (await this.dialogPrimaryBtn.getText()).trim().toLowerCase();
    if (primary === 'log out') {
      await this.dialogNegativeBtn.click();          // "Cancel"
    } else {
      // "Save your login info?" — its "Not now" continues the log-out, so dismiss with Back instead
      await driver.back();
    }
    await this.dialogPrimaryBtn.waitForDisplayed({ reverse: true });
    await this.waitForLoad();
  }
}

export default new MenuPage();