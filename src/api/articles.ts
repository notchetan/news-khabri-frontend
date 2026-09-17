import { apiFetch } from "./client";

export type Article = {
  id: number;
  title: string;
  link: string;
  source: string;
  category: string;
  published_at: string;
  image_url: string | null;
  fetched_at: string;
  language: string;
  // Attached to every /articles result (for the debug ranking pill) -
  // informational only, doesn't affect this endpoint's chronological order.
  ranking_score?: number;
  ranking_freshness?: number;
  ranking_importance?: number;
  ranking_sourceAuthority?: number;
};

export type ArticleDetail = Article & {
  // The RSS summary snippet - the app shows this plus a link to the
  // publisher, rather than the full scraped body (which the backend no
  // longer serves). May be null / light HTML - see utils/strip-html.ts.
  description: string | null;
  image_caption: string | null;
  read_time_minutes: number | null;
  related: Article[];
};

export const ARTICLES_PAGE_SIZE = 20;

export function cursorFor(article: Article): string {
  return `${article.fetched_at}|${article.id}`;
}

export async function fetchArticles(
  language: string,
  category?: string,
  cursor?: string,
  search?: string,
  sources?: string[]
): Promise<Article[]> {
  const params = new URLSearchParams({
    limit: String(ARTICLES_PAGE_SIZE),
    language,
  });
  if (category) params.set("category", category);
  if (cursor) params.set("cursor", cursor);
  if (search) params.set("search", search);
  if (sources && sources.length > 0) params.set("sources", sources.join(","));

  return apiFetch(`/articles?${params}`, {
    errorMessage: "Failed to fetch articles",
  });
}

export async function fetchArticleDetail(id: number): Promise<ArticleDetail> {
  return apiFetch(`/articles/${id}`, { errorMessage: "Failed to fetch article" });
}

export async function fetchCategories(
  language: string,
  sources?: string[]
): Promise<string[]> {
  const params = new URLSearchParams({ language });
  if (sources && sources.length > 0) params.set("sources", sources.join(","));

  return apiFetch(`/categories?${params}`, {
    errorMessage: "Failed to fetch categories",
  });
}

export async function fetchSources(language: string): Promise<string[]> {
  return apiFetch(`/sources?language=${language}`, {
    errorMessage: "Failed to fetch sources",
  });
}
