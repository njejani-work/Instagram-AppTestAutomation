# 06 – Framework

WebdriverIO 10.1.0 (Mocha, ESM JavaScript) → Appium UiAutomator2 → Android emulator · Page Object Model.

## Folder layout

~~~
project/
├─ README.md                    project overview + quick start
├─ wdio.conf.js                 device, suites, reporters, hooks (evidence, popups, dashboard)
├─ package.json                 npm scripts (see 02-running-tests)
├─ .env.example                 credentials / device template → copy to .env
├─ test/
│  ├─ specs/                    one file per feature (*.e2e.js)
│  │  ├─ home.e2e.js              3 tests
│  │  ├─ login.e2e.js             2 tests
│  │  ├─ loginToLogout.e2e.js     1 test
│  │  ├─ menu.e2e.js              4 tests
│  │  ├─ profile.e2e.js           5 tests
│  ├─ pageobjects/              locators + actions per screen
│  ├─ helpers/
│  │  ├─ evidence.js            step(), screenshots, logs, masking, test records
│  │  ├─ session.js             currentScreen(), ensureLoggedOut/In(), logOutSteps()
│  │  ├─ permissions.js         auto-deny the notification popup
│  │  └─ run.js                 run id + report paths
│  └─ data/users.js             accounts (from .env)
├─ tools/                       setup, check, dashboard, locators, deliverables, handover
├─ deliverables/                this documentation (generated)
└─ reports/                     runs/ + dashboard/ (generated, git-ignored)
~~~

## How a step works

~~~js
await step('Tap "Log in"', () => LoginPage.logInBtn.click(), {
  waitFor: () => LoginPage.notNowBtn.waitForDisplayed({ timeout: 45000 }),   // the RESULT of the action
});
~~~

1. deny the permission popup if it is up
2. run the action
3. `waitFor` – wait for the result of the action
4. wait until the page source stops changing (`settle`, max 4 s)
5. screenshot `NN-step-name.png`; on failure also `NN-step-name.xml` + error + stack
6. every tap / type / gesture / console line during the step goes into that step's log

`checkpoint(name, { waitFor })` = a step without an action. Tests are started and finished by the hooks in
`wdio.conf.js` – specs only call `step()`. A test without steps still gets a "Final screen" / "Failure" entry.

## Method reference (generated from the code)

### BasePage

| Method | Description |
|---|---|
| `tapTab(id, desc, isOpen, {…opts})` | Tap a bottom tab and (optionally) confirm the screen changed |
| `goToHome()` | Go to home |
| `goToReels()` | Go to reels |
| `goToMessages()` | Go to messages |
| `goToSearch()` | Go to search |
| `goToProfile({…opts})` | The ONE way to open the Profile tab – the same logic the forced logout uses: clear popups, tap the tab by id (fallback content-desc / coordinates), wait for "Edit profile" |
| `rect(el)` | Rect |
| `scrollAreaBelow(topEl)` | Area between a top element (e.g. action bar) and the bottom tab bar |
| `rowAreaOf(el)` | Full-width horizontal strip at the height of an element (for carousels / trays) |
| `systemInsets()` | System insets |
| `safeArea(area)` | Shrink an area so no part of it touches a system-gesture zone |
| `swipe(area, direction, percent = 0.6, {…opts})` | Swipe inside `area`. direction = where the finger moves ('up' scrolls content down) |
| `scrollUntil(getEl, area, {…opts})` | Scroll until `getEl()` is displayed. direction 'up' = content moves up = scroll down |
| `parseCount(raw = '')` | "1,234" / "12.5K" / "3M" / "0followers" → number |

### LoginPage

| Method | Description |
|---|---|
| `waitForLoad(timeout = 20000)` | Wait until either the profile picker or the login form is on screen |
| `chooseAnotherProfile()` | Screen 9 → screen 1 |
| `login({ username, password })` | Screen 1: fill credentials and tap Log in |
| `dontSaveLoginInfo(timeout = 45000)` | After tapping Log in: if "Save your login info?" shows, tap "Not now" |
| `waitForLoginError(timeout = 30000)` | After tapping Log in with bad credentials: wait for the error, return its text |
| `isLoginErrorShown()` | Is login error shown |
| `dismissLoginError()` | Close the error dialog and wait for the login form again |
| `loginAs(user)` | Full flow: picker → login → "Not now" |

### HomePage

