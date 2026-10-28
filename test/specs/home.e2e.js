// test/specs/home.e2e.js
// Home feed: story tray (horizontal), post actions, vertical feed scrolling.
// Every action is a step → screenshot + log on the dashboard.

import HomePage from '../pageobjects/HomePage.js';
import { users } from '../data/users.js';
import { step, checkpoint } from '../helpers/evidence.js';
import { ensureLoggedIn } from '../helpers/session.js';

describe('Home feed', function () {
  this.timeout(6 * 60 * 1000);

  before(async () => {
    await ensureLoggedIn(users.valid);
  });

  it('swipes through the story tray and opens a story', async () => {
    await checkpoint('Home feed shown', { waitFor: () => HomePage.waitForLoad() });

    const before = await HomePage.visibleStoryUsers();
    await step('Swipe story tray left', () => HomePage.swipeStoriesLeft());
    const after = await HomePage.visibleStoryUsers();
    expect(after).not.toEqual(before);

    await step('Swipe story tray right', () => HomePage.swipeStoriesRight());

    await step('Open story #1', () => HomePage.openStoryAt(1), {
      waitFor: () => browser.waitUntil(async () => !(await HomePage.isLoaded()), {
        timeout: 15000, timeoutMsg: 'Story viewer did not open',
      }),
    });

    await step('Close story', () => HomePage.closeStory(), {
      waitFor: () => HomePage.waitForLoad(),
    });
  });

  it('likes, saves and opens comments on the first post', async () => {
    await checkpoint('Home feed shown', { waitFor: () => HomePage.waitForLoad() });

    await step('Like first post', () => HomePage.likePost(0), {
      waitFor: async () => expect(await HomePage.isPostLiked(0)).toBe(true),
    });

    await step('Save first post', () => HomePage.savePost(0), {
      waitFor: async () => expect(await HomePage.isPostSaved(0)).toBe(true),
    });

    await step('Open comments', () => HomePage.openComments(0));

    await step('Close comments', () => HomePage.closeComments(), {
      waitFor: () => browser.waitUntil(() => HomePage.isInMainApp(), { timeout: 10000 }),
    });
  });

  it('scrolls the feed vertically', async () => {
    await checkpoint('Home feed shown', { waitFor: () => HomePage.waitForLoad() });

    await step('Scroll feed down ×3', () => HomePage.scrollDown(3), { settleTimeout: 2500 });
    await step('Scroll feed up ×1', () => HomePage.scrollUp(1), { settleTimeout: 2500 });

    // Last action of the spec: tapping Home at the top also refreshes the feed – fine here
    await step('Back to top (tap Home)', () => HomePage.scrollToTop(), {
      waitFor: async () => expect(HomePage.storyButtons[0]).toBeDisplayed(),
    });
  });
});