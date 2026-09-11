import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type MetaStatus = { configured: boolean; page: { id: string; name: string; is_demo: boolean; status: string } | null };
type PendingPage = { id: string; name: string; category: string | null };

export default function FacebookConnectScreen() {
  const { isOwner } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [pendingPages, setPendingPages] = useState<PendingPage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: status } = useQuery<MetaStatus>({ queryKey: ["meta-status"], queryFn: () => api("/meta/status") });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["meta-status"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
  }

  const demoConnectMutation = useMutation({
    mutationFn: () => api("/meta/demo-connect", { method: "POST" }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api("/meta/disconnect", { method: "POST" }),
    onSuccess: invalidate,
  });

  const selectPageMutation = useMutation({
    mutationFn: (pageId: string) => api("/meta/pages/select", { method: "POST", body: JSON.stringify({ page_id: pageId }) }),
    onSuccess: () => { setPendingPages(null); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  async function handleRealConnect() {
    setError(null);
    try {
      const res = await api("/meta/connect/start", { method: "POST" });
      await WebBrowser.openBrowserAsync(res.login_url);
      const pending = await api("/meta/connect/pending");
      if (!pending.pages?.length) {
        setError("No pending Facebook Pages found. Finish the Facebook login in the browser, then tap Connect again.");
        return;
      }
      setPendingPages(pending.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Facebook login");
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="facebook-connect-screen">
      <ScreenHeader title="Facebook Connection" showBack testID="facebook-connect-header" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {!status?.configured ? (
          <View style={styles.notConfiguredBanner} testID="facebook-connect-not-configured-banner">
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={styles.notConfiguredText}>
              No Meta App is configured yet. Use Demo Connect to try every feature now. Add META_APP_ID and
              META_APP_SECRET to the backend to connect a real Facebook Page later.
            </Text>
          </View>
        ) : null}

        <View style={styles.statusCard} testID="facebook-connect-status-card">
          <View style={styles.statusRow}>
            <Ionicons name="logo-facebook" size={26} color={colors.facebookBlue} />
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusTitle}>{status?.page ? status.page.name : "Not connected"}</Text>
              <Text style={styles.statusSubtitle}>
                {status?.page ? (status.page.is_demo ? "Demo Page — no real posts are published" : "Live connection") : "Connect a Page to publish posts"}
              </Text>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error} testID="facebook-connect-error-text">{error}</Text> : null}

        {isOwner ? (
          <>
            {!status?.page ? (
              <>
                <PrimaryButton testID="facebook-connect-demo-button" label="Demo Connect (try it now)" onPress={() => demoConnectMutation.mutate()} loading={demoConnectMutation.isPending} />
                <PrimaryButton
                  testID="facebook-connect-real-button"
                  label="Connect real Facebook Page"
                  variant="outline"
                  onPress={handleRealConnect}
                  disabled={!status?.configured}
                />
              </>
            ) : (
              <PrimaryButton testID="facebook-connect-disconnect-button" label="Disconnect Page" variant="danger" onPress={() => disconnectMutation.mutate()} loading={disconnectMutation.isPending} />
            )}

            {pendingPages ? (
              <View style={styles.pendingCard} testID="facebook-connect-pending-pages">
                <Text style={styles.pendingTitle}>Choose a Page</Text>
                {pendingPages.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    testID={`facebook-connect-select-page-${p.id}`}
                    style={styles.pendingRow}
                    onPress={() => selectPageMutation.mutate(p.id)}
                  >
                    <Text style={styles.pendingRowText}>{p.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.ownerOnlyNote}>Only the business owner can manage the Facebook connection.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  notConfiguredBanner: { flexDirection: "row", gap: 10, backgroundColor: "rgba(59,130,246,0.12)", borderRadius: 14, borderWidth: 1, borderColor: colors.info, padding: 14 },
  notConfiguredText: { flex: 1, color: colors.info, fontSize: 12, lineHeight: 17 },
  statusCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusTextWrap: { flex: 1 },
  statusTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  statusSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  error: { color: colors.error, fontSize: 13 },
  pendingCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 4 },
  pendingTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "700", marginBottom: 4 },
  pendingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  pendingRowText: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  ownerOnlyNote: { color: colors.muted, fontSize: 12, textAlign: "center", fontStyle: "italic" },
}));
