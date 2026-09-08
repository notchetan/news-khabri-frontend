import { useEffect, useRef } from "react";
import { Animated } from "react-native";

import { useReducedMotionSetting } from "@/hooks/use-reduced-motion";

const MIN_OPACITY = 0.4;
const MAX_OPACITY = 1;
const HALF_CYCLE_MS = 700;
// Held opacity when the pulse is off - the midpoint of the range above, so
// the blocks still read as placeholder rather than as real content.
const STATIC_OPACITY = 0.7;

// The shimmer opacity shared by all three loading skeletons (the feed list
// and the two detail screens), which had byte-identical copies of this loop.
//
// Honours Reduce Motion: an indefinite pulse is exactly what that setting
// is for, since it never resolves on its own and keeps moving for as long
// as the load takes. Each skeleton's own accessibilityRole="progressbar"
// is what communicates "loading" either way, so holding a static value
// loses nothing but the movement.
export function useSkeletonPulse(): Animated.Value {
  const opacity = useRef(new Animated.Value(MIN_OPACITY)).current;
  const reducedMotion = useReducedMotionSetting();

  useEffect(() => {
    // undefined means the OS has not answered yet. Hold off rather than
    // start a loop we may have to stop a frame later - that brief pulse is
    // still motion shown to a reader who asked for none.
    if (reducedMotion === undefined) return;

    if (reducedMotion) {
      opacity.setValue(STATIC_OPACITY);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: MAX_OPACITY,
          duration: HALF_CYCLE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: MIN_OPACITY,
          duration: HALF_CYCLE_MS,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reducedMotion]);

  return opacity;
}
