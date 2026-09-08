import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { Colors } from "@/constants/theme";
import { AuthProvider } from "@/contexts/auth-context";
import { BookmarksProvider } from "@/contexts/bookmarks-context";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { FontSizePreferenceProvider } from "@/contexts/font-size-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import {
  NotificationPreferenceProvider,
  useNotificationPreference,
} from "@/contexts/notification-preference";
import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding-context";
import { SourcesPreferenceProvider } from "@/contexts/sources-preference";
import {
  ThemePreferenceProvider,
  useThemePreference,
} from "@/contexts/theme-preference";
import { ToastProvider } from "@/contexts/toast-context";
import { captureException, initSentry, wrap } from "@/observability/sentry";
import { storyHref } from "@/utils/navigation";

// Before anything renders - inert until EXPO_PUBLIC_SENTRY_DSN is set.
initSentry();

SplashScreen.preventAutoHideAsync();

// expo-router renders this in place of the tree that threw, so it sits
// *outside* every provider below - it can't use useTheme/useTranslation.
// Deliberately minimal and self-contained: react-native's own
// useColorScheme + raw Colors tokens + English copy, since the thing that
// crashed could be i18n or a context itself. `retry` re-mounts the route.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? Colors.dark : Colors.light;

  // Report the crash that got us here (no-op until Sentry is configured).
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <View style={[boundaryStyles.container, { backgroundColor: palette.background }]}>
      {/* Plain Text throughout, not ThemedText: this boundary renders
          outside every provider, so there is no font-size preference to
          read here. See this file's own ErrorBoundary comment. */}
      <Text style={[boundaryStyles.title, { color: palette.text }]}>
        The app hit an unexpected error.
      </Text>
      {__DEV__ && (
        <Text style={[boundaryStyles.detail, { color: palette.textSecondary }]}>
          {error.message}
        </Text>
      )}
      <Pressable
        onPress={retry}
        style={[boundaryStyles.button, { backgroundColor: palette.tint }]}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={[boundaryStyles.buttonText, { color: palette.tintText }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const boundaryStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  title: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  detail: { fontSize: 13, textAlign: "center" },
  button: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 },
  buttonText: { fontSize: 15, fontWeight: "600" },
});

// Overrides React Navigation's own stock Theme colors with this app's own
// tokens - see docs/navigation-white-flash.md.
const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.backgroundSelected,
    primary: Colors.light.tint,
  },
};
const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.backgroundSelected,
    primary: Colors.dark.tint,
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The default (0) refetches on every mount, re-fetching a list every
      // time you navigate back into it even though nothing changed - the
      // backend only ingests new articles every 15 minutes, so a couple of
      // minutes of freshness avoids that round-trip. Pull-to-refresh still
      // bypasses this and always hits the network.
      staleTime: 2 * 60 * 1000,
      // react-query's default is 3 retries with exponential backoff, which
      // sits on top of apiFetch's own 15s AbortController timeout - so an
      // unreachable backend spun for ~60s before any error state appeared.
      // One retry covers a genuine blip; past that the reader is better
      // served by ErrorState's own "Try again" than by a longer spinner.
      // This audience is on slow networks, which is the same reason the 15s
      // timeout exists in the first place.
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function AppContent() {
  const { resolvedScheme } = useThemePreference();
  const { interval: notificationInterval } = useNotificationPreference();
  const { hasCompletedOnboarding } = useOnboarding();
  const router = useRouter();

  // First launch only - send the reader through onboarding/ before they
  // ever see the real app. Held behind the same AsyncStorage read that
  // gates the return `null` below, so this only ever fires once, right as
  // hasCompletedOnboarding resolves to false.
  useEffect(() => {
    if (hasCompletedOnboarding === false) {
      router.replace("/onboarding");
    }
  }, [hasCompletedOnboarding, router]);

  // Belt-and-suspenders alongside AppLightTheme/AppDarkTheme above - see
  // docs/navigation-white-flash.md.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(
      resolvedScheme === "dark" ? Colors.dark.background : Colors.light.background
    );
  }, [resolvedScheme]);

  // Tapping a trending-story notification opens that story directly - see
  // "Tapping a notification" in docs/push-notifications.md. Only set up
  // once notifications are actually on (and even then, guarded by try/catch)
  // - see "Why expo-notifications is required lazily, not imported" in that
  // same doc for why this can't be a top-level import.
  useEffect(() => {
    if (notificationInterval === 0) return;
    try {
      const Notifications: typeof import("expo-notifications") = require("expo-notifications");
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const storyId = response.notification.request.content.data?.storyId;
        if (storyId == null) return;
        router.push(storyHref(String(storyId)));
      });
      return () => subscription.remove();
    } catch {
      return undefined;
    }
  }, [router, notificationInterval]);

  // Nothing to render yet - the native splash screen (see
  // SplashScreen.preventAutoHideAsync() above) just stays up a little
  // longer, since AnimatedSplashOverlay below never gets a chance to call
  // hideAsync(). Avoids ever painting the tabs behind the redirect above.
  if (hasCompletedOnboarding === null) {
    return null;
  }

  return (
    <ThemeProvider value={resolvedScheme === "dark" ? AppDarkTheme : AppLightTheme}>
      <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemePreferenceProvider>
            <FontSizePreferenceProvider>
              <LanguagePreferenceProvider>
                <SourcesPreferenceProvider>
                  <NotificationPreferenceProvider>
                    <DebugPreferenceProvider>
                      <AuthProvider>
                        <ToastProvider>
                          <BookmarksProvider>
                            <OnboardingProvider>
                              <AppContent />
                            </OnboardingProvider>
                          </BookmarksProvider>
                        </ToastProvider>
                      </AuthProvider>
                    </DebugPreferenceProvider>
                  </NotificationPreferenceProvider>
                </SourcesPreferenceProvider>
              </LanguagePreferenceProvider>
            </FontSizePreferenceProvider>
          </ThemePreferenceProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap adds the error-boundary/profiler hooks; a passthrough when
// Sentry is disabled.
export default wrap(RootLayout);
