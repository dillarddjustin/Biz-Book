// Design tokens for this app. Light theme only.Always modify the colors and theme to Dark, Light or Dark and Light according to the design guidelines.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

// Dillard's Social Manager is a permanent dark, field-tech "tactical" theme
// (see /app/design_guidelines.json). Named `light` to match StorageBase/theme
// plumbing below, but values are the dark charcoal + irrigation green palette.
const light = {
  // ---------------------------------------------------------------------------
  // Surfaces: backgrounds, from the screen down to small fills.
  // Each `on` key is the text and icon color for that background.
  // ---------------------------------------------------------------------------
  surface: "#121316", // primary canvas, most of every screen
  onSurface: "#F3F4F6", // text and icons on the canvas
  surfaceSecondary: "#22252A", // cards, sheets, list rows
  onSurfaceSecondary: "#F3F4F6", // text and icons on cards, sheets, rows
  surfaceTertiary: "#1A1C20", // input backgrounds, chips, deepest nesting
  onSurfaceTertiary: "#9CA3AF", // text on inputs and chips; also muted text
  surfaceInverse: "#F3F4F6", // tooltips, snackbars, anything popping against the theme
  onSurfaceInverse: "#121316", // text and icons on the inverse surface
  muted: "#6B7280", // subdued text on surface: captions, timestamps, placeholders

  // ---------------------------------------------------------------------------
  // Brand: irrigation green identity color and the fills built from it.
  // ---------------------------------------------------------------------------
  brand: "#22C55E", // base hue, anchor only; Primary, Secondary, Tertiary are weights of it
  onBrand: "#0B1710", // text and icons placed directly on brand
  brandPrimary: "#22C55E", // primary CTA, active tab indicator, selected states
  onBrandPrimary: "#0B1710", // text and icons on brandPrimary
  brandSecondary: "#16A34A", // secondary CTA, less prominent accents
  onBrandSecondary: "#F3F4F6", // text and icons on brandSecondary
  brandTertiary: "rgba(34, 197, 94, 0.15)", // chips, tags, badges, subtle brand moments
  onBrandTertiary: "#4ADE80", // text and icons on brandTertiary

  // ---------------------------------------------------------------------------
  // Status: semantic only, never decorative. Fill for badges, banners and
  // toasts; the `on` key is text on that fill. The plain key is also safe as
  // text on `surface`.
  // ---------------------------------------------------------------------------
  success: "#22C55E",
  onSuccess: "#0B1710",
  warning: "#F59E0B",
  onWarning: "#1F1400",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  // ---------------------------------------------------------------------------
  // Lines
  // ---------------------------------------------------------------------------
  border: "#2E333D", // hairline outline, 0.5pt or 1pt max: inputs, cards
  borderStrong: "#3F4650", // focus rings, selected outlines, 1.5pt max
  divider: "#2E333D", // subtle list separators

  // ---------------------------------------------------------------------------
  // Extra brand-specific colors used across this app
  // ---------------------------------------------------------------------------
  facebookBlue: "#1877F2",
  onFacebookBlue: "#FFFFFF",
  accentGreenLight: "#4ADE80",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}


