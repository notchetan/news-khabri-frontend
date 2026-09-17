import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleSignInButton } from "@/components/apple-sign-in-button";
import Icon from "@/components/icon";
import { OnboardingDots } from "@/components/onboarding-dots";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useOnboardingSwipe } from "@/hooks/use-onboarding-swipe";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Screen 3 of 3 - see onboarding/_layout.tsx. Sign-in here is optional
// (the same account system profile.tsx exposes later) - either button
// finishes onboarding and lands on the real app; only the sign-in one also
// starts a session first.
export default function OnboardingSignInScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signInError, clearSignInError, signIn, signInWithApple } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const swipeGesture = useOnboardingSwipe({ onPrevious: () => router.back() });

  const finish = () => {
    completeOnboarding().then(() => router.replace("/"));
  };

  // Reacts to signIn() succeeding rather than awaiting it directly, since
  // AuthProvider's own signIn() swallows its result into `user`/
  // `signInError` state instead of returning a pass/fail value - see
  // auth-context.tsx.
  useEffect(() => {
    if (user) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // signInError lives in AuthProvider, which outlives this screen - without
  // this, a failure here would still be showing on the Profile screen later.
  useEffect(() => clearSignInError, [clearSignInError]);

  const topPadding = Platform.select({ default: insets.top, web: Spacing.six });
  const bottomPadding = insets.bottom + Spacing.five;

  return (
    <GestureDetector gesture={swipeGesture}>
      <ThemedView
        style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
      >
        {/* Scrollable so a small screen at a large font size can still
            reach the buttons below - this is the one flow every reader
            has to complete. flexGrow (not flex) on the content block so
            it still absorbs the slack that keeps the dots aligned across
            all three screens, without being allowed to shrink below its
            own content. */}
        <ScrollView
          testID="onboarding-scroll"
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
        <ThemedView style={styles.content}>
          <Icon
            sf="person.crop.circle.badge.checkmark"
            ion="person-circle-outline"
            size={64}
            weight="regular"
            color={theme.tint}
          />
          <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
            {t("onboardingSignInTitle")}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            {t("onboardingSignInDescription")}
          </ThemedText>
          {signInError && (
            <ThemedText
              testID="onboarding-sign-in-error"
              style={[styles.error, { color: theme.danger }]}
            >
              {t("unexpectedError")}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.actions}>
          {/* Apple first, per Apple's HIG for the sign-in list. */}
          <AppleSignInButton onPress={signInWithApple} style={styles.appleButton} />
          <Pressable
            testID="onboarding-sign-in"
            onPress={signIn}
            style={[styles.button, styles.signInButton, { backgroundColor: theme.tint }]}
            accessibilityRole="button"
            accessibilityLabel={t("signInWithGoogle")}
          >
            <Ionicons name="logo-google" size={18} color={theme.tintText} />
            <ThemedText type="default" style={{ color: theme.tintText }}>
              {t("signInWithGoogle")}
            </ThemedText>
          </Pressable>
          <Pressable
            testID="onboarding-skip"
            onPress={finish}
            style={styles.skipButton}
            accessibilityRole="button"
            accessibilityLabel={t("onboardingSkip")}
          >
            <ThemedText themeColor="textSecondary" type="default">
              {t("onboardingSkip")}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Sibling of content (and after actions) - see index.tsx's own
            comment on why this is what keeps the dots at the same bottom
            position across every onboarding screen, even this one with its
            extra actions block. */}
        <OnboardingDots total={3} current={2} style={styles.dots} />
        </ScrollView>
      </ThemedView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Explicit flex:1 - see AGENTS.md ScrollView-needs-explicit-flex lesson.
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
  },
  title: { marginTop: Spacing.three, textAlign: "center" },
  description: { marginTop: Spacing.two, textAlign: "center" },
  error: { marginTop: Spacing.three, textAlign: "center" },
  dots: { marginTop: Spacing.five },
  actions: { alignItems: "center", gap: Spacing.three },
  button: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
  },
  signInButton: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  appleButton: { width: 260 },
  skipButton: { paddingHorizontal: Spacing.five, paddingVertical: Spacing.two },
});
