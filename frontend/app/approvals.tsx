import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList, RefreshControl, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusBadge } from "@/src/components/StatusBadge";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type Draft = { id: string; post_type: string; final_headline: string | null; notes: string; status: string };

export default function ApprovalsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  const { data, isFetching, refetch } = useQuery<Draft[]>({ queryKey: ["approvals"], queryFn: () => api("/approvals") });

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="approvals-screen">
      <ScreenHeader title="Approval Queue" subtitle="Owner review before anything goes public" showBack testID="approvals-header" />
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        testID="approvals-list"
        ListEmptyComponent={
          <EmptyState testID="approvals-empty-state" icon="checkmark-done-outline" title="Nothing waiting" message="Drafts submitted from the Composer show up here for approval." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`approvals-item-${item.id}`}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/draft/${item.id}`)}
          >
            <Text style={styles.postType}>{item.post_type.replace(/_/g, " ")}</Text>
            <Text style={styles.headline} numberOfLines={2}>{item.final_headline || item.notes}</Text>
            <StatusBadge status={item.status} testID={`approvals-item-${item.id}-status`} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  listContent: { padding: 20, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  postType: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  headline: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
}));
