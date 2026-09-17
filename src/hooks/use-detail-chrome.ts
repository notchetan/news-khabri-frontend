import { useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";

// See "Hero image starts below the header, not behind it" in
// docs/article-header-layout.md. The 44 is the fallback for the frame
// before onLayout has reported a real height.
function contentTopFor(headerHeight: number, topPadding: number): number {
  return (headerHeight || topPadding + 44) + Spacing.two;
}

type Options = {
  // False for a screen pushed outside the tab group (Saved), which has no
  // native tab bar to clear - just its own safe-area inset.
  tabBar?: boolean;
};

// Everything a screen with a FloatingDetailHeader needs to lay itself out:
// the scroll position the header collapses against, the header's measured
// height, and the three paddings derived from those. Article detail, story
// detail and Saved each derived all of it identically, and the two loading
// skeletons derived the paddings a second time from props - so the same
// arithmetic appeared five times.
//
// The skeletons now take the finished paddings as props instead, which is
// why this returns them rather than the pieces to rebuild them from.
export function useDetailChrome({ tabBar = true }: Options = {}) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  // Owned here, not by the header, because reset-on-content-change
  // behaviour differs by caller - the header only ever reads it.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  const topPadding = Platform.select({
    default: insets.top + Spacing.two,
    web: Spacing.six,
  });

  return {
    scrollY,
    headerHeight,
    setHeaderHeight,
    topPadding,
    contentTopPadding: Platform.select({
      default: contentTopFor(headerHeight, topPadding),
      web: Spacing.six,
    }),
    contentBottomPadding:
      Spacing.three +
      (tabBar ? tabBarInset : Platform.select({ web: 0, default: insets.bottom })),
    // useNativeDriver false: FloatingDetailHeader interpolates maxWidth, a
    // layout property the native driver can't animate.
    handleScroll: Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: false }
    ),
  };
}
