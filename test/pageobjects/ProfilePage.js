// test/pageobjects/ProfilePage.js
// Instagram own-profile screen: header (avatar, counts, name), action buttons,
// "Discover people" carousel (horizontal), content tabs (Grid / Reels / Photos of you), post grid.

import BasePage, { ID, ui, str } from './BasePage.js';

class ProfilePage extends BasePage {
  // ---------- Top action bar ----------
  get usernameContainer()  { return $(ID('action_bar_username_container')); }   // tap → account switcher
  get createNewBtn()       { return $('~Create New'); }
  get optionsBtn()         { return $('~Options'); }                            // hamburger → Settings and activity

  // ---------- Header ----------
  get avatar()             { return $(ID('row_profile_header_imageview_frame_layout')); }
  get postsCount()         { return $(ID('profile_header_post_count_front_familiar')); }
  // IDs, not "~0followers": the content-desc changes with the count
  get followersCount()     { return $(ID('profile_header_followers_stacked_familiar')); }
  get followingCount()     { return $(ID('profile_header_following_stacked_familiar')); }
  get nameAndBio()         { return $(ID('profile_header_name_and_bio_upsell')); }

  // ---------- Header buttons ----------
  get editProfileBtn()     { return $('~Edit profile'); }
  get shareProfileBtn()    { return $('~Share profile'); }
  get discoverPeopleBtn()  { return $('~Discover people'); }

  // ---------- "Discover people" carousel (horizontal) ----------
  get seeAllBtn()          { return $(ID('netego_carousel_cta')); }
  get contactImportCard()  { return $(ID('contact_import_card_container')); }
  get suggestedCards()     { return $$(ID('suggested_entity_card_container')); }
  get suggestionFollowBtns() { return $$(ID('suggested_user_card_follow_button')); }
  get suggestionDismissBtns() { return $$(ID('dismiss_button_prism_style')); }
  /** Follow button on a suggestion card, e.g. followSuggestionBtn('madhu_pranav') */
  followSuggestionBtn(name) {
    return $(ui(`.resourceId("com.instagram.android:id/suggested_user_card_follow_button").descriptionContains(${str(name)})`));
  }

  // ---------- Content tabs ----------
  get gridTab()            { return $('~Grid view'); }
  get reelsContentTab()    { return $(ui('.resourceId("com.instagram.android:id/profile_tab_icon_view").description("Reels")')); }
  get photosOfYouTab()     { return $("//*[@content-desc='Photos of you']/ancestor::*[@clickable='true'][1]"); }

  // ---------- Grid / empty state ----------
  get emptyState()         { return $(ID('empty_state_view_root')); }
  // Grid items weren't in the dump (profile has 0 posts). Instagram usually labels them
  // "Photo by … at Row 1, Column 1" — confirm with a dump on a profile that has posts.
  get gridItems()          { return $$(ui('.descriptionMatches("(?i).*row \\\\d+, column \\\\d+.*")')); }
  gridItemAt(row, col)     { return $(ui(`.descriptionMatches(${str(`(?i).*row ${row}, column ${col}.*`)})`)); }

  // =====================================================================
  // Page state
  // =====================================================================

  async waitForLoad(timeout = 20000) {
    await this.editProfileBtn.waitForDisplayed({ timeout, timeoutMsg: 'Profile page did not load' });
  }

  async isLoaded() {
    return this.editProfileBtn.isDisplayed();
  }

  /** Navigate here from any main screen. */
  async open() {
    await this.goToProfile();
    await this.waitForLoad();
  }

  // =====================================================================
  // Reading header data
  // =====================================================================

