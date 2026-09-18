import { act, render, screen } from "@testing-library/react-native";

import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import PrivacyScreen from "../privacy";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

describe("PrivacyScreen", () => {
  it("renders the title and key content without crashing", async () => {
    await act(async () => {
      render(
        <ThemePreferenceProvider>
          <LanguagePreferenceProvider>
            <PrivacyScreen />
          </LanguagePreferenceProvider>
        </ThemePreferenceProvider>
      );
    });

    expect(screen.getByText("Privacy")).toBeTruthy();
    expect(screen.getByText(/IF YOU SIGN IN/)).toBeTruthy();
    expect(screen.getByText(/With\s+Apple, we receive/)).toBeTruthy();
    expect(screen.getByText(/CRASH REPORTS/)).toBeTruthy();
    expect(screen.getByText(/DELETING YOUR ACCOUNT AND DATA/)).toBeTruthy();
    expect(screen.getAllByText(/support@newskhabri\.app/).length).toBeGreaterThan(0);
  });
});
