import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { Animated, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Shared floating header for article-detail-screen.tsx and
// story-detail-screen.tsx - back button left, app name/logo right, both
// floating over scrolling content. See docs/article-header-layout.md.

// See docs/article-header-layout.md's "GlassView's non-iOS fallback" for
// why this is computed once at module scope rather than per-render.
let liquidGlassAvailable = false;
try {
  liquidGlassAvailable = isLiquidGlassAvailable();
} catch {
  liquidGlassAvailable = false;
}

// Distance (not a duration) the header labels' collapse is spread across -
// see docs/animated-scroll-collapse.md.
const HEADER_COLLAPSE_DISTANCE = 60;
// Natural width of each label, eyeballed against the real strings rather
// than measured via an onLayout probe.
const BACK_LABEL_WIDTH = 80;
const BRAND_LABEL_WIDTH = 100;

type Props = {
  // The caller's own live scroll position - this component only reads it,
  // never resets or owns it, since reset-on-content-change behavior
  // differs by caller.
  scrollY: Animated.Value;
  topPadding: number;
  onGoBack: () => void;
  onHeaderHeightChange: (height: number) => void;
  // Distinguishes testIDs per caller (default "article", matching this
  // component's original home in article-detail-screen.tsx) so both
  // screens' own tests can target their own instance unambiguously.
  testIDPrefix?: string;
  // When set, an inline title that fades in over the collapse distance as
  // the two side labels fade out - the iOS large-title-to-nav-bar-title
  // move (the caller renders the matching large title as scrolling
  // content). Article/story screens pass nothing and are unchanged.
  centerTitle?: string;
  // Fills the header row with a solid background instead of letting
  // content scroll visibly behind the pills. For list screens (Saved),
  // where chrome peeking through the gaps reads as a glitch rather than
  // the intentional "content flows under the header" look the article/
  // story screens want.
  opaque?: boolean;
};

export default function FloatingDetailHeader({
  scrollY,
  topPadding,
  onGoBack,
  onHeaderHeightChange,
  testIDPrefix = "article",
  centerTitle,
  opaque = false,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Near-instant opacity swap, deliberately not spread across the same
  // distance as the width shrink below - see docs/animated-scroll-collapse.md.
  const headerLabelOpacity = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const backLabelWidth = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_DISTANCE],
    outputRange: [BACK_LABEL_WIDTH, 0],
    extrapolate: "clamp",
  });
  const brandLabelWidth = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_DISTANCE],
    outputRange: [BRAND_LABEL_WIDTH, 0],
    extrapolate: "clamp",
  });
  // The mirror image of headerLabelOpacity - the inline title appears
  // exactly as the side labels finish collapsing.
  const centerTitleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Stands in for GlassView's real (iOS-only) blur where it's unavailable -
  // see docs/article-header-layout.md's "GlassView's non-iOS fallback".
  const glassFallbackStyle = liquidGlassAvailable
    ? null
    : { backgroundColor: theme.backgroundElement };

  return (
    <>
      {/* Scrolling content is deliberately allowed to flow behind the
          floating pills below, but never behind the status bar itself -
          this opaque strip pins to exactly the status bar's height so the
          clock/battery/carrier text always has a solid backdrop. */}
      {Platform.OS !== "web" && (
        <View
          pointerEvents="none"
          style={[styles.statusBarScrim, { height: insets.top, backgroundColor: theme.background }]}
        />
      )}
      <View
        testID={`${testIDPrefix}-header-row`}
        style={[
          styles.backRow,
          { paddingTop: topPadding },
          opaque && { backgroundColor: theme.background },
        ]}
        onLayout={(event) => onHeaderHeightChange(event.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        {centerTitle != null && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.centerTitleWrap,
              { paddingTop: topPadding, opacity: centerTitleOpacity },
            ]}
          >
            <GlassView
              style={[styles.centerGlass, glassFallbackStyle]}
              glassEffectStyle="regular"
            >
              <ThemedText
                testID={`${testIDPrefix}-center-title`}
                unscaled
                numberOfLines={1}
                style={styles.centerTitle}
                accessibilityRole="header"
              >
                {centerTitle}
              </ThemedText>
            </GlassView>
          </Animated.View>
        )}

        <GlassView style={[styles.backGlass, glassFallbackStyle]} glassEffectStyle="regular">
          <Pressable
            onPress={onGoBack}
            hitSlop={12}
            style={[styles.backPressable, styles.backPressableRow]}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
          >
            <SymbolView
              testID={`${testIDPrefix}-back-chevron`}
              name="chevron.left"
              size={16}
              weight="semibold"
              tintColor={theme.text}
              fallback={<ThemedText unscaled style={styles.backGlyph}>‹</ThemedText>}
            />
            <Animated.View
              style={{
                opacity: headerLabelOpacity,
                maxWidth: backLabelWidth,
                overflow: "hidden",
              }}
            >
              <ThemedText unscaled numberOfLines={1} style={[styles.backGlyph, styles.backLabel]}>
                {` ${t("back")}`}
              </ThemedText>
            </Animated.View>
          </Pressable>
        </GlassView>

        <GlassView style={[styles.brandGlass, glassFallbackStyle]} glassEffectStyle="regular">
          <View testID={`${testIDPrefix}-brand-row`} style={styles.brandRow}>
            <Image
              testID={`${testIDPrefix}-brand-logo`}
              source={require("@/assets/images/tab-home-icon.png")}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Animated.View
              style={{
                opacity: headerLabelOpacity,
                maxWidth: brandLabelWidth,
                overflow: "hidden",
              }}
            >
              <ThemedText unscaled numberOfLines={1} style={[styles.backGlyph, styles.brandLabel]}>
                {` ${t("appName")}`}
              </ThemedText>
            </Animated.View>
          </View>
        </GlassView>
      </View>
    </>
  );
}


const styles = StyleSheet.create({
  statusBarScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  backRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  // See "Pill shape" in docs/article-header-layout.md.
  backGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  backPressable: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  // See docs/cross-script-text-rendering.md.
  backPressableRow: { flexDirection: "row", alignItems: "center" },
  backGlyph: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: Math.ceil(16 * 1.4),
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: "center" },
      default: {},
    }),
  },
  // Overlay centered between the two pills; starts at the same top offset
  // and shares the pills' own vertical padding so its baseline matches
  // theirs. Wide side margins keep it clear of the collapsed pills.
  centerTitleWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  // Same liquid-glass pill treatment as the back/brand pills (see "Pill
  // shape" in docs/article-header-layout.md); wraps the inline title so
  // all three read as one set.
  centerGlass: {
    alignSelf: "center",
    borderRadius: Radius.full,
    overflow: "hidden",
    maxWidth: "55%",
  },
  centerTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: Math.ceil(16 * 1.4),
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: "center" },
      default: {},
    }),
  },
  backLabel: { flexShrink: 0 },
  brandGlass: { alignSelf: "flex-start", borderRadius: Radius.full, overflow: "hidden" },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  brandLogo: { width: 20, height: 20 },
  brandLabel: { flexShrink: 0 },
});
