const en = {
  // The app's own name - shown at the top of the Home tab (see
  // app-header.tsx), deliberately not translated per-locale below like
  // every other string here: a proper noun/brand name, same convention as
  // not translating publisher names.
  appName: "News Khabri",
  tabHome: "Home",
  tabProfile: "Profile",
  tabPreferences: "Preferences",
  articlesLoadError: "Something went wrong loading articles.",
  back: "Back",
  retry: "Try again",
  unexpectedError: "The app hit an unexpected error.",
  pageNotFoundTitle: "Page not found",
  pageNotFoundMessage: "This screen doesn't exist, or the link is broken.",
  goHome: "Go to Home",
  articleLoadError: "Couldn't load this article.",
  readOnTemplate: "Read on {source}",
  relatedArticles: "RELATED ARTICLES",
  imageFailedToLoad: "Image failed to load",
  noImage: "No image",
  profileTitle: "Profile",
  signInDescription: "Sign in to sync your preferences across devices",
  signInWithGoogle: "Sign in with Google",
  signOut: "Sign out",
  deleteAccount: "Delete account",
  deleteAccountConfirmTitle: "Delete account?",
  deleteAccountConfirmMessage:
    "This permanently deletes your account and everything synced to it — saved articles, preferences, and reading history. This can't be undone.",
  deleteAccountConfirm: "Delete",
  deleteAccountError: "Couldn't delete your account. Please try again.",
  // Bookmarks - the toggle on articles/feed cards, and the Saved screen
  // reached from the header icon and the Profile screen.
  save: "Save",
  removeBookmark: "Remove from saved",
  savedArticlesTitle: "Saved",
  savedTitleCountTemplate: "Saved ({count})",
  articleSaved: "Saved",
  toastCheckNow: "View",
  noSavedArticles: "No saved articles yet",
  noSavedArticlesDescription:
    "Tap the bookmark icon on any article to save it for later",
  clearAll: "Clear All",
  clearAllConfirmTitle: "Clear all saved articles?",
  clearAllConfirmMessage:
    "This removes every article from your saved list. This can't be undone.",
  cancel: "Cancel",
  appearance: "Appearance",
  appearanceAutomaticDesc: "Match your device's system setting",
  appearanceDayDesc: "Always use light appearance",
  appearanceNightDesc: "Always use dark appearance",
  fontSize: "Font size",
  fontPreviewText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  language: "Language",
  languageDescription: "Choose your preferred language for articles and app text",
  languageEnglish: "English",
  languageHindi: "Hindi",
  languageGujarati: "Gujarati",
  languageBengali: "Bengali",
  languageKannada: "Kannada",
  languageMarathi: "Marathi",
  languageMalayalam: "Malayalam",
  languageTamil: "Tamil",
  languageTelugu: "Telugu",
  languageOdia: "Odia",
  articleImageAlt: "Article image",
  showPhotoCredit: "Show photo credit",
  hidePhotoCredit: "Hide photo credit",
  loadingMore: "Loading more articles…",
  loadingArticles: "Loading articles…",
  loadingArticle: "Loading article…",
  fontSizeSmall: "Small font size",
  fontSizeMedium: "Medium font size",
  fontSizeLarge: "Large font size",
  minReadTemplate: "{minutes} min read",
  // Relative time labels ("2h ago", "Just now") - see
  // utils/format-date.ts's formatRelativeTime, which does the date math
  // and calls t() with these rather than baking English text in directly
  // (Intl.RelativeTimeFormat is deliberately avoided there - see that
  // file's own comment on why).
  justNow: "Just now",
  minutesAgoTemplate: "{minutes}m ago",
  hoursAgoTemplate: "{hours}h ago",
  daysAgoTemplate: "{days}d ago",
  scrollToFirstCategory: "Scroll back to first category",
  tabSearch: "Explore",
  searchPlaceholder: "Search articles",
  clearSearch: "Clear search",
  noArticlesFound: "No articles found.",
  // Search-results-specific empty state (see article-list.tsx) - echoes
  // the actual query back so it's clear what came up empty, unlike the
  // generic noArticlesFound above used for a category with nothing in it.
  noResultsForTemplate: "No results found for {query}",
  topStories: "Top Stories",
  topStoriesShort: "Top",
  categoryIndia: "India",
  categoryWorld: "World",
  categoryBusiness: "Business",
  categorySports: "Sports",
  categoryCricket: "Cricket",
  categoryEntertainment: "Entertainment",
  categoryTech: "Tech",
  categoryLifestyle: "Lifestyle",
  categoryEducation: "Education",
  categoryScience: "Science",
  // The sample letter shown at three sizes on the "Article font size"
  // toggle - a plain Latin "A" reads oddly once the rest of the app is in
  // another script, so each language shows a representative letter from its
  // own alphabet instead.
  fontSizeSampleGlyph: "A",
  debugMode: "Debug mode",
  debugModeDescription:
    "Show each article's ranking score as a pill on its image, to verify the weighting logic.",
  storiesLoadError: "Something went wrong loading stories.",
  noStoriesFound: "No stories found.",
  storySourcesTemplate: "{count} sources",
  storyArticlesTemplate: "{count} articles",
  storyUpdatedTemplate: "Updated {time}",
  storyMembersHeading: "SOURCES COVERING THIS STORY",
  loadingStory: "Loading story…",
  storyLoadError: "Couldn't load this story.",
  share: "Share",
  sources: "Sources",
  sourcesDescription: "Choose which publishers' articles you want to see",
  allSources: "All sources",
  sourcesSelectedTemplate: "{count} selected",
  signInRequiredForSources: "Sign in to choose which publishers you see",
  notifications: "Notifications",
  notificationsDescription: "Get a push notification for the most trending story",
  notificationsOff: "Off",
  notificationsEveryMinutesTemplate: "Every {minutes} minutes",
  signInRequiredForNotifications: "Sign in for more notification timing options",
  about: "About",
  privacy: "Privacy",
  legal: "Legal",
  // First-launch onboarding (src/app/onboarding/) - three screens: a
  // branded welcome, a feature summary, then an optional sign-in pitch.
  // See onboarding-context.tsx for the "have we shown this already" flag.
  onboardingCatchphrase: "Your day's biggest stories, without the noise.",
  onboardingLegalAccept:
    "I have read and accept the Privacy Policy and Terms of Service",
  onboardingNext: "Next",
  onboardingFeaturesTitle: "Everything you need, nothing you don't",
  onboardingFeatureNoAdsTitle: "No ads, ever",
  onboardingFeatureNoAdsDesc:
    "A clean reading experience with nothing competing for your attention",
  onboardingFeatureLanguageTitle: "Read in your language",
  onboardingFeatureLanguageDesc: "News in 10 Indian languages, not just English",
  onboardingFeatureSourcesTitle: "Choose your sources",
  onboardingFeatureSourcesDesc: "Pick exactly which publishers show up in your feed",
  onboardingFeatureNotificationsTitle: "Notifications on your terms",
  onboardingFeatureNotificationsDesc:
    "Get alerted about trending stories, as often as you want",
  onboardingSignInTitle: "Sign in to unlock more",
  onboardingSignInDescription:
    "Sign in with Google to sync your source picks and notification settings across every device you use",
  onboardingSkip: "Skip for now",
} as const;

export default en;
