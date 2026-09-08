import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// Whether the reader has asked the OS to cut down on animation - iOS's
// Settings > Accessibility > Motion > Reduce Motion, Android's Settings >
// Accessibility > Remove animations. Both surface through the same RN API.
//
// What each caller does with it is deliberately not uniform: the guidance
// is to replace *motion* with a cross-fade or an instant change, not to
// strip all feedback. See docs/reduced-motion.md.
//
// Reads as false until the initial async read resolves. That is fine for a
// short one-shot transition, but not for something indefinite - a skeleton
// that starts pulsing and stops a frame later still shows motion to a
// reader who asked for none. Use useReducedMotionSetting() there and wait
// for a defined answer before starting.
export function useReducedMotion(): boolean {
  return useReducedMotionSetting() ?? false;
}

// undefined until the OS has been asked - see useReducedMotion above.
export function useReducedMotionSetting(): boolean | undefined {
  const [reduced, setReduced] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduced(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => setReduced(enabled)
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
