import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusBadge } from "@/src/components/StatusBadge";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type InboxItem = {
  id: string; type: "comment" | "mention" | "messenger"; from_name: string; message: string;
  classification: string | null; status: string; is_demo: boolean; created_time: string;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "comment", label: "Comments" },
  { key: "mention", label: "Mentions" },
  { key: "messenger", label: "Messenger" },
];

export default function InboxScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data, isFetching, refetch } = useQuery<InboxItem[]>({
    queryKey: ["inbox-items"],
    queryFn: () => api("/inbox"),
  });

  async function handleRefresh() {
    await api("/inbox/refresh", { method: "POST" });
    await queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
    refetch();
  }

  const items = (data ?? []).filter((i) => filter === "all" || i.type === filter);

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="inbox-screen">
      <ScreenHeader title="Facebook Inbox" subtitle="Comments, mentions and Messenger" testID="inbox-header" />
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          testID="inbox-filter-row"
          renderItem={({ item: f }) => {
            const selected = filter === f.key;
            return (
              <TouchableOpacity
                testID={`inbox-filter-${f.key}`}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, selected && styles.chipSelected]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{f.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={handleRefresh} tintColor={colors.brandPrimary} />}
        testID="inbox-list"
        ListEmptyComponent={
          <EmptyState
            testID="inbox-empty-state"
            icon="chatbubbles-outline"
            title="Inbox is empty"
            message="Pull down to refresh and check for new comments and messages."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`inbox-item-${item.id}`}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/inbox/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Ionicons
                name={item.type === "messenger" ? "chatbox-outline" : item.type === "mention" ? "at-outline" : "chatbubble-outline"}
                size={16}
                color={colors.muted}
              />
              <Text style={styles.fromName} numberOfLines={1}>{item.from_name}</Text>
              {item.is_demo ? <Text style={styles.demoTag}>DEMO</Text> : null}
            </View>
            <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
            <View style={styles.cardFooter}>
              <StatusBadge status={item.status} testID={`inbox-item-${item.id}-status`} />
              {item.classification ? <Text style={styles.classification}>{item.classification}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  filterWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  chipRow: { gap: 8, paddingHorizontal: 20 },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  chipSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: colors.onBrandPrimary },
  listContent: { padding: 20, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  fromName: { color: colors.onSurface, fontSize: 14, fontWeight: "700", flex: 1 },
  demoTag: { color: colors.info, fontSize: 10, fontWeight: "800" },
  message: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 10 },
  classification: { color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
}));
