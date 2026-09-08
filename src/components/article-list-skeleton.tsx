import { Animated, StyleSheet, View } from "react-native";

import { CARD_PADDING } from "@/components/feed-card";
import { Radius, Spacing } from "@/constants/theme";
import { useSkeletonPulse } from "@/hooks/use-skeleton-pulse";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

const SKELETON_CARDS = 6;

export default function ArticleListSkeleton() {
  const theme = useTheme();
  const { t } = useTranslation();
  const opacity = useSkeletonPulse();

  const blockStyle = { backgroundColor: theme.backgroundSelected, opacity };

  return (
    <View
      style={[styles.list, { backgroundColor: theme.background }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("loadingArticles")}
      importantForAccessibility="yes"
    >
      {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
        <View
          key={i}
          style={[styles.card, { backgroundColor: theme.backgroundElement }]}
          importantForAccessibility="no-hide-descendants"
        >
          <Animated.View testID="skeleton-block" style={[styles.image, blockStyle]} />
          <Animated.View testID="skeleton-block" style={[styles.line, blockStyle]} />
          <Animated.View
            testID="skeleton-block"
            style={[styles.line, styles.lineShort, blockStyle]}
          />
          <Animated.View testID="skeleton-block" style={[styles.sourceLine, blockStyle]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors ArticleList's own contentContainerStyle so the placeholders sit
  // exactly where the real cards will land.
  list: { padding: Spacing.three, gap: Spacing.three },
  // A filled, rounded card - not the flat bordered row this used to be,
  // which reflowed visibly the moment real cards replaced it. Plain
  // borderRadius rather than Squircle: this is a transient loading state and
  // an SVG per placeholder is not worth the fidelity.
  card: { padding: CARD_PADDING, borderRadius: Radius.large },
  image: {
    width: "100%",
    height: 180,
    // Matches feed-card.tsx's concentric image radius (its card is
    // Radius.large with 12px padding, so its image lands on Radius.tiny) -
    // this skeleton is standing in for that exact shape.
    borderRadius: Radius.tiny,
  },
  line: {
    height: 16,
    borderRadius: Radius.tiny,
    marginTop: 10,
  },
  lineShort: { width: "60%", marginTop: 6 },
  sourceLine: {
    height: 10,
    width: "30%",
    borderRadius: Radius.tiny,
    marginTop: 10,
  },
});
