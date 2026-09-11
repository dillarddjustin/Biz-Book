import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { api } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

export default function NewLeadScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api("/leads", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null, service: service.trim() || null, city: city.trim() || null, notes: notes.trim() || null }),
    }),
    onSuccess: () => router.back(),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="new-lead-screen">
      <ScreenHeader title="New Lead" showBack testID="new-lead-header" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.error} testID="new-lead-error-text">{error}</Text> : null}

          <Field label="Name" value={name} onChangeText={setName} placeholder="Customer name" testID="new-lead-name-input" colors={colors} />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="(407) 555-0100" testID="new-lead-phone-input" colors={colors} />
          <Field label="Service needed" value={service} onChangeText={setService} placeholder="Sprinkler valve repair" testID="new-lead-service-input" colors={colors} />
          <Field label="City" value={city} onChangeText={setCity} placeholder="Sanford" testID="new-lead-city-input" colors={colors} />
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Any extra detail" testID="new-lead-notes-input" colors={colors} multiline />

          <PrimaryButton
            testID="new-lead-submit-button"
            label="Add lead"
            onPress={() => {
              setError(null);
              if (!name.trim()) { setError("Name is required"); return; }
              createMutation.mutate();
            }}
            loading={createMutation.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, testID, colors, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string; testID: string;
  colors: ReturnType<typeof useTheme>["colors"]; multiline?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 14, paddingBottom: 60 },
  error: { color: colors.error, fontSize: 13 },
  field: { gap: 6 },
  label: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 14, color: colors.onSurface, fontSize: 15 },
  inputMultiline: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
}));
