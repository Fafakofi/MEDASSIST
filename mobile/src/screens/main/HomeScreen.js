import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../lib/api";

import { useNavigation } from "@react-navigation/native";

const adherenceColor = (rate) => {
  if (rate >= 80) return "#22c55e";
  if (rate >= 50) return "#f59e0b";
  return "#ef4444";
};

export default function HomeScreen() {
  const [user, setUser]           = useState(null);
  const [logs, setLogs]           = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const navigation = useNavigation();

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, interactionsRes, userStr] = await Promise.all([
        api.get("/schedules/adherence"),
        api.get("/interactions"),
        AsyncStorage.getItem("user"),
      ]);

      setLogs(logsRes.data);
      setInteractions(interactionsRes.data.filter((i) => !i.acknowledged));
      if (userStr) setUser(JSON.parse(userStr));
    } catch (err) {
      console.error("Failed to load home data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const updateStatus = async (logId, status) => {
    setUpdatingId(logId);
    try {
      await api.patch(`/schedules/adherence/${logId}`, { status });
      fetchData();
    } catch (err) {
      console.error("Failed to update dose status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Today's logs sorted by time ───────────────────────────────────────────
  const todayLogs = logs
    .filter((l) => {
      const d = new Date(l.scheduledTime);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    })
    .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

  // ── Adherence rate ────────────────────────────────────────────────────────
  const completed = logs.filter((l) => l.status !== "pending");
  const taken     = logs.filter((l) => l.status === "taken");
  const rate      = completed.length > 0
    ? Math.round((taken.length / completed.length) * 100)
    : null;

  const statusConfig = {
    taken:   { icon: "✓", color: "#22c55e", bg: "#f0fdf4", label: "Taken",    border: "#bbf7d0" },
    missed:  { icon: "✕", color: "#ef4444", bg: "#fff1f2", label: "Missed",   border: "#fecdd3" },
    skipped: { icon: "—", color: "#f59e0b", bg: "#fffbeb", label: "Skipped",  border: "#fde68a" },
    pending: { icon: "○", color: "#9ca3af", bg: "#f9fafb", label: "Upcoming", border: "#f3f4f6" },
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
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.name}>{user?.name?.split(" ")[0] || "there"} 👋</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Notifications")}
          style={styles.bellBtn}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {interactions.length > 0 && (
            <View style={styles.bellBadge} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("ProfileModal")}
          style={styles.avatar}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>
            {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>

      {/* Interaction Warning */}
      {interactions.length > 0 && (
        <View style={styles.interactionBanner}>
          <Text style={styles.interactionIcon}>⚠️</Text>
          <View style={styles.interactionContent}>
            <Text style={styles.interactionTitle}>Potential Drug Interaction</Text>
            <Text style={styles.interactionText}>
              {interactions[0].description?.slice(0, 100)}...
            </Text>
            <Text style={styles.interactionSub}>
              Please consult your healthcare professional before making any changes.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Interactions")}
              style={styles.viewDetailsBtn}
              >
              <Text style={styles.viewDetailsBtnText}>View details →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Today's Medications Timeline */}
      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Today's medications</Text>
        <View style={styles.divider} />

        {todayLogs.length === 0 ? (
          <View style={styles.emptyTimeline}>
            <Text style={styles.emptyText}>No medications scheduled for today.</Text>
          </View>
        ) : (
          todayLogs.map((log, index) => {
            const s = statusConfig[log.status] || statusConfig.pending;
            const isLast = index === todayLogs.length - 1;
            const isUpdating = updatingId === log._id;

            return (
              <View key={log._id}>
                <View style={styles.timelineRow}>
                  {/* Time */}
                  <Text style={styles.timeText}>
                    {new Date(log.scheduledTime).toLocaleTimeString("en-US", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </Text>

                  {/* Dot + Line */}
                  <View style={styles.timelineDotCol}>
                    <View style={[styles.timelineDot, { backgroundColor: s.color }]}>
                      <Text style={styles.timelineDotIcon}>{s.icon}</Text>
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>

                  {/* Content */}
                  <View style={[styles.timelineContent, { backgroundColor: s.bg, borderColor: s.border }]}>
                    <View style={styles.timelineContentHeader}>
                      <Text style={styles.medName}>
                        {log.medicationId?.name || "Medication"}
                      </Text>
                      <Text style={[styles.statusLabel, { color: s.color }]}>
                        {s.label}
                      </Text>
                    </View>
                    <Text style={styles.medDosage}>
                      {log.medicationId?.dosage || ""}
                    </Text>

                    {/* Action Buttons for Pending */}
                    {log.status === "pending" && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.takenBtn]}
                          onPress={() => updateStatus(log._id, "taken")}
                          disabled={isUpdating}
                        >
                          <Text style={styles.takenBtnText}>
                            {isUpdating ? "..." : "✓ Taken"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.skippedBtn]}
                          onPress={() => updateStatus(log._id, "skipped")}
                          disabled={isUpdating}
                        >
                          <Text style={styles.skippedBtnText}>Skip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.missedBtn]}
                          onPress={() => updateStatus(log._id, "missed")}
                          disabled={isUpdating}
                        >
                          <Text style={styles.missedBtnText}>Missed</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.divider} />

        {/* Adherence */}
        <View style={styles.adherenceRow}>
          <Text style={styles.adherenceLabel}>Adherence</Text>
          <Text style={[
            styles.adherenceValue,
            { color: rate !== null ? adherenceColor(rate) : "#9ca3af" }
          ]}>
            {rate !== null ? `${rate}%` : "N/A"}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{taken.length}</Text>
          <Text style={styles.statLabel}>Taken</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: logs.filter((l) => l.status === "missed").length > 0 ? "#ef4444" : "#1a1a1a" }]}>
            {logs.filter((l) => l.status === "missed").length}
          </Text>
          <Text style={styles.statLabel}>Missed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>
            {logs.filter((l) => l.status === "pending").length}
          </Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>
            {logs.filter((l) => l.status === "skipped").length}
          </Text>
          <Text style={styles.statLabel}>Skipped</Text>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚕️ Always follow your doctor's instructions. This app is a
          decision-support tool only and does not replace professional
          medical advice.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 20, paddingBottom: 100 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginTop: 48, marginBottom: 20,
  },
  greeting:   { fontSize: 13, color: "#9ca3af" },
  name:       { fontSize: 24, fontWeight: "700", color: "#1a1a1a" },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#1a3a5c",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  interactionBanner: {
    flexDirection: "row", gap: 10,
    backgroundColor: "#fff7ed", borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: "#fed7aa",
  },
  interactionIcon:    { fontSize: 20 },
  interactionContent: { flex: 1 },
  interactionTitle:   { fontSize: 13, fontWeight: "700", color: "#c2410c", marginBottom: 2 },
  interactionText:    { fontSize: 12, color: "#7c3800", lineHeight: 17, marginBottom: 4 },
  interactionSub:     { fontSize: 11, color: "#9a4500", fontStyle: "italic" },

  timelineCard: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  timelineTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 12 },
  divider:       { height: 1, backgroundColor: "#f3f4f6", marginBottom: 12 },

  emptyTimeline: { paddingVertical: 20, alignItems: "center" },
  emptyText:     { fontSize: 13, color: "#9ca3af" },

  timelineRow: {
    flexDirection: "row", gap: 10,
    marginBottom: 0, alignItems: "flex-start",
  },
  timeText: {
    width: 60, fontSize: 12,
    color: "#6b7280", paddingTop: 8,
    fontWeight: "500",
  },
  timelineDotCol: { alignItems: "center", width: 24 },
  timelineDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  timelineDotIcon: { fontSize: 11, color: "#fff", fontWeight: "700" },
  timelineLine:    { width: 2, flex: 1, backgroundColor: "#f3f4f6", minHeight: 20, marginTop: 2 },

  timelineContent: {
    flex: 1, borderRadius: 10, padding: 10,
    marginBottom: 10, borderWidth: 1,
  },
  timelineContentHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 2,
  },
  medName:     { fontSize: 13, fontWeight: "700", color: "#1a1a1a", flex: 1 },
  statusLabel: { fontSize: 11, fontWeight: "600" },
  medDosage:   { fontSize: 12, color: "#6b7280" },

  actionRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  takenBtn:      { backgroundColor: "#1a3a5c" },
  takenBtnText:  { color: "#fff", fontSize: 11, fontWeight: "600" },
  skippedBtn:    { backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a" },
  skippedBtnText:{ color: "#b45309", fontSize: 11, fontWeight: "600" },
  missedBtn:     { backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3" },
  missedBtnText: { color: "#be123c", fontSize: 11, fontWeight: "600" },

  adherenceRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingTop: 4,
  },
  adherenceLabel: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  adherenceValue: { fontSize: 18, fontWeight: "700" },

  statsRow: {
    flexDirection: "row", gap: 8, marginBottom: 16,
  },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12,
    padding: 12, alignItems: "center",
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  statNum:   { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  statLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },

  disclaimer: {
    backgroundColor: "#eff6ff", borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: "#bfdbfe",
  },
  disclaimerText: { fontSize: 11, color: "#1d4ed8", lineHeight: 16 },

  viewDetailsBtn:     { marginTop: 8, alignSelf: "flex-start" },
viewDetailsBtnText: { fontSize: 12, color: "#c2410c", fontWeight: "700", textDecorationLine: "underline" },

  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  bellBtn:       { position: "relative", padding: 4 },
  bellIcon:      { fontSize: 22 },
  bellBadge: {
    position: "absolute", top: 2, right: 2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1.5, borderColor: "#f8f9fa",
  },
});