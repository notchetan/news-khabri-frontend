import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";

import Squircle from "@/components/squircle";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { getCategoryGlyph } from "@/utils/category-glyph";
import { getCategoryIonicon } from "@/utils/category-ionicon";

type Props = {
  uri: string | null;
  category?: string;
  height?: DimensionValue;
  alt?: string;
  // Callers pass the radius that fits their context (e.g. a smaller,
  // concentric value when nested inside a card that has its own radius) -
  // see utils/corner-radius.ts. Defaults to the small thumbnail size.
  radius?: number;
};

// See docs/article-image-placeholder.md.
export default function ArticleImage({
  uri,
  category,
  height = 180,
  alt,
  radius = Radius.small,
}: Props) {
  const [failed, setFailed] = useState(false);
  const theme = useTheme();
  const { t } = useTranslation();

  // Without this the failure sticks to the component, not to the image that
  // actually failed - navigating between related articles reuses this same
  // position in the tree, so a broken photo on one article left the next
  // one showing the failure placeholder over a perfectly good URL.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    // Two different states, two different treatments - see
    // docs/article-image-placeholder.md.
    return (
      <Squircle
        radius={radius}
        backgroundColor={theme.backgroundElement}
        style={[styles.placeholder, { height }]}
      >
        <View
          style={styles.placeholderContent}
          accessible
          accessibilityLabel={uri ? t("imageFailedToLoad") : t("noImage")}
        >
          <SymbolView
            testID="article-image-placeholder-glyph"
            name={uri ? "exclamationmark.triangle.fill" : getCategoryGlyph(category)}
            size={36}
            tintColor={theme.textSecondary}
            fallback={
              <Ionicons
                name={uri ? "warning" : getCategoryIonicon(category)}
                size={36}
                color={theme.textSecondary}
              />
            }
          />
          {uri && (
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
              {t("imageFailedToLoad")}
            </Text>
          )}
        </View>
      </Squircle>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { height, borderRadius: radius }]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      onError={() => setFailed(true)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={alt || t("articleImageAlt")}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  image: { width: "100%" },
  placeholder: { width: "100%" },
  placeholderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  // Plain Text: this sits inside a fixed-height image placeholder, so it
  // deliberately does not grow with the font-size preference.
  placeholderText: { fontSize: 13 },
});
