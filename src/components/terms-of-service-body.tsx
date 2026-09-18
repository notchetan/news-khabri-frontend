import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { LEGAL_LAST_UPDATED } from "@/constants/legal";
import { Spacing } from "@/constants/theme";

// The terms' own text, lifted out of the preferences route for the same
// reason as privacy-policy-body.tsx - onboarding shows the identical
// document before the reader accepts it (app/onboarding/terms.tsx).
//
// A reasonable starting point, not legal advice, and not reviewed by a
// lawyer - get one before a public launch. Deliberately avoids inventing
// specifics we don't actually have (a registered entity name, a specific
// jurisdiction beyond "India") rather than asserting something that might
// not be true. English-only, same reasoning as about.tsx.
export default function TermsOfServiceBody() {
  return (
    <>

      <ThemedText themeColor="textSecondary" style={styles.updated}>
        Last updated: {LEGAL_LAST_UPDATED}
      </ThemedText>

      <ThemedText style={styles.paragraph}>
        By using News Khabri, you agree to these terms. If you don't agree,
        please don't use the app.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        WHAT NEWS KHABRI IS
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        News Khabri is a news aggregator: it collects, ranks, and groups
        articles published by third-party news organizations. We don't
        write or edit the underlying news, and we don't guarantee its
        accuracy, completeness, or timeliness - that responsibility sits
        with each original publisher.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        ACCOUNTS
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        You can use News Khabri without an account. Signing in is optional
        and uses your Google account or, on iPhone, your Apple ID; you're
        responsible for keeping that account secure. You can delete your News Khabri account, and the
        data synced to it, at any time from the Profile screen. See the
        Privacy Policy for what signing in stores.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        ACCEPTABLE USE
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Use the app for personal, non-commercial reading. Don't attempt to
        scrape, abuse, or overload News Khabri's own systems, or use the
        app in any way that violates applicable law.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        OWNERSHIP
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Article headlines, summaries, images, and full text belong to their
        original publishers. News Khabri's own app design, branding, and
        software are ours.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        NO WARRANTY
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        News Khabri is provided "as is," without warranty of any kind. We
        don't guarantee the app will always be available, error-free, or
        uninterrupted, and we're not liable for decisions made based on
        content shown in the app.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        CHANGES
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        We may update the app or these terms over time. Continuing to use
        News Khabri after a change means you accept the updated terms.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        GOVERNING LAW
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        These terms are governed by the laws of India.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        CONTACT
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Questions about these terms? Reach us at support@newskhabri.app.
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  updated: { marginBottom: Spacing.three },
  heading: { letterSpacing: 0.5, marginTop: Spacing.four, marginBottom: Spacing.two },
  paragraph: { marginBottom: Spacing.two },
});
