import { fireEvent, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import EmptyState from "../empty-state";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

async function renderEmptyState(props: Partial<React.ComponentProps<typeof EmptyState>> = {}) {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <EmptyState
          testID="empty"
          symbolName="newspaper"
          ioniconName="newspaper-outline"
          title="No articles found."
          {...props}
        />
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("EmptyState", () => {
  it("renders the title on its own when there is nothing to act on", async () => {
    await renderEmptyState();

    expect(screen.getByText("No articles found.")).toBeTruthy();
    expect(screen.queryByTestId("empty-action")).toBeNull();
  });

  it("renders a description and an action when given both", async () => {
    const onPress = jest.fn();
    await renderEmptyState({
      description: "Choose which publishers' articles you want to see",
      action: { label: "Sources", onPress },
    });

    expect(
      screen.getByText("Choose which publishers' articles you want to see")
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("empty-action"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("labels the action for screen readers", async () => {
    await renderEmptyState({ action: { label: "Sources", onPress: jest.fn() } });

    expect(screen.getByRole("button", { name: "Sources" })).toBeTruthy();
  });
});
