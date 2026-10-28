# Locator catalogue

Generated from the page objects by `npm run locators:catalog` – regenerate after changing a page object.
**Screens** = screen dumps in which the element was found (see the screen index below). Empty = not seen in any dump yet.

| Total locators | Seen in a dump | Not yet seen | Position-based (fragile) |
|---|---|---|---|
| 74 | 56 | 18 | 0 |

## Screen index

| # | Screen | Dump |
|---|---|---|
| 1 | Login form | [screen-1.json](screen-dumps/screen-1.json) |
| 2 | "Save your login info?" after login | [screen-2.json](screen-dumps/screen-2.json) |
| 3 | Home feed | [screen-3.json](screen-dumps/screen-3.json) |
| 4 | Own profile | [screen-4.json](screen-dumps/screen-4.json) |
| 5 | Settings menu – top | [screen-5.json](screen-dumps/screen-5.json) |
| 6 | Settings menu – bottom | [screen-6.json](screen-dumps/screen-6.json) |
| 7 | "Save your login info?" during log out | [screen-7.json](screen-dumps/screen-7.json) |
| 8 | "Log out?" confirmation | [screen-8.json](screen-dumps/screen-8.json) |
| 9 | Profile picker ("Continue as …") | [screen-9.json](screen-dumps/screen-9.json) |
| 10 | Android notification-permission popup | [screen-10.json](screen-dumps/screen-10.json) |

## BasePage

| Element | Kind | Strategy | Selector | Stability | Screens | Notes |
|---|---|---|---|---|---|---|
| `homeTab` | single | resource-id | `id=com.instagram.android:id/feed_tab` | stable | 3 4 |  |
| `reelsTab` | single | resource-id | `id=com.instagram.android:id/clips_tab` | stable | 3 4 |  |
| `messageTab` | single | resource-id | `id=com.instagram.android:id/direct_tab` | stable | 3 4 |  |
| `searchTab` | single | resource-id | `id=com.instagram.android:id/search_tab` | stable | 3 4 |  |
| `profileTab` | single | resource-id | `id=com.instagram.android:id/profile_tab` | stable | 3 4 |  |

## LoginPage

| Element | Kind | Strategy | Selector | Stability | Screens | Notes |
|---|---|---|---|---|---|---|
| `useAnotherProfileBtn` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").description("Use another profile")` | stable | 9 |  |
| `continueBtn` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").description("Continue")` | stable | 9 |  |
| `usernameInput` | single | accessibility id | `~Username, email or mobile number,` | stable | 1 |  |
| `passwordInput` | single | accessibility id | `~Password,` | stable | 1 |  |
| `logInBtn` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").description("Log in")` | stable | 1 |  |
| `forgotPasswordBtn` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").description("Forgot password?")` | stable | 1 |  |
| `createNewAccountBtn` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").description("Create new account")` | stable | 1 9 |  |
| `saveBtn` | single | XPath | `//android.widget.Button[@content-desc='Save' or @text='Save']` | medium – XPath | 2 7 |  |
| `notNowBtn` | single | XPath | `//android.widget.Button[@content-desc='Not now' or @text='Not now' or @text='Not Now' or @content-desc='Not Now']` | medium – XPath | 2 7 |  |
| `loginErrorByText` | single | UiAutomator | `android=new UiSelector().textMatches("(?is).*(incorrect\|can.?t find\|couldn.?t find\|isn.?t right\|wrong\|try again\|no account\|not found\|invalid).*")` | pattern – verify wording | – | Invalid-login message – not dumped yet. Adjust the wording pattern if needed. |
| `loginErrorByDesc` | single | UiAutomator | `android=new UiSelector().descriptionMatches("(?is).*(incorrect\|can.?t find\|couldn.?t find\|isn.?t right\|wrong\|try again\|no account\|not found\|invalid).*")` | pattern – verify wording | – | Invalid-login message – not dumped yet. Adjust the wording pattern if needed. |
| `errorDismissBtn` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").textMatches("(?i)(ok\|try again\|dismiss\|close)")` | pattern – verify wording | – | Error dialog button – not dumped yet. |
| `errorDismissBtnByDesc` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").descriptionMatches("(?i)(ok\|try again\|dismiss\|close)")` | pattern – verify wording | – | Error dialog button – not dumped yet. |

