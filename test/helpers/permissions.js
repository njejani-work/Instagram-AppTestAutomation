// test/helpers/permissions.js
// Android runtime-permission popup (screen 10) → tap "Don't allow".
//
// The popup belongs to the system (com.google.android.permissioncontroller), not Instagram,
// so while it is up none of the app's elements are visible and every wait would time out.
// installPermissionGuard() hooks into all waits so the popup is denied whenever it shows up.

import { snapshot } from './evidence.js';

const PC = 'com.android.permissioncontroller:id/';

export const PermissionPopup = {
  get dialog()     { return $(`id=${PC}grant_dialog`); },
  get message()    { return $(`id=${PC}permission_message`); },
  get allowBtn()   { return $(`id=${PC}permission_allow_button`); },
  // First request shows "Don't allow" with id permission_deny_button,
  // later requests use permission_deny_and_dont_ask_again_button (as in screen 10).
  get denyAgainBtn() { return $(`id=${PC}permission_deny_and_dont_ask_again_button`); },
  get denyBtn()      { return $(`id=${PC}permission_deny_button`); },
  get denyByText()   { return $('android=new UiSelector().className("android.widget.Button").textMatches("(?i)(don.?t allow|deny)")'); },
};

let options = { only: /notif/i };   // which popups to deny (matched against the popup message)
let busy = false;
let lastCheck = 0;

/**
 * If a permission popup is on screen (and matches `only`), tap "Don't allow".
 * @returns {Promise<boolean>} true if a popup was denied
 */
export async function denyPermissionPopupIfShown({ only = options.only } = {}) {
  if (busy) return false;
  busy = true;
  try {
    if (!(await PermissionPopup.dialog.isDisplayed())) return false;

    const msg = (await PermissionPopup.message.isExisting())
      ? (await PermissionPopup.message.getText()) : '';
    if (only && msg && !only.test(msg)) {
      console.warn(`[permissions] Popup left alone (not matched): "${msg}"`);
      return false;
    }

    // Screenshot into the step evidence, if a test with useEvidence() is running
    try { await snapshot('Notification permission popup'); } catch { /* not inside an evidence test */ }

    for (const btn of [PermissionPopup.denyAgainBtn, PermissionPopup.denyBtn, PermissionPopup.denyByText]) {
      if (await btn.isDisplayed()) {
        await btn.click();
        console.log(`[permissions] Denied: "${msg || 'permission popup'}"`);
        await PermissionPopup.dialog.waitForDisplayed({ reverse: true, timeout: 5000 }).catch(() => {});
        return true;
      }
    }
    console.warn('[permissions] Popup shown but no deny button found');
    return false;
  } catch {
    return false;   // popup vanished mid-check, session busy, etc.
  } finally {
    busy = false;
  }
}

/** Throttled check, safe to call from inside polling loops. */
async function maybeDeny(throttleMs) {
  if (Date.now() - lastCheck < throttleMs) return;
  lastCheck = Date.now();
  await denyPermissionPopupIfShown();
}

/**
 * Call once per session (wdio.conf.js → before hook).
 * Wraps browser.waitUntil and element.waitUntil — which also power waitForDisplayed,
 * waitForExist, waitForClickable… — so the popup is denied during any wait.
 */
export function installPermissionGuard({ only = /notif/i, throttleMs = 1000 } = {}) {
  options = { only };

  const wrapped = async function (origWaitUntil, condition, waitOptions) {
    return origWaitUntil(async () => {
      await maybeDeny(throttleMs);
      return condition();
    }, waitOptions);
  };

  browser.overwriteCommand('waitUntil', wrapped);         // browser.waitUntil(...)
  browser.overwriteCommand('waitUntil', wrapped, true);   // element.waitUntil / waitForDisplayed / ...
}