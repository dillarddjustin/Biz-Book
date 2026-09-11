import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type Lead = {
  id: string; name: string; phone: string | null; service: string | null; city: string | null;
  urgency: string; stage: string; source: string;
};

const STAGES: { key: string; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "estimate", label: "Estimate" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Closed" },
];

export default function LeadsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const { data } = useQuery<Lead[]>({ queryKey: ["leads"], queryFn: () => api("/leads") });

  async function moveStage(stage: string) {
    if (!activeLead) return;
    await api(`/leads/${activeLead.id}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) });
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    setActiveLead(null);
  }

  const leads = data ?? [];

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="leads-screen">
      <ScreenHeader
        title="Leads"
        subtitle={`${leads.length} total`}
        testID="leads-header"
        right={
          <TouchableOpacity testID="leads-add-button" onPress={() => router.push("/leads/new")} style={styles.addButton}>
            <Ionicons name="add" size={22} color={colors.onBrandPrimary} />
          </TouchableOpacity>
        }
      />

      {leads.length === 0 ? (
        <EmptyState testID="leads-empty-state" icon="people-outline" title="No leads yet" message="Leads captured from Facebook or added manually will appear here." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board} testID="leads-board">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage.key);
            return (
              <View key={stage.key} style={styles.column} testID={`leads-column-${stage.key}`}>
                <View style={styles.columnHeader}>
                  <Text style={styles.columnTitle}>{stage.label}</Text>
                  <Text style={styles.columnCount}>{stageLeads.length}</Text>
                </View>
                <ScrollView contentContainerStyle={styles.columnList}>
                  {stageLeads.map((lead) => (
                    <TouchableOpacity
                      key={lead.id}
                      testID={`leads-card-${lead.id}`}
                      style={styles.leadCard}
                      activeOpacity={0.85}
                      onPress={() => setActiveLead(lead)}
                    >
                      <Text style={styles.leadName} numberOfLines={1}>{lead.name}</Text>
                      {lead.service ? <Text style={styles.leadMeta} numberOfLines={1}>{lead.service}</Text> : null}
                      {lead.city ? <Text style={styles.leadMeta} numberOfLines={1}>{lead.city}</Text> : null}
                      <View style={[styles.urgencyDot, { backgroundColor: urgencyColor(lead.urgency, colors) }]} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!activeLead} transparent animationType="fade" onRequestClose={() => setActiveLead(null)} testID="leads-stage-modal">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActiveLead(null)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>{activeLead?.name}</Text>
            <Text style={styles.modalSubtitle}>Move to stage</Text>
            {STAGES.map((s) => (
              <TouchableOpacity
                key={s.key}
                testID={`leads-move-to-${s.key}`}
                style={styles.stageOption}
                onPress={() => moveStage(s.key)}
              >
                <Text style={styles.stageOptionText}>{s.label}</Text>
                {activeLead?.stage === s.key ? <Ionicons name="checkmark" size={18} color={colors.brandPrimary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function urgencyColor(urgency: string, colors: ReturnType<typeof useTheme>["colors"]) {
  switch (urgency) {
    case "emergency": return colors.error;
    case "high": return colors.warning;
    default: return colors.info;
  }
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  board: { padding: 16, gap: 12 },
  column: { width: 200, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, maxHeight: "100%" },
  columnHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  columnTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  columnCount: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  columnList: { padding: 10, gap: 10 },
  leadCard: { backgroundColor: colors.surfaceTertiary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 3 },
  leadName: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  leadMeta: { color: colors.muted, fontSize: 11 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4, position: "absolute", top: 12, right: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 4 },
  modalTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  modalSubtitle: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  stageOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  stageOptionText: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
}));
