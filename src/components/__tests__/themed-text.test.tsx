import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { Colors } from "@/constants/theme";
import { FontSizePreferenceProvider } from "@/contexts/font-size-preference";

import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import { ThemedText } from "../themed-text";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemePreferenceProvider>{ui}</ThemePreferenceProvider>);
}

describe("ThemedText", () => {
  it.each([
    "default",
    "title",
    "small",
    "smallBold",
    "subtitle",
    "link",
    "linkPrimary",
  ] as const)("renders without crashing for type=%s", async (type) => {
    await renderWithTheme(<ThemedText type={type}>Hello</ThemedText>);
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("uses the 'text' theme color by default", async () => {
    await renderWithTheme(<ThemedText>Hello</ThemedText>);
    const node = screen.getByText("Hello");
    const flatStyle = [node.props.style].flat();
    expect(flatStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#1C1A17" })])
    );
  });

  it("uses the given themeColor when provided", async () => {
    await renderWithTheme(
      <ThemedText themeColor="textSecondary">Hello</ThemedText>
    );
    const node = screen.getByText("Hello");
    const flatStyle = [node.props.style].flat();
    expect(flatStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#71685A" })])
    );
  });

  it("type='linkPrimary' defaults to the theme's tint color", async () => {
    await renderWithTheme(<ThemedText type="linkPrimary">Hello</ThemedText>);
    const node = screen.getByText("Hello");
    const flatStyle = [node.props.style].flat();
    expect(flatStyle).toEqual(
      // The token, not its literal - this assertion is about
      // linkPrimary resolving to tint, not about which hex tint is.
      expect.arrayContaining([
        expect.objectContaining({ color: Colors.light.tint }),
      ])
    );
  });

  it("an explicit themeColor overrides linkPrimary's default tint", async () => {
    await renderWithTheme(
      <ThemedText type="linkPrimary" themeColor="text">Hello</ThemedText>
    );
    const node = screen.getByText("Hello");
    const flatStyle = [node.props.style].flat();
    expect(flatStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#1C1A17" })])
    );
  });

  it.each(["title", "subtitle"] as const)(
    "gives type=%s a generous lineHeight, not Apple's own tighter Dynamic Type ratio",
    async (type) => {
      // Regression test: title/subtitle used lineHeight ratios (44/40,
      // 41/34 - both ~1.1-1.2x fontSize) copied from Apple's own Dynamic
      // Type scale, tuned for Latin text - real article/story headlines in
      // Devanagari/Tamil/etc. clipped at the top under that ratio. Asserts
      // the invariant (>=1.3x, comfortably above Apple's own ratio) rather
      // than the exact current multiplier, so this doesn't need updating
      // every time the multiplier itself is retuned - just that it stays
      // generous.
      await renderWithTheme(<ThemedText type={type}>Hello</ThemedText>);
      const node = screen.getByText("Hello");
      const flatStyle = [node.props.style].flat();
      const { fontSize, lineHeight } = Object.assign({}, ...flatStyle);
      expect(lineHeight / fontSize).toBeGreaterThanOrEqual(1.3);
    }
  );
});

describe("ThemedText font scaling", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  function renderScaled(ui: React.ReactElement) {
    return render(
      <ThemePreferenceProvider>
        <FontSizePreferenceProvider>{ui}</FontSizePreferenceProvider>
      </ThemePreferenceProvider>
    );
  }

  function sizeOf(node: ReturnType<typeof screen.getByText>) {
    return StyleSheet.flatten(node.props.style) as {
      fontSize?: number;
      lineHeight?: number;
    };
  }

  it("leaves sizes alone at the default (medium) scale", async () => {
    await renderScaled(<ThemedText>Hello</ThemedText>);
    expect(sizeOf(screen.getByText("Hello"))).toMatchObject({
      fontSize: 16,
      lineHeight: 24,
    });
  });

  it("scales a type variant's own size and line height", async () => {
    await AsyncStorage.setItem("fontSizePreference", "large");

    await renderScaled(<ThemedText>Hello</ThemedText>);

    await waitFor(() => {
      // large = 1.2
      expect(sizeOf(screen.getByText("Hello"))).toMatchObject({
        fontSize: 16 * 1.2,
        lineHeight: 24 * 1.2,
      });
    });
  });

  // The point of scaling after flattening: a caller's explicit fontSize is
  // still the reader's text, so it has to follow the preference too.
  it("scales a caller's own fontSize override", async () => {
    await AsyncStorage.setItem("fontSizePreference", "small");

    await renderScaled(<ThemedText style={{ fontSize: 20 }}>Hello</ThemedText>);

    await waitFor(() => {
      // small = 0.875
      expect(sizeOf(screen.getByText("Hello")).fontSize).toBeCloseTo(20 * 0.875);
    });
  });

  it("leaves `unscaled` text at its declared size", async () => {
    await AsyncStorage.setItem("fontSizePreference", "large");

    await renderScaled(
      <>
        <ThemedText style={{ fontSize: 20 }}>Scaled</ThemedText>
        <ThemedText unscaled style={{ fontSize: 20 }}>
          Fixed
        </ThemedText>
      </>
    );

    await waitFor(() => {
      expect(sizeOf(screen.getByText("Scaled")).fontSize).toBeCloseTo(24);
    });
    expect(sizeOf(screen.getByText("Fixed")).fontSize).toBe(20);
  });

  // ThemedText is a leaf primitive - it must not crash where no provider
  // happens to sit above it.
  it("falls back to the default scale with no FontSizePreferenceProvider", async () => {
    await render(
      <ThemePreferenceProvider>
        <ThemedText>Hello</ThemedText>
      </ThemePreferenceProvider>
    );

    expect(sizeOf(screen.getByText("Hello"))).toMatchObject({ fontSize: 16 });
  });
});
