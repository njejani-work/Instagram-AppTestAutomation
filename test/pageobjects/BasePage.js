// test/pageobjects/BasePage.js
// Shared bits for Instagram screens: bottom tab bar + swipe / scroll helpers.

import { denyPermissionPopupIfShown } from '../helpers/permissions.js';
import { saveDebugSource } from '../helpers/evidence.js';

export const ID = (id) => `id=com.instagram.android:id/${id}`;
export const ui = (selector) => `android=new UiSelector()${selector}`;
export const str = (s) => JSON.stringify(s);

export default class BasePage {
  // ---------- Bottom tab bar (same on every main screen) ----------
  get homeTab()    { return $(ID('feed_tab')); }
  get reelsTab()   { return $(ID('clips_tab')); }      // "~Reels" also matches the profile Reels tab
  get messageTab() { return $(ID('direct_tab')); }
  get searchTab()  { return $(ID('search_tab')); }
  get profileTab() { return $(ID('profile_tab')); }

  /**
   * Tap a bottom tab and (optionally) confirm the screen changed.
   * Tries the resource-id, then the content-desc; if the tap doesn't register,
   * retries with a coordinate tap in the middle of the tab.
   */
  async tapTab(id, desc, isOpen, { timeout = 8000, findTimeout = 30000 } = {}) {
    const candidates = [$(ID(id)), $(`~${desc}`)];
    let tab;

    // WAIT for the tab, like ensureLoggedOut() → currentScreen() does, instead of checking once.
    // A system popup (notification permission) or a loading screen hides the whole tab bar;
    // each poll denies the popup, so the tab reappears and gets found.
    try {
      await browser.waitUntil(async () => {
        await denyPermissionPopupIfShown();
        for (const c of candidates) {
          if (await c.isDisplayed().catch(() => false)) { tab = c; return true; }
        }
        return false;
      }, { timeout: findTimeout, interval: 700 });
    } catch {
      const file = await saveDebugSource(`reports/debug/${desc.toLowerCase()}-tab-not-found-${Date.now()}.xml`);
      throw new Error(`"${desc}" tab not found within ${findTimeout / 1000}s (tried id=${id} and ~${desc}). `
        + `Page source: reports/debug/${file}`);
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      await denyPermissionPopupIfShown();   // popup may have appeared since the tab was found
      if (attempt === 1) {
        await tab.click();
      } else {
        const r = await this.rect(tab);
        await driver.execute('mobile: clickGesture', {
          x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
        });
      }
      if (!isOpen) return;
      try {
        await browser.waitUntil(isOpen, { timeout, interval: 500 });
        return;
      } catch {
        console.warn(`[tabs] "${desc}" tap #${attempt} didn't open the screen, retrying`);
      }
    }
    const file = await saveDebugSource(`reports/debug/${desc.toLowerCase()}-tab-no-effect-${Date.now()}.xml`);
    throw new Error(`Tapped the "${desc}" tab 3 times but the screen did not open. Page source: reports/debug/${file}`);
  }

  async goToHome()     { await this.tapTab('feed_tab', 'Home'); }
  async goToReels()    { await this.tapTab('clips_tab', 'Reels'); }
  async goToMessages() { await this.tapTab('direct_tab', 'Message'); }
  async goToSearch()   { await this.tapTab('search_tab', 'Search and explore'); }
  /**
   * The ONE way to open the Profile tab – the same logic the forced logout uses:
   * clear popups, tap the tab by id (fallback content-desc / coordinates), wait for "Edit profile".
   * Every page object's goToProfile() and ProfilePage.open() end up here.
   */
  async goToProfile({ timeout = 20000 } = {}) {
    const isProfile = () => $('~Edit profile').isDisplayed();
    await denyPermissionPopupIfShown();
    if (await isProfile()) return;                         // already there
    if (await driver.isKeyboardShown().catch(() => false)) await driver.hideKeyboard(); // can cover the tab bar
    await this.tapTab('profile_tab', 'Profile', isProfile);
    await $('~Edit profile').waitForDisplayed({ timeout, timeoutMsg: 'Profile page did not load' });
  }

  // ---------- Geometry ----------
  async rect(el) {
    const e = await el;
    const { x, y } = await e.getLocation();
    const { width, height } = await e.getSize();
    return { x, y, width, height };
  }

  /** Area between a top element (e.g. action bar) and the bottom tab bar. */
  async scrollAreaBelow(topEl) {
    const top = await this.rect(topEl);
    const tabs = await this.rect(this.homeTab);
    const { width } = await driver.getWindowSize();
    const y = top.y + top.height;
    return { left: 0, top: y, width, height: tabs.y - y };
  }

