import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ARTICLES_PAGE_SIZE, fetchArticles, type Article } from "@/api/articles";
import { DebugPreferenceProvider } from "@/contexts/debug-preference";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import {
  SOURCES_STORAGE_KEY,
  SourcesPreferenceProvider,
} from "@/contexts/sources-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import ArticleList from "../article-list";
import { __resetGuardedNavigateForTests } from "@/utils/navigation-guard";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/articles", () => ({
  ...jest.requireActual("@/api/articles"),
  fetchArticles: jest.fn(),
}));

// ArticleList reads the bookmark toggle state per card - stubbed here
// since these assertions are about the list, not bookmarking (see
// bookmarks-context.test.tsx for that).
jest.mock("@/contexts/bookmarks-context", () => ({
  useBookmarks: () => ({
    bookmarks: [],
    isBookmarked: () => false,
    toggleBookmark: jest.fn(),
  }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetchArticles = fetchArticles as jest.Mock;

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

function renderList(props: Partial<React.ComponentProps<typeof ArticleList>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <LanguagePreferenceProvider>
          <SourcesPreferenceProvider>
            <DebugPreferenceProvider>
              <ArticleList basePath="/article" {...props} />
            </DebugPreferenceProvider>
          </SourcesPreferenceProvider>
        </LanguagePreferenceProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

describe("ArticleList", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockFetchArticles.mockResolvedValue([]);
    // FeedCard's onPress goes through guardedNavigate now, a module-scoped
    // real-time cooldown shared across every card - without resetting it,
    // a card press in one test can be silently dropped because a *different*
    // test's own press (in this same file, sharing the same module) landed
    // within the real 800ms cooldown window just before it.
    __resetGuardedNavigateForTests();
  });

  it("shows a loading skeleton, then the article list once articles resolve", async () => {
    // Deferred rather than mockResolvedValue: the skeleton is only
    // observable while the query is genuinely in flight, and an already
    // -resolved promise can settle inside the same act() flush as the
    // render, leaving nothing to assert on.
    let resolveArticles: (articles: Article[]) => void = () => {};
    mockFetchArticles.mockReturnValue(
      new Promise<Article[]>((resolve) => {
        resolveArticles = resolve;
      })
    );

    await act(async () => {
      renderList();
    });

    expect(screen.getByRole("progressbar")).toBeTruthy();

    await act(async () => {
      resolveArticles([
        makeArticle({ id: 1, title: "First article", source: "NDTV" }),
        makeArticle({ id: 2, title: "Second article", source: "Aaj Tak" }),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("First article")).toBeTruthy();
    });
    expect(screen.getByText("Second article")).toBeTruthy();
    expect(screen.getByText("NDTV")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("shows an error message with a working retry when the articles request fails", async () => {
    mockFetchArticles.mockRejectedValueOnce(new Error("network down"));

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong loading articles.")
      ).toBeTruthy();
    });

    // Retry succeeds this time - the list replaces the error state.
    mockFetchArticles.mockResolvedValueOnce([
      {
        id: 1,
        title: "Recovered article",
        link: "https://example.com/1",
        source: "NDTV",
        category: "national",
        published_at: "2026-08-25T12:00:00Z",
        image_url: null,
        fetched_at: "2026-08-25 12:00:00",
        language: "en",
      },
    ]);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Recovered article")).toBeTruthy();
    });
  });

  it("shows a category-browse empty state when there are no matching articles and no search term", async () => {
    mockFetchArticles.mockResolvedValue([]);

    await act(async () => {
      renderList({ category: "business" });
    });

    await waitFor(() => {
      expect(screen.getByText("No articles found.")).toBeTruthy();
    });
  });

  it("shows a search-specific empty state echoing the query, centered, without a trailing full stop", async () => {
    mockFetchArticles.mockResolvedValue([]);

    await act(async () => {
      renderList({ search: "nonexistent" });
    });

    await waitFor(() => {
      expect(screen.getByText("No results found for nonexistent")).toBeTruthy();
    });
    expect(screen.queryByText("No articles found.")).toBeNull();
    expect(screen.getByText("No results found for nonexistent")).toHaveStyle({
      textAlign: "center",
    });
  });

  it("passes category and search through to fetchArticles", async () => {
    await act(async () => {
      renderList({ category: "business", search: "market" });
    });

    await waitFor(() => {
      expect(mockFetchArticles).toHaveBeenCalledWith(
        "en",
        "business",
        undefined,
        "market",
        []
      );
    });
  });

  it("passes the selected sources preference through to fetchArticles", async () => {
    await AsyncStorage.setItem(
      "sourcesPreference",
      JSON.stringify({ en: ["NDTV", "BBC Sport"] })
    );

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(mockFetchArticles).toHaveBeenCalledWith(
        "en",
        undefined,
        undefined,
        undefined,
        ["NDTV", "BBC Sport"]
      );
    });
  });

  it("requests the next page with the last article's cursor when end-reached fires", async () => {
    const firstPage = Array.from({ length: ARTICLES_PAGE_SIZE }, (_, i) =>
      makeArticle({
        id: i + 1,
        title: `Article ${i + 1}`,
        fetched_at: `2026-01-15T18:${String(i).padStart(2, "0")}:00Z`,
      })
    );
    mockFetchArticles.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("Article 1")).toBeTruthy();
    });

    await act(async () => {
      screen.getByTestId("article-list").props.onEndReached();
    });

    await waitFor(() => {
      expect(mockFetchArticles).toHaveBeenCalledTimes(2);
    });
    // The cursor for the next page is derived from the last article of the
    // page just loaded (fetched_at|id).
    expect(mockFetchArticles).toHaveBeenLastCalledWith(
      "en",
      undefined,
      "2026-01-15T18:19:00Z|20",
      undefined,
      []
    );
  });

  it("stops paginating once a page comes back shorter than the page size", async () => {
    const shortPage = [makeArticle({ id: 1, title: "Only article" })];
    mockFetchArticles.mockResolvedValueOnce(shortPage);

    await act(async () => {
      renderList();
    });
    await waitFor(() => {
      expect(screen.getByText("Only article")).toBeTruthy();
    });

    mockFetchArticles.mockClear();
    await act(async () => {
      screen.getByTestId("article-list").props.onEndReached();
    });

    // A short first page means there is no next page - onEndReached should
    // be a no-op rather than requesting more.
    expect(mockFetchArticles).not.toHaveBeenCalled();
  });

  it("navigates to the article detail screen at basePath when a card is tapped", async () => {
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 42, title: "Tap me", source: "NDTV" }),
    ]);

    await act(async () => {
      renderList({ basePath: "/search/article" });
    });

    await waitFor(() => {
      expect(screen.getByText("Tap me")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Tap me, NDTV" }));
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search/article/[id]",
      params: { id: "42" },
    });
  });

  it("shows the ranking score as a debug pill on each card when debug mode is enabled", async () => {
    await AsyncStorage.setItem("debugPreference", "true");
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "An article", ranking_score: 0.734 }),
    ]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByTestId("ranking-debug-pill")).toBeTruthy();
    });
    expect(screen.getByText("0.73")).toBeTruthy();
  });

  it("hides the debug pill when debug mode is off, even with ranking data present", async () => {
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "An article", ranking_score: 0.5 }),
    ]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("An article")).toBeTruthy();
    });
    expect(screen.queryByTestId("ranking-debug-pill")).toBeNull();
  });

  it("hides the debug pill when no ranking data is present, even with debug mode on", async () => {
    await AsyncStorage.setItem("debugPreference", "true");
    mockFetchArticles.mockResolvedValue([
      makeArticle({ id: 1, title: "An article without a score" }),
    ]);

    await act(async () => {
      renderList();
    });

    await waitFor(() => {
      expect(screen.getByText("An article without a score")).toBeTruthy();
    });
    expect(screen.queryByTestId("ranking-debug-pill")).toBeNull();
  });

  // An empty feed is the most reachable empty state in the app - both a
  // category and a source filter can produce one - and it used to be a
  // bare left-aligned line of secondary text with nothing to do about it.
  describe("the empty feed", () => {
    it("offers the way back to Sources when a source filter is active", async () => {
      await AsyncStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify({ en: ["NDTV"] }));

      await act(async () => {
        renderList();
      });

      await waitFor(() => {
        expect(screen.getByText("No articles found.")).toBeTruthy();
      });
      fireEvent.press(screen.getByTestId("article-list-empty-action"));
      expect(mockPush).toHaveBeenCalledWith("/preferences/sources");
    });

    // Pointing at a filter that is not the problem is worse than saying
    // nothing - an empty selection means every source is already on.
    it("offers no source action when nothing is filtered", async () => {
      await act(async () => {
        renderList();
      });

      await waitFor(() => {
        expect(screen.getByText("No articles found.")).toBeTruthy();
      });
      expect(screen.queryByTestId("article-list-empty-action")).toBeNull();
    });

    it("shows the query, and no source action, for a search with no hits", async () => {
      await AsyncStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify({ en: ["NDTV"] }));

      await act(async () => {
        renderList({ search: "kerala" });
      });

      await waitFor(() => {
        expect(screen.getByText("No results found for kerala")).toBeTruthy();
      });
      // The query box is right above it; a Sources detour is the wrong help.
      expect(screen.queryByTestId("article-list-empty-action")).toBeNull();
    });
  });
});
