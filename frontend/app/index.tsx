import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { makeStyles } from "@/src/theme";

export default function Index() {
  const { user, isLoading } = useAuth();
  const styles = useStyles();

  if (isLoading) {
    return (
      <View style={styles.container} testID="app-loading">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/dashboard" />;
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
}));
