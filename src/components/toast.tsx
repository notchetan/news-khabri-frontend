import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useTheme } from "@/hooks/use-theme";

export type ToastConfig = {
  message: string;
  // Optional inline link, e.g. "Check now" -> the Saved screen.
  action?: { label: string; onPress: () => void };
};

// A single bottom-anchored toast, driven by toast-context. `config` goes
// null on dismiss; the last shown config is kept around just long enough
// to animate out before the view actually unmounts.
export default function Toast({
  config,
  onHide,
}: {
  config: ToastConfig | null;
  onHide: () => void;
}) {
  const theme = useTheme();
  const tabBarInset = useTabBarInset();
  const reducedMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const shownRef = useRef<ToastConfig | null>(null);
  if (config) shownRef.current = config;
  const shown = shownRef.current;

  useEffect(() => {
    if (config) setMounted(true);
    const animation = Animated.timing(anim, {
      toValue: config ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !config) setMounted(false);
    });
    // Stop the animation on unmount so a test that shows a toast and tears
    // down before it settles doesn't leak a timer (see AGENTS.md).
    return () => animation.stop();
  }, [config, anim]);

  if (!mounted || !shown) return null;

  return (
    <Animated.View
      testID="toast"
      pointerEvents={config ? "box-none" : "none"}
      style={[
        styles.wrap,
        // Clear the tab bar where there is one; on the tab-less screens
        // (article/story detail, Saved) it just floats a little higher,
        // which is fine for a transient toast.
        { bottom: tabBarInset + Spacing.two },
        {
          opacity: anim,
          // Under Reduce Motion the toast cross-fades in place instead of
          // rising - a fade is the recommended stand-in for motion, so the
          // opacity half stays either way and only the travel goes.
          transform: reducedMotion
            ? []
            : [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.message} numberOfLines={2}>
          {shown.message}
        </ThemedText>
        {shown.action && (
          <Pressable
            testID="toast-action"
            onPress={() => {
              shown.action?.onPress();
              onHide();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={shown.action.label}
          >
            <ThemedText style={[styles.action, { color: theme.tint }]}>
              {shown.action.label}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  message: { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  action: { fontSize: 14, fontWeight: "700" },
});
