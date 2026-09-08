import { useRouter } from "expo-router";
import { SFSymbol, SymbolView } from "expo-symbols";
import { Fragment } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader from "@/components/app-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { LANGUAGE_ENDONYMS } from "@/constants/languages";
import { Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useDebugPreference } from "@/contexts/debug-preference";
import {
  FontSizePreference,
  useFontSizePreference,
} from "@/contexts/font-size-preference";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useNotificationPreference } from "@/contexts/notification-preference";
import { useSourcesPreference } from "@/contexts/sources-preference";
import {
  ThemePreference,
  useThemePreference,
} from "@/contexts/theme-preference";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useTheme } from "@/hooks/use-theme";
import { TranslationKey, useTranslation } from "@/i18n/translations";

const APPEARANCE_OPTIONS: {
  value: ThemePreference;
  glyph: string;
  sf: SFSymbol;
  descriptionKey: TranslationKey;
}[] = [
  // sf renders as a real SF Symbol on iOS; glyph is the Android/web fallback
  // (SymbolView renders nothing there on its own - see the fallback prop
  // below). "circle.lefthalf.filled" is the same glyph macOS System
  // Settings itself uses for "Auto" appearance.
  { value: "automatic", glyph: "⚙️", sf: "circle.lefthalf.filled", descriptionKey: "appearanceAutomaticDesc" },
  { value: "day", glyph: "☀️", sf: "sun.max.fill", descriptionKey: "appearanceDayDesc" },
  { value: "night", glyph: "🌙", sf: "moon.fill", descriptionKey: "appearanceNightDesc" },
];

const FONT_SIZE_OPTIONS: {
  value: FontSizePreference;
  glyphSize: number;
  scale: number;
  labelKey: TranslationKey;
}[] = [
  { value: "small", glyphSize: 13, scale: 0.875, labelKey: "fontSizeSmall" },
  { value: "medium", glyphSize: 17, scale: 1, labelKey: "fontSizeMedium" },
  { value: "large", glyphSize: 21, scale: 1.2, labelKey: "fontSizeLarge" },
];

// The About/Privacy/Terms links at the bottom of this screen - each just a
// static-content route under this same preferences/ stack (see
// pushed-screen.tsx for their shared shell). Shown as a single
// centered line (see legalLinksRow) rather than three stacked rows, since
// three short reference links don't need a full row each.
const LEGAL_LINKS: { href: "/preferences/about" | "/preferences/privacy" | "/preferences/terms"; labelKey: TranslationKey }[] = [
  { href: "/preferences/about", labelKey: "about" },
  { href: "/preferences/privacy", labelKey: "privacy" },
  { href: "/preferences/terms", labelKey: "legal" },
];

const FONT_PREVIEW_BASE_SIZE = 15;
// The preview used to reserve a fixed 3 lines so switching size wouldn't
// shift the layout below. That reservation was sized against English (56
// chars) on a premise that didn't hold - the Indic strings run 101-139
// chars yet still render in 1-2 lines - so it left ~52pt of permanent dead
// space under this one section in most locales, which is visible on the
// screen where every other section sits flush.
//
// Sizing to content instead. Changing font size can now nudge what's below
// by a line, but that happens only while the reader is actively using this
// control, and it makes the effect of their choice visible. Permanent dead
// space on every visit is the worse trade. numberOfLines stays as a cap so
// a pathological string still can't run away with the layout.
const PREVIEW_MAX_LINES = 3;

