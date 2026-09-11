import { Text, View } from "react-native";

import { makeStyles, useTheme, ThemeColors } from "@/src/theme";

const LABELS: Record<string, string> = {
  draft: "Draft", needs_review: "Needs Review", approved: "Approved", scheduled: "Scheduled",
  published: "Published", failed: "Failed", rejected: "Rejected", unread: "Unread", read: "Read",
  replied: "Replied", needs_human: "Needs You", connected: "Connected", disconnected: "Disconnected",
  new: "New", contacted: "Contacted", estimate: "Estimate", completed: "Completed", closed: "Closed",
};

function getPalette(status: string, colors: ThemeColors) {
  switch (status) {
    case "approved":
    case "published":
    case "connected":
    case "replied":
    case "completed":
      return { bg: "rgba(34,197,94,0.15)", border: colors.success, text: colors.accentGreenLight };
    case "needs_review":
    case "unread":
    case "scheduled":
    case "new":
      return { bg: "rgba(245,158,11,0.15)", border: colors.warning, text: colors.warning };
    case "rejected":
    case "failed":
    case "needs_human":
      return { bg: "rgba(239,68,68,0.15)", border: colors.error, text: colors.error };
    default:
      return { bg: colors.surfaceTertiary, border: colors.border, text: colors.onSurfaceTertiary };
  }
}

export function StatusBadge({ status, testID }: { status: string; testID?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const palette = getPalette(status, colors);
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]} testID={testID}>
      <Text style={[styles.text, { color: palette.text }]}>{LABELS[status] ?? status}</Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" },
  text: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
}));
