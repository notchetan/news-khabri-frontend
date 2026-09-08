import { Colors } from "@/constants/theme";

// WCAG 2.x relative luminance and contrast ratio. Small enough to keep
// here rather than shipping a colour library the app itself never needs.
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const AA_TEXT = 4.5;

// Only pairings the app actually renders. backgroundSelected is
// deliberately absent as a *text* background: it is used for borders,
// dividers and skeleton blocks, never behind text (see the greps in the
// PR that added this file). Put text on it and these need extending.
const TEXT_ON_SURFACE: [foreground: string, background: string][] = [
  ["text", "background"],
  ["text", "backgroundElement"],
  ["textSecondary", "background"],
  ["textSecondary", "backgroundElement"],
  ["tint", "background"],
  ["tint", "backgroundElement"],
  ["danger", "background"],
  ["danger", "backgroundElement"],
];

describe.each(["light", "dark"] as const)("%s palette", (scheme) => {
  const palette = Colors[scheme];

  it.each(TEXT_ON_SURFACE)("%s on %s meets AA for normal text", (fg, bg) => {
    const ratio = contrast(
      palette[fg as keyof typeof palette],
      palette[bg as keyof typeof palette]
    );
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });

  // The filled primary button (article detail's "Read on <source>", the
  // onboarding Next button, the profile sign-out button).
  it("reads tintText on a tint fill", () => {
    expect(contrast(palette.tintText, palette.tint)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
