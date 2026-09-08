import { StyleSheet, View, type ViewStyle } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const DOT_SIZE = 8;
// The active step reads as an elongated pill rather than just a color swap -
// "bolden the dot" per the design ask, the same page-indicator convention
// iOS's own onboarding/App Store carousels use.
const ACTIVE_DOT_WIDTH = 20;

type Props = { total: number; current: number; style?: ViewStyle };

// Sits below each onboarding screen's own text content (title/description/
// feature list) and its OnboardingNextButton (screens 1-2), not pinned to
// the screen's bottom edge - a position indicator only, not a control.
export function OnboardingDots({ total, current, style }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[styles.row, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          testID={index === current ? "onboarding-dot-active" : "onboarding-dot"}
          style={[
            styles.dot,
            {
              width: index === current ? ACTIVE_DOT_WIDTH : DOT_SIZE,
              // textSecondary, not backgroundSelected: the inactive dots
              // were 1.31:1 against the screen behind them, so a reader
              // could not count the steps at all. Which dot is current is
              // carried by the elongated width above as much as by colour,
              // so a visible inactive dot does not blur the distinction.
              backgroundColor: index === current ? theme.tint : theme.textSecondary,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  dot: { height: DOT_SIZE, borderRadius: Radius.full },
});