  async #readCount(el) {
    const e = await el;
    const desc = await e.getAttribute('content-desc');
    if (desc && /\d/.test(desc)) return this.parseCount(desc);
    const texts = await e.$$('android.widget.TextView');
    for (const t of texts) {
      const v = this.parseCount(await t.getText());
      if (!Number.isNaN(v)) return v;
    }
    return NaN;
  }

  async getPostsCount()     { return this.#readCount(this.postsCount); }
  async getFollowersCount() { return this.#readCount(this.followersCount); }
  async getFollowingCount() { return this.#readCount(this.followingCount); }

  async getUsername() {
    const t = await this.usernameContainer.$('android.widget.TextView');
    return (await t.getText()).trim();
  }

  async getDisplayName() {
    const t = await this.nameAndBio.$('android.widget.TextView');
    return (await t.isExisting()) ? (await t.getText()).trim() : '';
  }

  async getStats() {
    return {
      username: await this.getUsername(),
      name: await this.getDisplayName(),
      posts: await this.getPostsCount(),
      followers: await this.getFollowersCount(),
      following: await this.getFollowingCount(),
    };
  }

  // =====================================================================
  // Vertical scrolling
  // =====================================================================

  async #pageArea() { return this.scrollAreaBelow(this.usernameContainer); }

  async scrollDown(times = 1) {
    const area = await this.#pageArea();
    for (let i = 0; i < times; i++) await this.swipe(area, 'up');
  }

  async scrollUp(times = 1) {
    const area = await this.#pageArea();
    for (let i = 0; i < times; i++) await this.swipe(area, 'down');
  }

  async scrollToTop(maxSwipes = 10) {
    const area = await this.#pageArea();
    await this.scrollUntil(() => this.editProfileBtn, area, { direction: 'down', maxSwipes, label: 'Profile header' });
  }

  /** Scroll down until the content tabs (Grid / Reels / Photos of you) are on screen. */
  async scrollToContentTabs() {
    const area = await this.#pageArea();
    return this.scrollUntil(() => this.gridTab, area, { label: 'Content tabs' });
  }

  // =====================================================================
  // Header actions
  // =====================================================================

  async openEditProfile()   { await this.editProfileBtn.click(); }
  async openShareProfile()  { await this.shareProfileBtn.click(); }
  async toggleDiscoverPeople() { await this.discoverPeopleBtn.click(); }
  async openOptions()       { await this.optionsBtn.click(); }
  async openCreateNew()     { await this.createNewBtn.click(); }
  async openAccountSwitcher() { await this.usernameContainer.click(); }

  /** Close whatever sheet/screen was opened from the profile and come back. */
  async goBack() {
    await driver.back();
    await this.waitForLoad();
  }

  // =====================================================================
  // "Discover people" carousel (horizontal)
  // =====================================================================

  async isDiscoverPeopleShown() {
    return (await this.suggestedCards.length) > 0 || this.contactImportCard.isDisplayed();
  }

  async #carouselArea() {
    const cards = await this.suggestedCards;
    const anchor = cards.length ? cards[0] : this.contactImportCard;
    return this.rowAreaOf(anchor);
  }

  async swipeSuggestionsLeft(times = 1) {
    const area = await this.#carouselArea();
    for (let i = 0; i < times; i++) await this.swipe(area, 'left', 0.6);
  }

  async swipeSuggestionsRight(times = 1) {
    const area = await this.#carouselArea();
    for (let i = 0; i < times; i++) await this.swipe(area, 'right', 0.6);
  }

  /** Swipe through the carousel until this person's card appears, then tap Follow. */
  async followSuggestion(name, maxSwipes = 8) {
    const area = await this.#carouselArea();
    const btn = await this.scrollUntil(() => this.followSuggestionBtn(name), area,
      { direction: 'left', maxSwipes, label: `Suggestion "${name}"` });
    await btn.click();
  }

  /** Dismiss the first visible suggestion card. */
  async dismissFirstSuggestion() {
    const btns = await this.suggestionDismissBtns;
    for (const b of btns) {
      if (await b.isDisplayed()) return b.click();
    }
    throw new Error('No visible suggestion to dismiss');
  }

  async openSeeAllSuggestions() { await this.seeAllBtn.click(); }

  // =====================================================================
  // Content tabs & grid
  // =====================================================================

  async openGrid() {
    await this.scrollToContentTabs();
    await this.gridTab.click();
  }

  async openReels() {
    await this.scrollToContentTabs();
    await this.reelsContentTab.click();
  }

  async openPhotosOfYou() {
    await this.scrollToContentTabs();
    await this.photosOfYouTab.click();
  }

  async hasNoPosts() {
    return this.emptyState.isDisplayed();
  }

  /** Open a post from the grid (1-based row/column), scrolling down to it if needed. */
  async openGridPost(row = 1, col = 1) {
    await this.openGrid();
    const area = await this.#pageArea();
    const item = await this.scrollUntil(() => this.gridItemAt(row, col), area,
      { label: `Grid post row ${row}, col ${col}` });
    await item.click();
  }
}

export default new ProfilePage();