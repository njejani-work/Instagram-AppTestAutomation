// test/pageobjects/HomePage.js
// Instagram home feed: top action bar, horizontal story tray, vertical post feed, bottom tab bar.

import BasePage from './BasePage.js';

const tabs = new BasePage();
const ID = (id) => `id=com.instagram.android:id/${id}`;
const ui = (selector) => `android=new UiSelector()${selector}`;
const str = (s) => JSON.stringify(s);

// Feed post action buttons. These are below the first post, so they weren't in the screen-3 dump.
// Instagram's usual resource-ids are used here (IDs stay the same when the button state changes;
// content-desc does not, e.g. "Like" → "Liked"). Confirm them with a dump after scrolling.
const POST = {
  like:    ID('row_feed_button_like'),
  comment: ID('row_feed_button_comment'),
  share:   ID('row_feed_button_share'),
  save:    ID('row_feed_button_save'),
};

class HomePage {
  // ---------- Top action bar ----------
  get actionBar()            { return $(ID('action_bar')); }
  get createBtn()            { return $('~Create a post, story, reel or live video.'); }
  get instagramHomeFeedBtn() { return $('~Instagram Home Feed'); }
  get notificationsBtn()     { return $('~Notifications'); }

  // ---------- Bottom tab bar ----------
  get homeTab()              { return $('~Home'); }
  get reelsTab()             { return $('~Reels'); }
  get messageTab()           { return $('~Message'); }
  get searchTab()            { return $('~Search and explore'); }
  get profileTab()           { return $('~Profile'); }

  // ---------- Story tray (horizontal) ----------
  // Every story is a Button whose content-desc looks like "<user>'s story, 2 of 13, Unseen."
  get storyButtons()         { return $$(ui('.className("android.widget.Button").descriptionContains("\'s story, ")')); }
  storyOf(username)          { return $(ui(`.className("android.widget.Button").descriptionStartsWith(${str(`${username}'s story`)})`)); }
  storyAt(index)             { return $(ui(`.className("android.widget.Button").descriptionContains(${str(`'s story, ${index} of `)})`)); }

  // ---------- Feed post (vertical) ----------
  get mediaGroup()           { return $(ID('media_group')); }
  get postAuthorNames()      { return $$(ID('row_feed_photo_profile_name')); }
  get postMoreActionsBtns()  { return $$('~More actions for this post'); }
  get followBtns()           { return $$(ID('inline_follow_button')); }

  get likeBtns()             { return $$(POST.like); }
  get commentBtns()          { return $$(POST.comment); }
  get shareBtns()            { return $$(POST.share); }
  get saveBtns()             { return $$(POST.save); }

  // =====================================================================
  // Page state
  // =====================================================================

  // Bottom tab bar – any of these on screen means we're inside the logged-in app
  get tabBarItems() {
    return ['feed_tab', 'clips_tab', 'direct_tab', 'search_tab', 'profile_tab'].map((t) => $(ID(t)));
  }

  async #anyDisplayed(els) {
    for (const el of els) {
      try { if (await el.isDisplayed()) return true; } catch { /* stale / not found */ }
    }
    return false;
  }

  /** Logged-in app is showing (any main tab), regardless of which tab. */
  async isInMainApp() {
    return this.#anyDisplayed([this.homeTab, ...this.tabBarItems]);
  }

  /**
   * Home feed is showing. Checks several signals instead of one exact pair,
   * because the top bar right after login isn't always identical to a later visit.
   */
  async isLoaded() {
    if (!(await this.isInMainApp())) return false;
    return this.#anyDisplayed([
      this.actionBar,
      this.instagramHomeFeedBtn,
      this.notificationsBtn,
      $(ui('.className("android.widget.Button").descriptionContains("\'s story, ")')),
      this.mediaGroup,
    ]);
  }

  async waitForLoad(timeout = 30000) {
    await browser.waitUntil(() => this.isLoaded(), {
      timeout, interval: 700, timeoutMsg: 'Home feed did not load',
    });
  }

  // =====================================================================
  // Gesture helpers
  // =====================================================================

  /** The scrollable feed area: between the top action bar and the bottom tab bar. */
  async #feedArea() {
    const s = await tabs.systemInsets();
    // The top bar hides while scrolling and the tab bar can too, so fall back to screen insets.
    let top = s.statusBar;
    if (await this.actionBar.isDisplayed()) {
      const r = await this.#rect(this.actionBar);
      top = r.y + r.height;
    }
    let bottom = s.height - s.navBar;
    if (await tabs.homeTab.isDisplayed()) bottom = (await this.#rect(tabs.homeTab)).y;
    return { left: 0, top, width: s.width, height: bottom - top };
  }

  /** The story tray row: full screen width, height of a story button. */
  async #trayArea() {
    const first = await this.storyButtons[0];
    await first.waitForDisplayed();
    const r = await this.#rect(first);
    const { width } = await driver.getWindowSize();
    return { left: 0, top: r.y, width, height: r.height };
  }

  async #rect(el) {
    const { x, y } = await el.getLocation();
    const { width, height } = await el.getSize();
    return { x, y, width, height };
  }

  // Uses the shared safe swipe (keeps clear of Home / Back / notification-shade gestures)
  async #swipe(area, direction, percent = 0.6) {
    await tabs.swipe(area, direction, percent);
  }

  // =====================================================================
  // Vertical feed scrolling
  // =====================================================================

  /** Scroll the feed down (to newer content below). */
  async scrollDown(times = 1) {
    const area = await this.#feedArea();
    for (let i = 0; i < times; i++) await this.#swipe(area, 'up');
  }

  /** Scroll the feed back up. */
  async scrollUp(times = 1) {
    const area = await this.#feedArea();
    for (let i = 0; i < times; i++) await this.#swipe(area, 'down');
  }

