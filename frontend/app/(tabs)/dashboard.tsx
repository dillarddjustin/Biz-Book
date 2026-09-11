import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type DashboardOverview = {
  page_connected: boolean;
  page_name: string | null;
  is_demo: boolean;
  pending_approvals: number;
  scheduled: number;
  drafts: number;
  unread_inbox: number;
  new_leads: number;
  recent_published: {
    id: string; post_type: string; final_headline: string | null; final_caption: string | null;
    published_at: string; is_demo_publish: boolean;
  }[];
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview"],
    queryFn: () => api("/dashboard/overview"),
  });

  const stats = [
    { key: "pending_approvals", label: "Pending Approvals", value: data?.pending_approvals ?? 0, icon: "checkmark-done-outline", target: "/approvals" },
    { key: "unread_inbox", label: "Unread Inbox", value: data?.unread_inbox ?? 0, icon: "chatbubble-ellipses-outline", target: "/(tabs)/inbox" },
    { key: "new_leads", label: "New Leads", value: data?.new_leads ?? 0, icon: "person-add-outline", target: "/(tabs)/leads" },
    { key: "drafts", label: "Open Drafts", value: data?.drafts ?? 0, icon: "document-text-outline", target: "/(tabs)/composer" },
  ] as const;

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="dashboard-screen">
      <ScreenHeader title="Dashboard" subtitle={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`} testID="dashboard-header" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
      >
        <TouchableOpacity
          testID="dashboard-fb-status-card"
          style={styles.fbCard}
          onPress={() => router.push("/facebook-connect")}
          activeOpacity={0.85}
        >
          <View style={styles.fbIconWrap}>
            <Ionicons name="logo-facebook" size={22} color={colors.facebookBlue} />
          </View>
          <View style={styles.fbTextWrap}>
            <Text style={styles.fbTitle}>
              {data?.page_connected ? (data?.page_name ?? "Facebook Page") : "Facebook not connected"}
            </Text>
            <Text style={styles.fbSubtitle}>
              {!data?.page_connected ? "Tap to connect your Page" : data?.is_demo ? "Demo mode — no real posts are published" : "Connected and live"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <TouchableOpacity
              key={s.key}
              testID={`dashboard-stat-${s.key}`}
              style={styles.statCard}
              onPress={() => router.push(s.target as never)}
              activeOpacity={0.85}
            >
              <Ionicons name={s.icon as never} size={20} color={colors.brandPrimary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          testID="dashboard-nova-launch-button"
          style={styles.novaCard}
          onPress={() => router.push("/(tabs)/composer")}
          activeOpacity={0.85}
        >
          <View style={styles.novaIconWrap}>
            <Ionicons name="sparkles" size={22} color={colors.onBrandPrimary} />
          </View>
          <View style={styles.fbTextWrap}>
            <Text style={styles.novaTitle}>Ask NOVA for a new post</Text>
            <Text style={styles.novaSubtitle}>Turn a field note into 3 ready-to-review post drafts</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recently published</Text>
        {!isLoading && (data?.recent_published?.length ?? 0) === 0 ? (
          <EmptyState
            testID="dashboard-recent-empty"
            icon="megaphone-outline"
            title="Nothing published yet"
            message="Approved posts you publish will show up here."
          />
        ) : (
          data?.recent_published.map((p) => (
            <View key={p.id} style={styles.recentCard} testID={`dashboard-recent-item-${p.id}`}>
              <Text style={styles.recentHeadline} numberOfLines={1}>{p.final_headline || "Untitled post"}</Text>
              <Text style={styles.recentCaption} numberOfLines={2}>{p.final_caption}</Text>
              {p.is_demo_publish ? <Text style={styles.demoTag}>DEMO PUBLISH</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  fbCard: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  fbIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  fbTextWrap: { flex: 1 },
  fbTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  fbSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    flexBasis: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 6, minHeight: 96,
  },
  statValue: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  novaCard: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.brandPrimary,
    borderRadius: 16, padding: 16,
  },
  novaIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(11,23,16,0.2)", alignItems: "center", justifyContent: "center" },
  novaTitle: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  novaSubtitle: { color: colors.onBrandPrimary, fontSize: 12, marginTop: 2, opacity: 0.85 },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700", marginTop: 4 },
  recentCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  recentHeadline: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  recentCaption: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  demoTag: { color: colors.info, fontSize: 10, fontWeight: "800", letterSpacing: 0.5, marginTop: 4 },
}));
