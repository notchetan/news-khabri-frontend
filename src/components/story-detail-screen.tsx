import Ionicons from "@expo/vector-icons/Ionicons";
import { recordRead } from "@/api/reads";
import { fetchStoryDetail } from "@/api/stories";
import ArticleImage from "@/components/article-image";
import ErrorState from "@/components/error-state";
import FloatingDetailHeader, {
  getContentTopPadding,
  useHeaderScrollY,
} from "@/components/floating-detail-header";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useSkeletonPulse } from "@/hooks/use-skeleton-pulse";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";
import { formatRelativeTime } from "@/utils/format-date";
import { articleHref } from "@/utils/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Stories only exist under the home tab, so unlike ArticleDetailScreen
// there's nothing to parameterize - these were single-member unions, i.e.
// constants wearing a prop's clothes. Re-add the props if a second story
// surface ever appears.
const ARTICLE_BASE_PATH = "/article" as const;
const HOME_PATH = "/" as const;

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  // Continuous scroll-position-driven collapse - see
  // docs/animated-scroll-collapse.md.
  const scrollY = useHeaderScrollY();
  // Measured height of the floating back/brand pill row - see
  // docs/article-header-layout.md.
  const [headerHeight, setHeaderHeight] = useState(0);

  const storyId = Number(id);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["story", storyId],
    queryFn: () => fetchStoryDetail(storyId),
  });

  const topPadding = Platform.select({
    default: insets.top + Spacing.two,
    web: Spacing.six,
  });
  const contentTopPadding = Platform.select({
    default: getContentTopPadding(headerHeight, topPadding),
    web: Spacing.six,
  });
  const contentBottomPadding = Spacing.three + tabBarInset;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    // false: the animated maxWidth inside FloatingDetailHeader is a layout
    // property the native driver can't animate.
    { useNativeDriver: false }
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(HOME_PATH);
    }
  };

  const updatedLabel = data ? formatRelativeTime(data.latestPublishedAt, t) : null;

  // A story itself has no single canonical URL (it's an aggregate of every
  // member article) - the representative article's own link is the closest
  // real, dereferenceable thing to share, same choice the hero image above
  // already makes for its source.
  const shareStory = async () => {
    const link = data?.representativeArticle?.link;
    if (!data || !link) return;
    try {
      // See ArticleDetailScreen's shareArticle for why Android needs the
      // link folded into `message` rather than passed as `url`.
      await Share.share(
        Platform.OS === "ios"
          ? { title: data.title, url: link }
          : { message: `${data.title}\n${link}` },
        { dialogTitle: data.title }
      );
    } catch {
      // Share sheet dismissed, or unsupported - nothing to recover from.
    }
  };

  // See docs/story-detail-screen.md.
  const isSingleton = data ? data.articleCount <= 1 && data.sourceCount <= 1 : false;
  const representativeArticleId = data?.representativeArticle?.id;
  useEffect(() => {
    if (isSingleton && representativeArticleId != null) {
      router.replace(articleHref(representativeArticleId, ARTICLE_BASE_PATH));
    }
  }, [isSingleton, representativeArticleId, router]);

  // Feeds the backend's personalized-ranking signal via the story's own
  // representative article - see the backend's docs/personalization.md and
  // article-detail-screen.tsx's identical hook for a plain article page.
  // Fire-and-forget, only while signed in.
  useEffect(() => {
    if (!token || representativeArticleId == null) return;
    recordRead(token, representativeArticleId).catch(() => {});
  }, [token, representativeArticleId]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FloatingDetailHeader
        scrollY={scrollY}
        topPadding={topPadding}
        onGoBack={goBack}
        onHeaderHeightChange={setHeaderHeight}
        testIDPrefix="story"
      />

      {isLoading || isSingleton ? (
        <StoryDetailSkeleton headerHeight={headerHeight} topPadding={topPadding} />
      ) : error || !data ? (
        <ErrorState
          testID="story-detail-error"
          message={t("storyLoadError")}
          onRetry={refetch}
        />
      ) : (
        <ScrollView
          testID="story-scroll-view"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: contentTopPadding, paddingBottom: contentBottomPadding },
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <ArticleImage
            uri={data.representativeArticle?.image_url ?? null}
            category={data.category}
            alt={data.title}
            radius={Radius.large}
          />
          <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
            {data.title}
          </ThemedText>

          <View style={styles.metaRow}>
            <View style={styles.metaTextBlock}>
              <ThemedText themeColor="textSecondary" style={styles.meta}>
                {t("storySourcesTemplate", { count: String(data.sourceCount) })}
                {" · "}
                {t("storyArticlesTemplate", { count: String(data.articleCount) })}
              </ThemedText>
              {updatedLabel && (
                <ThemedText themeColor="textSecondary" style={styles.meta}>
                  {t("storyUpdatedTemplate", { time: updatedLabel })}
                </ThemedText>
              )}
            </View>

            <TouchableOpacity
              onPress={shareStory}
              style={[styles.shareButton, { backgroundColor: theme.backgroundElement }]}
              accessibilityRole="button"
              accessibilityLabel={t("share")}
            >
              <SymbolView
                name="square.and.arrow.up"
                size={16}
                weight="semibold"
                tintColor={theme.text}
                fallback={<Ionicons name="share-outline" size={16} color={theme.text} />}
              />
              <ThemedText style={styles.shareButtonText}>{t("share")}</ThemedText>
            </TouchableOpacity>
          </View>
          {data.summary && (
            <ThemedText style={styles.summary}>{data.summary}</ThemedText>
          )}

          <View style={styles.membersSection}>
            <ThemedText
              type="smallBold"
              style={styles.membersHeading}
              accessibilityRole="header"
            >
              {t("storyMembersHeading")}
            </ThemedText>
            {data.members.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[styles.memberRow, { borderColor: theme.backgroundSelected }]}
                onPress={() => router.push(articleHref(member.id, ARTICLE_BASE_PATH))}
                accessibilityRole="button"
                accessibilityLabel={`${member.title}, ${member.source}`}
              >
                <View style={styles.memberThumb}>
                  <ArticleImage
                    uri={member.image_url}
                    category={data.category}
                    height={80}
                    alt={member.title}
                    radius={Radius.small}
                  />
                </View>
                <View style={styles.memberTextBlock}>
                  <ThemedText numberOfLines={3} style={styles.memberTitle}>
                    {member.title}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {member.source}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// Matches article-detail-screen.tsx's ArticleDetailSkeleton (same shimmer,
// same start-below-the-header math) but shaped to this screen's layout:
// hero, title, meta, summary, then a couple of member rows.
function StoryDetailSkeleton({
  headerHeight,
  topPadding,
}: {
  headerHeight: number;
  topPadding: number;
}) {
  const opacity = useSkeletonPulse();
  const theme = useTheme();
  const tabBarInset = useTabBarInset();
  const { t } = useTranslation();
  const contentTopPadding = Platform.select({
    default: getContentTopPadding(headerHeight, topPadding),
    web: Spacing.six,
  });
  const contentBottomPadding = Spacing.three + tabBarInset;

  const block = { backgroundColor: theme.backgroundSelected, opacity };

  return (
    <View
      style={[
        styles.scrollContent,
        { paddingTop: contentTopPadding, paddingBottom: contentBottomPadding },
      ]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("loadingStory")}
    >
      <Animated.View style={[styles.skeletonImage, block]} />
      <Animated.View style={[styles.skeletonLine, block]} />
      <Animated.View style={[styles.skeletonLine, { width: "65%" }, block]} />
      <Animated.View style={[styles.skeletonLineSmall, block]} />
      <Animated.View style={[styles.skeletonLine, { marginTop: Spacing.four }, block]} />
      <Animated.View style={[styles.skeletonLine, { width: "80%" }, block]} />
      {[0, 1].map((i) => (
        <View key={i} style={styles.skeletonMemberRow}>
          <Animated.View style={[styles.skeletonThumb, block]} />
          <View style={styles.skeletonMemberText}>
            <Animated.View style={[styles.skeletonLine, { marginTop: 0 }, block]} />
            <Animated.View style={[styles.skeletonLineSmall, { marginTop: Spacing.two }, block]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.four },
  skeletonImage: { width: "100%", height: 220, borderRadius: Radius.large },
  skeletonLine: { height: 18, borderRadius: Radius.tiny, marginTop: Spacing.three },
  skeletonLineSmall: {
    height: 12,
    width: "40%",
    borderRadius: Radius.tiny,
    marginTop: Spacing.two,
  },
  skeletonMemberRow: {
    flexDirection: "row",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  skeletonThumb: { width: 80, height: 80, borderRadius: Radius.medium },
  skeletonMemberText: { flex: 1, justifyContent: "center" },
  title: { marginTop: Spacing.three },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.one,
  },
  metaTextBlock: { gap: 2 },
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
  meta: {},
  summary: { marginTop: Spacing.three },
  membersSection: { marginTop: Spacing.five },
  membersHeading: { letterSpacing: 0.5, marginBottom: Spacing.two },
  memberRow: {
    flexDirection: "row",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
  },
  memberThumb: { width: 80, height: 80 },
  memberTextBlock: { flex: 1, justifyContent: "center", gap: 4 },
  memberTitle: { fontSize: 14, fontWeight: "600" },
});
