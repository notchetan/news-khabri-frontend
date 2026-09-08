import { Platform } from 'react-native';

// A warm, low-saturation neutral palette shared across both themes (same
// undertone, inverted lightness) rather than pure black/white, so day and
// night read as a matched pair instead of two unrelated extremes.
export const Colors = {
  light: {
    text: '#1C1A17',
    background: '#FAF7F2',
    backgroundElement: '#F0EAE0',
    backgroundSelected: '#E2D9C9',
    textSecondary: '#71685A',
    // A warm terracotta rather than iOS's stock system blue - a saturated
    // blue would clash with this palette's warm undertone. Used for
    // selection/active states (see category-pills.tsx, profile.tsx) instead
    // of the plain text/background inversion those used before, and for
    // ThemedText's "linkPrimary" type, replacing a leftover hardcoded
    // '#3c87f7' that didn't match anything else in the app.
    //
    // Darkened from '#A8552E', which was 4.38:1 on backgroundElement - just
    // under AA, and live as the toast's action link. See
    // __tests__/theme-contrast.test.ts, which pins every pairing the app
    // actually renders.
    tint: '#9E4E29',
    tintText: '#FFF9F2',
    // Destructive actions only (e.g. "Clear all" on the Saved screen). A
    // muted brick red rather than iOS's stock '#FF3B30' so it still reads
    // as "danger" without breaking this palette's warm, low-saturation
    // undertone.
    danger: '#B23B2E',
  },
  dark: {
    text: '#F3EFE7',
    background: '#17140F',
    backgroundElement: '#241F18',
    backgroundSelected: '#332C22',
    textSecondary: '#A79D8C',
    tint: '#D98B63',
    tintText: '#1C1109',
    danger: '#E0685A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// One shared corner-radius scale instead of ad hoc numbers per component.
// `full` is a "rounded-full" sentinel, not a real radius - RN clips any
// borderRadius past half the shortest side to a perfect capsule/circle.
// See utils/corner-radius.ts's concentricRadius for a nested element's
// radius derived from its container instead.
export const Radius = {
  tiny: 4,
  small: 8,
  medium: 12,
  large: 16,
  full: 9999,
} as const;

// Standard tab bar content heights (49pt iOS, 80dp Android - Material 3's
// NavigationBar spec) - added *on top of* insets.bottom, not instead of
// it. See docs/android-tab-bar.md and AGENTS.md's own
// useSafeAreaInsets()-doesn't-include-the-tab-bar lesson.
export const NATIVE_TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 80, default: 0 });
