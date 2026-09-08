import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// LayoutAnimation needs an explicit opt-in on Android - used below only for
// the divider<->back-arrow swap (a discrete change); the pinned pill's own
// transition tracks scroll position continuously instead (see
// docs/animated-scroll-collapse.md).
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  // A shorter form of the pinned (first) category's label to smoothly
  // shrink into as the user scrolls through the rest of the row - e.g.
  // "Top Stories" -> "Top" once the full label isn't needed for
  // recognition anymore and the room can go to the scrollable categories
  // instead. Optional: the pinned pill just keeps its full label unchanged
  // if this isn't given, since not every caller of this shared component
  // necessarily has a natural short form for whatever it pins.
  pinnedCollapsedLabel?: string;
  // Maps a raw category value to what's actually displayed - lets a caller
  // translate category names (see (home)/index.tsx) without this component
  // needing to know anything about i18n itself. Defaults to showing the
  // category value unchanged.
  getLabel?: (category: string) => string;
};

const SCROLL_BACK_THRESHOLD = 8;
// Distance (not a duration) the pinned pill's full<->collapsed transition
// is spread across - see docs/animated-scroll-collapse.md.
const PINNED_PILL_COLLAPSE_DISTANCE = 60;

export default function CategoryPills({
  categories,
  selected,
  onSelect,
  pinnedCollapsedLabel,
  getLabel = (category) => category,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollBackAnimation = useRef<Animated.CompositeAnimation | null>(null);
  // Measured below via MeasureProbe and passed down as plain props, not
  // measured inside PinnedPill itself - see docs/animated-scroll-collapse.md.
  const [pinnedFullWidth, setPinnedFullWidth] = useState<number | null>(null);
  const [pinnedCollapsedWidth, setPinnedCollapsedWidth] = useState<number | null>(null);

  // Stop, rather than leak, the back-arrow's own scrollX animation (below)
  // if this whole strip unmounts mid-animation - e.g. navigating away right
  // after tapping the back arrow.
  useEffect(() => {
    return () => {
      scrollBackAnimation.current?.stop();
    };
  }, []);

  // The first category is always "All" (see index.tsx) - pin it outside the
  // scrollable region so it's never scrolled out of view, with the rest of
  // the categories in their own scrollable strip after a divider.
  const [pinned, ...scrollable] = categories;
  if (!pinned) return null;

  const pinnedFullLabel = getLabel(pinned);

  // Drives scrollX and isScrolled back explicitly rather than relying on
  // real onScroll events firing during this programmatic scroll - see
  // docs/animated-scroll-collapse.md.
  const scrollToStart = () => {
    // The one *programmatic* animation in this component - the pinned
    // pill's own collapse tracks the finger, which Reduce Motion doesn't
    // ask us to suppress. This travel is ours, so it goes.
    scrollRef.current?.scrollTo({ x: 0, animated: !reducedMotion });
    scrollBackAnimation.current = Animated.timing(scrollX, {
      toValue: 0,
      duration: reducedMotion ? 0 : 300,
      useNativeDriver: false,
    });
    scrollBackAnimation.current.start();
    if (isScrolled) {
      if (!reducedMotion) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setIsScrolled(false);
    }
  };

  // Discrete threshold-based change, unlike scrollX's own continuous
  // interpolation above - see docs/animated-scroll-collapse.md.
  const handleScrollThreshold = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIsScrolled = event.nativeEvent.contentOffset.x > SCROLL_BACK_THRESHOLD;
    if (nextIsScrolled !== isScrolled) {
      if (!reducedMotion) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setIsScrolled(nextIsScrolled);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    // false: the pinned pill interpolates `width` below, a layout property
    // the native driver can't animate - everything here already runs once
    // per scroll frame on the JS thread regardless (scrollEventThrottle).
    { useNativeDriver: false, listener: handleScrollThreshold }
  );

  return (
    <View testID="category-pills-row" style={styles.row}>
      <View style={styles.pinnedContainer}>
        <PinnedPill
          fullLabel={pinnedFullLabel}
          collapsedLabel={pinnedCollapsedLabel}
          fullWidth={pinnedFullWidth}
          collapsedWidth={pinnedCollapsedWidth}
          scrollX={scrollX}
          isActive={selected === pinned}
          onPress={() => onSelect(pinned)}
        />
      </View>

      {/* Siblings of PinnedPill, not descendants - see
          docs/animated-scroll-collapse.md for why. */}
      {pinnedCollapsedLabel != null && (
        <>
          <MeasureProbe
            testID="pinned-pill-full-measure"
            label={pinnedFullLabel}
            onMeasured={setPinnedFullWidth}
          />
          <MeasureProbe
            testID="pinned-pill-collapsed-measure"
            label={pinnedCollapsedLabel}
            onMeasured={setPinnedCollapsedWidth}
          />
        </>
      )}

      {scrollable.length > 0 && (
        <>
          {/* Fixed-width slot shared by the divider and back arrow - see
              docs/category-pills-layout.md. */}
          <View testID="category-pills-divider-slot" style={styles.dividerSlot}>
            {!isScrolled && (
              <View
                testID="category-pills-divider"
                style={[styles.divider, { backgroundColor: theme.textSecondary }]}
              />
            )}
            {isScrolled && (
              <TouchableOpacity
                onPress={scrollToStart}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("scrollToFirstCategory")}
                style={styles.backArrow}
              >
                <SymbolView
                  name="chevron.left"
                  size={20}
                  weight="bold"
                  tintColor={theme.textSecondary}
                  fallback={
                    <Text style={[styles.backArrowText, { color: theme.textSecondary }]}>
                      ‹
                    </Text>
                  }
                />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            ref={scrollRef}
            testID="category-pills-scroll-view"
            horizontal
            showsHorizontalScrollIndicator={false}
            // Prevents fast-fling scroll-bounce from jittering the pinned
            // pill's collapse on short lists (e.g. Marathi's 4 categories) -
            // see docs/animated-scroll-collapse.md.
            bounces={false}
            overScrollMode="never"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.scrollView}
            contentContainerStyle={styles.container}
          >
            {scrollable.map((cat) => (
              <Pill
                key={cat}
                category={cat}
                getLabel={getLabel}
                isActive={selected === cat}
                onPress={() => onSelect(cat)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// The pinned (first) pill specifically - the only one that ever collapses
// to a shorter label, so the scroll-linked animation machinery lives here
// rather than in the plain Pill below (used for every other, non-collapsing
// pill).
function PinnedPill({
  fullLabel,
  collapsedLabel,
  fullWidth,
  collapsedWidth,
  scrollX,
  isActive,
  onPress,
}: {
  fullLabel: string;
  collapsedLabel?: string;
  // Measured by the caller (see the two MeasureProbes in CategoryPills'
  // own render) rather than here.
  fullWidth: number | null;
  collapsedWidth: number | null;
  scrollX: Animated.Value;
  isActive: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const canCollapse = collapsedLabel != null;
  const color = isActive ? theme.tintText : theme.textSecondary;

  const animatedWidth =
    canCollapse && fullWidth != null && collapsedWidth != null
      ? scrollX.interpolate({
          inputRange: [0, PINNED_PILL_COLLAPSE_DISTANCE],
          outputRange: [fullWidth, collapsedWidth],
          extrapolate: "clamp",
        })
      : undefined;

  // Near-instant swap, deliberately not spread across the same distance as
  // the width shrink above - see docs/animated-scroll-collapse.md.
  const fullOpacity = scrollX.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const collapsedOpacity = scrollX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      testID="pinned-pill"
      style={[
        styles.pill,
        styles.pillOuterReset,
        { backgroundColor: isActive ? theme.tint : theme.backgroundElement },
        animatedWidth != null && { width: animatedWidth, overflow: "hidden" },
      ]}
    >
      <TouchableOpacity
        testID="pinned-pill-touchable"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        // Always the full label, deliberately ignoring the collapsed
        // cross-fade - a screen reader should still announce the complete
        // name even once the pill has visually shrunk.
        accessibilityLabel={fullLabel}
        style={styles.pillInner}
      >
        {canCollapse ? (
          <>
            <Animated.Text
              testID="pinned-pill-full-text"
              numberOfLines={1}
              style={[styles.pillText, styles.pinnedPillOverlayText, { color, opacity: fullOpacity }]}
            >
              {fullLabel}
            </Animated.Text>
            <Animated.Text
              testID="pinned-pill-collapsed-text"
              numberOfLines={1}
              style={[styles.pillText, styles.pinnedPillOverlayText, { color, opacity: collapsedOpacity }]}
            >
              {collapsedLabel}
            </Animated.Text>
          </>
        ) : (
          <Text style={[styles.pillText, { color }]}>{fullLabel}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Measures one label's own natural pill width via onLayout, independent of
// any other probe or of PinnedPill's own animated width - see
// docs/animated-scroll-collapse.md.
function MeasureProbe({
  testID,
  label,
  onMeasured,
}: {
  testID?: string;
  label: string;
  onMeasured: (width: number) => void;
}) {
  const handleLayout = (event: LayoutChangeEvent) => {
    onMeasured(event.nativeEvent.layout.width);
  };

  return (
    <View
      testID={testID}
      onLayout={handleLayout}
      pointerEvents="none"
      accessible={false}
      style={[styles.pill, styles.measureProbe]}
    >
      <Text style={styles.pillText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Pill({
  category,
  getLabel,
  isActive,
  onPress,
}: {
  // The real category value - always used for the selection/onPress
  // contract, regardless of what's visually shown.
  category: string;
  getLabel: (category: string) => string;
  isActive: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const label = getLabel(category);

  return (
    <TouchableOpacity
      testID={`category-pill-${category}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      style={[
        styles.pill,
        styles.pillInner,
        { backgroundColor: isActive ? theme.tint : theme.backgroundElement },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: isActive ? theme.tintText : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Screen-edge padding vs. the gap between items within the row vs. the gap
// around the divider/back-arrow slot specifically - see
// docs/category-pills-layout.md for why these are three different constants.
// The platform touch-target minimum. The visible capsule is deliberately
// this tall rather than staying compact with a hitSlop: RN's hitSlop never
// extends past the parent's bounds, and PinnedPill's tappable child sits
// inside an Animated.View sized to the pill, so slop there would have been
// silently clipped on Android.
const PILL_MIN_HEIGHT = 44;
const PILL_GAP = Spacing.three;
const PILL_ITEM_GAP = 14;
const DIVIDER_SLOT_GAP = 10;

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexShrink: 0,
    flexGrow: 0,
    flexDirection: "row",
    alignItems: "center",
    // row's own gap only ever applies on either side of dividerSlot (the
    // pinned pill and the scrollable strip's own internal gap - see
    // container below - supply their own spacing otherwise).
    gap: DIVIDER_SLOT_GAP,
  },
  pinnedContainer: { paddingLeft: PILL_GAP },
  // Fixed width, not the icon's own 20px size prop - see
  // docs/category-pills-layout.md.
  dividerSlot: { width: 14, alignItems: "center", justifyContent: "center" },
  divider: { width: 2, height: 24, borderRadius: 1 },
  // No horizontal padding - hitSlop below already gives this a comfortable
  // touch target without also widening the *visual* gap on either side
  // beyond what `row`'s gap already provides.
  backArrow: { paddingVertical: 8 },
  backArrowText: { fontSize: 20, fontWeight: "700" },
  scrollView: { flexShrink: 1, flexGrow: 0 },
  container: {
    // No paddingLeft here - `row`'s own gap already supplies the space
    // before this ScrollView (from the divider or the back arrow,
    // whichever immediately precedes it); adding one here too would double it.
    paddingRight: PILL_GAP,
    // 6, not 10: PILL_MIN_HEIGHT + this padding on both sides has to come
    // to `row`'s own height, or the taller pills get clipped by it.
    paddingVertical: 6,
    gap: PILL_ITEM_GAP,
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    // Already a fully-round capsule at this size (radius >= half the
    // pill's own height) - Radius.full just makes that explicit/consistent
    // rather than hardcoding a number that happens to be big enough.
    borderRadius: Radius.full,
  },
  // Plain Text, not ThemedText - so these deliberately do not take the
  // reader's font-size preference. `row` above is a fixed height and the
  // pinned pill's width is measured off these metrics, so growing them
  // would clip the row and desync the probes. ThemedText's `unscaled` prop
  // is the usual way to say this, but two of the five call sites here are
  // Animated.Text (the cross-fading pinned labels), which ThemedText cannot
  // be - so all five stay plain rather than splitting across two mechanisms.
  pillText: { fontSize: 14, fontWeight: "500" },
  // Whatever actually receives the tap carries the pill's metrics, so the
  // touch target and the visible capsule are the same box. Shared by the
  // plain Pill (where the touchable *is* the capsule) and PinnedPill (where
  // it sits inside an Animated.View that owns the width animation).
  pillInner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: PILL_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  // PinnedPill's outer view is a background capsule and an animated width,
  // nothing else - pillInner above supplies every bit of padding, so the
  // two must not both apply it.
  pillOuterReset: { paddingHorizontal: 0, paddingVertical: 0 },
  // Both labels stack on the exact same spot so the opacity cross-fade
  // reads as one label smoothly turning into the other, not two texts
  // sliding past each other.
  pinnedPillOverlayText: { position: "absolute" },
  // Out of flow and paint-time-only hidden, so nothing here can affect (or
  // be affected by) a sibling's size - see docs/animated-scroll-collapse.md.
  measureProbe: { position: "absolute", opacity: 0 },
});
