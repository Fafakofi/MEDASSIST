import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../lib/api";

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });

      if (data.user.role !== "patient") {
        Alert.alert(
          "Access denied",
          "This app is for patients only. Please use the web dashboard."
        );
        return;
      }

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      navigation.replace("Main");
    } catch (err) {
      Alert.alert(
        "Login failed",
        err.response?.data?.error || "Check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>💊</Text>
        </View>

        {/* Header */}
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to MedAssist</Text>

        {/* Email */}
        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            style={styles.input}
            placeholder="patient@example.com"
            placeholderTextColor="#c0c0c0"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>PASSWORD</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••••"
            placeholderTextColor="#c0c0c0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Text style={styles.inputIcon}>{showPass ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign in</Text>
          }
        </TouchableOpacity>

        {/* Register Link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.registerLink}>Create one</Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This system is a decision-support tool only and does not replace
          professional medical advice. If you are experiencing a medical
          emergency, call emergency services immediately.
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#1a3a5c",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    alignSelf: "center",
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 32,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
    height: 48,
  },
  btn: {
    backgroundColor: "#1a3a5c",
    borderRadius: 10,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 11,
    color: "#c0c0c0",
    textAlign: "center",
    marginTop: 32,
    lineHeight: 16,
  },
  registerRow: {
  flexDirection: "row",
  justifyContent: "center",
  marginTop: 20,
  },
  registerText: { fontSize: 13, color: "#9ca3af" },
  registerLink: { fontSize: 13, color: "#1a3a5c", fontWeight: "600" },
});