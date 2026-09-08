# `category-pills.tsx` layout details

Static layout/spacing rationale for the category pills row, extracted out
of the component to keep the source focused on behavior. See
[`animated-scroll-collapse.md`](./animated-scroll-collapse.md) for the
scroll-driven animation behavior instead.

## The divider/back-arrow slot has a fixed width

The divider (shown at the start of the scrollable strip) and the back
arrow (shown once scrolled, to jump back to the start) occupy one shared,
fixed-width slot (`dividerSlot`) rather than each being its own bare flex
item. Swapping between a 2px-wide divider and a ~20px-wide icon changed
the row's total width, which visibly made the `ScrollView` after it jump
sideways on every swap. The slot's own width never changes; only what's
centered inside it does.

The slot's width is `MIN_TOUCH_TARGET`, and that is a touch-target
decision rather than a visual one. It used to be 14 - chosen as a close
fit for the chevron's true ink, since a left-chevron glyph is narrower
than its 20pt bounding box and the *divider* got centered inside that
same slot, reading as a bigger gap around the divider than elsewhere in
the row.

14pt is not tappable. RN does not dispatch touches outside a parent's
bounds, so the back arrow's tappable width was 14pt no matter how much
`hitSlop` it carried - the `hitSlop={8}` it used to have bought nothing
horizontally.

The separation the old 14pt slot plus a 10pt `DIVIDER_SLOT_GAP` produced
is now supplied by the slot's width alone, with `DIVIDER_SLOT_GAP` at 0.
Everything in the slot is centered, so moving the space out of the gap
and into the width leaves the divider in very nearly the same place while
giving the arrow a real target. `backArrow` fills the slot
(`flex: 1`, `alignSelf: "stretch"`) so the whole thing is tappable rather
than just the chevron.

## The touchable is the capsule, not something inside it

`pillInner` carries the pill's padding and its `minHeight`, and it is
applied to whatever actually receives the tap - the `TouchableOpacity`
itself in the plain `Pill`, and the inner touchable in `PinnedPill`. The
outer `Animated.View` in `PinnedPill` is only a background capsule and an
animated width, so `pillOuterReset` zeroes its padding; the two must not
both apply it.

This was previously split the other way and both pill kinds ended up with
a tappable box smaller than the capsule drawn around it. `PinnedPill` was
the worse of the two: with a collapsed label configured, both of its
labels are `position: "absolute"` (that is what makes them cross-fade in
place), so its touchable had no in-flow content at all and shrank to its
own vertical padding.

A `hitSlop` would have been the lighter fix and is wrong here: RN's
hitSlop never extends past the parent's bounds, and `PinnedPill`'s
touchable sits inside an `Animated.View` sized to the pill, so the slop
would have been silently clipped on Android. The visible capsule is
`PILL_MIN_HEIGHT` tall instead.

`container`'s `paddingVertical` is 6 rather than 10 for the same reason:
`PILL_MIN_HEIGHT` plus that padding on both sides has to come to `row`'s
own fixed height, or the taller pills get clipped by it.

## Divider color matches the back arrow's icon color

The divider uses `theme.textSecondary`, the same color the back arrow's
own icon uses, so the two things that occupy the same slot read as one
consistent element rather than two different colors depending on scroll
state - and it's the *current* color scheme's own token (not the other
scheme's, as this once mistakenly used), so it stays guaranteed to
contrast against its own background either way.

## PILL_GAP vs. PILL_ITEM_GAP vs. DIVIDER_SLOT_GAP

Three different spacing constants, deliberately not unified into one:

- `PILL_GAP` is the screen-edge padding (pinned pill's left edge, and the
  scrollable strip's trailing right edge). Kept at `Spacing.three`
  specifically so the pinned pill's left edge lines up with the
  article/story cards' own left edge below it - a fixed design constraint
  tied to the rest of the page's layout.
- `DIVIDER_SLOT_GAP` (0) is the gap on either side of `dividerSlot`
  specifically: pinned pill -> divider/back-arrow slot, and slot -> the
  scrollable strip. Driven by `row`'s own `gap` property, which - because
  `dividerSlot` and the `ScrollView` are `row`'s only other children -
  only ever applies in those two places, nowhere else in the row. It is 0
  because the slot's own `MIN_TOUCH_TARGET` width now supplies that
  separation (see above); it stays a separate named constant rather than
  being deleted, so the three spacings remain independently adjustable.
- `PILL_ITEM_GAP` (14) is the space *between* the scrollable pills
  themselves, inside the `ScrollView`'s own `contentContainerStyle`
  (`container`) - a separate, visual-density-only choice, intentionally
  not tied to `DIVIDER_SLOT_GAP`'s value. It's driven by `container`'s own
  `gap` property rather than scattered margin/padding on each individual
  pill; that per-piece approach is what previously let the actual gaps
  drift apart from each other.
