import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

type Props = {
  message: string;
  // Omit to render the message with no action (e.g. a state nothing can
  // retry). When given, a "Try again" button calls it.
  onRetry?: () => void;
  testID?: string;
};

// Shared failure state for the feeds and detail screens - a message plus
// an optional retry button, instead of the bare line of text each of those
// used to render on their own.
export default function ErrorState({ message, onRetry, testID }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View testID={testID} style={styles.container}>
      <ThemedText style={styles.message}>{message}</ThemedText>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={[styles.button, { backgroundColor: theme.backgroundElement }]}
          accessibilityRole="button"
          accessibilityLabel={t("retry")}
        >
          <ThemedText style={styles.buttonText}>{t("retry")}</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.five,
    gap: Spacing.three,
  },
  message: { textAlign: "center", fontSize: 15 },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    // 14pt of text inside Spacing.two came to roughly 34pt, under the
    // platform minimum - and this is the one control on a failed screen.
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "600" },
});
