# Instagram Android – Appium Test Automation

End-to-end UI tests for the **Instagram Android app** (`com.instagram.android`), written in JavaScript with
**WebdriverIO 10 + Appium (UiAutomator2) + Mocha** and the **Page Object Model**.

Every test step is recorded with a **screenshot**, its **duration**, a **log** of every tap/type/gesture and – when it
fails – the **error, stack trace and page source**. A static **dashboard** keeps the history of every run.

---

## Contents

- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Commands](#commands)
- [Test suites](#test-suites)
- [Project structure](#project-structure)
- [How a test step works](#how-a-test-step-works)
- [Reports & dashboard](#reports--dashboard)
- [Configuration](#configuration)
- [Locators](#locators)
- [Handover & deliverables](#handover--deliverables)
- [Troubleshooting](#troubleshooting)

---

## Quick start

```bash
npm install                 # dependencies
npm run appium:driver       # UiAutomator2 driver (once)
npm run setup               # checks Node / Java / Android SDK / device, creates .env + .gitignore
#   → edit .env: IG_VALID_USERNAME, IG_VALID_PASSWORD
npm run check               # all project files present and valid
npm run test:smoke          # P1 smoke: login suite + login→logout flow
npm run dashboard           # open the results
```

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS+ | |
| Java JDK | 17+ | Android Studio's bundled `jbr` folder works. **`JAVA_HOME` must be set.** |
| Android Studio + SDK | API 30+ | **`ANDROID_HOME` must be set**, `platform-tools` on `PATH` (for `adb`) |
| Android emulator | Google Play image | default name `emulator-5554` |
| Instagram app | Play Store | installed on the emulator, logged in **once by hand**, then logged out |
| Test account | dedicated | 2-factor auth off |

**Windows – set the environment variables once, then open a new terminal:**
```powershell
$jdk = "C:\Program Files\Android\Android Studio\jbr"
[Environment]::SetEnvironmentVariable("JAVA_HOME", $jdk, "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
$p = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$p;$jdk\bin;$env:LOCALAPPDATA\Android\Sdk\platform-tools", "User")
```
`npm run setup` reports exactly what is still missing and how to fix it.

## Commands

### Setup & checks
| Command | Does |
|---|---|
| `npm run setup` | Check prerequisites (Node, Java, Android SDK, adb, device, Appium driver); create `.env` / `.gitignore` if missing |
| `npm run check` | All required files present? Every spec / page object / helper / tool parses? All scripts point to existing files? |
| `npm run devices` | List connected Android devices |
| `npm run appium:driver` | Install or update the UiAutomator2 driver |
| `npm run appium:doctor` | Appium's own check (ffmpeg / gstreamer / bundletool warnings are optional) |

### Tests
| Command | Runs |
|---|---|
| `npm test` | all specs |
| `npm run test:smoke` | **P1 smoke** – login suite + login→logout |
| `npm run test:regression` | every suite |
| `npm run test:login` | valid + invalid login |
| `npm run test:valid` | valid login only |
| `npm run test:invalid` | invalid login only |
| `npm run test:flow` | login → profile → logout journey |
| `npm run test:home` | home feed suite |
| `npm run test:profile` | profile suite |
| `npm run test:menu` | settings menu suite |
| `npm run test:spec -- ./test/specs/home.e2e.js` | one spec file |
| `npm run test:grep -- "Edit profile"` | every test whose name contains the text |
| `npm run wdio -- --suite login --logLevel info` | raw runner with your own flags |

### Reports
| Command | Does |
|---|---|
| `npm run dashboard` | rebuild + open the dashboard |
| `npm run dashboard:build` | rebuild only (CI, or after copying run folders) |
| `npm run dashboard:open` | open without rebuilding |
| `npm run report:allure` | Allure report of the last run (needs Java) |

### Locators, deliverables, handover
| Command | Does |
|---|---|
| `npm run locators` | live locator finder – **Enter** dumps the current screen to `locators/`, typing a selector tests it, **q** quits |
| `npm run locators:file -- path/to/screen.xml` | locator JSON from a saved page source |
| `npm run locators:catalog` | rebuild only the locator catalogue |
| `npm run deliverables` | regenerate the whole `deliverables/` folder from the code |
| `npm run handover` | `deliverables` + zip the project without credentials → `handover/` |

### Housekeeping
| Command | Does |
|---|---|
| `npm run clean` | delete `reports/`, `logs/`, `allure-results/` (**removes run history**) |

## Test suites

| Suite (`--suite`) | Spec | Tests |
|---|---|---|
| `login` | `login.e2e.js` | valid login · invalid login |
| `flow` | `loginToLogout.e2e.js` | login → profile → logout |
| `home` | `home.e2e.js` | story tray · like / save / comments · feed scroll |
| `profile` | `profile.e2e.js` | header · Edit profile · Share profile · content tabs · scroll |
| `menu` | `menu.e2e.js` | options · scroll · search · cancel + log out |
| `smoke` | login + flow | P1 |
| `regression` | all of the above | everything |

All test cases with their steps and expected results: [deliverables/03-test-cases](deliverables/03-test-cases/TEST-CASES.md).

## Project structure

```
.
├─ README.md                      this file
├─ package.json                   npm scripts + dependencies
├─ wdio.conf.js                   device, suites, reporters, hooks (evidence, popups, dashboard)
├─ .env.example                   template → copy to .env (credentials, device, run options)
├─ .gitignore
├─ test/
│  ├─ specs/                      one file per feature (*.e2e.js)
│  ├─ pageobjects/
│  │  ├─ BasePage.js              bottom tabs, verified tab taps, safe swipes / scrolls
│  │  ├─ LoginPage.js             profile picker, login form, save-login prompt, login error
│  │  ├─ HomePage.js              top bar, story tray, feed posts
│  │  ├─ ProfilePage.js           header, buttons, suggestions, content tabs, grid
│  │  └─ MenuPage.js              settings list, search, log-out dialogs
│  ├─ helpers/
│  │  ├─ evidence.js              step(), screenshots, step logs, password masking, test records
│  │  ├─ session.js               currentScreen(), ensureLoggedOut/In(), logOutSteps()
│  │  ├─ permissions.js           auto-deny the notification-permission popup
│  │  └─ run.js                   run id + report paths
│  └─ data/users.js               test accounts (read from .env)
├─ tools/
│  ├─ setup.mjs                   npm run setup
│  ├─ check.mjs                   npm run check
│  ├─ build-dashboard.mjs         npm run dashboard[:build]
│  ├─ open-report.mjs             npm run dashboard:open
│  ├─ find-locators.mjs           npm run locators / locators:file
│  ├─ export-locators.mjs         npm run locators:catalog
│  ├─ build-deliverables.mjs      npm run deliverables
│  └─ make-handover.mjs           npm run handover
├─ deliverables/                  generated documentation for testers (npm run deliverables)
├─ locators/                      screen dumps from npm run locators (git-ignored)
└─ reports/                       runs/ + dashboard/ (generated, git-ignored)
```

## How a test step works

```js
await step('Tap "Log in"', () => LoginPage.logInBtn.click(), {
  waitFor: () => LoginPage.notNowBtn.waitForDisplayed({ timeout: 45000 }),   // the result of the action
});
```

1. Deny the Android notification popup if it is on screen.
2. Run the action.
3. `waitFor` – wait for the **result** of the action.
4. Wait until the screen stops changing (max 4 s).
5. Screenshot → `NN-step-name.png`. On failure also the page source (`.xml`), the error and the stack trace.
6. Every tap / type / gesture / console line during the step is written to that step's log.

Tests are started and finished by the hooks in `wdio.conf.js`; specs only call `step()` / `checkpoint()`.

## Reports & dashboard

```
reports/
├─ dashboard/index.html           open with: npm run dashboard
└─ runs/<YYYY-MM-DD_HH-mm-ss>/     one folder per run
   ├─ run.json                    command, device, timing, result
   ├─ logs/                       wdio worker logs + appium.log
   ├─ junit/                      JUnit XML (CI / test-management import)
   └─ <suite>/<test>/NN-step.png  screenshot of every step (+ .xml for failed steps)
```

- **Overview:** last run, pass rate, duration trend, pass/fail bar per run, test stability (last 10 results, *flaky* flag), list of runs.
- **Run page:** device, command, log files; every test with every step – screenshot (click to enlarge, ← → to browse), status, duration, step log, and for failures the error, stack trace and page source.
- History keeps the newest 30 runs (`KEEP_RUNS`). Passwords are masked (`••••••`) everywhere.
- The dashboard is a static page – zip `reports/` to share it, or publish it from CI.

## Configuration

`.env` (or environment variables in front of a command):

| Variable | Default | Effect |
|---|---|---|
| `IG_VALID_USERNAME` / `IG_VALID_PASSWORD` | – | test account |
| `IG_INVALID_USERNAME` / `IG_INVALID_PASSWORD` | built-in | account used for the invalid-login test |
| `DEVICE_NAME` | `emulator-5554` | device to use |
| `UDID` / `PLATFORM_VERSION` | – | pick a specific device |
| `LOG_LEVEL` | `warn` | wdio console detail |
| `RETRIES` | `0` | re-run a failed spec file N times |
| `KEEP_RUNS` | `30` | runs kept on the dashboard |
| `RUN_LABEL` | – | label shown on the dashboard (e.g. a build number) |
| `DENY_ALL_PERMISSIONS` | `false` | deny every Android permission popup, not only notifications |

```powershell
$env:RUN_LABEL="build 1.4.2"; npm run test:smoke          # PowerShell
```
```bash
RUN_LABEL="build 1.4.2" npm run test:smoke                # macOS / Linux
```

Capabilities (app package/activity, timeouts, `noReset`, …) are in `wdio.conf.js`.

## Locators

- Order of preference: **accessibility id** (`~Edit profile`) → **resource-id** → **UiAutomator** → **XPath via a label**. No position-based locators.
- Full catalogue (which screen each locator was seen on, stability, notes): [deliverables/04-locators](deliverables/04-locators/LOCATOR-CATALOG.md).
- Broken locator? Open the failed step on the dashboard → **page source (XML)**, or capture the screen live with `npm run locators`, then update the getter in `test/pageobjects/` and run `npm run deliverables`.

## Handover & deliverables

`npm run deliverables` regenerates [`deliverables/`](deliverables/README.md) from the code:

| Section | Contents |
|---|---|
| 01-setup | prerequisites, environment variables, emulator, `.env`, troubleshooting |
| 02-running-tests | every npm script, suites, options |
| 03-test-cases | all test cases with steps (read from the specs) – Markdown + CSV |
| 04-locators | locator catalogue (Markdown + CSV) + screen dumps |
| 05-test-data | accounts, masking, what the tests change |
| 06-framework | structure, method reference (read from the page objects), adding a test |
| 07-reports-dashboard | dashboard and report files |
| 08-known-issues | unconfirmed locators, app quirks, limitations |
| 09-tools | the tools in `tools/` |
| 10-handover-checklist | sign-off list |

`npm run handover` does the same and zips the project into `handover/instagram-appium-tests-handover.zip`
– without `node_modules`, reports, logs, `.env` and with `test/data/users.js` replaced by a credential-free template.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `JAVA_HOME environment variable is NOT set` | set it (see Prerequisites), open a **new** terminal, `npm run setup` |
| `Could not find a connected Android device` | start the emulator; `npm run devices`; check `DEVICE_NAME` |
| `ECONNREFUSED 127.0.0.1:4723` | another Appium is already running – close it (the test run starts its own) |
| `.env.example` / `.gitignore` missing | dot-files are easy to lose when copying – `npm run setup` recreates them |
| A file seems missing or broken | `npm run check` |
| "App is not on any known screen" | dashboard → failed step → page source (XML); see Locators |
| Login asks for a code | Instagram security check – complete it by hand on the emulator, then rerun |
| Feed refresh swallows a tap | don't scroll the feed right before tapping a tab |

---
Detailed documentation for testers: **[deliverables/README.md](deliverables/README.md)**