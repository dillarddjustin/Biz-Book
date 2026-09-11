import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { api, mediaFileUrl, uploadMedia } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

const POST_TYPES: { key: string; label: string; icon: string }[] = [
  { key: "field_tip", label: "Field Tip", icon: "bulb-outline" },
  { key: "before_after", label: "Before/After", icon: "swap-horizontal-outline" },
  { key: "service_update", label: "Service Update", icon: "construct-outline" },
  { key: "seasonal_reminder", label: "Seasonal", icon: "leaf-outline" },
  { key: "emergency", label: "Emergency", icon: "alert-circle-outline" },
  { key: "faq", label: "FAQ", icon: "help-circle-outline" },
  { key: "customer_education", label: "Education", icon: "school-outline" },
  { key: "promotion", label: "Promotion", icon: "megaphone-outline" },
];

export default function ComposerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();

  const [postType, setPostType] = useState("field_tip");
  const [notes, setNotes] = useState("");
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: () => api("/composer/generate", {
      method: "POST",
      body: JSON.stringify({ post_type: postType, notes: notes.trim(), media_ids: mediaIds }),
    }),
    onSuccess: (draft) => {
      setNotes("");
      setMediaIds([]);
      router.push(`/draft/${draft.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  async function handlePickPhoto() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is needed to attach job photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const uploaded = await uploadMedia({
        uri: asset.uri,
        name: asset.fileName || `job-photo-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        tags: postType,
        altText: "",
      });
      setMediaIds((prev) => [...prev, uploaded.id]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="composer-screen">
      <ScreenHeader title="Composer" subtitle="Ask NOVA to draft a Facebook post" testID="composer-header" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Post type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            testID="composer-post-type-row"
          >
            {POST_TYPES.map((t) => {
              const selected = postType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  testID={`composer-post-type-${t.key}`}
                  onPress={() => setPostType(t.key)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.icon as never} size={16} color={selected ? colors.onBrandPrimary : colors.onSurfaceTertiary} />
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>Field notes</Text>
          <TextInput
            testID="composer-notes-input"
            style={styles.textarea}
            value={notes}
            onChangeText={setNotes}
            placeholder="What did you fix today? e.g. Replaced a broken sprinkler valve, took 45 min, customer happy..."
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.sectionLabel}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
            {mediaIds.map((id) => (
              <Image key={id} source={{ uri: mediaFileUrl(id) }} style={styles.mediaThumb} contentFit="cover" />
            ))}
            <TouchableOpacity
              testID="composer-add-photo-button"
              style={styles.addPhotoButton}
              onPress={handlePickPhoto}
              disabled={uploading}
            >
              <Ionicons name={uploading ? "hourglass-outline" : "camera-outline"} size={22} color={colors.brandPrimary} />
              <Text style={styles.addPhotoText}>{uploading ? "Uploading" : "Add"}</Text>
            </TouchableOpacity>
          </ScrollView>

          {error ? <Text style={styles.error} testID="composer-error-text">{error}</Text> : null}

          <PrimaryButton
            testID="composer-generate-button"
            label="Ask NOVA to draft this post"
            onPress={() => {
              setError(null);
              if (!notes.trim()) {
                setError("Add a few field notes first so NOVA has something to write about.");
                return;
              }
              generateMutation.mutate();
            }}
            loading={generateMutation.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 12, paddingBottom: 60 },
  sectionLabel: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "700", marginTop: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  chipRow: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: {
    flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary,
  },
  chipSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: colors.onBrandPrimary },
  textarea: {
    minHeight: 120, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary,
    padding: 14, color: colors.onSurface, fontSize: 15, lineHeight: 21,
  },
  mediaRow: { gap: 10, paddingRight: 8 },
  mediaThumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  addPhotoButton: {
    width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  addPhotoText: { color: colors.brandPrimary, fontSize: 11, fontWeight: "600" },
  error: { color: colors.error, fontSize: 13 },
}));
