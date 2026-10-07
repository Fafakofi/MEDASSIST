import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import api from "../../lib/api";
import { useNavigation } from "@react-navigation/native";

export default function MedicationsScreen() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const navigation = useNavigation();

  const fetchMedications = useCallback(async () => {
    try {
      const { data } = await api.get("/medications");
      setMedications(data);
    } catch (err) {
      console.error("Failed to load medications", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMedications(); }, [fetchMedications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedications();
  };

  const stockLevel = (remaining, total) => {
    if (remaining == null || !total) return { pct: 0, color: "#d1d5db", label: "Unknown" };
    const pct = Math.round((remaining / total) * 100);
    if (pct <= 20) return { pct, color: "#ef4444", label: "Low stock" };
    if (pct <= 50) return { pct, color: "#f59e0b", label: "Half stock" };
    return { pct, color: "#22c55e", label: "In stock" };
  };

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
      <Text style={styles.pageTitle}>My medications</Text>
      <Text style={styles.pageSubtitle}>
        {medications.length} active medication{medications.length !== 1 ? "s" : ""}
      </Text>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚕️ Always take medications exactly as prescribed by your doctor.
        </Text>
      </View>

      {/* Medications List */}
      {medications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>💊</Text>
          <Text style={styles.emptyTitle}>No medications yet</Text>
          <Text style={styles.emptyText}>
            Your medications will appear here once your healthcare provider adds them.
          </Text>
        </View>
      ) : (
        medications.map((med) => {
          const stock = stockLevel(med.remainingQuantity, med.totalQuantity);
          return (
            <View key={med._id} style={styles.card}>

              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <View style={[styles.badge, { backgroundColor: med.isActive ? "#f0fdf4" : "#f3f4f6" }]}>
                    <Text style={[styles.badgeText, { color: med.isActive ? "#16a34a" : "#6b7280" }]}>
                      {med.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
                {med.genericName && (
                  <Text style={styles.genericName}>{med.genericName}</Text>
                )}
              </View>

              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Dosage</Text>
                  <Text style={styles.detailValue}>{med.dosage}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Form</Text>
                  <Text style={styles.detailValue}>{med.form || "—"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Prescribed by</Text>
                  <Text style={styles.detailValue}>{med.prescribedBy || "—"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Remaining</Text>
                  <Text style={styles.detailValue}>
                    {med.remainingQuantity != null ? `${med.remainingQuantity} doses` : "—"}
                  </Text>
                </View>
              </View>

              {/* Stock Bar */}
              {med.remainingQuantity != null && med.totalQuantity && (
                <View style={styles.stockSection}>
                  <View style={styles.stockLabelRow}>
                    <Text style={styles.stockLabel}>Stock level</Text>
                    <Text style={[styles.stockPct, { color: stock.color }]}>
                      {stock.pct}% · {stock.label}
                    </Text>
                  </View>
                  <View style={styles.stockBarBg}>
                    <View style={[styles.stockBarFill, {
                      width: `${stock.pct}%`,
                      backgroundColor: stock.color,
                    }]} />
                  </View>
                </View>
              )}

              {/* Instructions */}
              {med.instructions && (
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsLabel}>Instructions</Text>
                  <Text style={styles.instructionsText}>{med.instructions}</Text>
                </View>
              )}

              {/* Low Stock Warning */}
              {stock.pct <= 20 && med.remainingQuantity != null && (
                <View style={styles.lowStockWarning}>
                  <Text style={styles.lowStockText}>
                    ⚠️ Running low — contact your pharmacy to arrange a refill.
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Refills")}
                    style={styles.refillNavBtn}
                  >
                    <Text style={styles.refillNavBtnText}>View refills →</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          );
        })
      )}

      <Text style={styles.footerDisclaimer}>
        Medication information is for reference only. Always follow your
        healthcare provider's instructions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 20, paddingBottom: 100 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center" },

  pageTitle:    { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginTop: 48 },
  pageSubtitle: { fontSize: 13, color: "#9ca3af", marginTop: 2, marginBottom: 16 },

  disclaimer: {
    backgroundColor: "#eff6ff", borderRadius: 10,
    padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  disclaimerText: { fontSize: 11, color: "#1d4ed8", lineHeight: 16 },

  emptyBox: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 32, alignItems: "center",
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a", marginBottom: 6 },
  emptyText:  { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 18 },

  card: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  cardHeader:   { marginBottom: 12 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  medName:      { fontSize: 16, fontWeight: "700", color: "#1a1a1a", flex: 1 },
  genericName:  { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  detailsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 12, marginBottom: 14,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
    paddingTop: 12,
  },
  detailItem:  { width: "45%" },
  detailLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },

  stockSection:  { marginBottom: 12 },
  stockLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  stockLabel:    { fontSize: 12, color: "#6b7280" },
  stockPct:      { fontSize: 12, fontWeight: "600" },
  stockBarBg: {
    height: 6, backgroundColor: "#f3f4f6",
    borderRadius: 3, overflow: "hidden",
  },
  stockBarFill: { height: 6, borderRadius: 3 },

  instructionsBox: {
    backgroundColor: "#f8f9fa", borderRadius: 8,
    padding: 10, marginBottom: 10,
  },
  instructionsLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 3 },
  instructionsText:  { fontSize: 12, color: "#4b5563", lineHeight: 17 },

  lowStockWarning: {
    backgroundColor: "#fff7ed", borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: "#fed7aa",
  },
  lowStockText: { fontSize: 12, color: "#c2410c", lineHeight: 17 },

  footerDisclaimer: {
    fontSize: 11, color: "#d1d5db",
    textAlign: "center", marginTop: 12, lineHeight: 16,
  },

  refillNavBtn:     { marginTop: 6, alignSelf: "flex-start" },
  refillNavBtnText: { fontSize: 12, color: "#c2410c", fontWeight: "700", textDecorationLine: "underline" },
});