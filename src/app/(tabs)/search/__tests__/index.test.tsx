import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { Platform, TextInput } from "react-native";

import { fetchArticles, fetchCategories, type Article } from "@/api/articles";
import { AuthProvider } from "@/contexts/auth-context";
import { BookmarksProvider } from "@/contexts/bookmarks-context";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { SourcesPreferenceProvider } from "@/contexts/sources-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import SearchScreen from "../index";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/articles", () => ({
  ...jest.requireActual("@/api/articles"),
  fetchArticles: jest.fn(),
  fetchCategories: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("@/contexts/toast-context", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
}));

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => ({ push: mockPush }),
    // The real one needs a navigation/route context this standalone-render
    // test doesn't set up - simulate "already focused on mount" via a plain
    // useEffect instead, which (like the real thing) only runs after the
    // ref has attached - unlike calling the effect inline during render.
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/api/auth", () => ({
  fetchMe: jest.fn(),
  signInWithGoogle: jest.fn(),
  putPreferences: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockFetchArticles = fetchArticles as jest.Mock;
const mockFetchCategories = fetchCategories as jest.Mock;

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 1,
    title: "Test article title",
    link: "https://example.com/1",
    source: "Test Source",
    category: "national",
    published_at: "2026-01-15T18:30:00Z",
    image_url: null,
    fetched_at: "2026-01-15T18:31:00Z",
    language: "en",
    ...overrides,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <SourcesPreferenceProvider>
            <DebugPreferenceProvider>
              <AuthProvider>
                <BookmarksProvider>
                  <SearchScreen />
                </BookmarksProvider>
              </AuthProvider>
            </DebugPreferenceProvider>
          </SourcesPreferenceProvider>
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

describe("SearchScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockFetchCategories.mockResolvedValue(["national", "business"]);
    mockFetchArticles.mockResolvedValue([]);
  });

  it("focuses the search input as soon as the tab gains focus", async () => {
    const focusSpy = jest.spyOn(TextInput.prototype, "focus");

    await act(async () => {
      renderScreen();
    });

    expect(focusSpy).toHaveBeenCalled();
  });

  it("shows 'Explore' at the top, via the shared AppHeader", async () => {
    await act(async () => {
      renderScreen();
    });

    expect(screen.getByText("Explore")).toBeTruthy();
  });

  it("renders a category grid by default (empty search)", async () => {
    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "National" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
    expect(screen.getByTestId("category-grid")).toBeTruthy();
  });

  it("renders every category as its own tappable card even with an odd count (no dropped/merged last item)", async () => {
    mockFetchCategories.mockResolvedValue(["national", "business", "sports"]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sports" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "National" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
  });

  it("translates known category values into the currently active language", async () => {
    await AsyncStorage.setItem("languagePreference", "hi");
    mockFetchCategories.mockResolvedValue(["business", "sports"]);

    await act(async () => {
      renderScreen();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "बिजनेस" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "स्पोर्ट्स" })).toBeTruthy();
  });

  it("navigates to the category results screen when a card is tapped", async () => {
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Business" })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole("button", { name: "Business" }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search/category/[category]",
      params: { category: "business" },
    });
  });

  it("does not search immediately on every keystroke (debounced)", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.changeText(
        screen.getByLabelText("Search articles"),
        "election"
      );
    });
    // Immediately after typing, still within the debounce window - no
    // search request yet.
    expect(mockFetchArticles).not.toHaveBeenCalledWith(
      "en",
      undefined,
      undefined,
      "election",
      []
    );

    await waitFor(
      () => {
        expect(mockFetchArticles).toHaveBeenCalledWith(
          "en",
          undefined,
          undefined,
          "election",
          []
        );
      },
      { timeout: 2000 }
    );
  });

  it("does not search below the 2-character minimum, even after the debounce window", async () => {
    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "e");
    });

    // Give the debounce timer plenty of time to fire - a 1-character query
    // should never reach fetchArticles, and the category grid should stay put.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
    expect(mockFetchArticles).not.toHaveBeenCalled();
    expect(screen.getByTestId("category-grid")).toBeTruthy();
  });

  it("searches once the query reaches the 2-character minimum", async () => {
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "US elections" }),
    ]);

    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "us");
    });

    await waitFor(
      () => {
        expect(mockFetchArticles).toHaveBeenCalledWith(
          "en",
          undefined,
          undefined,
          "us",
          []
        );
      },
      { timeout: 2000 }
    );
  });

  it("shows the ranking debug pill on a search result when debug mode is on", async () => {
    await AsyncStorage.setItem("debugPreference", "true");
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "Election results in", ranking_score: 0.45 }),
    ]);

    await act(async () => {
      renderScreen();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "election");
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("ranking-debug-pill")).toBeTruthy();
      },
      { timeout: 2000 }
    );
    expect(screen.getByText("0.45")).toBeTruthy();
  });

  it("swaps the category grid for search results once debounced text is present, and back once cleared", async () => {
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "Election results in" }),
    ]);
    await act(async () => {
      renderScreen();
    });
    await waitFor(() => {
      expect(screen.getByTestId("category-grid")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "election");
    });

    await waitFor(
      () => {
        expect(screen.getByText("Election results in")).toBeTruthy();
      },
      { timeout: 2000 }
    );
    expect(screen.queryByTestId("category-grid")).toBeNull();

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText("Search articles"), "");
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("category-grid")).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });

  // Abandoning a query otherwise means holding backspace.
  describe("clearing the query", () => {
    const originalOS = Platform.OS;

    afterEach(() => {
      Platform.OS = originalOS;
    });

    it("uses the iOS system clear button rather than a custom one", async () => {
      Platform.OS = "ios";
      await act(async () => {
        renderScreen();
      });

      const input = screen.getByTestId("search-input");
      expect(input.props.clearButtonMode).toBe("while-editing");

      await act(async () => {
        fireEvent.changeText(input, "kerala");
      });
      // The system control is drawn natively; there is no view of ours.
      expect(screen.queryByTestId("search-clear-button")).toBeNull();
    });

    it("renders its own clear button on Android, which empties the field", async () => {
      Platform.OS = "android";
      await act(async () => {
        renderScreen();
      });

      const input = screen.getByTestId("search-input");
      expect(screen.queryByTestId("search-clear-button")).toBeNull();

      await act(async () => {
        fireEvent.changeText(input, "kerala");
      });
      const clear = screen.getByTestId("search-clear-button");
      expect(clear).toHaveProp("accessibilityLabel", "Clear search");

      await act(async () => {
        fireEvent.press(clear);
      });
      expect(screen.getByTestId("search-input").props.value).toBe("");
      expect(screen.queryByTestId("search-clear-button")).toBeNull();
    });
  });
});
