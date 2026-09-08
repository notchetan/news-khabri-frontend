import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { goBackOr } from "@/utils/navigation";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

type Props = {
  title: string;
  children: ReactNode;
  // Overrides the default "‹ Back" row with a custom header (e.g.
  // page-header.tsx, used by language.tsx/sources.tsx to match
  // article-detail-screen.tsx's own header look) - also suppresses the
  // in-content title below, since the custom header already shows it.
  // About/Privacy/Terms don't pass this and keep the plain default.
  renderHeader?: (goBack: () => void) => ReactNode;
};

// Shared shell for every screen pushed from Preferences: the three static
// documents (about/privacy/terms) and the three pickers (language/sources/
// notifications). Same back-button pattern already established by
// story-detail-screen.tsx and article-detail-screen.tsx, without the data
// fetching.
//
// Named for what it is, not what it first held - it was
// legal-document-screen.tsx until the pickers started using it too, at
// which point the name described half its callers.
export default function PushedScreen({ title, children, renderHeader }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.select({
    default: insets.top + Spacing.two,
    web: Spacing.six,
  });
  const bottomPadding = useTabBarInset();

  const goBack = () => goBackOr(router, "/preferences");

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: topPadding, paddingBottom: bottomPadding }}>
      {renderHeader ? (
        renderHeader(goBack)
      ) : (
        <View style={styles.headerRow}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            style={[styles.backPressable, styles.backPressableRow]}
          >
            <SymbolView
              name="chevron.left"
              size={16}
              weight="semibold"
              tintColor={theme.text}
              fallback={<ThemedText style={styles.backGlyph}>‹</ThemedText>}
            />
            <ThemedText style={styles.backGlyph}>{" " + t("back")}</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Explicit flex:1 - see AGENTS.md's ScrollView-needs-explicit-flex
          lesson, which saved.tsx and preferences/index.tsx both cite and
          this file was the one place still missing. */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {!renderHeader && (
          <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
            {title}
          </ThemedText>
        )}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  headerRow: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  backPressable: { alignSelf: "flex-start", paddingVertical: Spacing.one },
  backPressableRow: { flexDirection: "row", alignItems: "center" },
  backGlyph: { fontSize: 16, fontWeight: "600" },
  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  title: { marginBottom: Spacing.three },
});