## HomePage

| Element | Kind | Strategy | Selector | Stability | Screens | Notes |
|---|---|---|---|---|---|---|
| `actionBar` | single | resource-id | `id=com.instagram.android:id/action_bar` | stable | 3 |  |
| `createBtn` | single | accessibility id | `~Create a post, story, reel or live video.` | stable | 3 |  |
| `instagramHomeFeedBtn` | single | accessibility id | `~Instagram Home Feed` | stable | 3 |  |
| `notificationsBtn` | single | accessibility id | `~Notifications` | stable | 3 5 |  |
| `homeTab` | single | accessibility id | `~Home` | stable | 3 4 |  |
| `reelsTab` | single | accessibility id | `~Reels` | stable | 3 4 |  |
| `messageTab` | single | accessibility id | `~Message` | stable | 3 4 |  |
| `searchTab` | single | accessibility id | `~Search and explore` | stable | 3 4 |  |
| `profileTab` | single | accessibility id | `~Profile` | stable | 3 4 |  |
| `storyButtons` | list | UiAutomator | `android=new UiSelector().className("android.widget.Button").descriptionContains("'s story, ")` | stable | – | Story buttons: content-desc is "<user>'s story, N of M, …" – matched by prefix, so it works for any user (screen 3). |
| `storyOf(username)` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").descriptionStartsWith("<username>'s story")` | stable (parameterised) | – | Story buttons: content-desc is "<user>'s story, N of M, …" – matched by prefix, so it works for any user (screen 3). |
| `storyAt(index)` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").descriptionContains("'s story, <index> of ")` | stable (parameterised) | – | Story buttons: content-desc is "<user>'s story, N of M, …" – matched by prefix, so it works for any user (screen 3). |
| `mediaGroup` | single | resource-id | `id=com.instagram.android:id/media_group` | stable | 3 |  |
| `postAuthorNames` | list | resource-id | `id=com.instagram.android:id/row_feed_photo_profile_name` | stable | 3 |  |
| `postMoreActionsBtns` | list | accessibility id | `~More actions for this post` | stable | 3 |  |
| `followBtns` | list | resource-id | `id=com.instagram.android:id/inline_follow_button` | stable | 3 |  |
| `likeBtns` | list | resource-id | `id=com.instagram.android:id/row_feed_button_like` | stable | – | Below the first post – not in a dump yet. Confirm after one scroll. |
| `commentBtns` | list | resource-id | `id=com.instagram.android:id/row_feed_button_comment` | stable | – | Below the first post – not in a dump yet. Confirm after one scroll. |
| `shareBtns` | list | resource-id | `id=com.instagram.android:id/row_feed_button_share` | stable | – | Below the first post – not in a dump yet. Confirm after one scroll. |
| `saveBtns` | list | resource-id | `id=com.instagram.android:id/row_feed_button_save` | stable | – | Below the first post – not in a dump yet. Confirm after one scroll. |

## ProfilePage