export default function PreferencesScreen() {
  const { preference, setPreference } = useThemePreference();
  const { preference: fontPreference, setPreference: setFontPreference } =
    useFontSizePreference();
  const { language } = useLanguagePreference();
  const { selectedSources } = useSourcesPreference();
  const { interval: notificationInterval, setInterval: setNotificationInterval } =
    useNotificationPreference();
  const { debugEnabled, setDebugEnabled } = useDebugPreference();
  const { user } = useAuth();
  const isSignedIn = user != null;
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const router = useRouter();

  // No extra top gap beyond the inset itself, matching Home/Search -
  // AppHeader below owns that spacing instead.
  const topPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });

  const selectedAppearance = APPEARANCE_OPTIONS.find(
    (option) => option.value === preference
  );
  const selectedFontSize = FONT_SIZE_OPTIONS.find(
    (option) => option.value === fontPreference
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: topPadding }]}>
      <AppHeader title={t("tabPreferences")} />
      <ScrollView
        testID="preferences-scroll"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.toggleRow}>
          <ThemedText type="default">{t("appearance")}</ThemedText>
          <View style={styles.iconRow}>
            {APPEARANCE_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setPreference(option.value)}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: selected
                        ? theme.tint
                        : theme.backgroundElement,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(option.descriptionKey)}
                >
                  <SymbolView
                    name={option.sf}
                    size={18}
                    tintColor={selected ? theme.tintText : theme.text}
                    fallback={
                      <Text style={styles.iconGlyph}>{option.glyph}</Text>
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {selectedAppearance && t(selectedAppearance.descriptionKey)}
        </ThemedText>

        <View
          style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.backgroundSelected }]}
        />

        <View style={styles.toggleRow}>
          <ThemedText type="default">{t("fontSize")}</ThemedText>
          <View style={styles.iconRow}>
            {FONT_SIZE_OPTIONS.map((option) => {
              const selected = fontPreference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setFontPreference(option.value)}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: selected
                        ? theme.tint
                        : theme.backgroundElement,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(option.labelKey)}
                >
                  <ThemedText
                    // Sets its own size per option - applying the active
                    // scale again would square the preference.
                    unscaled
                    style={[
                      styles.iconGlyph,
                      styles.fontSizeSampleGlyph,
                      {
                        fontSize: option.glyphSize,
                        // See "Font-size sample glyph centering" in
                        // docs/preferences-screen.md.
                        lineHeight: Math.ceil(option.glyphSize * 1.4),
                        color: selected ? theme.tintText : theme.text,
                      },
                    ]}
                  >
                    {t("fontSizeSampleGlyph")}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View>
          <ThemedText
            // Sized from the selected option below; ThemedText must not
            // apply the active scale on top of it.
            unscaled
            numberOfLines={PREVIEW_MAX_LINES}
            themeColor="textSecondary"
            style={[
              styles.description,
              { fontSize: FONT_PREVIEW_BASE_SIZE * (selectedFontSize?.scale ?? 1) },
            ]}
          >
            {t("fontPreviewText")}
          </ThemedText>
        </View>

        <View
          style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.backgroundSelected }]}
        />

        <Pressable
          onPress={() => router.push("/preferences/language")}
          style={styles.legalRow}
          accessibilityRole="button"
          accessibilityLabel={t("language")}
        >
          <ThemedText type="default">{t("language")}</ThemedText>
          <View style={styles.languagePickerValue}>
            <ThemedText themeColor="textSecondary">{LANGUAGE_ENDONYMS[language]}</ThemedText>
            <SymbolView
              name="chevron.right"
              size={14}
              weight="semibold"
              tintColor={theme.textSecondary}
              fallback={
                <ThemedText themeColor="textSecondary" style={styles.legalChevronFallback}>
                  ›
                </ThemedText>
              }
            />
          </View>
        </Pressable>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {t("languageDescription")}
        </ThemedText>

        <View
          style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.backgroundSelected }]}
        />

        {/* Sources and Notifications below are gated on sign-in as a
            deliberate incentive to create an account, NOT because either
            needs one. Nothing technical requires it: the source filter is
            pure local AsyncStorage that ArticleList already applies for
            everyone, and /push-subscriptions is explicitly anonymous-capable
            (see api/notifications.ts). Recorded here because a reader
            reasonably assumes a disabled row means "this can't work yet"
            rather than "this is a product decision". */}
        <Pressable
          onPress={() => isSignedIn && router.push("/preferences/sources")}
          disabled={!isSignedIn}
          style={[styles.legalRow, !isSignedIn && styles.disabledRow]}
          accessibilityRole="button"
          accessibilityLabel={t("sources")}
          accessibilityState={{ disabled: !isSignedIn }}
        >
          <ThemedText type="default">{t("sources")}</ThemedText>
          <View style={styles.languagePickerValue}>
            <ThemedText themeColor="textSecondary">
              {selectedSources.length > 0
                ? t("sourcesSelectedTemplate", { count: String(selectedSources.length) })
                : t("allSources")}
            </ThemedText>
            <SymbolView
              name="chevron.right"
              size={14}
              weight="semibold"
              tintColor={theme.textSecondary}
              fallback={
                <ThemedText themeColor="textSecondary" style={styles.legalChevronFallback}>
                  ›
                </ThemedText>
              }
            />
          </View>
        </Pressable>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {isSignedIn ? t("sourcesDescription") : t("signInRequiredForSources")}
        </ThemedText>

        <View
          style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.backgroundSelected }]}
        />

        {isSignedIn ? (
          <Pressable
            onPress={() => router.push("/preferences/notifications")}
            style={styles.legalRow}
            accessibilityRole="button"
            accessibilityLabel={t("notifications")}
          >
            <ThemedText type="default">{t("notifications")}</ThemedText>
            <View style={styles.languagePickerValue}>
              <ThemedText themeColor="textSecondary">
                {notificationInterval === 0
                  ? t("notificationsOff")
                  : t("notificationsEveryMinutesTemplate", { minutes: String(notificationInterval) })}
              </ThemedText>
              <SymbolView
                name="chevron.right"
                size={14}
                weight="semibold"
                tintColor={theme.textSecondary}
                fallback={
                  <ThemedText themeColor="textSecondary" style={styles.legalChevronFallback}>
                    ›
                  </ThemedText>
                }
              />
            </View>
          </Pressable>
        ) : (
          // Signed-out readers get a plain on/off toggle, not the full
          // picker - see "Sources vs. Notifications" in
          // docs/preferences-screen.md.
          <View style={styles.toggleRow}>
            <ThemedText type="default">{t("notifications")}</ThemedText>
            <Switch
              value={notificationInterval !== 0}
              onValueChange={(enabled) => setNotificationInterval(enabled ? 15 : 0)}
              trackColor={{ false: theme.backgroundSelected, true: theme.tint }}
              accessibilityRole="switch"
              accessibilityLabel={t("notifications")}
            />
          </View>
        )}
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {isSignedIn ? t("notificationsDescription") : t("signInRequiredForNotifications")}
        </ThemedText>

        {/* Developer-only: the toggle for the ranking-score debug pills.
            Never rendered in a release build (see also debug-preference.tsx,
            which forces the value off when !__DEV__). */}
        {__DEV__ && (
          <>
            <View
              style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.backgroundSelected }]}
            />

            <View style={styles.toggleRow}>
              <ThemedText type="default">{t("debugMode")}</ThemedText>
              <Switch
                value={debugEnabled}
                onValueChange={setDebugEnabled}
                // Without this, the "on" track defaults to the OS's stock green -
                // clashing with this app's warm palette. thumbColor is left alone
                // so the platform's own native thumb rendering (white on iOS)
                // stays untouched.
                trackColor={{ false: theme.backgroundSelected, true: theme.tint }}
                accessibilityRole="switch"
                accessibilityLabel={t("debugMode")}
              />
            </View>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              {t("debugModeDescription")}
            </ThemedText>
          </>
        )}
      </ScrollView>

      {/* Pinned above the tab bar, not scrolling with the rest - see
          "Legal footer pinned above the tab bar" in
          docs/preferences-screen.md. */}
      <View
        testID="preferences-legal-footer"
        style={[
          styles.legalFooter,
          { paddingBottom: Spacing.three + tabBarInset },
        ]}
      >
        <View
          testID="preferences-legal-footer-divider"
          // textSecondary, not backgroundSelected like the section dividers
          // above - see docs/preferences-screen.md.
          style={[styles.divider, styles.sectionSpacing, { backgroundColor: theme.textSecondary }]}
        />
        {/* unscaled: three dot-separated links on one centered line have no
            room to grow. At Large in a long-label locale this overflowed both
            edges - Malayalam clipped "ഞങ്ങളെക്കുറിച്ച്" to "ദങ്ങളെക്കുറിച്ച്" on the
            left and lost the end of "സേവന നിബന്ധനകൾ" on the right. This is
            reference chrome pinned above the tab bar, not reading content, so
            it keeps its own size like the header pills do. */}
        <View style={styles.legalLinksRow}>
          {LEGAL_LINKS.map((link, index) => (
            <Fragment key={link.href}>
              {index > 0 && (
                <ThemedText unscaled themeColor="textSecondary">
                  {"·"}
                </ThemedText>
              )}
              <Pressable
                onPress={() => router.push(link.href)}
                // These are 14pt text on one line - roughly a 20pt tall
                // target without this. The row is centered with gaps, so
                // hitSlop is the right tool: it grows the touch area without
                // pushing the three links apart visually.
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t(link.labelKey)}
              >
                <ThemedText unscaled type="small" themeColor="tint">
                  {t(link.labelKey)}
                </ThemedText>
              </Pressable>
            </Fragment>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Explicit flex:1 - see AGENTS.md's ScrollView-needs-explicit-flex lesson.
  scrollView: { flex: 1 },
  // Spacing.three matches AppHeader's own paddingHorizontal, so every row's
  // edges line up with the logo/profile icon above.
  scrollContent: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  sectionSpacing: { marginTop: Spacing.three },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: Spacing.three },
  legalFooter: { paddingHorizontal: Spacing.three },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconRow: { flexDirection: "row", gap: Spacing.two },
  iconButton: {
    // 44 is the platform minimum touch target on both iOS and Android; these
    // were 40 with no hitSlop, so they fell just under it.
    width: 44,
    height: 44,
    // Fully round at this size - plain circular, not squircle (see
    // Radius.full's own comment).
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  // Plain Text: the emoji fallback for an SF Symbol, inside the fixed
  // 44x44 iconButton above - it does not take the font-size preference.
  iconGlyph: { fontSize: 18 },
  // See docs/cross-script-text-rendering.md.
  fontSizeSampleGlyph: Platform.select({
    android: { includeFontPadding: false, textAlignVertical: "center" },
    default: {},
  }),
  description: { marginTop: Spacing.one },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.two,
  },
  disabledRow: { opacity: 0.5 },
  legalChevronFallback: { fontSize: 18, fontWeight: "600" },
  languagePickerValue: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  // Centered and dot-separated - see docs/preferences-screen.md. One line
  // wherever the three labels fit, which is most locales; flexWrap so the
  // ones where they don't (Tamil and Malayalam run ~2x English here) break
  // to a second line instead of clipping off both screen edges. rowGap
  // keeps the two lines from touching when that happens.
  legalLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
    rowGap: Spacing.one,
  },
});
