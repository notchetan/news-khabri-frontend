import { Pressable, StyleSheet, type ViewStyle } from "react-native";

import Icon from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// A visible forward affordance for the swipe-only onboarding flow - the
// gesture alone isn't discoverable. Screens 1 and 2 render this between
// their content and the dots; screen 3 has its own sign-in / skip
// buttons and doesn't need it.
export function OnboardingNextButton({
  onPress,
  style,
  disabled = false,
}: {
  onPress: () => void;
  style?: ViewStyle;
  // Screen 1 holds this closed until the reader has accepted the privacy
  // policy and terms - see onboarding-legal-consent.tsx. Dimmed rather than
  // hidden so the way forward stays visible and the checkbox reads as the
  // thing standing in front of it.
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      testID="onboarding-next"
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: theme.tint },
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t("onboardingNext")}
      accessibilityState={{ disabled }}
    >
      <ThemedText type="default" style={{ color: theme.tintText }}>
        {t("onboardingNext")}
      </ThemedText>
      <Icon
        sf="chevron.right"
        ion="chevron-forward"
        size={15}
        weight="semibold"
        color={theme.tintText}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
  },
  disabled: { opacity: 0.5 },
});
