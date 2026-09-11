import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type InboxItem = {
  id: string; type: string; from_name: string; message: string; classification: string | null;
  suggested_reply: string | null; status: string; is_demo: boolean; linked_lead_id: string | null;
};

export default function InboxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isOwner } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");

  const { data: items } = useQuery<InboxItem[]>({ queryKey: ["inbox-items"], queryFn: () => api("/inbox") });
  const item = items?.find((i) => i.id === id);

  useEffect(() => {
    if (item?.suggested_reply && !replyText) setReplyText(item.suggested_reply);
  }, [item?.suggested_reply, replyText]);

  const classifyMutation = useMutation({
    mutationFn: () => api(`/inbox/${id}/classify`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-items"] }),
  });

  const replyMutation = useMutation({
    mutationFn: () => api(`/inbox/${id}/reply`, { method: "POST", body: JSON.stringify({ message: replyText }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
      router.back();
    },
  });

  if (!item) {
    return (
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <ScreenHeader title="Inbox item" showBack testID="inbox-detail-header" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="inbox-detail-screen">
      <ScreenHeader title={item.from_name} subtitle={item.type} showBack testID="inbox-detail-header" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.messageCard}>
            <View style={styles.messageHeader}>
              <StatusBadge status={item.status} testID="inbox-detail-status" />
              {item.is_demo ? <Text style={styles.demoTag}>DEMO ITEM</Text> : null}
            </View>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>

          {!item.classification ? (
            <PrimaryButton
              testID="inbox-detail-classify-button"
              label="Ask NOVA to classify & draft a reply"
              onPress={() => classifyMutation.mutate()}
              loading={classifyMutation.isPending}
              variant="secondary"
            />
          ) : (
            <View style={styles.classificationCard} testID="inbox-detail-classification-card">
              <View style={styles.classificationHeader}>
                <Ionicons name="sparkles" size={16} color={colors.brandPrimary} />
                <Text style={styles.classificationTitle}>NOVA classified this as: {item.classification}</Text>
              </View>
              {item.status === "needs_human" ? (
                <Text style={styles.needsHumanText}>This needs your personal judgment (complaint, price, or legal topic).</Text>
              ) : null}
            </View>
          )}

          <Text style={styles.sectionLabel}>Reply</Text>
          <TextInput
            testID="inbox-detail-reply-input"
            style={styles.textarea}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Type or edit the reply before sending..."
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            editable={isOwner}
          />

          {isOwner ? (
            <PrimaryButton
              testID="inbox-detail-send-reply-button"
              label={item.status === "replied" ? "Already replied" : "Approve & send reply"}
              onPress={() => replyMutation.mutate()}
              loading={replyMutation.isPending}
              disabled={!replyText.trim() || item.status === "replied"}
            />
          ) : (
            <Text style={styles.ownerOnlyNote}>Only the business owner can send replies to customers.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 14, paddingBottom: 60 },
  messageCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  messageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  demoTag: { color: colors.info, fontSize: 10, fontWeight: "800" },
  messageText: { color: colors.onSurface, fontSize: 15, lineHeight: 21 },
  classificationCard: { backgroundColor: colors.brandTertiary, borderRadius: 14, padding: 14, gap: 6 },
  classificationHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  classificationTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  needsHumanText: { color: colors.warning, fontSize: 12, fontWeight: "600" },
  sectionLabel: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "700", marginTop: 4, textTransform: "uppercase" },
  textarea: {
    minHeight: 110, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary,
    padding: 14, color: colors.onSurface, fontSize: 14, lineHeight: 20,
  },
  ownerOnlyNote: { color: colors.muted, fontSize: 12, textAlign: "center", fontStyle: "italic" },
}));
