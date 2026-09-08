import Ionicons from "@expo/vector-icons/Ionicons";
import { SymbolView, type SymbolViewProps } from "expo-symbols";

type Props = {
  // The SF Symbol, rendered on iOS.
  sf: SymbolViewProps["name"];
  // The Ionicons equivalent - this is what every Android reader actually
  // sees, since SymbolView renders nothing but its `fallback` off iOS.
  ion: React.ComponentProps<typeof Ionicons>["name"];
  size: number;
  color: string;
  // Passed straight through rather than defaulted: SymbolView's own default
  // is 'unspecified', not 'regular', so defaulting here would change how
  // every call site that omits it renders.
  weight?: SymbolViewProps["weight"];
  testID?: string;
};

// The SF-Symbol-with-an-Ionicons-fallback pairing this app uses for every
// icon, which was seven to nine lines repeated at sixteen call sites. Both
// halves always shared a size and a colour, so they're one prop each here.
//
// Icons whose fallback is a text glyph rather than an Ionicon (the header
// chevrons, the checkmark) deliberately don't go through this - those
// fallbacks carry per-site typography for cross-script centering, see
// docs/cross-script-text-rendering.md.
export default function Icon({ sf, ion, size, color, weight, testID }: Props) {
  return (
    <SymbolView
      testID={testID}
      name={sf}
      size={size}
      weight={weight}
      tintColor={color}
      fallback={<Ionicons name={ion} size={size} color={color} />}
    />
  );
}