| Method | Description |
|---|---|
| `storyOf(username)` | Story of |
| `storyAt(index)` | Story at |
| `isInMainApp()` | Logged-in app is showing (any main tab), regardless of which tab |
| `isLoaded()` | Home feed is showing |
| `waitForLoad(timeout = 30000)` | Wait for load |
| `scrollDown(times = 1)` | Scroll the feed down (to newer content below) |
| `scrollUp(times = 1)` | Scroll the feed back up |
| `scrollToTop()` | Jump back to the top of the feed (tapping Home again scrolls to top) |
| `scrollDownTo(target, maxSwipes = 10)` | Scroll down until the element is visible |
| `scrollToPostBy(username, maxSwipes = 15)` | Scroll down to the post by this author (matches the name shown in the post header) |
| `swipeStoriesLeft(times = 1)` | Swipe stories left |
| `swipeStoriesRight(times = 1)` | Swipe stories right |
| `visibleStoryUsers()` | Usernames of stories currently visible in the tray |
| `openStoryOf(username, maxSwipes = 8)` | Swipe through the tray until a user's story is visible, then open it |
| `openStoryAt(index, maxSwipes = 8)` | Open the story at a position in the tray (0-based, as in "… 2 of 13") |
| `closeStory()` | Leave the story viewer and return to the feed |
| `isPostLiked(postIndex = 0)` | Is post liked |
| `isPostSaved(postIndex = 0)` | Is post saved |
| `likePost(postIndex = 0, {…opts})` | Tap like |
| `unlikePost(postIndex = 0)` | Unlike post |
| `doubleTapToLike()` | Double-tap the media to like (Instagram gesture) |
| `openComments(postIndex = 0)` | Open the comments sheet for the post |
| `closeComments()` | Close comments |
| `savePost(postIndex = 0, {…opts})` | Save post |
| `sharePost(postIndex = 0)` | Share post |
| `openPostMoreActions(postIndex = 0)` | Open post more actions |
| `openNotifications()` | Open notifications |
| `openCreate()` | Open create |
| `goToReels()` | Same verified tab taps as every other page (id → content-desc → coordinate tap) |
| `goToMessages()` | Go to messages |
| `goToSearch()` | Go to search |
| `goToProfile()` | same logic as the forced logout (ProfilePage.open) |

### ProfilePage

| Method | Description |
|---|---|
| `followSuggestionBtn(name)` | Follow button on a suggestion card, e.g. followSuggestionBtn('madhu_pranav') |
| `gridItemAt(row, col)` | Grid item at |
| `waitForLoad(timeout = 20000)` | Wait for load |
| `isLoaded()` | Is loaded |
| `open()` | Navigate here from any main screen |
| `getPostsCount()` | Get posts count |
| `getFollowersCount()` | Get followers count |
| `getFollowingCount()` | Get following count |
| `getUsername()` | Get username |
| `getDisplayName()` | Get display name |
| `getStats()` | Get stats |
| `scrollDown(times = 1)` | Scroll down |
| `scrollUp(times = 1)` | Scroll up |
| `scrollToTop(maxSwipes = 10)` | Scroll to top |
| `scrollToContentTabs()` | Scroll down until the content tabs (Grid / Reels / Photos of you) are on screen |
| `openEditProfile()` | Open edit profile |
| `openShareProfile()` | Open share profile |
| `toggleDiscoverPeople()` | Toggle discover people |
| `openOptions()` | Open options |
| `openCreateNew()` | Open create new |
| `openAccountSwitcher()` | Open account switcher |
| `goBack()` | Close whatever sheet/screen was opened from the profile and come back |
| `isDiscoverPeopleShown()` | Is discover people shown |
| `swipeSuggestionsLeft(times = 1)` | Swipe suggestions left |
| `swipeSuggestionsRight(times = 1)` | Swipe suggestions right |
| `followSuggestion(name, maxSwipes = 8)` | Swipe through the carousel until this person's card appears, then tap Follow |
| `dismissFirstSuggestion()` | Dismiss the first visible suggestion card |
| `openSeeAllSuggestions()` | Open see all suggestions |
| `openGrid()` | Open grid |
| `openReels()` | Open reels |
| `openPhotosOfYou()` | Open photos of you |
| `hasNoPosts()` | Has no posts |
| `openGridPost(row = 1, col = 1)` | Open a post from the grid (1-based row/column), scrolling down to it if needed |

### MenuPage

