// Maps a category name (raw string from whatever publisher/language it came
// from - there's no fixed taxonomy, see category-aliases.js on the backend)
// to one of a small set of general topics via keyword matching. Shared by
// category-glyph.ts (SF Symbols, iOS) and category-ionicon.ts (Ionicons,
// Android), so the "which bucket does this category belong to" judgment
// call lives in exactly one place rather than separate keyword lists
// silently drifting apart as sources/languages are added.
export type CategoryTopic =
  | "sports"
  | "cricket"
  | "business"
  | "tech"
  | "entertainment"
  | "world"
  | "politics"
  | "science"
  | "lifestyle"
  | "education"
  | "weather"
  | "opinion"
  | "default";

// See docs/category-topic-mapping.md.
const CATEGORY_TOPIC_RULES: { keywords: string[]; topic: CategoryTopic }[] = [
  { keywords: ["cricket", "क्रिकेट"], topic: "cricket" },
  { keywords: ["sport", "football", "स्पोर्ट", "સ્પોર્ટ્સ"], topic: "sports" },
  {
    keywords: ["business", "market", "finance", "बिजनेस", "व्यापार", "बाज़ार", "બિઝનેસ"],
    topic: "business",
  },
  { keywords: ["tech", "auto", "गैजेट", "टेक", "ऑटो"], topic: "tech" },
  {
    keywords: ["entertainment", "bollywood", "movie", "बॉलीवुड", "मनोरंजन", "એન્ટરટેઇનમેન્ટ"],
    topic: "entertainment",
  },
  { keywords: ["world", "foreign", "international", "विदेश", "વર્લ્ડ"], topic: "world" },
  {
    keywords: [
      "politic", "national", "देश", "राजनीति", "nation", "india",
      "ઈન્ડિયા", "મારું ગુજરાત",
    ],
    topic: "politics",
  },
  { keywords: ["science", "विज्ञान"], topic: "science" },
  { keywords: ["lifestyle", "health", "wellness", "स्वास्थ्य", "जीवन"], topic: "lifestyle" },
  { keywords: ["education", "job", "career", "शिक्षा", "जॉब"], topic: "education" },
  { keywords: ["weather"], topic: "weather" },
  { keywords: ["opinion", "ओपिनियन"], topic: "opinion" },
];

export function getCategoryTopic(category: string | null | undefined): CategoryTopic {
  if (!category) return "default";
  const lower = category.toLowerCase();
  const match = CATEGORY_TOPIC_RULES.find((rule) =>
    rule.keywords.some((keyword) => lower.includes(keyword))
  );
  return match?.topic ?? "default";
}
