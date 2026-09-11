import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { makeStyles } from "@/src/theme";

type AuditEvent = { id: string; actor_name: string | null; action: string; details: string | null; created_at: string };

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isOwner, logout } = useAuth();
  const styles = useStyles();

  const { data: audit } = useQuery<AuditEvent[]>({
    queryKey: ["audit"],
    queryFn: () => api("/audit"),
    enabled: isOwner,
  });

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="settings-screen">
      <ScreenHeader title="Settings" showBack testID="settings-header" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{isOwner ? "Business Owner" : "Team Member"}</Text>
        </View>

        <TouchableOpacity testID="settings-facebook-row" style={styles.row} onPress={() => router.push("/facebook-connect")}>
          <Text style={styles.rowText}>Facebook Connection</Text>
        </TouchableOpacity>

        {isOwner ? (
          <>
            <Text style={styles.sectionTitle}>Audit log</Text>
            <View style={styles.card}>
              {!audit?.length ? (
                <EmptyState testID="settings-audit-empty" icon="shield-checkmark-outline" title="No activity yet" />
              ) : (
                audit.slice(0, 20).map((e) => (
                  <View key={e.id} style={styles.auditRow} testID={`settings-audit-${e.id}`}>
                    <Text style={styles.auditAction}>{e.action.replace(/_/g, " ")}</Text>
                    <Text style={styles.auditMeta}>{e.actor_name} · {new Date(e.created_at).toLocaleString()}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}

        <PrimaryButton testID="settings-logout-button" label="Log out" variant="danger" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 4 },
  label: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: 8 },
  value: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  row: { minHeight: 48, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, justifyContent: "center" },
  rowText: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  sectionTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700", marginTop: 4 },
  auditRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10, gap: 2 },
  auditAction: { color: colors.onSurface, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  auditMeta: { color: colors.muted, fontSize: 11 },
}));
