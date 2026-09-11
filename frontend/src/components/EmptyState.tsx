import Ionicons from "@react-native-vector-icons/ionicons";
import { Text, View } from "react-native";

import { makeStyles, useTheme } from "@/src/theme";

export function EmptyState({
  icon = "document-text-outline",
  title,
  message,
  testID,
}: {
  icon?: string;
  title: string;
  message?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container} testID={testID}>
      <Ionicons name={icon as never} size={40} color={colors.muted} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { alignItems: "center", justifyContent: "center", paddingVertical: 56, paddingHorizontal: 24, gap: 8 },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "600", textAlign: "center" },
  message: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 18 },
}));
