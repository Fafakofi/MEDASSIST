import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import api from "../../lib/api";

const urgencyConfig = (daysLeft) => {
  if (daysLeft === null) return { color: "#9ca3af", bg: "#f9fafb", border: "#f3f4f6", label: "Unknown" };
  if (daysLeft <= 3)  return { color: "#be123c", bg: "#fff1f2", border: "#fecdd3", label: "Critical" };
  if (daysLeft <= 7)  return { color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", label: "Low" };
  if (daysLeft <= 14) return { color: "#b45309", bg: "#fffbeb", border: "#fde68a", label: "Moderate" };
  return { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", label: "Good" };
};

export default function RefillScreen() {
  const [medications, setMedications] = useState([]);
  const [refills, setRefills]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [triggering, setTriggering]   = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [medsRes, refillsRes] = await Promise.all([
        api.get("/medications"),
        api.get("/refills"),
      ]);
      setMedications(medsRes.data);
      setRefills(Array.isArray(refillsRes.data) ? refillsRes.data : []);
    } catch (err) {
      console.error("Failed to load refill data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const triggerRefillCheck = async (medicationId, medName) => {
    setTriggering(medicationId);
    try {
      await api.post("/refills/check", { medicationId });
      Alert.alert(
        "Refill check triggered",
        `Our system is checking your ${medName} supply and will remind you when it's time to refill.`
      );
      setTimeout(() => fetchData(), 2000);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Failed to trigger refill check.");
    } finally {
      setTriggering(null);
    }
  };

  const dismissRefill = async (refillId) => {
    try {
      await api.patch(`/refills/${refillId}`, { status: "dismissed" });
      fetchData();
    } catch (err) {
      console.error("Failed to dismiss refill", err);
    }
  };

  const markRefilled = async (refillId, medName) => {
    try {
      await api.patch(`/refills/${refillId}`, { status: "refilled" });
      Alert.alert("✅ Great!", `${medName} has been marked as refilled.`);
      fetchData();
    } catch (err) {
      console.error("Failed to mark refilled", err);
    }
  };

  // Calculate days remaining
  const daysRemaining = (remaining, total, frequency) => {
    if (remaining == null) return null;
    const dosesPerDay = {
      daily:             1,
      twice_daily:       2,
      three_times_daily: 3,
      weekly:            1 / 7,
      as_needed:         null,
    }[frequency] || 1;
    return Math.floor(remaining / dosesPerDay);
  };

  const stockPct = (remaining, total) => {
    if (remaining == null || !total) return 0;
    return Math.round((remaining / total) * 100);
  };

  const activeRefills = refills.filter((r) => ["pending", "sent"].includes(r.status));
  const lowStockMeds  = medications.filter((m) => {
    const pct = stockPct(m.remainingQuantity, m.totalQuantity);
    return m.remainingQuantity != null && pct <= 30;
  });

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#1a3a5c" />
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <Text style={styles.pageTitle}>Refills</Text>
      <Text style={styles.pageSubtitle}>Monitor your medication supply</Text>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚕️ Always consult your healthcare provider or pharmacist before
          refilling medications. Do not change your dosage without medical advice.
        </Text>
      </View>

      {/* Active Refill Reminders */}
      {activeRefills.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Refill reminders</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeRefills.length}</Text>
            </View>
          </View>

          {activeRefills.map((refill) => {
            const med = medications.find((m) => m._id === refill.medicationId?._id || m._id === refill.medicationId);
            const runOut = refill.estimatedRunOutDate
              ? new Date(refill.estimatedRunOutDate)
              : null;
            const daysLeft = runOut
              ? Math.ceil((runOut - new Date()) / (1000 * 60 * 60 * 24))
              : null;
            const u = urgencyConfig(daysLeft);

            return (
              <View key={refill._id} style={[styles.refillCard, { backgroundColor: u.bg, borderColor: u.border }]}>
                <View style={styles.refillHeader}>
                  <View style={styles.refillTitleRow}>
                    <Text style={styles.refillMedName}>
                      {refill.medicationId?.name || med?.name || "Medication"}
                    </Text>
                    <View style={[styles.urgencyBadge, { backgroundColor: u.border }]}>
                      <Text style={[styles.urgencyBadgeText, { color: u.color }]}>
                        {u.label}
                      </Text>
                    </View>
                  </View>
                  {runOut && (
                    <Text style={[styles.runOutText, { color: u.color }]}>
                      {daysLeft <= 0
                        ? "⚠️ May have run out"
                        : `Estimated run out in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
                    </Text>
                  )}
                  {runOut && (
                    <Text style={styles.runOutDate}>
                      Est. run out: {runOut.toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })}
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.refillActions}>
                  <TouchableOpacity
                    style={styles.refilledBtn}
                    onPress={() => markRefilled(refill._id, refill.medicationId?.name || "Medication")}
                  >
                    <Text style={styles.refilledBtnText}>✓ I refilled it</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={() => dismissRefill(refill._id)}
                  >
                    <Text style={styles.dismissBtnText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* All Medications Stock */}
      <Text style={styles.sectionTitle}>Medication stock</Text>

      {medications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>💊</Text>
          <Text style={styles.emptyTitle}>No medications found</Text>
          <Text style={styles.emptyText}>
            Your medications will appear here once your healthcare provider adds them.
          </Text>
        </View>
      ) : (
        medications.map((med) => {
          const pct   = stockPct(med.remainingQuantity, med.totalQuantity);
          const days  = daysRemaining(med.remainingQuantity, med.totalQuantity, "daily");
          const u     = urgencyConfig(days);
          const isTrig = triggering === med._id;

          return (
            <View key={med._id} style={styles.medCard}>
              {/* Med Header */}
              <View style={styles.medHeader}>
                <View style={styles.medTitleCol}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDosage}>{med.dosage} · {med.form || "tablet"}</Text>
                </View>
                {med.remainingQuantity != null && (
                  <View style={[styles.stockBadge, { backgroundColor: u.bg, borderColor: u.border }]}>
                    <Text style={[styles.stockBadgeText, { color: u.color }]}>
                      {med.remainingQuantity} left
                    </Text>
                  </View>
                )}
              </View>

              {/* Stock Bar */}
              {med.remainingQuantity != null && med.totalQuantity && (
                <View style={styles.stockSection}>
                  <View style={styles.stockBarBg}>
                    <View style={[styles.stockBarFill, {
                      width: `${pct}%`,
                      backgroundColor: u.color,
                    }]} />
                  </View>
                  <View style={styles.stockLabelRow}>
                    <Text style={styles.stockPct}>{pct}% remaining</Text>
                    {days !== null && (
                      <Text style={[styles.daysLeft, { color: u.color }]}>
                        ~{days} days supply
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Low Stock Warning */}
              {pct <= 30 && med.remainingQuantity != null && (
                <View style={[styles.warningBox, { backgroundColor: u.bg, borderColor: u.border }]}>
                  <Text style={[styles.warningText, { color: u.color }]}>
                    {pct <= 10
                      ? "🚨 Critically low — contact your pharmacy immediately."
                      : "⚠️ Your medication may need refilling soon."}
                  </Text>
                </View>
              )}

              {/* Refill Check Button */}
              {med.remainingQuantity != null && (
                <TouchableOpacity
                  style={[styles.refillCheckBtn, isTrig && styles.refillCheckBtnDisabled]}
                  onPress={() => triggerRefillCheck(med._id, med.name)}
                  disabled={isTrig}
                >
                  <Text style={styles.refillCheckBtnText}>
                    {isTrig ? "Checking..." : "🔔 Set refill reminder"}
                  </Text>
                </TouchableOpacity>
              )}

              {med.remainingQuantity == null && (
                <Text style={styles.noStockText}>
                  Stock tracking not enabled for this medication.
                </Text>
              )}
            </View>
          );
        })
      )}

      <Text style={styles.footerText}>
        Contact your pharmacist or healthcare provider to arrange refills.
        Do not skip doses while waiting for a refill.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content:   { padding: 20, paddingBottom: 100 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center" },

  pageTitle:    { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginTop: 48 },
  pageSubtitle: { fontSize: 13, color: "#9ca3af", marginTop: 2, marginBottom: 16 },

  disclaimer: {
    backgroundColor: "#eff6ff", borderRadius: 10,
    padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  disclaimerText: { fontSize: 11, color: "#1d4ed8", lineHeight: 16 },

  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 8, marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 10 },
  countBadge: {
    backgroundColor: "#ef4444", borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  countBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  refillCard: {
    borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1,
  },
  refillHeader:   { marginBottom: 12 },
  refillTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  refillMedName:  { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  urgencyBadge:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  urgencyBadgeText: { fontSize: 11, fontWeight: "700" },
  runOutText:     { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  runOutDate:     { fontSize: 11, color: "#9ca3af" },

  refillActions: { flexDirection: "row", gap: 8 },
  refilledBtn: {
    flex: 1, backgroundColor: "#1a3a5c",
    borderRadius: 8, padding: 10, alignItems: "center",
  },
  refilledBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  dismissBtn: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 8, padding: 10, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
  },
  dismissBtnText: { color: "#6b7280", fontSize: 12, fontWeight: "600" },

  emptyBox: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 32, alignItems: "center",
    borderWidth: 1, borderColor: "#f3f4f6",
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 6 },
  emptyText:  { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 18 },

  medCard: {
    backgroundColor: "#fff", borderRadius: 14,
    padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  medHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  medTitleCol: { flex: 1 },
  medName:     { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  medDosage:   { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  stockBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  stockBadgeText: { fontSize: 12, fontWeight: "700" },

  stockSection:  { marginBottom: 10 },
  stockBarBg: {
    height: 8, backgroundColor: "#f3f4f6",
    borderRadius: 4, overflow: "hidden", marginBottom: 6,
  },
  stockBarFill:  { height: 8, borderRadius: 4 },
  stockLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  stockPct:      { fontSize: 11, color: "#9ca3af" },
  daysLeft:      { fontSize: 11, fontWeight: "600" },

  warningBox: {
    borderRadius: 8, padding: 10,
    marginBottom: 10, borderWidth: 1,
  },
  warningText: { fontSize: 12, lineHeight: 17 },

  refillCheckBtn: {
    backgroundColor: "#f8f9fa", borderRadius: 8,
    padding: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  refillCheckBtnDisabled: { opacity: 0.5 },
  refillCheckBtnText: { fontSize: 12, color: "#1a3a5c", fontWeight: "600" },

  noStockText: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },

  footerText: {
    fontSize: 11, color: "#d1d5db",
    textAlign: "center", marginTop: 16, lineHeight: 16,
  },
}); 