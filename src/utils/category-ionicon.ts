import type Ionicons from "@expo/vector-icons/Ionicons";

import { getCategoryTopic, type CategoryTopic } from "./category-topic";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// The Android counterpart to category-glyph.ts's SF Symbols. SymbolView
// only renders a real symbol on iOS, so whatever is passed as its
// `fallback` is what every Android reader actually sees - which used to be
// the emoji in category-icon.ts. Same topic buckets as the SF Symbol map,
// so the two platforms show the same thing in a different icon family
// rather than one showing icons and the other emoji.
const TOPIC_IONICON: Record<CategoryTopic, IoniconName> = {
  // Ionicons has no cricket icon either (see category-glyph.ts's note on
  // the same gap); baseball is the closest bat-and-ball shape.
  cricket: "baseball",
  sports: "football",
  business: "trending-up",
  tech: "desktop",
  entertainment: "film",
  world: "globe",
  politics: "business",
  science: "flask",
  lifestyle: "sparkles",
  education: "school",
  weather: "partly-sunny",
  opinion: "chatbubble-ellipses",
  default: "newspaper",
};

export function getCategoryIonicon(category: string | null | undefined): IoniconName {
  return TOPIC_IONICON[getCategoryTopic(category)];
}