| Method | Description |
|---|---|
| `option(label)` | A menu row by its label |
| `waitForLoad(timeout = 15000)` | Wait for load |
| `isLoaded()` | Is loaded |
| `open()` | Open the menu from anywhere in the main app (goes via the Profile tab) |
| `goBack()` | Go back |
| `scrollDown(times = 1)` | Scroll down |
| `scrollUp(times = 1)` | Scroll up |
| `scrollToTop(maxSwipes = 15)` | Scroll to top |
| `scrollToBottom(maxSwipes = 15)` | Scroll to bottom |
| `scrollToOption(label, maxSwipes = 12)` | Bring an option into view |
| `selectOption(label)` | Scroll to an option and tap it |
| `openAndReturn(label)` | Select an option, then come back to the menu (handy for smoke-checking every entry) |
| `search(text)` | Type into the "Search" box at the top of the menu |
| `clearSearch()` | Clear search |
| `openSaved()` | Shortcuts for common options |
| `openArchive()` | Open archive |
| `openYourActivity()` | Open your activity |
| `openNotifications()` | Open notifications |
| `openTimeManagement()` | Open time management |
| `openMetaAccount()` | Open meta account |
| `openAccountStatus()` | Open account status |
| `openAbout()` | Open about |
| `addProfile()` | Add profile |
| `logOut({…opts})` | Tap "Log out" and get through the dialogs: - "Save your login info?" (Save / Not now) → depends on saveLoginInfo - "Log out?" (Log out / Cancel) → Log out The order and presence of these dialogs… |
| `cancelLogOut()` | Open the "Log out?" confirmation and back out of it |

### helpers/session.js

| Method | Description |
|---|---|
| `currentScreen(timeout = 30000)` | Wait until the app shows a screen we recognise, and say which one |
| `ensureLoggedOut()` | Log out if a session is active |
| `ensureLoggedIn(user)` | Log in silently (for specs that only need a session, not login evidence) |
| `logOutSteps()` | Log out via Profile → Options → Log out, with a screenshot after every action |

### helpers/evidence.js

| Method | Description |
|---|---|
| `registerSecrets(values = [])` | Register secrets |
| `mask(text)` | Mask |
| `installLogging()` | Call once per worker (wdio.conf.js → before) |
| `logCommand(commandName, args = [], result, error)` | wdio.conf.js → afterCommand |
| `waitForUiIdle({…opts})` | Wait until two consecutive page sources are identical (no spinners/animations still changing the hierarchy) |
| `saveDebugSource(filePath)` | Write page source + current package/activity to a file |
| `step(name, action, {…opts})` | Run one test action and record a screenshot once its result has loaded |
| `snapshot(name)` | Extra screenshot recorded as its own entry (used for system popups) |
| `startTest(test)` | Start test |
| `endTest(test, {…opts})` | End test |
| `recordHookFailure(test, hookName, error)` | A before/after hook failed (the test itself never ran or its cleanup broke) |
| `flushSuites()` | Write every suite once more (wdio.conf.js → after) |
| `useEvidence()` | Kept for older specs – tests are now recorded automatically via wdio.conf.js hooks |

### helpers/permissions.js

| Method | Description |
|---|---|
| `denyPermissionPopupIfShown({…opts})` | If a permission popup is on screen (and matches `only`), tap "Don't allow" |
| `installPermissionGuard({…opts})` | Call once per session (wdio.conf.js → before hook) |

## Adding a test

1. Capture the screen: `npm run locators` → Enter → `locators/screen-N.json`.
2. Add getters / methods to the page object (stable strategies first – see 04-locators).
3. One `step()` per user action, with a `waitFor` that proves the result:

~~~js
import ProfilePage from '../pageobjects/ProfilePage.js';
import { users } from '../data/users.js';
import { step } from '../helpers/evidence.js';
import { ensureLoggedIn } from '../helpers/session.js';

describe('Profile', function () {
  this.timeout(5 * 60 * 1000);
  before(() => ensureLoggedIn(users.valid));

  it('opens the account switcher', async () => {
    await step('Open Profile tab', () => ProfilePage.open());
    await step('Tap username', () => ProfilePage.openAccountSwitcher(), {
      waitFor: () => $('~Add account').waitForDisplayed(),
    });
  });
});
~~~

4. Add the spec to a suite in `wdio.conf.js → suites` (and `regression`), give it an ID in `tools/build-deliverables.mjs → META`.
5. `npm run check` then `npm run deliverables`.

## Conventions

- Step names read like a manual test (Tap "Log in", Open Profile tab). Secrets are masked anyway.
- No fixed `pause()` to wait – `waitFor` the result.
- Don't scroll the home feed right before tapping a tab (pull-to-refresh swallows the tap).
- Swipes only through `BasePage.swipe()` – raw gestures can trigger Android Home / Back.


---
_Generated by «npm run deliverables» on 2026-10-28 · instagram-appium-tests 1.0.0_
