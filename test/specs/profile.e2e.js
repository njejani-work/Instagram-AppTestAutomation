// test/specs/profile.e2e.js
// Own profile: header data, Edit / Share profile, content tabs, vertical scrolling.
// Every action is a step → screenshot + log on the dashboard.

import ProfilePage from '../pageobjects/ProfilePage.js';
import { users } from '../data/users.js';
import { step } from '../helpers/evidence.js';
import { ensureLoggedIn } from '../helpers/session.js';

const openProfile = () => step('Open Profile tab', () => ProfilePage.open(), {
  waitFor: () => ProfilePage.waitForLoad(),
});

describe('Profile', function () {
  this.timeout(6 * 60 * 1000);

  before(async () => {
    await ensureLoggedIn(users.valid);
  });

  it('shows the profile header', async () => {
    await openProfile();

    const stats = await step('Read username, name and counts', () => ProfilePage.getStats(), { settle: false });
    console.log('Profile:', stats);
    expect(stats.username).not.toBe('');
    expect(Number.isNaN(stats.followers)).toBe(false);
    await expect(ProfilePage.editProfileBtn).toBeDisplayed();
    await expect(ProfilePage.shareProfileBtn).toBeDisplayed();
  });

  it('opens and closes Edit profile', async () => {
    await openProfile();
    await step('Tap "Edit profile"', () => ProfilePage.openEditProfile(), {
      waitFor: () => ProfilePage.editProfileBtn.waitForDisplayed({ reverse: true, timeout: 15000 }),
    });
    await step('Go back to profile', () => ProfilePage.goBack());
  });

  it('opens and closes Share profile', async () => {
    await openProfile();
    await step('Tap "Share profile"', () => ProfilePage.openShareProfile(), {
      waitFor: () => ProfilePage.editProfileBtn.waitForDisplayed({ reverse: true, timeout: 15000 }),
    });
    await step('Go back to profile', () => ProfilePage.goBack());
  });

  it('switches between the content tabs', async () => {
    await openProfile();
    await step('Open Reels tab', () => ProfilePage.openReels());
    await step('Open "Photos of you" tab', () => ProfilePage.openPhotosOfYou());
    await step('Open Grid tab', () => ProfilePage.openGrid());
  });

  it('scrolls the profile vertically', async () => {
    await openProfile();
    await step('Scroll profile down ×2', () => ProfilePage.scrollDown(2), { settleTimeout: 2500 });
    await step('Scroll back to top', () => ProfilePage.scrollToTop(), {
      waitFor: () => ProfilePage.editProfileBtn.waitForDisplayed(),
    });
  });
});