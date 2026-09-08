import { getCategoryIonicon } from "../category-ionicon";

describe("getCategoryIonicon", () => {
  it("returns the generic newspaper icon for null/undefined/empty/unmatched category", () => {
    expect(getCategoryIonicon(null)).toBe("newspaper");
    expect(getCategoryIonicon(undefined)).toBe("newspaper");
    expect(getCategoryIonicon("")).toBe("newspaper");
    expect(getCategoryIonicon("Astrology")).toBe("newspaper");
  });

  it.each([
    ["Sports", "football"],
    ["Cricket", "baseball"],
    ["Business", "trending-up"],
    ["Technology", "desktop"],
    ["Entertainment", "film"],
    ["World", "globe"],
    ["Politics", "business"],
    ["India", "business"],
    ["Science", "flask"],
    ["Lifestyle", "sparkles"],
    ["Health", "sparkles"],
    ["Education", "school"],
    ["Weather", "partly-sunny"],
    ["Opinion", "chatbubble-ellipses"],
  ])("maps %s to %s", (category, icon) => {
    expect(getCategoryIonicon(category)).toBe(icon);
  });

});
