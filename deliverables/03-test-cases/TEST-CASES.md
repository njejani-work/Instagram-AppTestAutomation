# 03 – Test cases

All 15 cases are automated. **Test** = the exact name on the dashboard; **Steps** are read from the spec
(one step = one screenshot on the dashboard). Regenerate with `npm run deliverables` after changing a spec.
IDs marked * were assigned automatically – give new tests an ID/priority in `tools/build-deliverables.mjs → META`.

| ID | Priority | Suite | Test | Steps | Spec |
|---|---|---|---|---|---|
| [TC-HOME-01](#tc-home-01) | P2 | Home feed | swipes through the story tray and opens a story | 5 | `test/specs/home.e2e.js` |
| [TC-HOME-02](#tc-home-02) | P2 | Home feed | likes, saves and opens comments on the first post | 5 | `test/specs/home.e2e.js` |
| [TC-HOME-03](#tc-home-03) | P3 | Home feed | scrolls the feed vertically | 4 | `test/specs/home.e2e.js` |
| [TC-LOGIN-01](#tc-login-01) | P1 | Login | logs in with valid credentials | 16 | `test/specs/login.e2e.js` |
| [TC-LOGIN-02](#tc-login-02) | P1 | Login | shows an error for invalid credentials | 8 | `test/specs/login.e2e.js` |
| [TC-FLOW-01](#tc-flow-01) | P1 | Login to logout | logs in, visits home and profile, then logs out | 15 | `test/specs/loginToLogout.e2e.js` |
| [TC-MENU-01](#tc-menu-01) | P2 | Settings menu | opens each top-level option and returns | 3 | `test/specs/menu.e2e.js` |
| [TC-MENU-02](#tc-menu-02) | P3 | Settings menu | scrolls to the bottom and back to the top | 3 | `test/specs/menu.e2e.js` |
| [TC-MENU-03](#tc-menu-03) | P3 | Settings menu | searches the menu | 3 | `test/specs/menu.e2e.js` |
| [TC-MENU-04](#tc-menu-04) | P1 | Settings menu | cancels log out, then logs out without saving login info | 3 | `test/specs/menu.e2e.js` |
| [TC-PROF-01](#tc-prof-01) | P2 | Profile | shows the profile header | 2 | `test/specs/profile.e2e.js` |
| [TC-PROF-02](#tc-prof-02) | P3 | Profile | opens and closes Edit profile | 3 | `test/specs/profile.e2e.js` |
| [TC-PROF-03](#tc-prof-03) | P3 | Profile | opens and closes Share profile | 3 | `test/specs/profile.e2e.js` |
| [TC-PROF-04](#tc-prof-04) | P3 | Profile | switches between the content tabs | 4 | `test/specs/profile.e2e.js` |
| [TC-PROF-05](#tc-prof-05) | P3 | Profile | scrolls the profile vertically | 3 | `test/specs/profile.e2e.js` |

**P1** = must pass before a release (`npm run test:smoke`) · **P2** = core feature · **P3** = navigation / UI

## TC-HOME-01

**Home feed › swipes through the story tray and opens a story**
Spec: `test/specs/home.e2e.js` · Priority: P2 · Data: `users.valid`
Run alone: `npm run test:grep -- "swipes through the story tray and opens a story"`

**Preconditions:** Logged in (before hook logs in if needed). ≥ 5 stories in the tray.

**Steps**

1. Home feed shown
2. Swipe story tray left
3. Swipe story tray right
4. Open story #1
5. Close story
**Expected:** Tray scrolls horizontally; story viewer opens and closes back to the feed.

## TC-HOME-02

**Home feed › likes, saves and opens comments on the first post**
Spec: `test/specs/home.e2e.js` · Priority: P2 · Data: `users.valid`
Run alone: `npm run test:grep -- "likes, saves and opens comments on the first post"`

**Preconditions:** Logged in. Feed has at least one post.

**Steps**

1. Home feed shown
2. Like first post
3. Save first post
4. Open comments
5. Close comments
**Expected:** Post shows as liked and saved; comments open and close. Changes account data.

## TC-HOME-03

**Home feed › scrolls the feed vertically**
Spec: `test/specs/home.e2e.js` · Priority: P3 · Data: `users.valid`
Run alone: `npm run test:grep -- "scrolls the feed vertically"`

**Preconditions:** Logged in.

**Steps**

1. Home feed shown
2. Scroll feed down ×3
3. Scroll feed up ×1
4. Back to top (tap Home)
**Expected:** Feed scrolls both ways without system gestures; story tray visible again at the top.

## TC-LOGIN-01

**Login › logs in with valid credentials**
Spec: `test/specs/login.e2e.js` · Priority: P1 · Data: `users.valid`
Run alone: `npm run test:grep -- "logs in with valid credentials"`

**Preconditions:** App installed, logged out (beforeEach logs out automatically).

**Steps**

1. App opened on login screen
2. Tap "Use another profile"
3. Enter username
4. Enter password
5. Hide keyboard
6. Tap "Log in"
7. Tap "Not now" on save login info _(only if applicable)_
8. Save login info prompt not shown _(only if applicable)_
9. Home feed loaded
10. Open Profile tab
11. Open Options menu
12. Scroll menu to bottom
13. Tap "Log out"
14. Tap "Not now" on save login info _(only if applicable)_
15. Confirm "Log out" _(only if applicable)_
16. Logged out – login screen shown
**Expected:** Home feed loads after login; test ends logged out on the login screen.

## TC-LOGIN-02

**Login › shows an error for invalid credentials**
Spec: `test/specs/login.e2e.js` · Priority: P1 · Data: `users.invalid`
Run alone: `npm run test:grep -- "shows an error for invalid credentials"`

**Preconditions:** Logged out.

**Steps**

1. App opened on login screen
2. Tap "Use another profile"
3. Enter invalid username
4. Enter invalid password
5. Hide keyboard
6. Tap "Log in"
7. Dismiss error
8. Still on login screen
**Expected:** Error message shown; user stays on the login form; home feed never appears.

## TC-FLOW-01

**Login to logout › logs in, visits home and profile, then logs out**
Spec: `test/specs/loginToLogout.e2e.js` · Priority: P1 · Data: `users.valid`
Run alone: `npm run test:grep -- "logs in, visits home and profile, then logs out"`

**Preconditions:** Logged out.

**Steps**

1. App opened on login screen
2. Tap "Use another profile"
3. Enter username
4. Enter password
5. Hide keyboard
6. Tap "Log in"
7. Tap "Not now" on save login info _(only if applicable)_
8. Home feed loaded _(only if applicable)_
9. Open Profile tab
10. Open Options menu
11. Scroll menu to bottom
12. Tap "Log out"
13. Tap "Not now" on save login info _(only if applicable)_
14. Confirm "Log out" _(only if applicable)_
15. Logged out – login screen shown
**Expected:** Full journey completes and ends on the login screen. No feed scrolling (pull-to-refresh swallows the Profile tap).

## TC-MENU-01

**Settings menu › opens each top-level option and returns**
Spec: `test/specs/menu.e2e.js` · Priority: P2 · Data: `users.valid`
Run alone: `npm run test:grep -- "opens each top-level option and returns"`

**Preconditions:** Logged in.

**Steps**

1. Open settings menu (Profile → Options)
2. Open "<label>" – for each: Saved, Archive, Your activity, Time management, About
3. Back from "<label>" – for each: Saved, Archive, Your activity, Time management, About
**Expected:** Each option opens its screen; Back returns to the menu.

## TC-MENU-02

**Settings menu › scrolls to the bottom and back to the top**
Spec: `test/specs/menu.e2e.js` · Priority: P3 · Data: `users.valid`
Run alone: `npm run test:grep -- "scrolls to the bottom and back to the top"`

**Preconditions:** Logged in.

**Steps**

1. Open settings menu (Profile → Options)
2. Scroll to bottom
3. Scroll to top
**Expected:** "Log out" + "Add profile" at the bottom, Search at the top; no Home gesture triggered.

## TC-MENU-03

**Settings menu › searches the menu**
Spec: `test/specs/menu.e2e.js` · Priority: P3 · Data: `users.valid`
Run alone: `npm run test:grep -- "searches the menu"`

**Preconditions:** Logged in.

**Steps**

1. Open settings menu (Profile → Options)
2. Search "Saved"
3. Clear search
**Expected:** "Saved" listed in the results.

## TC-MENU-04

**Settings menu › cancels log out, then logs out without saving login info**
Spec: `test/specs/menu.e2e.js` · Priority: P1 · Data: `users.valid`
Run alone: `npm run test:grep -- "cancels log out, then logs out without saving login info"`

**Preconditions:** Logged in.

**Steps**

1. Open settings menu (Profile → Options)
2. Tap "Log out", then cancel
3. Log out ("Not now" on save info, confirm)
**Expected:** Cancel keeps the session; second attempt logs out to the login screen.

## TC-PROF-01

**Profile › shows the profile header**
Spec: `test/specs/profile.e2e.js` · Priority: P2 · Data: `users.valid`
Run alone: `npm run test:grep -- "shows the profile header"`

**Preconditions:** Logged in.

**Steps**

1. Open Profile tab
2. Read username, name and counts
**Expected:** Username not empty, follower count numeric, Edit profile + Share profile visible.

## TC-PROF-02

**Profile › opens and closes Edit profile**
Spec: `test/specs/profile.e2e.js` · Priority: P3 · Data: `users.valid`
Run alone: `npm run test:grep -- "opens and closes Edit profile"`

**Preconditions:** Logged in.

**Steps**

1. Open Profile tab
2. Tap "Edit profile"
3. Go back to profile
**Expected:** Edit profile opens; Back returns to the profile.

## TC-PROF-03

**Profile › opens and closes Share profile**
Spec: `test/specs/profile.e2e.js` · Priority: P3 · Data: `users.valid`
Run alone: `npm run test:grep -- "opens and closes Share profile"`

**Preconditions:** Logged in.

**Steps**

1. Open Profile tab
2. Tap "Share profile"
3. Go back to profile
**Expected:** Share sheet opens; Back returns to the profile.

## TC-PROF-04

**Profile › switches between the content tabs**
Spec: `test/specs/profile.e2e.js` · Priority: P3 · Data: `users.valid`
Run alone: `npm run test:grep -- "switches between the content tabs"`

**Preconditions:** Logged in.

**Steps**

1. Open Profile tab
2. Open Reels tab
3. Open "Photos of you" tab
4. Open Grid tab
**Expected:** Each content tab can be selected.

## TC-PROF-05

**Profile › scrolls the profile vertically**
Spec: `test/specs/profile.e2e.js` · Priority: P3 · Data: `users.valid`
Run alone: `npm run test:grep -- "scrolls the profile vertically"`

**Preconditions:** Logged in.

**Steps**

1. Open Profile tab
2. Scroll profile down ×2
3. Scroll back to top
**Expected:** Profile scrolls; header visible again at the top.



---
_Generated by «npm run deliverables» on 2026-10-28 · instagram-appium-tests 1.0.0_
