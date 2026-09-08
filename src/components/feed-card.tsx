import Ionicons from "@expo/vector-icons/Ionicons";
import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ArticleImage from "@/components/article-image";
import Squircle from "@/components/squircle";
import { ThemedText } from "@/components/themed-text";
import { Radius } from "@/constants/theme";
import { concentricRadius } from "@/utils/corner-radius";
import { useTheme } from "@/hooks/use-theme";
import { guardedNavigate } from "@/utils/navigation-guard";

// Exported so screens that place their own headings above a list of these
// cards can line the heading's edges up with the card's inner content.
export const CARD_PADDING = 12;
const IMAGE_RADIUS = concentricRadius(Radius.large, CARD_PADDING);

type Props = {
  title: string;
  metaText: string;
  imageUrl: string | null;
  category: string;
  onPress: () => void;
  accessibilityLabel: string;
  // Rendered as a debug pill top-left of the image when provided - callers
  // pass undefined to hide it (e.g. debug mode off, or no score available).
  debugScore?: number;
  debugTestID?: string;
  // A bookmark toggle overlaid top-right of the image - only rendered when
  // onToggleBookmark is provided, so callers that don't opt in (e.g. the
  // Saved screen's own list) are unchanged.
  onToggleBookmark?: () => void;
  bookmarked?: boolean;
  bookmarkAccessibilityLabel?: string;
  bookmarkTestID?: string;
};

// Shared by ArticleList and StoryList - both render the same card shape
// (image, title, one line of meta text, optional debug pill), previously
// duplicated near-verbatim with inline style objects in each file.
export default function FeedCard({
  title,
  metaText,
  imageUrl,
  category,
  onPress,
  accessibilityLabel,
  debugScore,
  debugTestID,
  onToggleBookmark,
  bookmarked,
  bookmarkAccessibilityLabel,
  bookmarkTestID,
}: Props) {
  const theme = useTheme();

  return (
    <Squircle
      radius={Radius.large}
      backgroundColor={theme.backgroundElement}
      // guardedNavigate, not onPress directly - see navigation-guard.ts.
      onPress={() => guardedNavigate(onPress)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.card}
    >
      <View style={styles.imageWrapper}>
        <ArticleImage uri={imageUrl} category={category} alt={title} radius={IMAGE_RADIUS} />
        {debugScore != null && (
          <View testID={debugTestID} style={styles.debugPill}>
            <Text style={styles.debugPillText}>{debugScore.toFixed(2)}</Text>
          </View>
        )}
        {onToggleBookmark && (
          <TouchableOpacity
            testID={bookmarkTestID}
            onPress={onToggleBookmark}
            // 28pt visual + 10 each side = 48. Slop rather than a bigger
            // box because the pill is overlaid on the card image and
            // growing it would cover more of the photo.
            hitSlop={10}
            style={styles.bookmarkButton}
            accessibilityRole="button"
            accessibilityState={{ selected: !!bookmarked }}
            accessibilityLabel={bookmarkAccessibilityLabel}
          >
            <SymbolView
              name={bookmarked ? "bookmark.fill" : "bookmark"}
              size={13}
              weight="bold"
              tintColor="#fff"
              fallback={
                <Ionicons
                  name={bookmarked ? "bookmark" : "bookmark-outline"}
                  size={13}
                  color="#fff"
                />
              }
            />
          </TouchableOpacity>
        )}
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.meta}>
        {metaText}
      </ThemedText>
    </Squircle>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: CARD_PADDING,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrapper: { position: "relative" },
  debugPill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  // Plain Text: a debug-only overlay in a fixed pill, deliberately outside
  // the font-size preference.
  debugPillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  // Mirrors debugPill's absolute overlay, top-right instead of top-left.
  bookmarkButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontWeight: "600", fontSize: 16, marginTop: 8 },
  meta: { fontSize: 12, marginTop: 4 },
});
