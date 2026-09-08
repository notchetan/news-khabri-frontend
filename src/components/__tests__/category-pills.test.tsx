import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ScrollView, StyleSheet } from "react-native";

import { Colors } from "@/constants/theme";
import { LanguagePreferenceProvider } from "@/contexts/language-preference";
import { ThemePreferenceProvider } from "@/contexts/theme-preference";
import CategoryPills from "../category-pills";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemePreferenceProvider>
      <LanguagePreferenceProvider>{ui}</LanguagePreferenceProvider>
    </ThemePreferenceProvider>
  );
}

describe("CategoryPills", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("renders a pill for every category", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Sports")).toBeTruthy();
    expect(screen.getByText("Business")).toBeTruthy();
  });

  it("marks the selected pill via accessibilityState", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports"]}
        selected="Sports"
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Sports" })).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ selected: true })
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveProp(
      "accessibilityState",
      expect.objectContaining({ selected: false })
    );
  });

  it("calls onSelect with the tapped category", async () => {
    const onSelect = jest.fn();
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={onSelect}
      />
    );

    fireEvent.press(screen.getByText("Business"));

    expect(onSelect).toHaveBeenCalledWith("Business");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders nothing but the container when given an empty category list", async () => {
    await renderWithTheme(
      <CategoryPills categories={[]} selected="All" onSelect={jest.fn()} />
    );

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders only the pinned pill and no divider when there is just one category", async () => {
    await renderWithTheme(
      <CategoryPills categories={["All"]} selected="All" onSelect={jest.fn()} />
    );

    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.queryByTestId("category-pills-scroll-view")).toBeNull();
  });

  it("disables the native scroll bounce/overscroll, so a fast fling can't oscillate the pinned pill's collapse", async () => {
    // Regression test: the pinned pill's collapse is driven by real
    // contentOffset.x over a fixed distance, regardless of how much is
    // actually scrollable. For a short category list (e.g. Marathi's 4
    // categories), a fast fling's native rubber-band bounce can overshoot
    // past the real end and spring back several times before settling,
    // sweeping contentOffset.x back through that whole collapse range each
    // cycle - visibly jittering the pill's width/text. Not reproducible in
    // jest (no real scroll-bounce physics here), so this only asserts the
    // fix itself: bounce/overscroll is turned off at the source, which
    // removes the oscillating input regardless of list length.
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );

    const scrollView = screen.getByTestId("category-pills-scroll-view");
    expect(scrollView).toHaveProp("bounces", false);
    expect(scrollView).toHaveProp("overScrollMode", "never");
  });

  it("does not show the scroll-back arrow before the list has been scrolled", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Scroll back to first category" })
    ).toBeNull();
  });

  it("shows a scroll-back arrow once the category strip is scrolled, and it scrolls back to the start when pressed", async () => {
    const scrollToSpy = jest
      .spyOn(ScrollView.prototype, "scrollTo")
      .mockImplementation(() => {});

    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );
    const scrollView = screen.getByTestId("category-pills-scroll-view");

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 50 } } });
    });

    const backArrow = screen.getByRole("button", {
      name: "Scroll back to first category",
    });
    expect(backArrow).toBeTruthy();

    fireEvent.press(backArrow);
    expect(scrollToSpy).toHaveBeenCalledWith({ x: 0, animated: true });

    scrollToSpy.mockRestore();
  });

  it("hides the scroll-back arrow again once scrolled back near the start", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );
    const scrollView = screen.getByTestId("category-pills-scroll-view");

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 50 } } });
    });
    expect(
      screen.getByRole("button", { name: "Scroll back to first category" })
    ).toBeTruthy();

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 0 } } });
    });
    expect(
      screen.queryByRole("button", { name: "Scroll back to first category" })
    ).toBeNull();
  });

  it("hides the divider once scrolled (the back arrow already separates the pinned pill), and restores it when scrolled back", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );
    const scrollView = screen.getByTestId("category-pills-scroll-view");

    expect(screen.getByTestId("category-pills-divider")).toBeTruthy();

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 50 } } });
    });
    expect(screen.queryByTestId("category-pills-divider")).toBeNull();

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 0 } } });
    });
    expect(screen.getByTestId("category-pills-divider")).toBeTruthy();
  });

  it("keeps the divider/back-arrow slot's own width fixed across the swap, so the scroll strip after it never jumps sideways", async () => {
    // Regression test: the divider (2px wide) and the back arrow (a wider
    // icon) used to each be a bare flex item, so swapping between them
    // changed the row's total width and visibly shifted everything after
    // it. Both now live inside one fixed-width slot instead.
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );
    const scrollView = screen.getByTestId("category-pills-scroll-view");
    const slot = screen.getByTestId("category-pills-divider-slot");
    // Asserts the width stays constant rather than hardcoding its exact
    // value, which has already been tuned once (20 -> 14) for visual
    // density and may well change again - that tuning isn't what this test
    // is protecting.
    const initialWidth = StyleSheet.flatten(slot.props.style).width;

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 50 } } });
    });
    expect(slot).toHaveStyle({ width: initialWidth });

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 0 } } });
    });
    expect(slot).toHaveStyle({ width: initialWidth });
  });

  // The separation around the divider used to come from row's own gap (10)
  // with a 14pt slot between. It now comes from the slot's own width, which
  // has to be a real touch target for the back arrow that shares it - RN
  // does not dispatch touches outside a parent's bounds, so no amount of
  // hitSlop could widen a 14pt slot. Everything in the slot is centred, so
  // moving the space from the gap into the width leaves the divider in
  // very nearly the same place.
  it("sizes the divider/back-arrow slot as a real touch target, with the row's gap folded into it", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );

    const slotWidth = StyleSheet.flatten(
      screen.getByTestId("category-pills-divider-slot").props.style
    ).width;
    const rowGap = StyleSheet.flatten(
      screen.getByTestId("category-pills-row").props.style
    ).gap;

    expect(slotWidth).toBeGreaterThanOrEqual(44);
    expect(rowGap).toBe(0);
    // Still independent of the gap between scrollable pills, which is the
    // point of keeping three separate constants.
    expect(rowGap).not.toBe(14);
  });

  it("makes the whole slot tappable, not just the chevron's own ink", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );
    const scrollView = screen.getByTestId("category-pills-scroll-view");

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 50 } } });
    });

    const arrow = StyleSheet.flatten(
      screen.getByTestId("category-pills-back-arrow").props.style
    );
    expect(arrow.flex).toBe(1);
    expect(arrow.alignSelf).toBe("stretch");
  });

  it("colors the divider from the current theme's own secondary text color in light mode, matching the back arrow it shares a slot with", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );

    // Matches the back arrow's own icon color (textSecondary), not the
    // primary text color, so the divider and the back arrow - which share
    // the exact same slot at different scroll positions - read as one
    // consistent element rather than two different colors. Still the
    // *current* scheme's own token (not the other scheme's, as this once
    // mistakenly used), so it stays guaranteed to contrast against its own
    // background either way.
    expect(screen.getByTestId("category-pills-divider")).toHaveStyle({
      backgroundColor: Colors.light.textSecondary,
    });
  });

  it("colors the divider from the current theme's own secondary text color in dark mode", async () => {
    await AsyncStorage.setItem("themePreference", "night");

    await renderWithTheme(
      <CategoryPills
        categories={["All", "Sports", "Business"]}
        selected="All"
        onSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("category-pills-divider")).toHaveStyle({
        backgroundColor: Colors.dark.textSecondary,
      });
    });
  });

  it("keeps the pinned pill's full label when no collapsed label is given, even once scrolled", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["Top Stories", "Sports", "Business"]}
        selected="Top Stories"
        onSelect={jest.fn()}
      />
    );
    const scrollView = screen.getByTestId("category-pills-scroll-view");

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 50 } } });
    });

    expect(screen.getByText("Top Stories")).toBeTruthy();
  });

  it("swaps the pinned pill's label almost instantly at the very start of scroll, well before the width finishes shrinking", async () => {
    // Regression test: the text used to cross-fade across the *same*
    // distance the width shrinks over (PINNED_PILL_COLLAPSE_DISTANCE, 60),
    // so during a slow scroll the box sat at some in-between width while
    // both labels were partway visible - neither one actually fit that
    // width, so they visibly overlapped. The swap now happens over a
    // near-zero distance instead, so it's effectively done well before the
    // width has shrunk much at all.
    await renderWithTheme(
      <CategoryPills
        categories={["Top Stories", "Sports", "Business"]}
        selected="Top Stories"
        onSelect={jest.fn()}
        pinnedCollapsedLabel="Top"
      />
    );
    const scrollView = screen.getByTestId("category-pills-scroll-view");
    // Both labels are always mounted (see PinnedPill in category-pills.tsx)
    // and swap via opacity rather than one replacing the other, so
    // presence/absence assertions don't apply here - opacity does.
    const fullText = screen.getByTestId("pinned-pill-full-text");
    const collapsedText = screen.getByTestId("pinned-pill-collapsed-text");

    expect(fullText).toHaveStyle({ opacity: 1 });
    expect(collapsedText).toHaveStyle({ opacity: 0 });

    // A small scroll, well short of PINNED_PILL_COLLAPSE_DISTANCE (60) -
    // the width is still mostly full at this point, but the label should
    // already have swapped entirely.
    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 5 } } });
    });
    expect(fullText).toHaveStyle({ opacity: 0 });
    expect(collapsedText).toHaveStyle({ opacity: 1 });

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 60 } } });
    });
    expect(fullText).toHaveStyle({ opacity: 0 });
    expect(collapsedText).toHaveStyle({ opacity: 1 });

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 0 } } });
    });
    expect(fullText).toHaveStyle({ opacity: 1 });
    expect(collapsedText).toHaveStyle({ opacity: 0 });
  });

  it("measures the full and collapsed labels independently, and shrinks the pill's real width in step with scroll", async () => {
    // Regression test (two prior bugs): the first version's two probes sat
    // in a column with default alignItems:"stretch", which silently forced
    // both onLayout calls to report the *same* number instead of each
    // label's own true width - so the pill was stuck at one size,
    // throughout, even before any scroll. A second attempt (wrongly)
    // dropped the width measurement/animation entirely to sidestep that,
    // which fixed the stuck-size bug but regressed the shrink transition
    // itself - the pill stopped resizing at all. This test locks in both:
    // the two probes must report *different* widths (not stretched
    // together), and the pinned pill's actual rendered width must move
    // between them as scrollX changes.
    await renderWithTheme(
      <CategoryPills
        categories={["Top Stories", "Sports", "Business"]}
        selected="Top Stories"
        onSelect={jest.fn()}
        pinnedCollapsedLabel="Top"
      />
    );
    const fullProbe = screen.getByTestId("pinned-pill-full-measure");
    const collapsedProbe = screen.getByTestId("pinned-pill-collapsed-measure");
    const pill = screen.getByTestId("pinned-pill");
    const scrollView = screen.getByTestId("category-pills-scroll-view");

    await act(async () => {
      fireEvent(fullProbe, "layout", { nativeEvent: { layout: { width: 96, height: 36 } } });
    });
    await act(async () => {
      fireEvent(collapsedProbe, "layout", { nativeEvent: { layout: { width: 52, height: 36 } } });
    });

    expect(pill).toHaveStyle({ width: 96 });

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 60 } } });
    });
    expect(pill).toHaveStyle({ width: 52 });

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 0 } } });
    });
    expect(pill).toHaveStyle({ width: 96 });
  });

  it("still reports the pinned pill's full name as its accessibility label once visually collapsed", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["Top Stories", "Sports", "Business"]}
        selected="Top Stories"
        onSelect={jest.fn()}
        pinnedCollapsedLabel="Top"
      />
    );
    const scrollView = screen.getByTestId("category-pills-scroll-view");

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 50 } } });
    });

    expect(screen.getByRole("button", { name: "Top Stories" })).toBeTruthy();
  });

  it("still calls onSelect with the real pinned category value, not the collapsed label", async () => {
    const onSelect = jest.fn();
    await renderWithTheme(
      <CategoryPills
        categories={["Top Stories", "Sports", "Business"]}
        selected="Sports"
        onSelect={onSelect}
        pinnedCollapsedLabel="Top"
      />
    );
    const scrollView = screen.getByTestId("category-pills-scroll-view");

    await act(async () => {
      fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 50 } } });
    });

    // Both the collapsed overlay label and its own width-measure probe
    // render "Top" text now, so press by accessible name (always the full
    // label, per PinnedPill's own accessibilityLabel) rather than by text.
    fireEvent.press(screen.getByRole("button", { name: "Top Stories" }));
    expect(onSelect).toHaveBeenCalledWith("Top Stories");
  });

  // Both pill kinds previously left the tappable box smaller than the
  // capsule it sat in. The pinned one was the worse of the two: with the
  // collapse animation both labels are position: absolute, so its
  // touchable had no in-flow content and shrank to its own padding.
  it("gives the scrollable pills the 44pt touch-target minimum", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["Top Stories", "Sports", "Business"]}
        selected="Top Stories"
        onSelect={jest.fn()}
      />
    );

    for (const category of ["Sports", "Business"]) {
      const pill = screen.getByTestId(`category-pill-${category}`);
      expect(StyleSheet.flatten(pill.props.style).minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it("gives the pinned pill's touchable the 44pt minimum, not just its capsule", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["Top Stories", "Sports"]}
        selected="Top Stories"
        onSelect={jest.fn()}
        pinnedCollapsedLabel="Top"
      />
    );

    const touchable = screen.getByTestId("pinned-pill-touchable");
    expect(StyleSheet.flatten(touchable.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  // A 44pt pill plus the scroll container's own vertical padding has to fit
  // inside the row, or the taller pills are clipped by it.
  it("keeps the pills inside the row's fixed height", async () => {
    await renderWithTheme(
      <CategoryPills
        categories={["Top Stories", "Sports"]}
        selected="Top Stories"
        onSelect={jest.fn()}
      />
    );

    const row = StyleSheet.flatten(screen.getByTestId("category-pills-row").props.style);
    const content = StyleSheet.flatten(
      screen.getByTestId("category-pills-scroll-view").props.contentContainerStyle
    );
    const pill = StyleSheet.flatten(
      screen.getByTestId("category-pill-Sports").props.style
    );

    expect(pill.minHeight + content.paddingVertical * 2).toBeLessThanOrEqual(row.height);
  });
});
