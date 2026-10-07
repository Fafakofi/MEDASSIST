import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import api from "../../lib/api";

const COMMON_SYMPTOMS = [
  "Nausea", "Dizziness", "Headache", "Fatigue",
  "Stomach pain", "Rash", "Itching", "Vomiting",
  "Chest pain", "Shortness of breath", "Swelling",
  "Blurred vision", "Dry mouth", "Insomnia", "Fever",
];

const SEVERITY_OPTIONS = [
  { label: "Mild",     value: "mild",     color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
  { label: "Moderate", value: "moderate", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { label: "Severe",   value: "severe",   color: "#ef4444", bg: "#fff1f2", border: "#fecdd3" },
];

export default function SymptomsScreen() {
  const [selected, setSelected]     = useState([]);
  const [severity, setSeverity]     = useState(null);
  const [description, setDescription] = useState("");
  const [medications, setMedications] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [lastReport, setLastReport] = useState(null);

  useEffect(() => {
    api.get("/medications")
      .then(({ data }) => setMedications(data))
      .catch(console.error);
  }, []);

  const toggleSymptom = (symptom) => {
    setSelected((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      Alert.alert("No symptoms selected", "Please select at least one symptom.");
      return;
    }
    if (!severity) {
      Alert.alert("Severity required", "Please select how severe your symptoms are.");
      return;
    }

    // Warn before submitting severe symptoms
    if (severity === "severe") {
      Alert.alert(
        "⚠️ Severe symptoms",
        "If you are experiencing a medical emergency, call emergency services immediately. Do you still want to submit this report?",
        [
          { text: "Call emergency", style: "destructive", onPress: () => {} },
          { text: "Submit report", onPress: () => submitReport() },
        ]
      );
      return;
    }

    submitReport();
  };

  const submitReport = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/side-effects", {
        symptoms: selected,
        severity,
        description,
        medicationId: selectedMed,
      });

      setLastReport(data);
      setSubmitted(true);
      setSelected([]);
      setSeverity(null);
      setDescription("");
      setSelectedMed(null);
    } catch (err) {
      Alert.alert(
        "Submission failed",
        err.response?.data?.error || "Failed to submit report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setLastReport(null);
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>Report submitted</Text>
        <Text style={styles.successText}>
          Our AI agent is analyzing your symptoms. Your care team will be
          notified if any follow-up is needed.
        </Text>
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            If your symptoms worsen or you experience chest pain, difficulty
            breathing, or loss of consciousness — call emergency services immediately.
          </Text>
        </View>
        <TouchableOpacity style={styles.resetBtn} onPress={resetForm}>
          <Text style={styles.resetBtnText}>Report more symptoms</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <Text style={styles.pageTitle}>Report symptoms</Text>
      <Text style={styles.pageSubtitle}>Tell us how you're feeling today</Text>

      {/* Emergency Banner */}
      <View style={styles.emergencyBanner}>
        <Text style={styles.emergencyText}>
          🚨 If this is a medical emergency, call emergency services immediately.
          Do not use this form for emergencies.
        </Text>
      </View>

      {/* Symptom Selector */}
      <Text style={styles.sectionTitle}>Select symptoms</Text>
      <Text style={styles.sectionSub}>Tap all that apply</Text>
      <View style={styles.symptomsGrid}>
        {COMMON_SYMPTOMS.map((symptom) => {
          const active = selected.includes(symptom);
          return (
            <TouchableOpacity
              key={symptom}
              onPress={() => toggleSymptom(symptom)}
              style={[styles.symptomChip, active && styles.symptomChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.symptomChipText, active && styles.symptomChipTextActive]}>
                {symptom}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selected.length > 0 && (
        <Text style={styles.selectedCount}>
          {selected.length} symptom{selected.length !== 1 ? "s" : ""} selected
        </Text>
      )}

      {/* Severity */}
      <Text style={styles.sectionTitle}>Severity</Text>
      <Text style={styles.sectionSub}>How severe are your symptoms?</Text>
      <View style={styles.severityRow}>
        {SEVERITY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setSeverity(opt.value)}
            style={[
              styles.severityBtn,
              severity === opt.value && {
                backgroundColor: opt.bg,
                borderColor: opt.border,
                borderWidth: 1.5,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.severityBtnText,
              severity === opt.value && { color: opt.color, fontWeight: "700" },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Related Medication */}
      <Text style={styles.sectionTitle}>Related medication</Text>
      <Text style={styles.sectionSub}>Which medication may have caused this? (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medScroll}>
        <TouchableOpacity
          onPress={() => setSelectedMed(null)}
          style={[styles.medChip, !selectedMed && styles.medChipActive]}
        >
          <Text style={[styles.medChipText, !selectedMed && styles.medChipTextActive]}>
            Not sure
          </Text>
        </TouchableOpacity>
        {medications.map((med) => (
          <TouchableOpacity
            key={med._id}
            onPress={() => setSelectedMed(med._id)}
            style={[styles.medChip, selectedMed === med._id && styles.medChipActive]}
          >
            <Text style={[styles.medChipText, selectedMed === med._id && styles.medChipTextActive]}>
              {med.name} {med.dosage}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Description */}
      <Text style={styles.sectionTitle}>Additional details</Text>
      <Text style={styles.sectionSub}>Describe your symptoms in more detail (optional)</Text>
      <TextInput
        style={styles.textArea}
        placeholder="e.g. Symptoms started 2 hours after taking medication..."
        placeholderTextColor="#c0c0c0"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>Submit report</Text>
        }
      </TouchableOpacity>

      <Text style={styles.footerDisclaimer}>
        This report is analyzed by an AI system for decision-support only.
        It does not constitute medical advice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 20, paddingBottom: 100 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  pageTitle:    { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginTop: 48 },
  pageSubtitle: { fontSize: 13, color: "#9ca3af", marginTop: 2, marginBottom: 16 },

  emergencyBanner: {
    backgroundColor: "#fff1f2", borderRadius: 10,
    padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: "#fecdd3",
  },
  emergencyText: { fontSize: 12, color: "#be123c", lineHeight: 17 },

  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 3, marginTop: 20 },
  sectionSub:   { fontSize: 12, color: "#9ca3af", marginBottom: 12 },

  symptomsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  symptomChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  symptomChipActive: { backgroundColor: "#1a3a5c", borderColor: "#1a3a5c" },
  symptomChipText:   { fontSize: 13, color: "#4b5563" },
  symptomChipTextActive: { color: "#fff", fontWeight: "600" },
  selectedCount: { fontSize: 12, color: "#1a3a5c", fontWeight: "600", marginTop: 10 },

  severityRow: { flexDirection: "row", gap: 10 },
  severityBtn: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
  },
  severityBtnText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },

  medScroll:       { marginBottom: 4 },
  medChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#e5e7eb", marginRight: 8,
  },
  medChipActive:     { backgroundColor: "#1a3a5c", borderColor: "#1a3a5c" },
  medChipText:       { fontSize: 13, color: "#4b5563" },
  medChipTextActive: { color: "#fff", fontWeight: "600" },

  textArea: {
    backgroundColor: "#fff", borderRadius: 10,
    borderWidth: 1, borderColor: "#e5e7eb",
    padding: 12, fontSize: 13, color: "#1a1a1a",
    height: 100, marginBottom: 4,
  },

  submitBtn: {
    backgroundColor: "#1a3a5c", borderRadius: 12,
    height: 50, alignItems: "center", justifyContent: "center",
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { color: "#fff", fontSize: 15, fontWeight: "700" },

  disclaimer: {
    backgroundColor: "#fff7ed", borderRadius: 10,
    padding: 12, marginVertical: 16,
    borderWidth: 1, borderColor: "#fed7aa",
  },
  disclaimerText: { fontSize: 12, color: "#c2410c", lineHeight: 17, textAlign: "center" },

  successEmoji: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  successText:  { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20, marginBottom: 16 },

  resetBtn: {
    backgroundColor: "#1a3a5c", borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  resetBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  footerDisclaimer: {
    fontSize: 11, color: "#d1d5db",
    textAlign: "center", marginTop: 16, lineHeight: 16,
  },
});