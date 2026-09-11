import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { api, mediaFileUrl, uploadMedia } from "@/src/lib/api";
import { makeStyles, useTheme } from "@/src/theme";

type MediaAsset = { id: string; filename: string; tags: string[]; alt_text: string | null; privacy_warning: string | null };

export default function MediaLibraryScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [active, setActive] = useState<MediaAsset | null>(null);
  const [altText, setAltText] = useState("");

  const { data } = useQuery<MediaAsset[]>({ queryKey: ["media"], queryFn: () => api("/media") });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/media/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["media"] }); setActive(null); },
  });

  const updateMutation = useMutation({
    mutationFn: () => api(`/media/${active?.id}`, { method: "PATCH", body: JSON.stringify({ alt_text: altText }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["media"] }); setActive(null); },
  });

  async function handleUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadMedia({ uri: asset.uri, name: asset.fileName || `photo-${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg", tags: "", altText: "" });
      queryClient.invalidateQueries({ queryKey: ["media"] });
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="media-library-screen">
      <ScreenHeader
        title="Media Library"
        subtitle={`${data?.length ?? 0} photos`}
        showBack
        testID="media-library-header"
        right={
          <TouchableOpacity testID="media-library-upload-button" style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
            <Ionicons name={uploading ? "hourglass-outline" : "add"} size={20} color={colors.onBrandPrimary} />
          </TouchableOpacity>
        }
      />
      {!data?.length ? (
        <EmptyState testID="media-library-empty-state" icon="images-outline" title="No photos yet" message="Upload job photos to use in NOVA-generated posts." />
      ) : (
        <ScrollView contentContainerStyle={styles.grid} testID="media-library-grid">
          {data.map((asset) => (
            <TouchableOpacity
              key={asset.id}
              testID={`media-library-item-${asset.id}`}
              style={styles.gridItem}
              onPress={() => { setActive(asset); setAltText(asset.alt_text ?? ""); }}
              activeOpacity={0.85}
            >
              <Image source={{ uri: mediaFileUrl(asset.id) }} style={styles.thumb} contentFit="cover" />
              {asset.privacy_warning ? (
                <View style={styles.warningBadge}>
                  <Ionicons name="warning" size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!active} transparent animationType="fade" onRequestClose={() => setActive(null)} testID="media-library-detail-modal">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActive(null)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            {active ? <Image source={{ uri: mediaFileUrl(active.id) }} style={styles.modalImage} contentFit="cover" /> : null}
            {active?.privacy_warning ? <Text style={styles.privacyText}>{active.privacy_warning}</Text> : null}
            <Text style={styles.modalLabel}>Alt text (accessibility)</Text>
            <TextInput
              testID="media-library-alt-text-input"
              style={styles.altInput}
              value={altText}
              onChangeText={setAltText}
              placeholder="Describe this photo..."
              placeholderTextColor={colors.muted}
            />
            <View style={styles.modalActions}>
              <View style={styles.modalActionWrap}>
                <PrimaryButton testID="media-library-delete-button" label="Delete" variant="danger" onPress={() => active && deleteMutation.mutate(active.id)} loading={deleteMutation.isPending} />
              </View>
              <View style={styles.modalActionWrap}>
                <PrimaryButton testID="media-library-save-button" label="Save" onPress={() => updateMutation.mutate()} loading={updateMutation.isPending} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  uploadButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  grid: { padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: "31%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: colors.surfaceTertiary },
  thumb: { width: "100%", height: "100%" },
  warningBadge: { position: "absolute", top: 6, right: 6, backgroundColor: colors.warning, borderRadius: 8, padding: 3 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  modalImage: { width: "100%", height: 200, borderRadius: 14, backgroundColor: colors.surfaceTertiary },
  privacyText: { color: colors.warning, fontSize: 12, fontWeight: "600" },
  modalLabel: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginTop: 4 },
  altInput: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 14, color: colors.onSurface, fontSize: 14 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalActionWrap: { flex: 1 },
}));
