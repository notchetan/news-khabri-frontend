import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { goBackOr } from "@/utils/navigation";

// Rendered by expo-router for any route that doesn't match a file - a bad
// deep link, a stale share URL, a web reload of a path that no longer
// exists. Replaces the framework's own dev-flavoured fallback.
export default function NotFoundScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goHome = () => goBackOr(router, "/");

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Platform.select({ default: insets.top, web: Spacing.six }),
          paddingBottom: insets.bottom + Spacing.five,
        },
      ]}
    >
      <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
        {t("pageNotFoundTitle")}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.message}>
        {t("pageNotFoundMessage")}
      </ThemedText>
      <Pressable
        testID="not-found-home"
        onPress={goHome}
        style={[styles.button, { backgroundColor: theme.tint }]}
        accessibilityRole="button"
        accessibilityLabel={t("goHome")}
      >
        <ThemedText type="default" style={{ color: theme.tintText }}>
          {t("goHome")}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  title: { textAlign: "center" },
  message: { textAlign: "center" },
  button: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
  },
});
