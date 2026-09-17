import { render, screen } from "@testing-library/react-native";

import Icon from "../icon";

describe("Icon", () => {
  it("passes the symbol through and hands SymbolView a matching Ionicons fallback", async () => {
    await render(
      <Icon
        testID="icon"
        sf="bookmark.fill"
        ion="bookmark"
        size={24}
        color="#abc123"
        weight="semibold"
      />
    );

    const symbol = screen.getByTestId("icon");
    expect(symbol).toHaveProp("name", "bookmark.fill");
    expect(symbol).toHaveProp("weight", "semibold");
    expect(symbol).toHaveProp("tintColor", "#abc123");

    // The fallback is what an Android reader actually sees, so it has to
    // carry the same size and colour as the symbol it stands in for.
    const fallback = symbol.props.fallback;
    expect(fallback.props.name).toBe("bookmark");
    expect(fallback.props.size).toBe(24);
    expect(fallback.props.color).toBe("#abc123");
  });

  it("leaves weight unset when the caller omits it", async () => {
    // SymbolView's own default is 'unspecified', not 'regular' - defaulting
    // here would silently change every call site that omits the prop.
    await render(
      <Icon testID="icon" sf="bookmark" ion="bookmark-outline" size={16} color="#000" />
    );

    expect(screen.getByTestId("icon").props.weight).toBeUndefined();
  });
});
