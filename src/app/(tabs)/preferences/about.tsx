import { StyleSheet } from "react-native";

import PushedScreen from "@/components/pushed-screen";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTranslation } from "@/i18n/translations";

// English-only for now, deliberately - unlike the app's UI chrome (fully
// localized via i18n/translations), this is a real document where a rushed
// or approximate translation could actually misrepresent something, rather
// than just reading a bit awkwardly. The row label that links here is
// still localized (see preferences/index.tsx).
export default function AboutScreen() {
  const { t } = useTranslation();

  return (
    <PushedScreen title={t("about")}>
      <ThemedText style={styles.paragraph}>
        News Khabri brings together news from multiple Indian publishers -
        in English and nine Indian languages (Hindi, Bengali, Gujarati,
        Kannada, Malayalam, Marathi, Odia, Tamil, Telugu) - in one place,
        so you can see what's actually happening without checking a dozen
        apps.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        HOW IT WORKS
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Articles are pulled from each publisher's own public feed, then
        grouped and ranked by an algorithm that weighs how many independent
        sources are covering something, how recent it is, and how
        significant it seems - not just what's trending or which publisher
        posted first.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        NOT A PUBLISHER
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        News Khabri does not write, edit, or take credit for the news it
        shows. Every story links back to its original publisher, and
        "Read on [Source]" opens the original article on the source's own
        site. News Khabri is an independent app and isn't affiliated with
        any of the publishers whose content it aggregates.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        YOUR ACCOUNT
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        You can use News Khabri without signing in. Signing in with Google
        or Apple is optional - it syncs your preferences and saved articles across
        devices and personalises story ranking. You can delete your
        account and its data any time from the Profile screen. See the
        Privacy Policy for the details.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        GET IN TOUCH
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Questions, feedback, or something looks wrong? Reach us at
        support@newskhabri.app.
      </ThemedText>
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  heading: { letterSpacing: 0.5, marginTop: Spacing.four, marginBottom: Spacing.two },
  paragraph: { marginBottom: Spacing.two },
});
