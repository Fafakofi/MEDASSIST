import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../lib/api";

  const Field = ({ label, placeholder, value, onChangeText, keyboardType, secureTextEntry, toggle, toggleValue }) => (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#c0c0c0"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || "default"}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {toggle && (
          <TouchableOpacity onPress={toggle}>
            <Text style={styles.eyeIcon}>{toggleValue ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    name:             "",
    email:            "",
    password:         "",
    confirmPassword:  "",
    phone:            "",
    dateOfBirth:      "",
    emergencyName:    "",
    emergencyPhone:   "",
    emergencyRelation:"",
  });
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [step, setStep]                 = useState(1); // 2-step form

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validateStep1 = () => {
    if (!form.name.trim())  { Alert.alert("Required", "Please enter your full name."); return false; }
    if (!form.email.trim()) { Alert.alert("Required", "Please enter your email."); return false; }
    if (form.password.length < 8) { Alert.alert("Weak password", "Password must be at least 8 characters."); return false; }
    if (form.password !== form.confirmPassword) { Alert.alert("Mismatch", "Passwords do not match."); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!form.emergencyName.trim()) {
      Alert.alert("Required", "Please enter an emergency contact name.");
      return;
    }
    if (!form.emergencyPhone.trim()) {
      Alert.alert("Required", "Please enter an emergency contact phone number.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        name:  form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "patient",
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        emergencyContact: {
          name:     form.emergencyName.trim(),
          phone:    form.emergencyPhone.trim(),
          relation: form.emergencyRelation.trim(),
        },
      });

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      navigation.replace("Main");
    } catch (err) {
      Alert.alert(
        "Registration failed",
        err.response?.data?.error || "Something went wrong. Please try again."
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => step === 1 ? navigation.goBack() : setStep(1)}
        >
          <Text style={styles.backText}>← {step === 1 ? "Back to login" : "Back"}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? "Step 1 of 2 — Your details" : "Step 2 of 2 — Emergency contact"}
        </Text>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
        </View>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <View style={styles.formSection}>
            <Field
              label="FULL NAME"
              placeholder="John Doe"
              value={form.name}
              onChangeText={(v) => update("name", v)}
            />
            <Field
              label="EMAIL ADDRESS"
              placeholder="john@example.com"
              value={form.email}
              onChangeText={(v) => update("email", v)}
              keyboardType="email-address"
            />
            <Field
              label="PHONE NUMBER"
              placeholder="+1 234 567 8900"
              value={form.phone}
              onChangeText={(v) => update("phone", v)}
              keyboardType="phone-pad"
            />
            <Field
              label="DATE OF BIRTH"
              placeholder="YYYY-MM-DD"
              value={form.dateOfBirth}
              onChangeText={(v) => update("dateOfBirth", v)}
            />
            <Field
              label="PASSWORD"
              placeholder="Min. 8 characters"
              value={form.password}
              onChangeText={(v) => update("password", v)}
              secureTextEntry={!showPass}
              toggle={() => setShowPass(!showPass)}
              toggleValue={showPass}
            />
            <Field
              label="CONFIRM PASSWORD"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChangeText={(v) => update("confirmPassword", v)}
              secureTextEntry={!showConfirm}
              toggle={() => setShowConfirm(!showConfirm)}
              toggleValue={showConfirm}
            />

            <TouchableOpacity
              style={styles.btn}
              onPress={() => validateStep1() && setStep(2)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <View style={styles.formSection}>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ⚕️ Your emergency contact will be notified if our system
                detects a critical health situation.
              </Text>
            </View>

            <Field
              label="CONTACT NAME"
              placeholder="Jane Doe"
              value={form.emergencyName}
              onChangeText={(v) => update("emergencyName", v)}
            />
            <Field
              label="CONTACT PHONE"
              placeholder="+1 234 567 8900"
              value={form.emergencyPhone}
              onChangeText={(v) => update("emergencyPhone", v)}
              keyboardType="phone-pad"
            />
            <Field
              label="RELATIONSHIP"
              placeholder="e.g. Spouse, Parent, Sibling"
              value={form.emergencyRelation}
              onChangeText={(v) => update("emergencyRelation", v)}
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Create account</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This application provides medication management assistance and
          decision support only. It does not replace professional medical advice.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll:    { flexGrow: 1, padding: 24, paddingBottom: 48 },

  backBtn:  { marginTop: 48, marginBottom: 8 },
  backText: { fontSize: 13, color: "#1a3a5c", fontWeight: "600" },

  title:    { fontSize: 24, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#9ca3af", marginBottom: 20 },

  stepRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 24,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#e5e7eb",
  },
  stepDotActive:  { backgroundColor: "#1a3a5c" },
  stepLine:       { flex: 1, height: 2, backgroundColor: "#e5e7eb", marginHorizontal: 6 },
  stepLineActive: { backgroundColor: "#1a3a5c" },

  formSection: { gap: 4 },

  fieldWrapper: { marginBottom: 14 },
  label: {
    fontSize: 11, fontWeight: "600",
    color: "#9ca3af", letterSpacing: 1, marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 10,
    borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 12, height: 48,
  },
  input:   { flex: 1, fontSize: 14, color: "#1a1a1a" },
  eyeIcon: { fontSize: 16, marginLeft: 8 },

  infoBox: {
    backgroundColor: "#eff6ff", borderRadius: 10,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  infoText: { fontSize: 12, color: "#1d4ed8", lineHeight: 17 },

  btn: {
    backgroundColor: "#1a3a5c", borderRadius: 10,
    height: 48, alignItems: "center",
    justifyContent: "center", marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: "#fff", fontSize: 15, fontWeight: "600" },

  disclaimer: {
    fontSize: 11, color: "#c0c0c0",
    textAlign: "center", marginTop: 24, lineHeight: 16,
  },
});