import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useAuth } from "@/src/context/AuthContext";
import { makeStyles, useTheme } from "@/src/theme";

export default function MoreScreen() {
  const router = useRouter();
  const { user, isOwner, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();

  const menuItems = [
    { key: "approvals", label: "Approval Queue", icon: "checkmark-done-outline", route: "/approvals" },
    { key: "calendar", label: "Content Calendar", icon: "calendar-outline", route: "/calendar" },
    { key: "media-library", label: "Media Library", icon: "images-outline", route: "/media-library" },
    { key: "business-brain", label: "Business Brain", icon: "bulb-outline", route: "/business-brain" },
    { key: "analytics", label: "Analytics", icon: "bar-chart-outline", route: "/analytics" },
    { key: "facebook-connect", label: "Facebook Connection", icon: "logo-facebook", route: "/facebook-connect" },
    { key: "settings", label: "Settings", icon: "settings-outline", route: "/settings" },
  ];

  return (
    <SafeAreaView style={styles.flex} edges={["top"]} testID="more-screen">
      <ScreenHeader title="More" subtitle={user?.email ?? undefined} testID="more-header" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileCard} testID="more-profile-card">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileRole}>{isOwner ? "Business Owner" : "Team Member"}</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              testID={`more-menu-${item.key}`}
              style={[styles.menuRow, index === menuItems.length - 1 && styles.menuRowLast]}
              onPress={() => router.push(item.route as never)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as never} size={20} color={colors.onSurfaceTertiary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="more-logout-button" style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrandPrimary, fontSize: 20, fontWeight: "800" },
  profileInfo: { flex: 1 },
  profileName: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  profileRole: { color: colors.muted, fontSize: 12, marginTop: 2, fontWeight: "600" },
  menuCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 48 },
  menuRowLast: { borderBottomWidth: 0 },
  menuLabel: { flex: 1, color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.error },
  logoutText: { color: colors.error, fontSize: 14, fontWeight: "700" },
}));
