import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import api from "../../lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const statusConfig = {
  taken:   { icon: "✓", color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", label: "Taken"    },
  missed:  { icon: "✕", color: "#ef4444", bg: "#fff1f2", border: "#fecdd3", label: "Missed"   },
  skipped: { icon: "—", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "Skipped"  },
  pending: { icon: "○", color: "#9ca3af", bg: "#f9fafb", border: "#f3f4f6", label: "Upcoming" },
};

export default function ScheduleScreen() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [updatingId, setUpdatingId] = useState(null);
  const [view, setView]           = useState("day"); // "day" | "week"

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await api.get("/schedules/adherence");
      setLogs(data);
    } catch (err) {
      console.error("Failed to load logs", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const onRefresh = () => { setRefreshing(true); fetchLogs(); };

  const updateStatus = async (logId, status) => {
    setUpdatingId(logId);
    try {
      await api.patch(`/schedules/adherence/${logId}`, { status });
      fetchLogs();
    } catch (err) {
      console.error("Failed to update", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Day Navigation ─────────────────────────────────────────────────────────
  const goToPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const isToday = (date) => date.toDateString() === new Date().toDateString();

  // ── Filter logs for selected date ──────────────────────────────────────────
  const logsForDate = (date) => logs
    .filter((l) => new Date(l.scheduledTime).toDateString() === date.toDateString())
    .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

  // ── Week view data ─────────────────────────────────────────────────────────
  const getWeekDays = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 6 + i);
      return d;
    });
  };

  const adherenceForDay = (date) => {
    const dayLogs = logsForDate(date).filter((l) => l.status !== "pending");
    if (dayLogs.length === 0) return null;
    const taken = dayLogs.filter((l) => l.status === "taken").length;
    return Math.round((taken / dayLogs.length) * 100);
  };

  // ── Overall stats ──────────────────────────────────────────────────────────
  const completed = logs.filter((l) => l.status !== "pending");
  const taken     = logs.filter((l) => l.status === "taken");
  const overall   = completed.length > 0
    ? Math.round((taken.length / completed.length) * 100)
    : null;

  const selectedDateLogs = logsForDate(selectedDate);

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
      <Text style={styles.pageTitle}>Schedule</Text>

      {/* View Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === "day" && styles.toggleBtnActive]}
          onPress={() => setView("day")}
        >
          <Text style={[styles.toggleBtnText, view === "day" && styles.toggleBtnTextActive]}>
            Day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === "week" && styles.toggleBtnActive]}
          onPress={() => setView("week")}
        >
          <Text style={[styles.toggleBtnText, view === "week" && styles.toggleBtnTextActive]}>
            Week
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Day View ── */}
      {view === "day" && (
        <>
          {/* Date Navigator */}
          <View style={styles.dateNav}>
            <TouchableOpacity onPress={goToPrevDay} style={styles.navBtn}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.dateCenter}>
              <Text style={styles.dateText}>
                {isToday(selectedDate) ? "Today" : DAYS[selectedDate.getDay()]}
              </Text>
              <Text style={styles.dateSubText}>
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={goToNextDay}
              style={styles.navBtn}
              disabled={isToday(selectedDate)}
            >
              <Text style={[styles.navBtnText, isToday(selectedDate) && styles.navBtnDisabled]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day Stats */}
          {selectedDateLogs.length > 0 && (
            <View style={styles.dayStats}>
              {["taken", "missed", "skipped", "pending"].map((status) => {
                const count = selectedDateLogs.filter((l) => l.status === status).length;
                const s = statusConfig[status];
                return (
                  <View key={status} style={styles.dayStat}>
                    <Text style={[styles.dayStatNum, { color: s.color }]}>{count}</Text>
                    <Text style={styles.dayStatLabel}>{s.label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Timeline */}
          {selectedDateLogs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>No doses scheduled</Text>
              <Text style={styles.emptyText}>
                {isToday(selectedDate)
                  ? "Your caregiver hasn't added a schedule yet."
                  : "No medications were scheduled for this day."}
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {selectedDateLogs.map((log, index) => {
                const s = statusConfig[log.status] || statusConfig.pending;
                const isLast = index === selectedDateLogs.length - 1;
                const isUpdating = updatingId === log._id;

                return (
                  <View key={log._id} style={styles.timelineRow}>
                    {/* Time */}
                    <Text style={styles.timeText}>
                      {new Date(log.scheduledTime).toLocaleTimeString("en-US", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>

                    {/* Dot + Line */}
                    <View style={styles.dotCol}>
                      <View style={[styles.dot, { backgroundColor: s.color }]}>
                        <Text style={styles.dotIcon}>{s.icon}</Text>
                      </View>
                      {!isLast && <View style={styles.line} />}
                    </View>

                    {/* Card */}
                    <View style={[styles.card, { backgroundColor: s.bg, borderColor: s.border }]}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.medName}>
                          {log.medicationId?.name || "Medication"}
                        </Text>
                        <Text style={[styles.statusBadge, { color: s.color }]}>
                          {s.label}
                        </Text>
                      </View>
                      <Text style={styles.medDosage}>
                        {log.medicationId?.dosage || ""}
                      </Text>
                      {log.notes && (
                        <Text style={styles.notes}>{log.notes}</Text>
                      )}

                      {/* Action Buttons */}
                      {log.status === "pending" && (
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.takenBtn]}
                            onPress={() => updateStatus(log._id, "taken")}
                            disabled={isUpdating}
                          >
                            <Text style={styles.takenText}>
                              {isUpdating ? "..." : "✓ Taken"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.skippedBtn]}
                            onPress={() => updateStatus(log._id, "skipped")}
                            disabled={isUpdating}
                          >
                            <Text style={styles.skippedText}>Skip</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.missedBtn]}
                            onPress={() => updateStatus(log._id, "missed")}
                            disabled={isUpdating}
                          >
                            <Text style={styles.missedText}>Missed</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Taken time */}
                      {log.status === "taken" && log.takenAt && (
                        <Text style={styles.takenAt}>
                          Taken at {new Date(log.takenAt).toLocaleTimeString("en-US", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* ── Week View ── */}
      {view === "week" && (
        <>
          <Text style={styles.sectionTitle}>Last 7 days</Text>

          {/* Weekly Bar Chart */}
          <View style={styles.weekCard}>
            {getWeekDays().map((day) => {
              const rate = adherenceForDay(day);
              const isTodays = isToday(day);
              return (
                <TouchableOpacity
                  key={day.toDateString()}
                  style={styles.weekDayCol}
                  onPress={() => { setSelectedDate(day); setView("day"); }}
                >
                  <Text style={[styles.weekDayPct, {
                    color: rate === null ? "#d1d5db"
                      : rate >= 80 ? "#22c55e"
                      : rate >= 50 ? "#f59e0b"
                      : "#ef4444"
                  }]}>
                    {rate !== null ? `${rate}%` : "—"}
                  </Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, {
                      height: `${rate || 0}%`,
                      backgroundColor: rate === null ? "#f3f4f6"
                        : rate >= 80 ? "#22c55e"
                        : rate >= 50 ? "#f59e0b"
                        : "#ef4444",
                    }]} />
                  </View>
                  <Text style={[styles.weekDayLabel, isTodays && styles.weekDayLabelActive]}>
                    {DAYS[day.getDay()]}
                  </Text>
                  <Text style={styles.weekDayDate}>{day.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Overall Stats */}
          <View style={styles.overallCard}>
            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>Overall adherence</Text>
              <Text style={[styles.overallValue, {
                color: overall === null ? "#9ca3af"
                  : overall >= 80 ? "#22c55e"
                  : overall >= 50 ? "#f59e0b"
                  : "#ef4444"
              }]}>
                {overall !== null ? `${overall}%` : "N/A"}
              </Text>
            </View>
            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>Total doses taken</Text>
              <Text style={styles.overallValue}>{taken.length}</Text>
            </View>
            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>Total doses missed</Text>
              <Text style={[styles.overallValue, {
                color: logs.filter((l) => l.status === "missed").length > 0 ? "#ef4444" : "#1a1a1a"
              }]}>
                {logs.filter((l) => l.status === "missed").length}
              </Text>
            </View>
            <View style={[styles.overallRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.overallLabel}>Total doses skipped</Text>
              <Text style={styles.overallValue}>
                {logs.filter((l) => l.status === "skipped").length}
              </Text>
            </View>
          </View>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Tap any day to see its full schedule and mark doses.
            </Text>
          </View>
        </>
      )}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚕️ Always follow your doctor's instructions. This schedule is for
          reference only.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 20, paddingBottom: 100 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center" },

  pageTitle: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginTop: 48, marginBottom: 16 },

  toggleRow: {
    flexDirection: "row", backgroundColor: "#f3f4f6",
    borderRadius: 10, padding: 4, marginBottom: 20,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
  },
  toggleBtnActive:     { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
  toggleBtnText:       { fontSize: 13, color: "#9ca3af", fontWeight: "500" },
  toggleBtnTextActive: { color: "#1a3a5c", fontWeight: "700" },

  dateNav: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16,
    backgroundColor: "#fff", borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: "#f3f4f6",
  },
  navBtn:        { padding: 8 },
  navBtnText:    { fontSize: 24, color: "#1a3a5c", fontWeight: "300" },
  navBtnDisabled:{ color: "#d1d5db" },
  dateCenter:    { alignItems: "center" },
  dateText:      { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  dateSubText:   { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  dayStats: {
    flexDirection: "row", backgroundColor: "#fff",
    borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  dayStat:      { flex: 1, alignItems: "center" },
  dayStatNum:   { fontSize: 18, fontWeight: "700" },
  dayStatLabel: { fontSize: 10, color: "#9ca3af", marginTop: 2 },

  emptyBox: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 32, alignItems: "center",
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 6 },
  emptyText:  { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 18 },

  timeline: { gap: 0 },
  timelineRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  timeText: {
    width: 64, fontSize: 11, color: "#6b7280",
    paddingTop: 10, fontWeight: "500", textAlign: "right",
  },
  dotCol:  { alignItems: "center", width: 28 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  dotIcon: { fontSize: 12, color: "#fff", fontWeight: "700" },
  line:    { width: 2, flex: 1, backgroundColor: "#f3f4f6", minHeight: 24, marginTop: 2 },

  card: {
    flex: 1, borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 2,
  },
  medName:     { fontSize: 13, fontWeight: "700", color: "#1a1a1a", flex: 1 },
  statusBadge: { fontSize: 11, fontWeight: "600" },
  medDosage:   { fontSize: 12, color: "#6b7280" },
  notes:       { fontSize: 11, color: "#9ca3af", marginTop: 4, fontStyle: "italic" },
  takenAt:     { fontSize: 11, color: "#22c55e", marginTop: 6 },

  actionRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  takenBtn:   { backgroundColor: "#1a3a5c" },
  takenText:  { color: "#fff", fontSize: 11, fontWeight: "600" },
  skippedBtn: { backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a" },
  skippedText:{ color: "#b45309", fontSize: 11, fontWeight: "600" },
  missedBtn:  { backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3" },
  missedText: { color: "#be123c", fontSize: 11, fontWeight: "600" },

  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 12 },

  weekCard: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 16, flexDirection: "row",
    justifyContent: "space-between", alignItems: "flex-end",
    marginBottom: 16, borderWidth: 1, borderColor: "#f3f4f6",
    height: 180,
  },
  weekDayCol:        { alignItems: "center", flex: 1 },
  weekDayPct:        { fontSize: 9, fontWeight: "600", marginBottom: 4 },
  barBg: {
    width: 20, height: 80, backgroundColor: "#f3f4f6",
    borderRadius: 10, overflow: "hidden", justifyContent: "flex-end",
    marginBottom: 6,
  },
  barFill:           { width: "100%", borderRadius: 10 },
  weekDayLabel:      { fontSize: 10, color: "#9ca3af", fontWeight: "500" },
  weekDayLabelActive:{ color: "#1a3a5c", fontWeight: "700" },
  weekDayDate:       { fontSize: 10, color: "#9ca3af" },

  overallCard: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "#f3f4f6",
    marginBottom: 16, overflow: "hidden",
  },
  overallRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 14,
    borderBottomWidth: 1, borderBottomColor: "#f9fafb",
  },
  overallLabel: { fontSize: 13, color: "#6b7280" },
  overallValue: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },

  disclaimer: {
    backgroundColor: "#eff6ff", borderRadius: 10,
    padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  disclaimerText: { fontSize: 11, color: "#1d4ed8", lineHeight: 16, textAlign: "center" },
});