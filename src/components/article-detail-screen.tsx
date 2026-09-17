import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchArticleDetail } from "@/api/articles";
import { recordRead } from "@/api/reads";
import ArticleImage from "@/components/article-image";
import ErrorState from "@/components/error-state";
import Icon from "@/components/icon";
import FloatingDetailHeader from "@/components/floating-detail-header";
import Squircle from "@/components/squircle";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useBookmarks } from "@/contexts/bookmarks-context";
import { useDetailChrome } from "@/hooks/use-detail-chrome";
import { useSkeletonPulse } from "@/hooks/use-skeleton-pulse";
import { useTheme } from "@/hooks/use-theme";
import { formatPublishedDate } from "@/utils/format-date";
import { articleHref, goBackOr, shareLink } from "@/utils/navigation";
import { stripHtml } from "@/utils/strip-html";
import { useTranslation } from "@/i18n/translations";
import { useQuery } from "@tanstack/react-query";

type Props = {
  basePath: "/article" | "/search/article";
  homePath: "/" | "/search";
};

export default function ArticleDetailScreen({ basePath, homePath }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { token } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [showCaption, setShowCaption] = useState(false);
  const articleId = Number(id);
  const scrollRef = useRef<ScrollView>(null);
  // Continuous scroll-position-driven collapse, not a discrete threshold -
  // see docs/animated-scroll-collapse.md.
  const {
    scrollY,
    setHeaderHeight,
    topPadding,
    contentTopPadding,
    contentBottomPadding,
    handleScroll,
  } = useDetailChrome();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => fetchArticleDetail(articleId),
  });

  useEffect(() => {
    setShowCaption(false);
    scrollY.setValue(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [articleId, scrollY]);

  // Feeds the backend's personalized-ranking signal - see the backend's
  // docs/personalization.md. Fire-and-forget, only while signed in; a
  // failed read-record isn't worth surfacing to the reader (matches
  // auth-context.tsx's own putPreferences swallow-error convention).
  useEffect(() => {
    if (!token) return;
    recordRead(token, articleId).catch(() => {});
  }, [token, articleId]);

  const openOriginal = () => {
    if (data?.link) WebBrowser.openBrowserAsync(data.link);
  };

  const shareArticle = () => {
    if (!data?.link) return;
    shareLink(data.title, data.link);
  };

  const saved = data ? isBookmarked(data.id) : false;
  const toggleSaved = () => {
    if (!data) return;
    toggleBookmark({
      id: data.id,
      title: data.title,
      link: data.link,
      source: data.source,
      category: data.category,
      published_at: data.published_at,
      image_url: data.image_url,
      language: data.language,
    });
  };

  const goBack = () => goBackOr(router, homePath);

  const publishedLabel = data ? formatPublishedDate(data.published_at) : null;
  // The RSS snippet, flattened to plain text - the app summarises and
  // links out rather than reproducing the publisher's full article body.
  const summary = data?.description ? stripHtml(data.description) : "";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FloatingDetailHeader
        scrollY={scrollY}
        topPadding={topPadding}
        onGoBack={goBack}
        onHeaderHeightChange={setHeaderHeight}
      />

      {isLoading ? (
        <ArticleDetailSkeleton
          contentTopPadding={contentTopPadding}
          contentBottomPadding={contentBottomPadding}
        />
      ) : error || !data ? (
        <ErrorState
          testID="article-detail-error"
          message={t("articleLoadError")}
          onRetry={refetch}
        />
      ) : (
        <ScrollView
          ref={scrollRef}
          testID="article-scroll-view"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: contentTopPadding, paddingBottom: contentBottomPadding },
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.heroWrapper}>
            <ArticleImage
              uri={data.image_url}
              category={data.category}
              alt={data.title}
              radius={Radius.large}
            />
            {data.image_caption && !showCaption && (
              <Pressable
                style={styles.infoBadge}
                onPress={() => setShowCaption(true)}
                // 26pt visual + 11 each side = 48, over the hero image.
                hitSlop={11}
                accessibilityRole="button"
                accessibilityLabel={t("showPhotoCredit")}
              >
                <SymbolView
                  name="info"
                  size={14}
                  weight="bold"
                  tintColor="#fff"
                  fallback={<ThemedText style={styles.infoBadgeText}>i</ThemedText>}
                />
              </Pressable>
            )}
            {showCaption && data.image_caption && (
              <Squircle
                radius={Radius.large}
                backgroundColor="rgba(0,0,0,0.72)"
                onPress={() => setShowCaption(false)}
                accessibilityRole="button"
                accessibilityLabel={t("hidePhotoCredit")}
                style={styles.imageCaptionScrim}
              >
                <ThemedText style={styles.imageCaptionText}>
                  {data.image_caption}
                </ThemedText>
              </Squircle>
            )}
          </View>

          <ThemedText
            type="subtitle"
            style={styles.title}
            accessibilityRole="header"
          >
            {data.title}
          </ThemedText>

          <View testID="article-meta-row" style={styles.metaRow}>
            <View testID="article-meta-text-block" style={styles.metaTextBlock}>
              <ThemedText themeColor="textSecondary">
                {data.source}
              </ThemedText>
              {(publishedLabel || data.read_time_minutes) && (
                <ThemedText themeColor="textSecondary">
                  {[
                    publishedLabel,
                    data.read_time_minutes
                      ? t("minReadTemplate", { minutes: String(data.read_time_minutes) })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </ThemedText>
              )}
            </View>

            <View style={styles.metaActions}>
              <TouchableOpacity
                testID="article-bookmark-button"
                onPress={toggleSaved}
                style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
                accessibilityRole="button"
                accessibilityState={{ selected: saved }}
                accessibilityLabel={saved ? t("removeBookmark") : t("save")}
              >
                <Icon
                  sf={saved ? "bookmark.fill" : "bookmark"}
                  ion={saved ? "bookmark" : "bookmark-outline"}
                  size={16}
                  weight="semibold"
                  color={theme.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={shareArticle}
                style={[styles.shareButton, { backgroundColor: theme.backgroundElement }]}
                accessibilityRole="button"
                accessibilityLabel={t("share")}
              >
                <Icon
                  sf="square.and.arrow.up"
                  ion="share-outline"
                  size={16}
                  weight="semibold"
                  color={theme.text}
                />
                <ThemedText style={styles.shareButtonText}>{t("share")}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* ThemedText applies the reader's font scale itself now; this
              used to multiply it here too, which would double-apply. */}
          {summary ? (
            <ThemedText testID="article-summary" style={styles.summary}>
              {summary}
            </ThemedText>
          ) : null}

          <TouchableOpacity
            testID="article-read-original"
            onPress={openOriginal}
            style={[styles.readOriginal, { backgroundColor: theme.tint }]}
            accessibilityRole="link"
            accessibilityLabel={t("readOnTemplate", { source: data.source })}
          >
            <ThemedText style={[styles.readOriginalText, { color: theme.tintText }]}>
              {t("readOnTemplate", { source: data.source })}
            </ThemedText>
          </TouchableOpacity>

          {data.related.length > 0 && (
            <View style={styles.relatedSection}>
              <ThemedText
                type="smallBold"
                style={styles.relatedHeading}
                accessibilityRole="header"
              >
                {t("relatedArticles")}
              </ThemedText>
              {data.related.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.relatedRow, { borderColor: theme.backgroundSelected }]}
                  onPress={() => router.push(articleHref(item.id, basePath))}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}, ${item.source}`}
                >
                  <View style={styles.relatedThumb}>
                    <ArticleImage
                      uri={item.image_url}
                      category={item.category}
                      height={80}
                      alt={item.title}
                      radius={Radius.small}
                    />
                  </View>
                  <View style={styles.relatedTextBlock}>
                    <ThemedText numberOfLines={3} style={styles.relatedTitle}>
                      {item.title}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      {item.source}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ArticleDetailSkeleton({
  contentTopPadding,
  contentBottomPadding,
}: {
  contentTopPadding: number;
  contentBottomPadding: number;
}) {
  const opacity = useSkeletonPulse();
  const theme = useTheme();

  const block = { backgroundColor: theme.backgroundSelected, opacity };
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.scrollContent,
        { paddingTop: contentTopPadding, paddingBottom: contentBottomPadding },
      ]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("loadingArticle")}
    >
      <Animated.View style={[styles.skeletonImage, block]} />
      <Animated.View style={[styles.skeletonLine, block]} />
      <Animated.View style={[styles.skeletonLine, { width: "70%" }, block]} />
      <Animated.View style={[styles.skeletonLineSmall, block]} />
      <Animated.View style={[styles.skeletonLine, { marginTop: Spacing.four }, block]} />
      <Animated.View style={[styles.skeletonLine, block]} />
      <Animated.View style={[styles.skeletonLine, { width: "85%" }, block]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.four },
  heroWrapper: { position: "relative" },
  infoBadge: {
    position: "absolute",
    top: Spacing.two,
    right: Spacing.two,
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontStyle: "italic",
  },
  // borderRadius intentionally omitted - Squircle (see JSX above) handles
  // the corner shape now, matching the hero image's own squircle exactly
  // since this overlays it at the same bounds.
  imageCaptionScrim: {
    ...StyleSheet.absoluteFillObject,
    padding: Spacing.three,
    justifyContent: "center",
  },
  imageCaptionText: { color: "#fff", fontSize: 13, lineHeight: 19 },
  title: { marginTop: Spacing.three },
  // See "Matching story-detail-screen's meta layout" in
  // docs/article-header-layout.md.
  metaActions: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  // minHeight, not a fixed height - matches the bookmark button beside it
  // and clears the 44pt minimum touch target.
  shareButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  shareButtonText: { fontSize: 14, fontWeight: "600" },
  // Icon-only, square-ish - the bookmark toggle sitting left of Share.
  // A 16pt icon with Spacing.two padding came out around 32pt square, under
  // the 44pt minimum. minWidth/minHeight rather than a fixed size so it stays
  // the same visual height as the Share button beside it.
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  // See "Matching story-detail-screen's meta layout" in
  // docs/article-header-layout.md.
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  metaTextBlock: { gap: 2 },
  summary: { marginTop: Spacing.two },
  // The primary action on this screen now - a filled button, since the
  // full article lives on the publisher's site, not here.
  readOriginal: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.full,
    alignItems: "center",
  },
  readOriginalText: { fontSize: 15, fontWeight: "600" },
  relatedSection: { marginTop: Spacing.three },
  relatedHeading: { letterSpacing: 0.5, marginBottom: Spacing.two },
  relatedRow: {
    flexDirection: "row",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
  relatedThumb: { width: 80, height: 80 },
  relatedTextBlock: { flex: 1, justifyContent: "center", gap: 4 },
  relatedTitle: { fontSize: 14, fontWeight: "600" },
  skeletonImage: { width: "100%", height: 220, borderRadius: Radius.large },
  skeletonLine: { height: 18, borderRadius: Radius.tiny, marginTop: Spacing.three },
  skeletonLineSmall: {
    height: 12,
    width: "40%",
    borderRadius: Radius.tiny,
    marginTop: Spacing.two,
  },
});
