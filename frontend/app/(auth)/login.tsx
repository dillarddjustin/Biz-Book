import { useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View,
} from "react-native";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { makeStyles, useTheme } from "@/src/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logoDot} />
          <Text style={styles.brandTitle}>Dillard&apos;s Social Manager</Text>
          <Text style={styles.brandSubtitle}>NOVA Social Copilot for field-tech content</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Sign in</Text>

          {error ? <Text style={styles.error} testID="login-error-text">{error}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email-input"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="owner@dillardsirrigation.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="login-password-input"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              placeholderTextColor={colors.muted}
              secureTextEntry
            />
          </View>

          <PrimaryButton testID="login-submit-button" label="Sign in" onPress={handleLogin} loading={loading} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to the team?</Text>
            <Link href="/(auth)/register" testID="login-go-register-link">
              <Text style={styles.footerLink}>Create an account</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, padding: 24, justifyContent: "center", gap: 32 },
  brand: { alignItems: "center", gap: 8 },
  logoDot: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.brandPrimary, marginBottom: 4 },
  brandTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "800", textAlign: "center" },
  brandSubtitle: { color: colors.muted, fontSize: 13, textAlign: "center" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 },
  heading: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  error: { color: colors.error, fontSize: 13 },
  field: { gap: 6 },
  label: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  input: {
    minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary, paddingHorizontal: 14, color: colors.onSurface, fontSize: 15,
  },
  footerRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 4 },
  footerText: { color: colors.muted, fontSize: 13 },
  footerLink: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },
}));
