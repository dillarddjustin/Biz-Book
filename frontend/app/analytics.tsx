import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/ScreenHeader";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type Analytics = {
  is_demo: boolean;
  daily: { date: string; reach: number; impressions: number; reactions: number }[];
  total_published: number;
  top_post_types: Record<string, number>;
  total_leads: number;
};

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { data } = useQuery<Analytics>({ queryKey: ["analytics"], queryFn: () => api("/analytics/overview") });

  const maxReach = Math.max(1, ...(data?.daily.map((d) => d.reach) ?? [1]));

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="analytics-screen">
      <ScreenHeader title="Analytics" subtitle="Page performance overview" showBack testID="analytics-header" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {data?.is_demo ? (
          <View style={styles.demoBanner} testID="analytics-demo-banner">
            <Text style={styles.demoBannerText}>DEMO DATA — connect a real Facebook Page to see live Meta insights.</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.total_published ?? 0}</Text>
            <Text style={styles.statLabel}>Published posts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.total_leads ?? 0}</Text>
            <Text style={styles.statLabel}>Total leads</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Reach — last 14 days</Text>
        <View style={styles.chartCard} testID="analytics-reach-chart">
          <View style={styles.chartBars}>
            {data?.daily.map((d) => (
              <View key={d.date} style={styles.barColumn}>
                <View style={[styles.bar, { height: Math.max(4, (d.reach / maxReach) * 100), backgroundColor: colors.brandPrimary }]} />
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Top post types</Text>
        <View style={styles.card}>
          {Object.keys(data?.top_post_types ?? {}).length === 0 ? (
            <Text style={styles.emptyText}>No posts published yet.</Text>
          ) : (
            Object.entries(data?.top_post_types ?? {}).map(([type, count]) => (
              <View key={type} style={styles.typeRow}>
                <Text style={styles.typeLabel}>{type.replace(/_/g, " ")}</Text>
                <Text style={styles.typeCount}>{count}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  demoBanner: { backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.info },
  demoBannerText: { color: colors.info, fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  statValue: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 4, fontWeight: "600" },
  sectionTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700", marginTop: 4 },
  chartCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, height: 140 },
  chartBars: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 4 },
  barColumn: { flex: 1, alignItems: "center" },
  bar: { width: "70%", borderRadius: 4 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  emptyText: { color: colors.muted, fontSize: 13 },
  typeRow: { flexDirection: "row", justifyContent: "space-between" },
  typeLabel: { color: colors.onSurface, fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  typeCount: { color: colors.brandPrimary, fontSize: 13, fontWeight: "800" },
}));
