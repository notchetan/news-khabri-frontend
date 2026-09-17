import { useRouter } from "expo-router";
import { Fragment } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import Icon from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { TranslationKey, useTranslation } from "@/i18n/translations";

// The two documents, laid out as the same centered "Privacy · Legal" line
// the Preferences footer uses (see preferences/index.tsx's legalLinksRow) -
// but pointing at onboarding's own copies of the routes, since the
// preferences ones live inside the (tabs) group. See
// app/onboarding/privacy.tsx.
const LEGAL_LINKS: {
  href: "/onboarding/privacy" | "/onboarding/terms";
  labelKey: TranslationKey;
}[] = [
  { href: "/onboarding/privacy", labelKey: "privacy" },
  { href: "/onboarding/terms", labelKey: "legal" },
];

// The links plus the acceptance checkbox that gates the rest of onboarding.
// Deliberately *not* `unscaled` like the Preferences footer is: that footer
// is fixed chrome, whereas this is a consent statement inside a scroll view
// that has room to grow, and it needs to stay readable at the largest font
// scale.
export function OnboardingLegalConsent({
  accepted,
  onToggle,
  style,
}: {
  accepted: boolean;
  onToggle: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={style}>
      <View style={styles.linksRow}>
        {LEGAL_LINKS.map((link, index) => (
          <Fragment key={link.href}>
            {index > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {"·"}
              </ThemedText>
            )}
            <Pressable
              testID={`onboarding-legal-${link.labelKey}`}
              onPress={() => router.push(link.href)}
              // Same reasoning as the Preferences footer: one line of small
              // text is a ~20pt target on its own, and the row is centered
              // with gaps, so hitSlop grows the touch area without pushing
              // the two links apart visually.
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t(link.labelKey)}
            >
              <ThemedText type="small" themeColor="tint">
                {t(link.labelKey)}
              </ThemedText>
            </Pressable>
          </Fragment>
        ))}
      </View>

      <Pressable
        testID="onboarding-legal-accept"
        onPress={onToggle}
        style={styles.acceptRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel={t("onboardingLegalAccept")}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: accepted ? theme.tint : theme.textSecondary,
              backgroundColor: accepted ? theme.tint : "transparent",
            },
          ]}
        >
          {accepted && (
            <Icon
              sf="checkmark"
              ion="checkmark"
              size={13}
              weight="bold"
              color={theme.tintText}
            />
          )}
        </View>
        <ThemedText type="small" style={styles.acceptLabel}>
          {t("onboardingLegalAccept")}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
    rowGap: Spacing.one,
  },
  acceptRow: {
    flexDirection: "row",
    // Top, not center: the label wraps to two lines at most font scales,
    // and a centered box drifts away from the first line as it grows.
    alignItems: "flex-start",
    gap: Spacing.two,
    // 44pt minimum tap target (see PR #53) - the row is the target, not
    // just the 22pt box.
    minHeight: 44,
    marginTop: Spacing.three,
    // Left-aligned text (as a checkbox label should be) inside a block that
    // is itself centered, so it sits under the centered links above rather
    // than reading as the one left-aligned thing on the screen. Capped so
    // the label wraps into a tidy column instead of running the full width.
    alignSelf: "center",
    maxWidth: 340,
  },
  box: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: Radius.tiny,
    alignItems: "center",
    justifyContent: "center",
  },
  // Keeps the wrapped label off the screen edge without shrinking the row
  // below its own content - RN's flexShrink defaults to 0 (see AGENTS.md).
  acceptLabel: { flexShrink: 1 },
});
