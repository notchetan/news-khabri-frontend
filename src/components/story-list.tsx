import { fetchStoryFeed, STORIES_PAGE_SIZE, STORY_FEED_MAX_LIMIT } from "@/api/stories";
import ArticleListSkeleton from "@/components/article-list-skeleton";
import EmptyState from "@/components/empty-state";
import ErrorState from "@/components/error-state";
import FeedCard from "@/components/feed-card";
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useBookmarks } from "@/contexts/bookmarks-context";
import { useDebugPreference } from "@/contexts/debug-preference";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useSourcesPreference } from "@/contexts/sources-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { formatRelativeTime } from "@/utils/format-date";
import { articleHref, storyHref } from "@/utils/navigation";

type Props = {
  category?: string;
};

// One card per story cluster instead of one per article - a deliberately
// separate component from ArticleList rather than a third mode bolted onto
// it: the data shape (sourceCount/articleCount/representativeArticle), the
// pagination strategy (growing-limit only, no cursor mode), and the tap
// target (a story detail screen, not the article detail screen) all differ
// enough that sharing ArticleList's already-dual-mode logic would only add
// confusion.
export default function StoryList({ category }: Props) {
  const { language } = useLanguagePreference();
  const { selectedSources } = useSourcesPreference();
  // An empty selection is the canonical "every source" state (see
  // sources-preference.tsx), so only a non-empty one can be hiding things.
  const hasSourceFilter = selectedSources.length > 0;
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { debugEnabled } = useDebugPreference();
  const { token } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [category, selectedSources]);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    // Whether we're signed in is part of the key so signing in/out refetches
    // with (or without) the personalization signal, rather than serving a
    // cached page computed under the other auth state. A boolean, not the
    // token itself - the key does the same job either way, and the JWT has
    // no business sitting in every cache key and devtools dump.
    queryKey: ["storyFeed", language, category, selectedSources, !!token],
    queryFn: ({ pageParam }) =>
      fetchStoryFeed(language, category, pageParam as number, selectedSources, token),
    initialPageParam: STORIES_PAGE_SIZE,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const requested = typeof lastPageParam === "number" ? lastPageParam : STORIES_PAGE_SIZE;
      if (lastPage.length < requested || requested >= STORY_FEED_MAX_LIMIT) return undefined;
      return requested + STORIES_PAGE_SIZE;
    },
    placeholderData: keepPreviousData,
  });

  // Memoized on the pages for the same reason ArticleList's is: the
  // growing-limit pagination genuinely re-sends earlier stories, so the
  // dedupe has to stay - but without useMemo it rebuilt the Set and a new
  // array reference on every render, changing FlatList's `data` identity
  // and re-rendering the whole list.
  const stories = useMemo(() => {
    const seenIds = new Set<number>();
    return (data?.pages.flat() ?? []).filter((story) => {
      if (seenIds.has(story.id)) return false;
      seenIds.add(story.id);
      return true;
    });
  }, [data?.pages]);

  if (isLoading) return <ArticleListSkeleton />;

  if (error) {
    return (
      <ErrorState
        testID="story-list-error"
        message={t("storiesLoadError")}
        onRetry={refetch}
      />
    );
  }

  return (
    <FlatList
      ref={listRef}
      testID="story-list"
      data={stories}
      keyExtractor={(item) => item.id.toString()}
      onRefresh={refetch}
      refreshing={isRefetching}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          testID="story-list-empty"
          symbolName="newspaper"
          ioniconName="newspaper-outline"
          title={t("noStoriesFound")}
          // See ArticleList's own note: only offered when a source filter
          // is actually what could be emptying the feed.
          description={hasSourceFilter ? t("sourcesDescription") : undefined}
          action={
            hasSourceFilter
              ? { label: t("sources"), onPress: () => router.push("/preferences/sources") }
              : undefined
          }
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} accessibilityLabel={t("loadingMore")} />
        ) : null
      }
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const updatedLabel = formatRelativeTime(item.latestPublishedAt, t);
        // Renders/navigates like a plain ArticleList card for a singleton
        // story - see docs/story-detail-screen.md.
        const isSingleton = item.articleCount <= 1 && item.sourceCount <= 1;
        const metaText = isSingleton
          ? [item.representativeArticle?.source, updatedLabel].filter(Boolean).join(" · ")
          : [
              t("storySourcesTemplate", { count: String(item.sourceCount) }),
              t("storyArticlesTemplate", { count: String(item.articleCount) }),
              ...(updatedLabel ? [t("storyUpdatedTemplate", { time: updatedLabel })] : []),
            ].join(" · ");

        const rep = item.representativeArticle;
        const repSaved = rep ? isBookmarked(rep.id) : false;

        return (
          <FeedCard
            title={item.title}
            metaText={metaText}
            imageUrl={item.representativeArticle?.image_url ?? null}
            category={item.category}
            accessibilityLabel={`${item.title}, ${metaText}`}
            debugScore={debugEnabled ? item.storyScore : undefined}
            debugTestID="story-debug-pill"
            bookmarked={repSaved}
            bookmarkAccessibilityLabel={repSaved ? t("removeBookmark") : t("save")}
            // Bookmarks are per-article; a story card saves its own
            // representative article. Hidden when there isn't one.
            onToggleBookmark={
              rep
                ? () =>
                    toggleBookmark({
                      id: rep.id,
                      title: rep.title,
                      link: rep.link,
                      source: rep.source,
                      category: item.category,
                      published_at: rep.published_at,
                      image_url: rep.image_url,
                      language: item.language,
                    })
                : undefined
            }
            onPress={() => {
              if (isSingleton && item.representativeArticle) {
                router.push(articleHref(item.representativeArticle.id));
              } else {
                router.push(storyHref(item.id));
              }
            }}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  footer: { paddingVertical: Spacing.four },
  listContent: { padding: Spacing.three, gap: Spacing.three },
});
