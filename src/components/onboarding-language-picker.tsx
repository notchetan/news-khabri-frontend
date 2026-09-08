import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { LANGUAGE_ENDONYMS, LANGUAGE_OPTIONS } from "@/constants/languages";
import { Radius, Spacing } from "@/constants/theme";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Two 144pt columns. Kept off the Spacing scale deliberately: this is a
// width derived from what two columns of endonym need, not a gap that has
// to rhyme with anything else on the screen.
const DROPDOWN_WIDTH = 288;

// Inline dropdown on the welcome screen (not a pushed picker screen like
// preferences/language.tsx) - picking a language here immediately re-renders
// the rest of onboarding in it, since every screen shares the same
// useLanguagePreference()-backed useTranslation().
export function OnboardingLanguagePicker({ style }: { style?: ViewStyle }) {
  const { language, setLanguage } = useLanguagePreference();
  const { t } = useTranslation();
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <Pressable
        testID="onboarding-language-toggle"
        onPress={() => setIsOpen((open) => !open)}
        style={[styles.pill, { backgroundColor: theme.backgroundElement }]}
        accessibilityRole="button"
        accessibilityLabel={t("language")}
        accessibilityState={{ expanded: isOpen }}
      >
        <SymbolView
          name="globe"
          size={14}
          tintColor={theme.text}
          fallback={<ThemedText style={styles.glyph}>🌐</ThemedText>}
        />
        <ThemedText type="small">{LANGUAGE_ENDONYMS[language]}</ThemedText>
        <SymbolView
          name="chevron.down"
          size={12}
          weight="semibold"
          tintColor={theme.textSecondary}
          fallback={<ThemedText style={styles.chevronFallback}>⌄</ThemedText>}
        />
      </Pressable>

      {isOpen && (
        <ThemedView
          testID="onboarding-language-dropdown"
          type="backgroundElement"
          // textSecondary, not backgroundSelected: this popup floats over
          // the welcome screen, and its own surface is only 1.12:1 against
          // that background, so the border is the entire boundary. At
          // backgroundSelected the border was 1.31:1 and the whole edge was
          // invisible. Same reasoning as the category-pills divider.
          style={[styles.dropdown, { borderColor: theme.textSecondary }]}
        >
          {/* Every language at once, no scroll - a scrollable list here
              risks a reader never realizing there's more below the fold
              and missing their own language entirely. Two columns is what
              makes that affordable at a 44pt row: ten single-column rows
              would be 440pt of popup, taller than the space under the pill
              on a short screen. */}
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = language === option.value;
            return (
              <Pressable
                key={option.value}
                testID={`onboarding-language-option-${option.value}`}
                onPress={() => {
                  setLanguage(option.value);
                  setIsOpen(false);
                }}
                style={styles.row}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <ThemedText type="small" style={[selected && { color: theme.tint }]}>
                  {LANGUAGE_ENDONYMS[option.value]}
                </ThemedText>
                {selected && (
                  <SymbolView
                    name="checkmark"
                    size={14}
                    weight="semibold"
                    tintColor={theme.tint}
                    fallback={<ThemedText style={{ color: theme.tint }}>✓</ThemedText>}
                  />
                )}
              </Pressable>
            );
          })}
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The pill itself is in-flow, directly below the welcome screen's own
  // catchphrase - but the expanded list is a popup (position: "absolute",
  // sized to just the pill since the list is removed from flow) so opening
  // it never shifts the dots/content below it.
  container: { alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  glyph: { fontSize: 14 },
  chevronFallback: { fontSize: 14, fontWeight: "700" },
  dropdown: {
    position: "absolute",
    top: "100%",
    marginTop: Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    zIndex: 10,
    // elevation is Android-only and was carrying this alone; iOS had no
    // depth cue at all behind a surface that barely differs from the
    // background it covers.
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    // A fixed width so the two 50%-wide cells below are a predictable size
    // rather than sized to whichever endonym happens to be widest. Centered
    // under the pill by `container`'s own alignItems, and comfortably inside
    // even a 320pt screen.
    width: DROPDOWN_WIDTH,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  row: {
    // Two per line - see the dropdown comment in the JSX above. The ten
    // languages divide evenly into five lines.
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    // The platform touch-target minimum. paddingVertical alone leaves a
    // 14pt line at roughly 36pt, and these rows sit flush against each
    // other with no gap, so an undersized one doesn't just miss - it
    // selects the neighbouring language.
    minHeight: 44,
  },
});
