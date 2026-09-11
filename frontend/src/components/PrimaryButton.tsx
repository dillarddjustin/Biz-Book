import { ActivityIndicator, Pressable, Text } from "react-native";

import { makeStyles, useTheme } from "@/src/theme";

type Variant = "primary" | "secondary" | "danger" | "outline";

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  testID,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const isDisabled = disabled || loading;

  const variantStyle: Record<Variant, { bg: string; text: string; border: string }> = {
    primary: { bg: colors.brandPrimary, text: colors.onBrandPrimary, border: colors.brandPrimary },
    secondary: { bg: colors.surfaceTertiary, text: colors.onSurface, border: colors.border },
    danger: { bg: colors.error, text: colors.onError, border: colors.error },
    outline: { bg: "transparent", text: colors.brandPrimary, border: colors.brandPrimary },
  };
  const v = variantStyle[variant];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={v.text} /> : <Text style={[styles.label, { color: v.text }]}>{label}</Text>}
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  button: { minHeight: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  label: { fontSize: 15, fontWeight: "700" },
}));