  /** Full-width horizontal strip at the height of an element (for carousels / trays). */
  async rowAreaOf(el) {
    const r = await this.rect(el);
    const { width } = await driver.getWindowSize();
    return { left: 0, top: r.y, width, height: r.height };
  }

  // ---------- Safe gestures ----------
  // Android reserves screen edges for system gestures:
  //   bottom edge (swipe up)  → Home / Recents     left & right edges → Back
  //   top edge (swipe down)   → notification shade
  // Every swipe below is kept inside a safe zone away from those edges, and is
  // drawn as an explicit start→end touch path from the middle of the area
  // (mobile: swipeGesture starts at the area's edge, which is what hit the Home gesture).

  async systemInsets() {
    if (BasePage._insets) return BasePage._insets;
    const { width, height } = await driver.getWindowSize();
    let statusBar = Math.round(height * 0.04);
    let navBar = Math.round(height * 0.05);
    try {
      const bars = await driver.getSystemBars();
      if (bars?.statusBar?.height) statusBar = bars.statusBar.height;
      if (bars?.navigationBar) navBar = bars.navigationBar.visible === false ? 0 : (bars.navigationBar.height || navBar);
    } catch { /* fall back to estimates */ }
    BasePage._insets = { width, height, statusBar, navBar };
    return BasePage._insets;
  }

  /** Shrink an area so no part of it touches a system-gesture zone. */
  async safeArea(area) {
    const s = await this.systemInsets();
    const edgeX = Math.round(s.width * 0.12);                        // back-gesture zones
    const minTop = s.statusBar + Math.round(s.height * 0.04);        // notification shade
    const maxBottom = s.height - s.navBar - Math.round(s.height * 0.12); // home-gesture zone

    const left = Math.max(area.left ?? 0, edgeX);
    const right = Math.min((area.left ?? 0) + (area.width ?? s.width), s.width - edgeX);
    const top = Math.max(area.top ?? 0, minTop);
    const bottom = Math.min((area.top ?? 0) + (area.height ?? s.height), maxBottom);

    if (right - left < 40 || bottom - top < 40) {
      throw new Error(`Swipe area too small after removing gesture zones: ${JSON.stringify(area)}`);
    }
    return { left, top, width: right - left, height: bottom - top };
  }

  /**
   * Swipe inside `area`. direction = where the finger moves ('up' scrolls content down).
   * `percent` = swipe length as a share of the safe area, centred in it.
   */
  async swipe(area, direction, percent = 0.6, { duration = 450 } = {}) {
    const a = await this.safeArea(area);
    const cx = Math.round(a.left + a.width / 2);
    const cy = Math.round(a.top + a.height / 2);
    const dx = Math.round((a.width * percent) / 2);
    const dy = Math.round((a.height * percent) / 2);

    const path = {
      up:    [[cx, cy + dy], [cx, cy - dy]],
      down:  [[cx, cy - dy], [cx, cy + dy]],
      left:  [[cx + dx, cy], [cx - dx, cy]],
      right: [[cx - dx, cy], [cx + dx, cy]],
    }[direction];
    if (!path) throw new Error(`Unknown swipe direction "${direction}"`);
    const [[x1, y1], [x2, y2]] = path;

    await driver.action('pointer', { parameters: { pointerType: 'touch' } })
      .move({ x: x1, y: y1 })
      .down()
      .pause(80)
      .move({ x: x2, y: y2, duration })
      .pause(80)      // hold briefly before lifting → controlled scroll, not a fling
      .up()
      .perform();
    await driver.pause(400);
  }

  /** Scroll until `getEl()` is displayed. direction 'up' = content moves up = scroll down. */
  async scrollUntil(getEl, area, { direction = 'up', maxSwipes = 10, label = 'element' } = {}) {
    for (let i = 0; i <= maxSwipes; i++) {
      const el = await getEl();
      if (await el.isDisplayed()) return el;
      await this.swipe(area, direction);
    }
    throw new Error(`${label} not found after ${maxSwipes} swipes`);
  }

  /** "1,234" / "12.5K" / "3M" / "0followers" → number */
  parseCount(raw = '') {
    const m = String(raw).replace(/,/g, '').match(/([\d.]+)\s*([KkMm])?/);
    if (!m) return NaN;
    const n = parseFloat(m[1]);
    return Math.round(m[2] ? n * (m[2].toLowerCase() === 'k' ? 1e3 : 1e6) : n);
  }
}