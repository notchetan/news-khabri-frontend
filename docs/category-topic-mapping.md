# `category-topic.ts` rule design

`CATEGORY_TOPIC_RULES` mirrors the backend's own consolidated ~10-category
taxonomy (see `services/category-aliases.js` in the backend) closely
enough that every one of its canonical English category strings (india,
world, business, sports, cricket, science, tech, education,
entertainment, lifestyle) matches its own rule directly, rather than
relying on an incidental substring match.

That gap is exactly what let `"lifestyle"` fall through to `"health"` via
a since-removed bare `"life"` keyword, which also incorrectly lumped the
backend's now-separate `"science"` category under the same icon as
`"lifestyle"`.

Cricket gets its own rule/topic for the same reason the backend keeps it
split from general sports - popular enough in India to earn its own icon
rather than sharing sports'.

The `"politics"` topic is effectively the "india"/national-news bucket in
practice - see `docs/category-icons.md` for why a government-building icon is the
right read for it.
