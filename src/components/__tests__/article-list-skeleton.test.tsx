import { render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Animated } from "react-native";

import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import ArticleListSkeleton from "../article-list-skeleton";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>{ui}</LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("ArticleListSkeleton", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("exposes a single accessible progressbar announcing the loading state", async () => {
    await renderWithProviders(<ArticleListSkeleton />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveProp("accessibilityLabel", "Loading articles…");
  });

  it("collapses its decorative skeleton blocks out of the accessibility tree", async () => {
    await renderWithProviders(<ArticleListSkeleton />);

    // The individual pulsing placeholder blocks carry no text/labels of
    // their own - only the single progressbar container should be surfaced.
    expect(screen.queryAllByRole("progressbar")).toHaveLength(1);
  });

  // An Animated.loop never resolves on its own - it keeps moving for as
  // long as the load takes, which is exactly what Reduce Motion is for.
  // Asserted on the loop rather than on rendered opacity: Animated style
  // props are a render-time snapshot, so the held setValue is not visible
  // through props. The progressbar role above communicates "loading"
  // either way.
  it("starts no indefinite pulse when Reduce Motion is on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const loop = jest.spyOn(Animated, "loop");

    await renderWithProviders(<ArticleListSkeleton />);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());

    expect(loop).not.toHaveBeenCalled();
  });

  it("pulses normally when Reduce Motion is off", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const loop = jest.spyOn(Animated, "loop");

    await renderWithProviders(<ArticleListSkeleton />);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());

    expect(loop).toHaveBeenCalled();
  });
});
