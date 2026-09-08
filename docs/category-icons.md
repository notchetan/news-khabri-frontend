# Category icons

Two maps, one per platform's icon family, both keyed off the same
`getCategoryTopic()` bucket so the "which topic is this category" judgment
lives in one place (see `category-topic.ts`):

- `category-glyph.ts` - SF Symbols, what iOS renders.
- `category-ionicon.ts` - Ionicons, what Android renders.

Both are `Record<CategoryTopic, ...>`, so adding a topic fails to compile
until both are updated. They are used by the search tab's category grid
and by `article-image.tsx`'s no-photo placeholder.

## Why this replaced an emoji map

There used to be a third map, `category-icon.ts`, holding an emoji per
topic. The grid used it directly, and - the part that actually mattered -
`article-image.tsx` passed it as `SymbolView`'s `fallback`. `SymbolView`
only renders a real symbol on iOS, so that fallback is what **every
Android reader saw**: the placeholder the map's own doc described as "a
large SF Symbol on a tonal background, matching how iOS itself represents
no artwork available" was, on Android, a colourful emoji on a plain box -
precisely the thing that doc said it was avoiding.

The original reasoning for emoji in the *grid* specifically was that a
colourful tile reads as decorative art rather than as a functional icon,
which is a fair distinction. Two things weigh against it:

- Emoji render from the system font, so the same glyph differs across
  Samsung/Pixel/older Android, and they cannot take a theme - a
  full-colour glyph sits on both a `#FAF7F2` and a `#17140F` tile.
- It made the grid the one place in the app not drawn from the same icon
  family as everything else.

The grid keeps its colour by tinting the symbol with `theme.tint` rather
than leaving it monochrome, so what the emoji were contributing visually
is not simply lost.

## Two gaps in the mapping

- **Cricket** has no dedicated icon in either family. SF Symbols gets
  `sportscourt.fill` (a flat court that reads as a pitch); Ionicons gets
  `baseball`, the closest bat-and-ball shape. General sports takes
  `trophy.fill` / `football` respectively.
- **Politics** is the topic the backend's own "india"/national-news
  category resolves to (see `docs/category-topic-mapping.md` - there is no
  separate canonical "politics" category), so a government-building glyph
  is the right read for it. This is also why the emoji map's India-flag
  choice existed; a building carries the same meaning without making a
  national flag stand for politics generally.
