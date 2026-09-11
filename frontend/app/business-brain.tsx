import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type BusinessBrain = {
  business_name: string; page_name: string; location: string; service_area: string;
  services: string[]; hours: string; contact_methods: string; common_problems: string[];
  approved_phrases: string[]; phrases_to_avoid: string[]; brand_voice: string;
};

const toLines = (arr: string[]) => arr.join(", ");
const fromLines = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);

export default function BusinessBrainScreen() {
  const { isOwner } = useAuth();
  const styles = useStyles();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BusinessBrain | null>(null);
  const [saved, setSaved] = useState(false);

  const { data } = useQuery<BusinessBrain>({ queryKey: ["business-brain"], queryFn: () => api("/business-brain") });

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: () => api("/business-brain", { method: "PUT", body: JSON.stringify(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-brain"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (!form) {
    return (
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <ScreenHeader title="Business Brain" showBack testID="business-brain-header" />
      </SafeAreaView>
    );
  }

  function set<K extends keyof BusinessBrain>(key: K, value: BusinessBrain[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="business-brain-screen">
      <ScreenHeader title="Business Brain" subtitle="What NOVA knows about your business" showBack testID="business-brain-header" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Field label="Business name" value={form.business_name} onChangeText={(v) => set("business_name", v)} editable={isOwner} colors={colors} />
          <Field label="Facebook Page name" value={form.page_name} onChangeText={(v) => set("page_name", v)} editable={isOwner} colors={colors} />
          <Field label="Location" value={form.location} onChangeText={(v) => set("location", v)} editable={isOwner} colors={colors} />
          <Field label="Service area" value={form.service_area} onChangeText={(v) => set("service_area", v)} editable={isOwner} colors={colors} />
          <Field label="Hours" value={form.hours} onChangeText={(v) => set("hours", v)} editable={isOwner} colors={colors} />
          <Field label="Contact methods" value={form.contact_methods} onChangeText={(v) => set("contact_methods", v)} editable={isOwner} colors={colors} />
          <Field
            label="Services (comma separated)"
            value={toLines(form.services)}
            onChangeText={(v) => set("services", fromLines(v))}
            editable={isOwner}
            multiline
            colors={colors}
          />
          <Field
            label="Common problems (comma separated)"
            value={toLines(form.common_problems)}
            onChangeText={(v) => set("common_problems", fromLines(v))}
            editable={isOwner}
            multiline
            colors={colors}
          />
          <Field
            label="Approved phrases (comma separated)"
            value={toLines(form.approved_phrases)}
            onChangeText={(v) => set("approved_phrases", fromLines(v))}
            editable={isOwner}
            multiline
            colors={colors}
          />
          <Field
            label="Phrases to avoid (comma separated)"
            value={toLines(form.phrases_to_avoid)}
            onChangeText={(v) => set("phrases_to_avoid", fromLines(v))}
            editable={isOwner}
            multiline
            colors={colors}
          />
          <Field label="Brand voice" value={form.brand_voice} onChangeText={(v) => set("brand_voice", v)} editable={isOwner} multiline colors={colors} />

          {isOwner ? (
            <PrimaryButton
              testID="business-brain-save-button"
              label={saved ? "Saved!" : "Save changes"}
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            />
          ) : (
            <Text style={styles.ownerOnlyNote}>Only the business owner can edit the Business Brain.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, editable, multiline, colors }: {
  label: string; value: string; onChangeText: (v: string) => void; editable: boolean; multiline?: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={`business-brain-${label.toLowerCase().replace(/[^a-z]+/g, "-")}-input`}
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline={multiline}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 14, paddingBottom: 60 },
  field: { gap: 6 },
  label: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 14, color: colors.onSurface, fontSize: 14 },
  inputMultiline: { minHeight: 72, paddingTop: 12, textAlignVertical: "top" },
  ownerOnlyNote: { color: colors.muted, fontSize: 12, textAlign: "center", fontStyle: "italic" },
}));
