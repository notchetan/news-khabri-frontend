import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleSignInButton } from "@/components/apple-sign-in-button";
import Icon from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { goBackOr } from "@/utils/navigation";

// Reachable from the profile button in AppHeader on every tab that shows
// one. Its own back button below follows the same pattern as
// pushed-screen.tsx, since it's no longer inside any tab's own
// Stack that would otherwise supply one (see app-tabs.tsx's own comment on
// why Profile is no longer a tab itself).
export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading, signInError, clearSignInError, signIn, signInWithApple, signOut, deleteAccount } =
    useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  // signInError lives in AuthProvider, which outlives this screen - without
  // this, a failure from one visit was still on screen the next time you
  // opened Profile.
  useEffect(() => clearSignInError, [clearSignInError]);

  const topPadding = Platform.select({
    default: insets.top,
    web: Spacing.six,
  });

  const goBack = () => goBackOr(router, "/");

  const confirmDeleteAccount = () => {
    Alert.alert(
      t("deleteAccountConfirmTitle"),
      t("deleteAccountConfirmMessage"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("deleteAccountConfirm"),
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
            } catch {
              Alert.alert(t("deleteAccountError"));
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: topPadding }]}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("back")}
        style={styles.backPressable}
      >
        <SymbolView
          name="chevron.left"
          size={16}
          weight="semibold"
          tintColor={theme.text}
          fallback={<ThemedText style={styles.backGlyph}>‹</ThemedText>}
        />
        <ThemedText style={styles.backGlyph}>{" " + t("back")}</ThemedText>
      </Pressable>

      <ThemedView style={styles.content}>
        {isLoading ? null : user ? (
          <>
            {user.avatarUrl ? (
              <Image
                testID="profile-avatar"
                source={{ uri: user.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <Icon
                sf="person.crop.circle"
                ion="person-circle"
                size={64}
                weight="regular"
                color={theme.textSecondary}
              />
            )}
            <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
              {user.name || user.email}
            </ThemedText>
            {user.name && (
              <ThemedText themeColor="textSecondary" style={styles.email}>
                {user.email}
              </ThemedText>
            )}
            <Pressable
              onPress={signOut}
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}
              accessibilityRole="button"
              accessibilityLabel={t("signOut")}
            >
              <ThemedText type="default">{t("signOut")}</ThemedText>
            </Pressable>
            <Pressable
              testID="profile-delete-account"
              onPress={confirmDeleteAccount}
              disabled={isDeleting}
              style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t("deleteAccount")}
              accessibilityState={{ disabled: isDeleting }}
            >
              <ThemedText type="default" style={{ color: theme.danger }}>
                {t("deleteAccount")}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <Icon
              sf="person.crop.circle"
              ion="person-circle"
              size={48}
              weight="regular"
              color={theme.textSecondary}
            />
            <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
              {t("profileTitle")}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.message}>
              {t("signInDescription")}
            </ThemedText>
            {/* Apple first, per Apple's HIG for the sign-in list. */}
            <AppleSignInButton onPress={signInWithApple} style={styles.appleButton} />
            <Pressable
              onPress={signIn}
              style={[styles.button, styles.signInButton, { backgroundColor: theme.tint }]}
              accessibilityRole="button"
              accessibilityLabel={t("signInWithGoogle")}
            >
              <Ionicons name="logo-google" size={18} color={theme.tintText} />
              <ThemedText type="default" style={{ color: theme.tintText }}>
                {t("signInWithGoogle")}
              </ThemedText>
            </Pressable>
            {signInError && (
              <ThemedText
                testID="profile-sign-in-error"
                style={[styles.error, { color: theme.danger }]}
              >
                {t("unexpectedError")}
              </ThemedText>
            )}
          </>
        )}

        {!isLoading && (
          <Pressable
            testID="profile-saved-button"
            onPress={() => router.push("/saved")}
            style={[styles.button, { backgroundColor: theme.backgroundElement }]}
            accessibilityRole="button"
            accessibilityLabel={t("savedArticlesTitle")}
          >
            <ThemedText type="default">{t("savedArticlesTitle")}</ThemedText>
          </Pressable>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backPressable: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
  },
  backGlyph: { fontSize: 16, fontWeight: "600" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
  },
  avatar: { width: 64, height: 64, borderRadius: Radius.full },
  title: { marginTop: Spacing.three, textAlign: "center" },
  email: { marginTop: Spacing.half, textAlign: "center" },
  message: { marginTop: Spacing.two, textAlign: "center" },
  button: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
  },
  signInButton: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  appleButton: { marginTop: Spacing.four, width: 260 },
  error: { marginTop: Spacing.three, textAlign: "center" },
  // Text-only, no fill - a quieter treatment than the filled buttons
  // above, since it's a destructive action the reader shouldn't reach for
  // by habit.
  deleteButton: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
  },
  deleteButtonDisabled: { opacity: 0.5 },
});
