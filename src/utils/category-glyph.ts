import type { SFSymbol } from "expo-symbols";

import { getCategoryTopic, type CategoryTopic } from "./category-topic";

// SF Symbol per topic, used for article-image.tsx's no-photo placeholder -
// a large glyph on a tonal background, matching how iOS itself represents
// "no artwork available" (Podcasts, Music, News) rather than a colorful
// emoji sitting on a plain gray box. Deliberately restricted to symbol
// names that have existed since SF Symbols 1.0/one of the earliest
// releases - this can't be visually verified on a real device from here,
// so every choice favors "definitely exists" over a more specific but
// newer/less certain name.
const TOPIC_GLYPH: Record<CategoryTopic, SFSymbol> = {
  // No cricket-specific SF Symbol exists in the catalog - sportscourt.fill
  // (a flat court/pitch) reasonably fits a cricket pitch too, so cricket
  // and general sports share it; general sports takes trophy.fill instead,
  // which is what actually distinguishes the two. See
  // docs/category-icons.md.
  cricket: "sportscourt.fill",
  sports: "trophy.fill",
  business: "chart.line.uptrend.xyaxis",
  tech: "desktopcomputer",
  entertainment: "film.fill",
  world: "globe",
  politics: "building.columns.fill",
  science: "cross.case.fill",
  lifestyle: "sparkles",
  education: "graduationcap.fill",
  weather: "cloud.sun.fill",
  opinion: "quote.bubble.fill",
  default: "newspaper.fill",
};

export function getCategoryGlyph(category: string | null | undefined): SFSymbol {
  return TOPIC_GLYPH[getCategoryTopic(category)];
}
