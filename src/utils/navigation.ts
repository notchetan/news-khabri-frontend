import type { Href, useRouter } from "expo-router";
import { Platform, Share } from "react-native";

// Typed-route Href builders for the article/story destinations. The screens
// that navigate here take basePath as a narrow literal-union prop (a
// home-tab vs. search-tab copy of the same screen renders under a different
// segment), so branching on the literal keeps every result inside
// expo-router's typed Href union - no `(router.push as any)` +
// eslint-disable at the call sites, which is what this used to be
// everywhere.
export type ArticleBasePath = "/article" | "/search/article";

export function articleHref(
  id: number | string,
  basePath: ArticleBasePath = "/article"
): Href {
  const params = { id: String(id) };
  return basePath === "/search/article"
    ? { pathname: "/search/article/[id]", params }
    : { pathname: "/article/[id]", params };
}

export function storyHref(id: number | string): Href {
  return { pathname: "/story/[id]", params: { id: String(id) } };
}

// router.back() warns/no-ops when a screen has no prior route to pop - e.g.
// opened via a direct link, or a notification tap, which drops the stack
// down to just that screen. Every screen with its own back affordance needs
// a root of its own stack to fall back to instead; `fallback` is that root.
export function goBackOr(
  router: ReturnType<typeof useRouter>,
  fallback: Href
): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

// Android's share sheet only reads `message` - `url` is silently dropped
// there, so the link has to be folded into the message text to actually
// reach the target app. iOS handles `url` as its own field, so it stays
// split there. A dismissed or unsupported sheet throws; nothing to recover
// from, so it's swallowed.
export async function shareLink(title: string, url: string): Promise<void> {
  try {
    await Share.share(
      Platform.OS === "ios" ? { title, url } : { message: `${title}\n${url}` },
      { dialogTitle: title }
    );
  } catch {
    // Dismissed or unsupported - no-op.
  }
}
