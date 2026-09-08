import Ionicons from "@expo/vector-icons/Ionicons";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const ICON_SIZE = 40;

type Props = {
  title: string;
  // The supporting line under the title. Optional: a search with no hits
  // says everything in its title, and the query box is right there.
  description?: string;
  // SF Symbol name plus its Ionicons fallback, the same pairing every
  // other icon in this app uses.
  symbolName: SymbolViewProps["name"];
  ioniconName: React.ComponentProps<typeof Ionicons>["name"];
  // Omit for a state the reader can't act on. When given, renders a button
  // below the copy - the counterpart to ErrorState's "Try again".
  action?: { label: string; onPress: () => void };
  testID?: string;
};

// The shared "there is nothing here" state, next to error-state.tsx's
// shared "this failed". The Saved screen had the only designed one of
// these; the feeds rendered a bare left-aligned line of secondary text,
// which is what a reader hit when a category or source filter emptied
// their feed - the most reachable empty state in the app had the least
// help in it.
export default function EmptyState({
  title,
  description,
  symbolName,
  ioniconName,
  action,
  testID,
}: Props) {
  const theme = useTheme();

  return (
    <View testID={testID} style={styles.container}>
      <SymbolView
        name={symbolName}
        size={ICON_SIZE}
        weight="regular"
        tintColor={theme.textSecondary}
        fallback={
          <Ionicons name={ioniconName} size={ICON_SIZE} color={theme.textSecondary} />
        }
      />
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {description && (
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      )}
      {action && (
        <TouchableOpacity
          testID={testID ? `${testID}-action` : undefined}
          onPress={action.onPress}
          style={[styles.button, { backgroundColor: theme.backgroundElement }]}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <ThemedText style={styles.buttonText}>{action.label}</ThemedText>
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
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  title: { textAlign: "center" },
  description: { textAlign: "center" },
  button: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    // Comes to the 44pt minimum with the 16pt line inside it.
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontWeight: "600" },
});
