import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { LANGUAGE_OPTIONS } from "@/constants/languages";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import { OnboardingLanguagePicker } from "../onboarding-language-picker";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

function renderPicker() {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>
        <OnboardingLanguagePicker />
      </LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("OnboardingLanguagePicker", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("shows the current language and no expanded list by default", async () => {
    await act(async () => {
      renderPicker();
    });

    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.queryByText("हिंदी")).toBeNull();
  });

  it("expands the full language list when the pill is pressed", async () => {
    await act(async () => {
      renderPicker();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Language" }));
    });

    expect(screen.getByText("हिंदी")).toBeTruthy();
    expect(screen.getByText("ગુજરાતી")).toBeTruthy();
  });

  it("selecting a language persists it, updates the pill, and collapses the list", async () => {
    await act(async () => {
      renderPicker();
    });
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Language" }));
    });

    await act(async () => {
      fireEvent.press(screen.getByText("हिंदी"));
    });

    expect(screen.getAllByText("हिंदी")).toHaveLength(1);
    expect(screen.queryByText("ગુજરાતી")).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await AsyncStorage.getItem("languagePreference")).toBe("hi");
  });

  // These rows sit flush against each other with no gap, so a row under the
  // 44pt minimum doesn't just miss - it selects the neighbouring language.
  it("gives every language row at least the 44pt touch-target minimum", async () => {
    await act(async () => {
      renderPicker();
    });
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Language" }));
    });

    for (const option of LANGUAGE_OPTIONS) {
      const row = screen.getByTestId(`onboarding-language-option-${option.value}`);
      const style = StyleSheet.flatten(row.props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});
