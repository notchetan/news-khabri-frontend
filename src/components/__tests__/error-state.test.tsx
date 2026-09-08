import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import ErrorState from "@/components/error-state";
import { FontSizePreferenceProvider } from "@/contexts/font-size-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";

jest.mock("@/hooks/use-color-scheme", () => ({ useColorScheme: () => "light" }));

async function renderState(props: React.ComponentProps<typeof ErrorState>) {
  await act(async () => {
    render(
      <ThemePreferenceProvider>
        <FontSizePreferenceProvider>
          <LanguagePreferenceProvider>
            <ErrorState {...props} />
          </LanguagePreferenceProvider>
        </FontSizePreferenceProvider>
      </ThemePreferenceProvider>
    );
  });
}

describe("ErrorState", () => {
  it("renders the message and a retry button that calls onRetry", async () => {
    const onRetry = jest.fn();
    await renderState({ message: "It broke", onRetry, testID: "err" });

    expect(screen.getByText("It broke")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders no button when onRetry is omitted", async () => {
    await renderState({ message: "Nothing to retry" });

    expect(screen.getByText("Nothing to retry")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  // This is the only control on a screen that has already failed, so it is
  // the worst one to have fall under the minimum.
  it("gives the retry button the 44pt touch-target minimum", async () => {
    await renderState({ message: "It broke", onRetry: jest.fn() });

    const button = screen.getByRole("button", { name: "Try again" });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  // It renders through ThemedText now, so the reader's font-size preference
  // reaches it - it is a message to read, not fixed-size chrome.
  it("scales its message with the reader's font-size preference", async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem("fontSizePreference", "large");

    await renderState({ message: "It broke" });

    await waitFor(() => {
      const style = StyleSheet.flatten(screen.getByText("It broke").props.style);
      // large = 1.2, against the 15pt base.
      expect(style.fontSize).toBeCloseTo(15 * 1.2);
    });
  });
});
