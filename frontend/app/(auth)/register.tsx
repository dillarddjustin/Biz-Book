import { useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View,
} from "react-native";

import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { makeStyles, useTheme } from "@/src/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError("Fill in your name, email, and a password with 6+ characters");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim());
      router.replace("/(tabs)/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logoDot} />
          <Text style={styles.brandTitle}>Create your account</Text>
          <Text style={styles.brandSubtitle}>The first account becomes the business owner with full approval control.</Text>
        </View>

        <View style={styles.card}>
          {error ? <Text style={styles.error} testID="register-error-text">{error}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              testID="register-name-input"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Dave Dillard"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="register-email-input"
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
              testID="register-password-input"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.muted}
              secureTextEntry
            />
          </View>

          <PrimaryButton testID="register-submit-button" label="Create account" onPress={handleRegister} loading={loading} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/(auth)/login" testID="register-go-login-link">
              <Text style={styles.footerLink}>Sign in</Text>
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
  brandTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800", textAlign: "center" },
  brandSubtitle: { color: colors.muted, fontSize: 13, textAlign: "center", paddingHorizontal: 12 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 },
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
