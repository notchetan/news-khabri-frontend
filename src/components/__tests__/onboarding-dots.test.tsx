import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { Colors } from "@/constants/theme";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import { OnboardingDots } from "../onboarding-dots";

// The dots are deliberately hidden from the accessibility tree (they are a
// position indicator, not a control), so every query here has to opt into
// hidden elements.
const HIDDEN = { includeHiddenElements: true } as const;

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

async function renderDots(current: number) {
  return render(
    <ThemePreferenceProvider>
      <OnboardingDots total={3} current={current} />
    </ThemePreferenceProvider>
  );
}

function styleOf(node: { props: Record<string, unknown> }) {
  return StyleSheet.flatten(node.props.style as never) as {
    width: number;
    backgroundColor: string;
  };
}

describe("OnboardingDots", () => {
  it("renders one dot per step with exactly one marked current", async () => {
    await renderDots(0);

    expect(screen.getAllByTestId("onboarding-dot", HIDDEN)).toHaveLength(2);
    expect(screen.getAllByTestId("onboarding-dot-active", HIDDEN)).toHaveLength(1);
  });

  // At backgroundSelected these were 1.31:1 against the screen behind
  // them - a reader could not count the steps at all.
  it("draws the inactive dots in a colour that is actually visible", async () => {
    await renderDots(1);

    for (const dot of screen.getAllByTestId("onboarding-dot", HIDDEN)) {
      expect(styleOf(dot).backgroundColor).toBe(Colors.light.textSecondary);
    }
  });

  // Which step is current must not rest on colour alone.
  it("distinguishes the current step by width as well as colour", async () => {
    await renderDots(1);

    const active = styleOf(screen.getByTestId("onboarding-dot-active", HIDDEN));
    const inactive = styleOf(screen.getAllByTestId("onboarding-dot", HIDDEN)[0]);

    expect(active.backgroundColor).toBe(Colors.light.tint);
    expect(active.width).toBeGreaterThan(inactive.width);
  });
});
