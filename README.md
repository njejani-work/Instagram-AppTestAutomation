# Instagram Android – Test Automation Handover

Automated UI tests for the **Instagram Android app** (`com.instagram.android`) using
**WebdriverIO 10 + Appium 2/3 (UiAutomator2) + Mocha**, written in JavaScript with the Page Object Model.
Every test step is recorded with a screenshot, its duration, a log of what was done and, on failure,
the error, stack trace and page source. A dashboard tracks every run.

## Start here

1. **[01 – Setup](01-setup/SETUP.md)** – install the tools, connect the emulator, add credentials. *(≈ 30 min the first time)*
2. **[02 – Running tests](02-running-tests/RUNNING-TESTS.md)** – the commands, suites and options.
3. **[07 – Dashboard](07-reports-dashboard/DASHBOARD.md)** – reading results, screenshots and error logs.

```bash
npm install
cp .env.example .env        # fill in the test account
npm run devices             # emulator must be listed
npm run test:smoke          # login + login→logout flow
npm run dashboard           # open the results
```

## What's in this folder

| Section | For | Contents |
|---|---|---|
| [01-setup](01-setup/SETUP.md) | everyone, once | Prerequisites, install, emulator, `.env`, first run, troubleshooting |
| [02-running-tests](02-running-tests/RUNNING-TESTS.md) | daily use | All `npm run` commands, suites, single tests, environment variables |
| [03-test-cases](03-test-cases/TEST-CASES.md) | test managers, testers | 15 automated test cases with steps and expected results · [CSV for Excel / test tools](03-test-cases/test-cases.csv) |
| [04-locators](04-locators/README.md) | anyone fixing a broken test | [Locator catalogue](04-locators/LOCATOR-CATALOG.md) (74 locators, which screen each was seen on, stability) · [CSV](04-locators/locator-catalog.csv) · raw [screen dumps](04-locators/screen-dumps/) · how to capture new ones |
| [05-test-data](05-test-data/TEST-DATA.md) | everyone | Test accounts, `.env` keys, password masking, data the tests change |
| [06-framework](06-framework/FRAMEWORK.md) | automation engineers | Folder layout, page objects (full method list), helpers, how to add a test |
| [07-reports-dashboard](07-reports-dashboard/DASHBOARD.md) | everyone | Dashboard, run history, per-step screenshots & logs, JUnit, Allure |
| [08-known-issues](08-known-issues/KNOWN-ISSUES.md) | everyone | Unverified locators, app behaviour quirks, limitations |
| [09-tools](09-tools/TOOLS.md) | automation engineers | Locator finder, locator catalogue, dashboard builder |
| [10-handover-checklist](10-handover-checklist/CHECKLIST.md) | receiving team | Sign-off list for taking over the project |

## Test coverage at a glance

| Suite | Spec | Tests | Command |
|---|---|---|---|
| Login | `login.e2e.js` | valid login · invalid login | `npm run test:login` |
| Login to logout | `loginToLogout.e2e.js` | full journey | `npm run test:flow` |
| Home feed | `home.e2e.js` | stories · like/save/comments · feed scroll | `npm run test:home` |
| Profile | `profile.e2e.js` | header · edit · share · content tabs · scroll | `npm run test:profile` |
| Settings menu | `menu.e2e.js` | options · scroll · search · log out | `npm run test:menu` |

**Smoke (P1):** `npm run test:smoke` = Login + Login to logout.

## Contacts

| Role | Name | Contact |
|---|---|---|
| Automation owner (handing over) | Nishant | nishant@egenome.ai |
| Receiving QA lead | _to fill in_ | |