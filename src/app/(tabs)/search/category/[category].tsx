import ArticleList from "@/components/article-list";
import { ThemedText } from "@/components/themed-text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { categoryLabelKey } from "@/utils/category-label";
import { goBackOr } from "@/utils/navigation";

export default function SearchCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // This screen lives inside the tabs, so its list scrolls behind the native
  // tab bar - without this the last card sits under it. See AGENTS.md's
  // useSafeAreaInsets()-doesn't-include-the-tab-bar lesson.
  const bottomPadding = useTabBarInset();

  const topPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });

  const categoryLabel = (() => {
    if (!category) return "";
    const key = categoryLabelKey(category);
    return key ? t(key) : category.charAt(0).toUpperCase() + category.slice(1);
  })();

  const goBack = () => goBackOr(router, "/search");

  return (
    <View
      testID="category-screen-container"
      style={{
        flex: 1,
        paddingTop: topPadding,
        paddingBottom: bottomPadding,
        backgroundColor: theme.background,
      }}
    >
      <View style={styles.headerRow}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          style={styles.backPressable}
        >
          <ThemedText style={styles.backGlyph}>{"‹ " + t("back")}</ThemedText>
        </Pressable>
        <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
          {categoryLabel}
        </ThemedText>
      </View>

      <ArticleList category={category} basePath="/search/article" />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  backPressable: { alignSelf: "flex-start", paddingVertical: Spacing.one },
  backGlyph: { fontSize: 16, fontWeight: "600" },
  title: { marginTop: Spacing.one },
});
