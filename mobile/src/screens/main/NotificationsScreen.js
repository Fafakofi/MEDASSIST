import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import api from "../../lib/api";

const notificationTypes = {
  interaction: { icon: "⚠️", color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", label: "Drug Interaction" },
  sideEffect:  { icon: "🔴", color: "#7f1d1d", bg: "#fff1f2", border: "#fecdd3", label: "Side Effect Alert" },
  refill:      { icon: "💊", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", label: "Refill Reminder" },
  missed:      { icon: "⏰", color: "#b45309", bg: "#fffbeb", border: "#fde68a", label: "Missed Dose" },
  escalation:  { icon: "🚨", color: "#7f1d1d", bg: "#fff1f2", border: "#fecdd3", label: "Health Alert" },
  reminder:    { icon: "🔔", color: "#1a3a5c", bg: "#f0f9ff", border: "#bae6fd", label: "Medication Reminder" },
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [interactionsRes, sideEffectsRes, refillsRes, logsRes] = await Promise.all([
        api.get("/interactions"),
        api.get("/side-effects"),
        api.get("/refills"),
        api.get("/schedules/adherence"),
      ]);

      const items = [];

      // Interaction alerts
      const interactions = Array.isArray(interactionsRes.data) ? interactionsRes.data : [];
      interactions.forEach((a) => {
        items.push({
          id:      `interaction-${a._id}`,
          type:    "interaction",
          title:   `Drug Interaction — ${a.severity?.toUpperCase()}`,
          body:    a.description?.slice(0, 100) + "...",
          date:    a.createdAt,
          read:    a.acknowledged,
          data:    a,
          action:  () => navigation.navigate("Interactions"),
        });
      });

      // Side effect reports
      const sideEffects = Array.isArray(sideEffectsRes.data) ? sideEffectsRes.data : [];
      sideEffects.forEach((s) => {
        const type = s.escalated ? "escalation" : "sideEffect";
        items.push({
          id:    `side-${s._id}`,
          type,
          title: s.escalated
            ? "🚨 Health Alert — Seek medical attention"
            : `Side Effect Report — ${s.severity}`,
          body:  s.agentAnalysis?.recommendation?.slice(0, 100)
            || s.symptoms.join(", "),
          date:  s.createdAt,
          read:  !s.flaggedForReview,
          data:  s,
        });
      });

      // Refill reminders
      const refills = Array.isArray(refillsRes.data) ? refillsRes.data : [];
      refills.filter((r) => ["pending", "sent"].includes(r.status)).forEach((r) => {
        items.push({
          id:    `refill-${r._id}`,
          type:  "refill",
          title: `Refill Reminder — ${r.medicationId?.name || "Medication"}`,
          body:  r.estimatedRunOutDate
            ? `Estimated to run out on ${new Date(r.estimatedRunOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : "Your medication may need refilling soon.",
          date:  r.createdAt,
          read:  r.status === "dismissed" || r.status === "refilled",
          data:  r,
          action: () => navigation.navigate("Refills"),
        });
      });

      // Missed doses
      const logs = Array.isArray(logsRes.data) ? logsRes.data : [];
      logs.filter((l) => l.status === "missed").forEach((l) => {
        items.push({
          id:    `missed-${l._id}`,
          type:  "missed",
          title: `Missed Dose — ${l.medicationId?.name || "Medication"}`,
          body:  `You missed your ${new Date(l.scheduledTime).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          })} dose of ${l.medicationId?.name || "medication"}.`,
          date:  l.scheduledTime,
          read:  false,
          data:  l,
          action: () => navigation.navigate("Schedule"),
        });
      });

      // Sort by date newest first
      items.sort((a, b) => new Date(b.date) - new Date(a.date));
      setNotifications(items);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const unread = notifications.filter((n) => !n.read).length;

  const formatDate = (date) => {
    const d    = new Date(date);
    const now  = new Date();
    const diff = Math.floor((now - d) / (1000 * 60));

    if (diff < 1)   return "Just now";
    if (diff < 60)  return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
          <Text style={styles.pageTitle}>Notifications</Text>
          <Text style={styles.pageSubtitle}>
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </Text>
        </View>
        {unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unread}</Text>
          </View>
        )}
      </View>

      {/* Empty State */}
      {notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>
            Medication reminders, interaction alerts, and refill
            notifications will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {notifications.map((notif) => {
            const config = notificationTypes[notif.type] || notificationTypes.reminder;
            return (
              <TouchableOpacity
                key={notif.id}
                onPress={notif.action}
                activeOpacity={notif.action ? 0.7 : 1}
                style={[
                  styles.notifCard,
                  { borderColor: notif.read ? "#f3f4f6" : config.border },
                  !notif.read && { backgroundColor: config.bg },
                ]}
              >
                <View style={styles.notifRow}>
                  {/* Icon */}
                  <View style={[styles.iconBox, { backgroundColor: config.bg, borderColor: config.border }]}>
                    <Text style={styles.iconText}>{config.icon}</Text>
                  </View>

                  {/* Content */}
                  <View style={styles.notifContent}>
                    <View style={styles.notifTitleRow}>
                      <Text style={[styles.notifTitle, !notif.read && { color: config.color }]} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      {!notif.read && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}
                    </View>
                    <Text style={styles.notifBody} numberOfLines={2}>
                      {notif.body}
                    </Text>
                    <View style={styles.notifFooter}>
                      <Text style={styles.notifType}>{config.label}</Text>
                      <Text style={styles.notifDate}>{formatDate(notif.date)}</Text>
                    </View>
                  </View>

                  {/* Arrow */}
                  {notif.action && (
                    <Text style={styles.arrow}>›</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚕️ Notifications are generated by an AI system for decision-support
          only. Always consult your healthcare provider for medical decisions.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content:   { padding: 20, paddingBottom: 100 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginTop: 48, marginBottom: 20,
  },
  pageTitle:    { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  pageSubtitle: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  unreadBadge: {
    backgroundColor: "#ef4444", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 4,
  },
  unreadBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  emptyBox: {
    backgroundColor: "#fff", borderRadius: 16,
    padding: 32, alignItems: "center",
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 6 },
  emptyText:  { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 18 },

  list: { gap: 8 },

  notifCard: {
    backgroundColor: "#fff", borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: "#f3f4f6",
  },
  notifRow:    { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, flexShrink: 0,
  },
  iconText:    { fontSize: 18 },
  notifContent:{ flex: 1 },
  notifTitleRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 3,
  },
  notifTitle:  { fontSize: 13, fontWeight: "700", color: "#1a1a1a", flex: 1 },
  unreadDot:   { width: 7, height: 7, borderRadius: 4, marginLeft: 6 },
  notifBody:   { fontSize: 12, color: "#6b7280", lineHeight: 17, marginBottom: 6 },
  notifFooter: { flexDirection: "row", justifyContent: "space-between" },
  notifType:   { fontSize: 10, color: "#9ca3af", fontWeight: "600" },
  notifDate:   { fontSize: 10, color: "#9ca3af" },
  arrow:       { fontSize: 20, color: "#d1d5db", alignSelf: "center" },

  disclaimer: {
    backgroundColor: "#eff6ff", borderRadius: 10,
    padding: 12, marginTop: 16,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  disclaimerText: { fontSize: 11, color: "#1d4ed8", lineHeight: 16 },
});