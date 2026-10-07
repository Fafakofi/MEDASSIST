import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  TextInput, Switch,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../lib/api";

const Field = ({ label, value, onChangeText, placeholder, keyboardType, editable = true }) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || "Not set"}
      placeholderTextColor="#d1d5db"
      keyboardType={keyboardType || "default"}
      editable={editable}
      autoCapitalize="none"
      autoCorrect={false}
    />
  </View>
);

export default function ProfileScreen({ navigation }) {
  const [user, setUser]       = useState(null);
  const [stats, setStats]     = useState({ medications: 0, reports: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name:             "",
    phone:            "",
    dateOfBirth:      "",
    emergencyName:    "",
    emergencyPhone:   "",
    emergencyRelation:"",
  });

  const [notifications, setNotifications] = useState({
    reminders:    true,
    interactions: true,
    refills:      true,
    sideEffects:  true,
  });

  const fetchData = useCallback(async () => {
    try {
      const [userStr, medsRes, reportsRes] = await Promise.all([
        AsyncStorage.getItem("user"),
        api.get("/medications"),
        api.get("/side-effects"),
      ]);

      if (userStr) {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        setForm({
          name:              parsed.name || "",
          phone:             parsed.phone || "",
          dateOfBirth:       parsed.dateOfBirth?.split("T")[0] || "",
          emergencyName:     parsed.emergencyContact?.name || "",
          emergencyPhone:    parsed.emergencyContact?.phone || "",
          emergencyRelation: parsed.emergencyContact?.relation || "",
        });
      }

      setStats({
        medications: medsRes.data.length,
        reports:     reportsRes.data.length,
      });
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Required", "Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.patch("/auth/profile", {
        name:        form.name.trim(),
        phone:       form.phone.trim(),
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        emergencyContact: {
          name:     form.emergencyName.trim(),
          phone:    form.emergencyPhone.trim(),
          relation: form.emergencyRelation.trim(),
        },
      });

      // Update local storage
      const updated = { ...user, ...data.user };
      await AsyncStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      setEditing(false);
      Alert.alert("✅ Saved", "Your profile has been updated.");
    } catch (err) {
      Alert.alert(
        "Save failed",
        err.response?.data?.error || "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            navigation.replace("Login");
          },
        },
      ]
    );
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#1a3a5c" />
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Avatar + Name */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || "Patient"}</Text>
        <Text style={styles.userEmail}>{user?.email || ""}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Patient</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.medications}</Text>
          <Text style={styles.statLabel}>Medications</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.reports}</Text>
          <Text style={styles.statLabel}>Symptom reports</Text>
        </View>
      </View>

      {/* Personal Info */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Personal information</Text>
        <TouchableOpacity
          onPress={() => editing ? handleSave() : setEditing(true)}
          disabled={saving}
        >
          <Text style={styles.editBtn}>
            {saving ? "Saving..." : editing ? "Save" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Field
          label="Full name"
          value={form.name}
          onChangeText={(v) => update("name", v)}
          placeholder="John Doe"
          editable={editing}
        />
        <View style={styles.cardDivider} />
        <Field
          label="Email"
          value={user?.email || ""}
          editable={false}
          placeholder="Not set"
        />
        <View style={styles.cardDivider} />
        <Field
          label="Phone"
          value={form.phone}
          onChangeText={(v) => update("phone", v)}
          placeholder="+1 234 567 8900"
          keyboardType="phone-pad"
          editable={editing}
        />
        <View style={styles.cardDivider} />
        <Field
          label="Date of birth"
          value={form.dateOfBirth}
          onChangeText={(v) => update("dateOfBirth", v)}
          placeholder="YYYY-MM-DD"
          editable={editing}
        />
      </View>

      {editing && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => { setEditing(false); fetchData(); }}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      )}

      {/* Emergency Contact */}
      <Text style={styles.sectionTitle}>Emergency contact</Text>
      <View style={styles.card}>
        <Field
          label="Contact name"
          value={form.emergencyName}
          onChangeText={(v) => update("emergencyName", v)}
          placeholder="Jane Doe"
          editable={editing}
        />
        <View style={styles.cardDivider} />
        <Field
          label="Phone number"
          value={form.emergencyPhone}
          onChangeText={(v) => update("emergencyPhone", v)}
          placeholder="+1 234 567 8900"
          keyboardType="phone-pad"
          editable={editing}
        />
        <View style={styles.cardDivider} />
        <Field
          label="Relationship"
          value={form.emergencyRelation}
          onChangeText={(v) => update("emergencyRelation", v)}
          placeholder="e.g. Spouse, Parent"
          editable={editing}
        />
      </View>

      {/* Notification Preferences */}
      <Text style={styles.sectionTitle}>Notification preferences</Text>
      <View style={styles.card}>
        {[
          { key: "reminders",    label: "Medication reminders",   sub: "Dose time alerts" },
          { key: "interactions", label: "Interaction warnings",   sub: "Drug interaction alerts" },
          { key: "refills",      label: "Refill reminders",       sub: "Low stock alerts" },
          { key: "sideEffects",  label: "Side effect updates",    sub: "AI analysis results" },
        ].map((item, index, arr) => (
          <View key={item.key}>
            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>{item.label}</Text>
                <Text style={styles.switchSub}>{item.sub}</Text>
              </View>
              <Switch
                value={notifications[item.key]}
                onValueChange={(val) =>
                  setNotifications((prev) => ({ ...prev, [item.key]: val }))
                }
                trackColor={{ false: "#f3f4f6", true: "#bfdbfe" }}
                thumbColor={notifications[item.key] ? "#1a3a5c" : "#d1d5db"}
              />
            </View>
            {index < arr.length - 1 && <View style={styles.cardDivider} />}
          </View>
        ))}
      </View>

      {/* Safety Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerTitle}>⚕️ Important disclaimer</Text>
        <Text style={styles.disclaimerText}>
          This application provides medication management assistance and
          decision support only. It does not replace professional medical
          advice, diagnosis, or treatment. Always seek the advice of your
          physician or other qualified health provider with any questions
          you may have regarding a medical condition.
        </Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Text style={styles.logoutBtnText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>MedAssist v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content:   { padding: 20, paddingBottom: 60 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center" },

  profileCard: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 24, alignItems: "center",
    borderWidth: 1, borderColor: "#f3f4f6",
    marginBottom: 14, marginTop: 12,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#1a3a5c",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  userName:   { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  userEmail:  { fontSize: 13, color: "#9ca3af", marginBottom: 10 },
  roleBadge: {
    backgroundColor: "#eff6ff", paddingHorizontal: 14,
    paddingVertical: 4, borderRadius: 20,
  },
  roleBadgeText: { fontSize: 12, color: "#1d4ed8", fontWeight: "600" },

  statsRow: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, flexDirection: "row",
    alignItems: "center", marginBottom: 24,
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  statCard:    { flex: 1, alignItems: "center" },
  statNum:     { fontSize: 24, fontWeight: "700", color: "#1a1a1a" },
  statLabel:   { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: "#f3f4f6" },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: "700",
    color: "#6b7280", marginBottom: 8, letterSpacing: 0.3,
  },
  editBtn: { fontSize: 14, color: "#1a3a5c", fontWeight: "700" },

  card: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "#f3f4f6",
    marginBottom: 20, overflow: "hidden",
  },
  cardDivider: { height: 1, backgroundColor: "#f9fafb", marginHorizontal: 14 },

  fieldWrapper: { padding: 14 },
  fieldLabel:   { fontSize: 11, color: "#9ca3af", marginBottom: 4, fontWeight: "500" },
  fieldInput: {
    fontSize: 14, color: "#1a1a1a",
    borderBottomWidth: 0, padding: 0,
  },
  fieldInputDisabled: { color: "#6b7280" },

  cancelBtn: {
    borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 10, padding: 12,
    alignItems: "center", marginTop: -12, marginBottom: 20,
  },
  cancelBtnText: { fontSize: 13, color: "#6b7280", fontWeight: "600" },

  switchRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", padding: 14,
  },
  switchContent: { flex: 1 },
  switchLabel:   { fontSize: 14, color: "#1a1a1a", fontWeight: "500" },
  switchSub:     { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  disclaimer: {
    backgroundColor: "#eff6ff", borderRadius: 12,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  disclaimerTitle: { fontSize: 13, fontWeight: "700", color: "#1d4ed8", marginBottom: 6 },
  disclaimerText:  { fontSize: 12, color: "#1d4ed8", lineHeight: 18 },

  logoutBtn: {
    backgroundColor: "#fff1f2", borderRadius: 12,
    height: 50, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#fecdd3", marginBottom: 16,
  },
  logoutBtnText: { color: "#e11d48", fontSize: 15, fontWeight: "700" },

  version: { fontSize: 12, color: "#d1d5db", textAlign: "center" },
});