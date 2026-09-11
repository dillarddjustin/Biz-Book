import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusBadge } from "@/src/components/StatusBadge";
import { api } from "@/src/lib/api";
import { makeStyles } from "@/src/theme";

type Draft = {
  id: string; post_type: string; final_headline: string | null; status: string;
  scheduled_at: string | null; published_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function CalendarScreen() {
  const router = useRouter();
  const styles = useStyles();

  const { data } = useQuery<Draft[]>({ queryKey: ["calendar"], queryFn: () => api("/calendar") });

  const items = [...(data ?? [])].sort((a, b) => {
    const aDate = a.scheduled_at || a.published_at || "";
    const bDate = b.scheduled_at || b.published_at || "";
    return aDate.localeCompare(bDate);
  });

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="calendar-screen">
      <ScreenHeader title="Content Calendar" subtitle="Scheduled & published posts · America/New York" showBack testID="calendar-header" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        testID="calendar-list"
        ListEmptyComponent={
          <EmptyState testID="calendar-empty-state" icon="calendar-outline" title="Nothing scheduled" message="Approve and schedule or publish a post to see it here." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`calendar-item-${item.id}`}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/draft/${item.id}`)}
          >
            <View style={styles.cardTop}>
              <Text style={styles.date}>{formatDate(item.scheduled_at || item.published_at)}</Text>
              <StatusBadge status={item.status} testID={`calendar-item-${item.id}-status`} />
            </View>
            <Text style={styles.postType}>{item.post_type.replace(/_/g, " ")}</Text>
            <Text style={styles.headline} numberOfLines={2}>{item.final_headline}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  listContent: { padding: 20, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 6 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  postType: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  headline: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
}));