| Element | Kind | Strategy | Selector | Stability | Screens | Notes |
|---|---|---|---|---|---|---|
| `usernameContainer` | single | resource-id | `id=com.instagram.android:id/action_bar_username_container` | stable | 4 |  |
| `createNewBtn` | single | accessibility id | `~Create New` | stable | 4 |  |
| `optionsBtn` | single | accessibility id | `~Options` | stable | 4 |  |
| `avatar` | single | resource-id | `id=com.instagram.android:id/row_profile_header_imageview_frame_layout` | stable | 4 |  |
| `postsCount` | single | resource-id | `id=com.instagram.android:id/profile_header_post_count_front_familiar` | stable | 4 |  |
| `followersCount` | single | resource-id | `id=com.instagram.android:id/profile_header_followers_stacked_familiar` | stable | 4 |  |
| `followingCount` | single | resource-id | `id=com.instagram.android:id/profile_header_following_stacked_familiar` | stable | 4 |  |
| `nameAndBio` | single | resource-id | `id=com.instagram.android:id/profile_header_name_and_bio_upsell` | stable | 4 |  |
| `editProfileBtn` | single | accessibility id | `~Edit profile` | stable | 4 |  |
| `shareProfileBtn` | single | accessibility id | `~Share profile` | stable | 4 |  |
| `discoverPeopleBtn` | single | accessibility id | `~Discover people` | stable | 4 |  |
| `seeAllBtn` | single | resource-id | `id=com.instagram.android:id/netego_carousel_cta` | stable | 4 |  |
| `contactImportCard` | single | resource-id | `id=com.instagram.android:id/contact_import_card_container` | stable | 4 |  |
| `suggestedCards` | list | resource-id | `id=com.instagram.android:id/suggested_entity_card_container` | stable | 4 |  |
| `suggestionFollowBtns` | list | resource-id | `id=com.instagram.android:id/suggested_user_card_follow_button` | stable | 4 |  |
| `suggestionDismissBtns` | list | resource-id | `id=com.instagram.android:id/dismiss_button_prism_style` | stable | 4 |  |
| `followSuggestionBtn(name)` | single | UiAutomator | `android=new UiSelector().resourceId("com.instagram.android:id/suggested_user_card_follow_button").descriptionContains("<name>")` | stable (parameterised) | 4 |  |
| `gridTab` | single | accessibility id | `~Grid view` | stable | 4 |  |
| `reelsContentTab` | single | UiAutomator | `android=new UiSelector().resourceId("com.instagram.android:id/profile_tab_icon_view").description("Reels")` | stable | 3 4 |  |
| `photosOfYouTab` | single | XPath | `//*[@content-desc='Photos of you']/ancestor::*[@clickable='true'][1]` | medium – XPath via label | 4 |  |
| `emptyState` | single | resource-id | `id=com.instagram.android:id/empty_state_view_root` | stable | 4 |  |
| `gridItems` | list | UiAutomator | `android=new UiSelector().descriptionMatches("(?i).*row \\d+, column \\d+.*")` | pattern – verify wording | – | Grid posts – profile had 0 posts when dumped. Confirm on a profile with posts. |
| `gridItemAt(row, col)` | single | UiAutomator | `android=new UiSelector().descriptionMatches("(?i).*row <row>, column <col>.*")` | pattern – verify wording | – | Grid posts – profile had 0 posts when dumped. Confirm on a profile with posts. |

## MenuPage

| Element | Kind | Strategy | Selector | Stability | Screens | Notes |
|---|---|---|---|---|---|---|
| `backBtn` | single | accessibility id | `~Back` | stable | 5 6 |  |
| `searchInput` | single | class name | `android.widget.EditText` | medium – only one on screen | – |  |
| `addProfileBtn` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").text("Add profile")` | stable | 6 |  |
| `logOutBtn` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").text("Log out")` | stable | 6 8 |  |
| `dialogPrimaryBtn` | single | resource-id | `id=com.instagram.android:id/primary_button` | stable | 7 8 |  |
| `dialogNegativeBtn` | single | resource-id | `id=com.instagram.android:id/negative_button` | stable | 7 8 |  |
| `option(label)` | single | XPath | `//*[starts-with(@text, '<label>') or starts-with(@content-desc, '<label>')]/ancestor-or-self::*[@clickable='true'][1]` | medium – XPath via label | – | Menu rows have no id/desc of their own – matched by the start of their label (screens 5, 6). Labels: MENU in MenuPage.js. |

## permissions

| Element | Kind | Strategy | Selector | Stability | Screens | Notes |
|---|---|---|---|---|---|---|
| `dialog` | single | resource-id | `id=com.android.permissioncontroller:id/grant_dialog` | stable | 10 |  |
| `message` | single | resource-id | `id=com.android.permissioncontroller:id/permission_message` | stable | – | Popup text – present on the popup, not listed in the dump (not clickable). |
| `allowBtn` | single | resource-id | `id=com.android.permissioncontroller:id/permission_allow_button` | stable | 10 |  |
| `denyAgainBtn` | single | resource-id | `id=com.android.permissioncontroller:id/permission_deny_and_dont_ask_again_button` | stable | 10 |  |
| `denyBtn` | single | resource-id | `id=com.android.permissioncontroller:id/permission_deny_button` | stable | – | First-time variant of "Don't allow" (screen 10 shows the repeat variant). |
| `denyByText` | single | UiAutomator | `android=new UiSelector().className("android.widget.Button").textMatches("(?i)(don.?t allow\|deny)")` | pattern – verify wording | – |  |

