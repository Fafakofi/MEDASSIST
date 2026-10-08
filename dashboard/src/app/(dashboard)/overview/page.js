"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const StatCard = ({ label, value, sub, subColor = "text-gray-400" }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5">
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className="text-2xl font-medium text-gray-800">{value}</p>
    {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
  </div>
);

export default function OverviewPage() {
  const [stats, setStats] = useState({
    medications: 0,
    alerts: 0,
    sideEffects: 0,
    refills: 0,
  });
  const [alerts, setAlerts] = useState([]);
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
  try {
    // Fetch assigned patients first
    const patientsRes = await api.get("/patients");
    const patients = Array.isArray(patientsRes.data) ? patientsRes.data : [];

    // Fetch overview for each patient in parallel
    const overviews = await Promise.all(
      patients.map((p) =>
        api.get(`/patients/${p._id}/overview`).then((r) => r.data).catch(() => null)
      )
    );

    const valid = overviews.filter(Boolean);

    // Aggregate across all patients
    const totalMeds     = valid.reduce((sum, o) => sum + o.summary.totalMedications, 0);
    const totalAlerts   = valid.reduce((sum, o) => sum + o.summary.activeAlerts, 0);
    const totalFlagged  = valid.reduce((sum, o) => sum + o.summary.flaggedSideEffects, 0);
    const rates = valid
    .map((o) => o.summary.adherenceRate)
    .filter((r) => r !== null && r !== undefined && !isNaN(r));
      const avgAdherence = rates.length > 0
    ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
    : null;
    

    // Collect all alerts and refills across patients
    const allAlerts  = valid.flatMap((o) => o.alerts || []);
    const allRefills = await api.get("/refills").then((r) => Array.isArray(r.data) ? r.data : []).catch(() => []);
    const pendingRefills = allRefills.filter((r) => r.status === "pending" || r.status === "sent");

    setStats({
      medications: totalMeds,
      alerts:      totalAlerts,
      sideEffects: totalFlagged,
      refills:     pendingRefills.length,
      patients:    patients.length,
      adherence:   avgAdherence,
    });

    setAlerts(allAlerts.slice(0, 3));
    setRefills(pendingRefills.slice(0, 4));
  } catch (err) {
    console.error("Failed to load overview data", err);
  } finally {
    setLoading(false);
  }
}

    fetchAll();
  }, []);

  const severityStyles = {
    contraindicated: { bg: "bg-red-50 border-red-200",   text: "text-red-800",   sub: "text-red-500",   badge: "bg-red-100 text-red-700" },
    major:           { bg: "bg-red-50 border-red-200",   text: "text-red-800",   sub: "text-red-500",   badge: "bg-red-100 text-red-700" },
    moderate:        { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-800", sub: "text-yellow-600", badge: "bg-yellow-100 text-yellow-700" },
    minor:           { bg: "bg-blue-50 border-blue-200", text: "text-blue-800",  sub: "text-blue-500",  badge: "bg-blue-100 text-blue-700" },
  };

  const refillUrgency = (date) => {
    if (!date) return { label: "Soon", style: "bg-yellow-50 text-yellow-700" };
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    if (days <= 2)  return { label: `${days}d`, style: "bg-red-50 text-red-600" };
    if (days <= 5)  return { label: `${days}d`, style: "bg-yellow-50 text-yellow-700" };
    return { label: `${days}d`, style: "bg-green-50 text-green-700" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="text-lg font-medium text-gray-800">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          A snapshot of your patients medication status.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-600">
        This dashboard is a decision-support tool only. Always consult a qualified
        healthcare professional before making clinical decisions.
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Patients"
          value={stats.patients}
          sub="Assigned to you"
        />
        <StatCard
          label="Avg adherence"
          value={(stats.adherence !== null && stats.adherence !== undefined) ? `${stats.adherence}%` : "N/A"}
          sub="Across all patients"
          subColor={stats.adherence >= 80 ? "text-green-500" : stats.adherence >= 50 ? "text-yellow-500" : "text-red-500"}
        />
        <StatCard
          label="Active medications"
          value={stats.medications}
          sub="Across all patients"
        />
        <StatCard
          label="Unreviewed alerts"
          value={stats.alerts}
          sub={stats.alerts > 0 ? "Needs attention" : "All clear"}
          subColor={stats.alerts > 0 ? "text-red-500" : "text-green-500"}
        />
        <StatCard
          label="Flagged side effects"
          value={stats.sideEffects}
          sub={stats.sideEffects > 0 ? "Review required" : "None flagged"}
          subColor={stats.sideEffects > 0 ? "text-yellow-500" : "text-green-500"}
        />
        <StatCard
          label="Refills pending"
          value={stats.refills}
          sub="Within threshold"
          subColor="text-yellow-500"
        />
      </div>

      {/* Alerts + Refills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-800">Recent interaction alerts</h2>
            <a href="/alerts" className="text-xs text-[#4a9ede] hover:underline">View all</a>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-gray-400">No unreviewed alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const s = severityStyles[alert.severity] || severityStyles.minor;
                return (
                  <div key={alert._id} className={`flex items-start gap-3 p-3 rounded-lg border ${s.bg}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.sub}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-xs font-medium ${s.text}`}>
                          {alert.description?.slice(0, 60) || "Interaction detected"}...
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Refills */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-800">Upcoming refills</h2>
            <a href="/adherence" className="text-xs text-[#4a9ede] hover:underline">View adherence</a>
          </div>

          {refills.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">💊</p>
              <p className="text-sm text-gray-400">No pending refills</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {refills.map((refill) => {
                const urgency = refillUrgency(refill.estimatedRunOutDate);
                return (
                  <div key={refill._id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm text-gray-700">
                        {refill.medicationId?.name || "Medication"}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{refill.status}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${urgency.style}`}>
                      {urgency.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}