  /** Jump back to the top of the feed (tapping Home again scrolls to top). */
  async scrollToTop() {
    await this.homeTab.click();
    await driver.pause(500);
  }

  /** Scroll down until the element is visible. Pass a selector string or a function returning an element. */
  async scrollDownTo(target, maxSwipes = 10) {
    const get = typeof target === 'function' ? target : () => $(target);
    for (let i = 0; i <= maxSwipes; i++) {
      if (await (await get()).isDisplayed()) return get();
      await this.scrollDown();
    }
    throw new Error(`Element not found after ${maxSwipes} swipes: ${target}`);
  }

  /** Scroll down to the post by this author (matches the name shown in the post header). */
  async scrollToPostBy(username, maxSwipes = 15) {
    const sel = ui(`.resourceId("com.instagram.android:id/row_feed_photo_profile_name").textStartsWith(${str(username)})`);
    return this.scrollDownTo(sel, maxSwipes);
  }

  // =====================================================================
  // Story tray (horizontal)
  // =====================================================================

  async swipeStoriesLeft(times = 1) {          // reveals stories further right
    const area = await this.#trayArea();
    for (let i = 0; i < times; i++) await this.#swipe(area, 'left', 0.6);
  }

  async swipeStoriesRight(times = 1) {         // goes back toward the start of the tray
    const area = await this.#trayArea();
    for (let i = 0; i < times; i++) await this.#swipe(area, 'right', 0.6);
  }

  /** Usernames of stories currently visible in the tray. */
  async visibleStoryUsers() {
    const users = [];
    for (const b of await this.storyButtons) {
      const desc = await b.getAttribute('content-desc');
      users.push(desc.split("'s story")[0]);
    }
    return users;
  }

  /** Swipe through the tray until a user's story is visible, then open it. */
  async openStoryOf(username, maxSwipes = 8) {
    for (let i = 0; i <= maxSwipes; i++) {
      const story = await this.storyOf(username);
      if (await story.isDisplayed()) return story.click();
      await this.swipeStoriesLeft();
    }
    throw new Error(`Story of "${username}" not found in tray`);
  }

  /** Open the story at a position in the tray (0-based, as in "… 2 of 13"). */
  async openStoryAt(index, maxSwipes = 8) {
    for (let i = 0; i <= maxSwipes; i++) {
      const story = await this.storyAt(index);
      if (await story.isDisplayed()) return story.click();
      await this.swipeStoriesLeft();
    }
    throw new Error(`Story #${index} not found in tray`);
  }

  /** Leave the story viewer and return to the feed. */
  async closeStory() {
    await driver.back();
    await this.waitForLoad();
  }

  // =====================================================================
  // Post actions: like / comment / save (first post visible on screen)
  // =====================================================================

  /** Make sure a post's action row is on screen and return its buttons. */
  async #visiblePostButtons(postIndex = 0) {
    await this.scrollDownTo(POST.like);
    const pick = async (sel) => (await $$(sel))[postIndex];
    return {
      like: await pick(POST.like),
      comment: await pick(POST.comment),
      save: await pick(POST.save),
      share: await pick(POST.share),
    };
  }

  async isPostLiked(postIndex = 0) {
    const { like } = await this.#visiblePostButtons(postIndex);
    return (await like.getAttribute('selected')) === 'true'
      || (await like.getAttribute('content-desc')) === 'Liked';
  }

  async isPostSaved(postIndex = 0) {
    const { save } = await this.#visiblePostButtons(postIndex);
    return (await save.getAttribute('selected')) === 'true'
      || /remove/i.test(await save.getAttribute('content-desc'));
  }

  /** Tap like. Pass `onlyIfNotLiked` so you never accidentally un-like a post. */
  async likePost(postIndex = 0, { onlyIfNotLiked = true } = {}) {
    if (onlyIfNotLiked && await this.isPostLiked(postIndex)) return;
    const { like } = await this.#visiblePostButtons(postIndex);
    await like.click();
  }

  async unlikePost(postIndex = 0) {
    if (!(await this.isPostLiked(postIndex))) return;
    const { like } = await this.#visiblePostButtons(postIndex);
    await like.click();
  }

  /** Double-tap the media to like (Instagram gesture). */
  async doubleTapToLike() {
    const media = await this.mediaGroup;
    await media.waitForDisplayed();
    await media.doubleClick();
  }

  /** Open the comments sheet for the post. */
  async openComments(postIndex = 0) {
    const { comment } = await this.#visiblePostButtons(postIndex);
    await comment.click();
  }

  async closeComments() {
    await driver.back();
  }

  async savePost(postIndex = 0, { onlyIfNotSaved = true } = {}) {
    if (onlyIfNotSaved && await this.isPostSaved(postIndex)) return;
    const { save } = await this.#visiblePostButtons(postIndex);
    await save.click();
  }

  async sharePost(postIndex = 0) {
    const { share } = await this.#visiblePostButtons(postIndex);
    await share.click();
  }

  async openPostMoreActions(postIndex = 0) {
    const btns = await this.postMoreActionsBtns;
    await btns[postIndex].click();
  }

  // =====================================================================
  // Navigation
  // =====================================================================

  async openNotifications() { await this.notificationsBtn.click(); }
  async openCreate()        { await this.createBtn.click(); }
  // Same verified tab taps as every other page (id → content-desc → coordinate tap)
  async goToReels()         { await tabs.goToReels(); }
  async goToMessages()      { await tabs.goToMessages(); }
  async goToSearch()        { await tabs.goToSearch(); }
  async goToProfile()       { await tabs.goToProfile(); }   // same logic as the forced logout (ProfilePage.open)
}

export default new HomePage();