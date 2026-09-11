import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type Variation = { tone: string; headline: string; caption: string; hashtags: string[]; alt_text?: string; explanation?: string };
type QualityCheck = { accuracy_score: number; clarity_score: number; cta_score: number; privacy_risk: string; warnings: string[] };
type Draft = {
  id: string; post_type: string; notes: string; variations: Variation[]; selected_variation_index: number | null;
  final_headline: string | null; final_caption: string | null; final_hashtags: string[]; quality_check: QualityCheck | null;
  status: string; rejection_reason: string | null; is_demo_publish: boolean;
};

const TONE_LABELS: Record<string, string> = { professional: "Professional", neighborly: "Neighborly", direct_service_call: "Direct Service Call" };

export default function DraftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isOwner } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();
  const queryClient = useQueryClient();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: draft } = useQuery<Draft>({ queryKey: ["draft", id], queryFn: () => api(`/drafts/${id}`) });

  useEffect(() => {
    if (!draft) return;
    if (draft.selected_variation_index !== null && draft.final_caption) {
      setSelectedIndex(draft.selected_variation_index);
      setHeadline(draft.final_headline ?? "");
      setCaption(draft.final_caption ?? "");
    } else if (draft.variations.length && selectedIndex === null) {
      applyVariation(0, draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  function applyVariation(index: number, d: Draft) {
    setSelectedIndex(index);
    setHeadline(d.variations[index].headline);
    setCaption(d.variations[index].caption);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["draft", id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    queryClient.invalidateQueries({ queryKey: ["approvals"] });
  }

  const submitMutation = useMutation({
    mutationFn: () => api(`/drafts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        selected_variation_index: selectedIndex, final_headline: headline, final_caption: caption,
        final_hashtags: draft?.variations[selectedIndex ?? 0]?.hashtags ?? [], status: "needs_review",
      }),
    }),
    onSuccess: () => { invalidate(); router.back(); },
    onError: (e: Error) => setError(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: () => api(`/drafts/${id}/approve`, { method: "POST" }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api(`/drafts/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: "Not a good fit" }) }),
    onSuccess: () => { invalidate(); router.back(); },
    onError: (e: Error) => setError(e.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => api(`/drafts/${id}/publish`, { method: "POST" }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  if (!draft) {
    return (
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <ScreenHeader title="Draft" showBack testID="draft-detail-header" />
      </SafeAreaView>
    );
  }

  const canEdit = draft.status === "draft" || draft.status === "needs_review";
  const highRisk = draft.quality_check?.privacy_risk === "high" || draft.quality_check?.privacy_risk === "medium";

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="draft-detail-screen">
      <ScreenHeader title="Review post" subtitle={draft.post_type.replace(/_/g, " ")} showBack testID="draft-detail-header" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.statusRow}>
            <StatusBadge status={draft.status} testID="draft-detail-status" />
            {draft.status === "published" && draft.is_demo_publish ? <Text style={styles.demoTag}>DEMO PUBLISH — not sent to real Facebook</Text> : null}
          </View>

          {draft.quality_check ? (
            <View style={[styles.qualityCard, highRisk && styles.qualityCardWarn]} testID="draft-detail-quality-check">
              <View style={styles.qualityHeader}>
                <Ionicons name="sparkles" size={16} color={colors.brandPrimary} />
                <Text style={styles.qualityTitle}>NOVA quality check</Text>
              </View>
              <Text style={styles.qualityScoreLine}>
                Accuracy {draft.quality_check.accuracy_score} · Clarity {draft.quality_check.clarity_score} · CTA {draft.quality_check.cta_score}
              </Text>
              {draft.quality_check.warnings.map((w, idx) => (
                <View key={idx} style={styles.warningRow}>
                  <Ionicons name="warning-outline" size={14} color={colors.warning} />
                  <Text style={styles.warningText}>{w}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {canEdit ? (
            <>
              <Text style={styles.sectionLabel}>Choose a tone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} testID="draft-detail-tone-row">
                {draft.variations.map((v, index) => {
                  const selected = selectedIndex === index;
                  return (
                    <TouchableOpacity
                      key={v.tone}
                      testID={`draft-detail-tone-${v.tone}`}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => applyVariation(index, draft)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{TONE_LABELS[v.tone] ?? v.tone}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionLabel}>Headline</Text>
              <TextInput testID="draft-detail-headline-input" style={styles.input} value={headline} onChangeText={setHeadline} placeholderTextColor={colors.muted} />

              <Text style={styles.sectionLabel}>Caption</Text>
              <TextInput
                testID="draft-detail-caption-input"
                style={styles.textarea}
                value={caption}
                onChangeText={setCaption}
                multiline
                textAlignVertical="top"
                placeholderTextColor={colors.muted}
              />

              {error ? <Text style={styles.error} testID="draft-detail-error-text">{error}</Text> : null}

              <PrimaryButton
                testID="draft-detail-submit-button"
                label={draft.status === "needs_review" ? "Update draft" : "Save & submit for approval"}
                onPress={() => submitMutation.mutate()}
                loading={submitMutation.isPending}
              />
            </>
          ) : (
            <View style={styles.previewCard} testID="draft-detail-preview-card">
              <Text style={styles.previewHeadline}>{draft.final_headline}</Text>
              <Text style={styles.previewCaption}>{draft.final_caption}</Text>
            </View>
          )}

          {isOwner && draft.status === "needs_review" ? (
            <View style={styles.actionRow}>
              <View style={styles.actionButtonWrap}>
                <PrimaryButton testID="draft-detail-reject-button" label="Reject" variant="danger" onPress={() => rejectMutation.mutate()} loading={rejectMutation.isPending} />
              </View>
              <View style={styles.actionButtonWrap}>
                <PrimaryButton testID="draft-detail-approve-button" label="Approve" onPress={() => approveMutation.mutate()} loading={approveMutation.isPending} />
              </View>
            </View>
          ) : null}

          {isOwner && draft.status === "approved" ? (
            <PrimaryButton testID="draft-detail-publish-button" label="Publish to Facebook now" onPress={() => publishMutation.mutate()} loading={publishMutation.isPending} />
          ) : null}

          {draft.status === "rejected" && draft.rejection_reason ? (
            <Text style={styles.rejectionText}>Rejected: {draft.rejection_reason}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 14, paddingBottom: 60 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  demoTag: { color: colors.info, fontSize: 11, fontWeight: "700" },
  qualityCard: { backgroundColor: colors.brandTertiary, borderRadius: 14, padding: 14, gap: 8 },
  qualityCardWarn: { backgroundColor: "rgba(245,158,11,0.12)" },
  qualityHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  qualityTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  qualityScoreLine: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  warningText: { color: colors.warning, fontSize: 12, flex: 1, lineHeight: 17 },
  sectionLabel: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "700", marginTop: 4, textTransform: "uppercase" },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  chipSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: colors.onBrandPrimary },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 14, color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  textarea: { minHeight: 140, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 14, color: colors.onSurface, fontSize: 14, lineHeight: 20 },
  error: { color: colors.error, fontSize: 13 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionButtonWrap: { flex: 1 },
  previewCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  previewHeadline: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  previewCaption: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 20 },
  rejectionText: { color: colors.error, fontSize: 13, textAlign: "center" },
}));
