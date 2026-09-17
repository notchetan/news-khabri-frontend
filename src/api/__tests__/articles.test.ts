import {
  ARTICLES_PAGE_SIZE,
  cursorFor,
  fetchArticleDetail,
  fetchArticles,
  fetchCategories,
  type Article,
} from "../articles";

const mockArticle: Article = {
  id: 1,
  title: "Test title",
  link: "https://example.com/1",
  source: "Test Source",
  category: "national",
  published_at: "2026-01-15T18:30:00Z",
  image_url: "https://example.com/1.jpg",
  fetched_at: "2026-01-15T18:31:00Z",
  language: "en",
};

function mockFetchOnce(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("cursorFor", () => {
  it("joins fetched_at and id with a pipe", () => {
    expect(cursorFor(mockArticle)).toBe("2026-01-15T18:31:00Z|1");
  });
});

describe("fetchArticles", () => {
  it("requests the articles endpoint with language and page size", async () => {
    mockFetchOnce([mockArticle]);

    const result = await fetchArticles("en");

    expect(result).toEqual([mockArticle]);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/articles?");
    expect(calledUrl).toContain(`limit=${ARTICLES_PAGE_SIZE}`);
    expect(calledUrl).toContain("language=en");
    expect(calledUrl).not.toContain("category=");
    expect(calledUrl).not.toContain("cursor=");
  });

  it("includes category and cursor params when provided", async () => {
    mockFetchOnce([mockArticle]);

    await fetchArticles("hi", "business", "2026-01-15T18:31:00Z|1");

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("language=hi");
    expect(calledUrl).toContain("category=business");
    expect(calledUrl).toContain(
      `cursor=${encodeURIComponent("2026-01-15T18:31:00Z|1")}`
    );
  });

  it("includes the search param when provided", async () => {
    mockFetchOnce([mockArticle]);

    await fetchArticles("en", undefined, undefined, "election");

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("search=election");
    expect(calledUrl).not.toContain("category=");
    expect(calledUrl).not.toContain("cursor=");
  });

  it("includes a joined sources param when a non-empty list is provided", async () => {
    mockFetchOnce([mockArticle]);

    await fetchArticles("en", undefined, undefined, undefined, ["NDTV", "BBC Sport"]);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    // URLSearchParams itself encodes a space as "+", not "%20" -
    // encodeURIComponent's own escaping doesn't match what's actually sent.
    expect(calledUrl).toContain("sources=NDTV%2CBBC+Sport");
  });

  it("omits the sources param entirely when the list is empty", async () => {
    mockFetchOnce([mockArticle]);

    await fetchArticles("en", undefined, undefined, undefined, []);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("sources=");
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce([], false);

    await expect(fetchArticles("en")).rejects.toThrow(
      "Failed to fetch articles"
    );
  });
});

describe("fetchArticleDetail", () => {
  it("requests the article detail endpoint by id", async () => {
    const detail = { ...mockArticle, content: "<p>Body</p>", image_caption: null, related: [] };
    mockFetchOnce(detail);

    const result = await fetchArticleDetail(1);

    expect(result).toEqual(detail);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/articles/1"),
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce(null, false);

    await expect(fetchArticleDetail(999)).rejects.toThrow(
      "Failed to fetch article"
    );
  });
});

describe("fetchCategories", () => {
  it("requests categories filtered by language", async () => {
    mockFetchOnce(["national", "business"]);

    const result = await fetchCategories("en");

    expect(result).toEqual(["national", "business"]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/categories?language=en"),
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it("throws when the response is not ok", async () => {
    mockFetchOnce([], false);

    await expect(fetchCategories("en")).rejects.toThrow(
      "Failed to fetch categories"
    );
  });
});

