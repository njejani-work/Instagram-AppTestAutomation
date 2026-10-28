// test/pageobjects/LoginPage.js
// Instagram login flow: profile picker (screen 9) → login form (screen 1) → "Save login info?" (screen 2)

const uiBtn = (desc) => `android=new UiSelector().className("android.widget.Button").description("${desc}")`;

class LoginPage {
  // ---------- Screen 9: "Continue as …" profile picker ----------
  get useAnotherProfileBtn() { return $(uiBtn('Use another profile')); }
  get continueBtn()          { return $(uiBtn('Continue')); }

  // ---------- Screen 1: login form ----------
  get usernameInput()        { return $('~Username, email or mobile number,'); }
  get passwordInput()        { return $('~Password,'); }
  get logInBtn()             { return $(uiBtn('Log in')); }
  get forgotPasswordBtn()    { return $(uiBtn('Forgot password?')); }
  get createNewAccountBtn()  { return $(uiBtn('Create new account')); }

  // ---------- Screen 2: "Save your login info?" ----------
  // Two variants of "Save your login info?": a React Native one (label in content-desc, screen 2)
  // and a native dialog (label in text, screen 7). Match either.
  get saveBtn()   { return $("//android.widget.Button[@content-desc='Save' or @text='Save']"); }
  get notNowBtn() { return $("//android.widget.Button[@content-desc='Not now' or @text='Not now' or @text='Not Now' or @content-desc='Not Now']"); }

  // ---------- Invalid-login error ----------
  // Not captured in a dump yet: matches Instagram's usual wording in text or content-desc
  // ("Incorrect password", "Can't find account", "Something went wrong", "Please try again"…).
  static ERROR_RE = '(?is).*(incorrect|can.?t find|couldn.?t find|isn.?t right|wrong|try again|no account|not found|invalid).*';
  get loginErrorByText()     { return $(`android=new UiSelector().textMatches("${LoginPage.ERROR_RE}")`); }
  get loginErrorByDesc()     { return $(`android=new UiSelector().descriptionMatches("${LoginPage.ERROR_RE}")`); }
  get errorDismissBtn() {
    return $('android=new UiSelector().className("android.widget.Button").textMatches("(?i)(ok|try again|dismiss|close)")');
  }
  get errorDismissBtnByDesc() {
    return $('android=new UiSelector().className("android.widget.Button").descriptionMatches("(?i)(ok|try again|dismiss|close)")');
  }

  // ---------- actions ----------

  /** Wait until either the profile picker or the login form is on screen. */
  async waitForLoad(timeout = 20000) {
    await browser.waitUntil(
      async () => (await this.useAnotherProfileBtn.isDisplayed()) || (await this.usernameInput.isDisplayed()),
      { timeout, timeoutMsg: 'Neither the profile picker nor the login form appeared' },
    );
  }

  /** Screen 9 → screen 1. Does nothing if the login form is already showing. */
  async chooseAnotherProfile() {
    if (await this.useAnotherProfileBtn.isDisplayed()) {
      await this.useAnotherProfileBtn.click();
    }
    await this.usernameInput.waitForDisplayed({ timeout: 15000 });
  }

  /** Screen 1: fill credentials and tap Log in. */
  async login({ username, password }) {
    await this.usernameInput.waitForDisplayed();
    await this.usernameInput.clearValue();
    await this.usernameInput.setValue(username);
    await this.passwordInput.clearValue();
    await this.passwordInput.setValue(password);
    if (await driver.isKeyboardShown()) await driver.hideKeyboard();
    await this.logInBtn.click();
  }

  /** Screen 2: decline saving login info. */
  /**
   * After tapping Log in: if "Save your login info?" shows, tap "Not now".
   * The prompt is optional – Instagram skips it sometimes – so this also succeeds when
   * the app goes straight to the main tabs.
   */
  async dontSaveLoginInfo(timeout = 45000) {
    const inApp = () => $('id=com.instagram.android:id/feed_tab').isDisplayed();
    await browser.waitUntil(async () => (await this.notNowBtn.isDisplayed()) || (await inApp()), {
      timeout, interval: 700, timeoutMsg: 'Neither the save-login prompt nor the home feed appeared after login',
    });
    if (await this.notNowBtn.isDisplayed()) {
      await this.notNowBtn.click();
      await this.notNowBtn.waitForDisplayed({ reverse: true, timeout: 10000 });
    }
  }

  /** After tapping Log in with bad credentials: wait for the error, return its text. */
  async waitForLoginError(timeout = 30000) {
    let message = '';
    await browser.waitUntil(async () => {
      for (const el of [this.loginErrorByText, this.loginErrorByDesc]) {
        if (await el.isDisplayed()) {
          message = (await el.getText()) || (await el.getAttribute('content-desc')) || '';
          return true;
        }
      }
      return false;
    }, { timeout, interval: 700, timeoutMsg: 'No login error message appeared' });
    return message.trim();
  }

  async isLoginErrorShown() {
    return (await this.loginErrorByText.isDisplayed()) || (await this.loginErrorByDesc.isDisplayed());
  }

  /** Close the error dialog and wait for the login form again. */
  async dismissLoginError() {
    if (await this.errorDismissBtn.isDisplayed()) await this.errorDismissBtn.click();
    else if (await this.errorDismissBtnByDesc.isDisplayed()) await this.errorDismissBtnByDesc.click();
    else if (!(await this.usernameInput.isDisplayed())) await driver.back();   // modal with no button
    await this.usernameInput.waitForDisplayed({ timeout: 10000 });
  }

  /** Full flow: picker → login → "Not now". */
  async loginAs(user) {
    await this.waitForLoad();
    await this.chooseAnotherProfile();
    await this.login(user);
    await this.dontSaveLoginInfo();
  }
}

export default new LoginPage();