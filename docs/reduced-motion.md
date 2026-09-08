# Reduced motion

`useReducedMotion()` (`src/hooks/use-reduced-motion.ts`) reports the OS
setting behind iOS's *Settings > Accessibility > Motion > Reduce Motion*
and Android's *Settings > Accessibility > Remove animations*. React
Native surfaces both through the same `AccessibilityInfo` API, so there is
no platform branch here.

## What the setting actually asks for

It asks for less *motion*, not less feedback. The vestibular triggers are
translation, scale, parallax and spring overshoot - the things that imply
something moved through space. A cross-fade is what the platform guidance
recommends you replace those with, so an opacity change is a valid
destination, not another thing to strip.

That is why each caller here does something slightly different rather than
sharing one "if reduced, do nothing" branch:

| Surface | Normal | Reduced |
|---|---|---|
| The three loading skeletons (`use-skeleton-pulse.ts`) | 0.4-1 opacity loop, indefinite | held at 0.7 |
| `toast.tsx` | fade + 24pt rise | fade only, no travel |
| `category-pills.tsx` `scrollToStart` | 300ms animated scroll + `LayoutAnimation` | instant |
| `animated-icon.tsx` splash | opacity fade-out | unchanged - see below |

## Two deliberate non-changes

**The splash overlay is already compliant.** Its `Keyframe` holds `scale`
at 1 for every step and only drives `opacity` 1 -> 0; the `Easing.elastic`
applies to that opacity, not to any spatial property. It is a cross-fade
already, which is the thing Reduce Motion wants in place of motion.
Suppressing it would remove a fade and gain nothing.

**The pinned pill's collapse is exempt.** It interpolates against
`scrollX`, so it tracks the reader's own finger rather than playing a
travel of ours. Direct manipulation is not what the setting targets - the
content moves because the user is moving it. Only the *programmatic*
`scrollToStart` path in that file is suppressed. See
`docs/animated-scroll-collapse.md` for how that interpolation works.

## `useReducedMotion` vs `useReducedMotionSetting`

The OS is asked asynchronously, so there is a window before the answer
arrives. `useReducedMotion()` reads as `false` in that window, which is
right for a short one-shot transition - the toast's own fade is over
before the answer would have changed anything.

It is wrong for anything indefinite. A skeleton that starts pulsing and
stops a frame later has still shown motion to a reader who asked for none,
so `use-skeleton-pulse.ts` uses `useReducedMotionSetting()` (which is
`undefined` until known) and starts nothing until it has a real answer.

## Adding a new animation

Call the hook and pick the reduced branch from the table's logic: hold a
static value for anything indefinite, drop the transform but keep the
opacity for an enter/exit, and make a programmatic travel instant. Do not
suppress something that is already only a fade, and do not suppress
anything driven by a gesture's own position.
