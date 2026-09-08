import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { MIN_TOUCH_TARGET, Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

type Props = {
  // Already-translated text for the tab this header is rendered on top of -
  // the app's own name for Home, "Search" for Search, "Preferences" for
  // Preferences (see each screen's own call site). Kept as a plain string
  // rather than a tab-name enum so this component doesn't need to know
  // anything about routing/tab structure itself.
  title: string;
};

// Shared top header for the Home/Search/Preferences tabs: the app's own
// mark plus the current tab's title on the left, and a button to the
// now-tab-less Profile screen (see app-tabs.tsx's own comment on why
// Profile is no longer a tab) on the right, in the same row - replaces the
// per-tab text labels those three tabs used to show in the tab bar itself.
//
// The Platform.OS === "web" early return below is inert dead code - web was
// dropped as a target in #17, along with the app-tabs.web.tsx this used to
// point at.
export default function AppHeader({ title }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  if (Platform.OS === "web") return null;

  return (
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <Image
          testID="app-header-logo"
          // The app's own mark, not a generic icon - same density-correct
          // asset already used for anything else needing this app's own
          // logo at a small size (see its own @2x/@3x siblings).
          source={require("@/assets/images/tab-home-icon.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <ThemedText style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          testID="app-header-saved-button"
          onPress={() => router.push("/saved")}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={t("savedArticlesTitle")}
        >
          <SymbolView
            name="bookmark"
            size={24}
            weight="regular"
            tintColor={theme.text}
            fallback={<Ionicons name="bookmark-outline" size={24} color={theme.text} />}
          />
        </Pressable>

        <Pressable
          testID="app-header-profile-button"
          onPress={() => router.push("/profile")}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={t("tabProfile")}
        >
          {user?.avatarUrl ? (
            <Image
              testID="app-header-avatar"
              source={{ uri: user.avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <SymbolView
              name="person.crop.circle"
              size={28}
              weight="regular"
              tintColor={theme.text}
              fallback={<Ionicons name="person-circle" size={28} color={theme.text} />}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    // Matches the app's other major structural gaps (list item spacing,
    // grid spacing, etc.) - this is what every tab's own content sits
    // below this header by, and it needs to be the same everywhere this
    // header appears for that to actually read as consistent.
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  // flex-end, not center - see docs/cross-script-text-rendering.md.
  titleGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.two,
    // So a long title still leaves room for the profile button instead of
    // pushing it off the right edge.
    flexShrink: 1,
  },
  logo: { width: 28, height: 28 },
  // A real box rather than a hitSlop: a 24pt icon with hitSlop 8 came to
  // 40pt, under either platform's minimum. The row has the width for it -
  // titleGroup already flexShrinks to make room.
  actionButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
  // Tightened from Spacing.three now that each button carries its own
  // MIN_TOUCH_TARGET box, which already separates them well past the 8pt
  // minimum gap.
  actions: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
  avatar: { width: 28, height: 28, borderRadius: Radius.full },
  // See docs/cross-script-text-rendering.md.
  title: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: Math.ceil(20 * 1.4),
    ...Platform.select({
      android: { includeFontPadding: false, textAlignVertical: "center" },
      default: {},
    }),
  },
});
