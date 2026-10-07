"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const severityConfig = {
  contraindicated: { bg: "bg-red-50",     border: "border-red-200",    badge: "bg-red-100 text-red-700",       icon: "text-red-500",    label: "Contraindicated" },
  major:           { bg: "bg-red-50",     border: "border-red-200",    badge: "bg-red-100 text-red-700",       icon: "text-red-500",    label: "Major" },
  moderate:        { bg: "bg-yellow-50",  border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700", icon: "text-yellow-500", label: "Moderate" },
  minor:           { bg: "bg-blue-50",    border: "border-blue-200",   badge: "bg-blue-100 text-blue-700",     icon: "text-blue-400",   label: "Minor" },
};

const AlertIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

export default function AlertsPage() {
  const [alerts, setAlerts]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all");
  const [acknowledging, setAcknowledging] = useState(null);

  useEffect(() => {
    api.get("/interactions")
      .then(({ data }) => setAlerts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAcknowledge = async (alertId) => {
    setAcknowledging(alertId);
    try {
      await api.patch(`/interactions/${alertId}/acknowledge`);
      setAlerts((prev) =>
        prev.map((a) => a._id === alertId ? { ...a, acknowledged: true } : a)
      );
    } catch (err) {
      console.error("Failed to acknowledge alert", err);
    } finally {
      setAcknowledging(null);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === "unreviewed") return !a.acknowledged;
    if (filter === "reviewed")   return a.acknowledged;
    return true;
  });

  const unreviewed = alerts.filter((a) => !a.acknowledged).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-sm">Loading alerts...</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-800">Interaction alerts</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Drug interaction flags detected by the AI agent.
          </p>
        </div>
        {unreviewed > 0 && (
          <span className="bg-red-50 text-red-600 text-xs font-medium px-3 py-1.5 rounded-full border border-red-200">
            {unreviewed} unreviewed
          </span>
        )}
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3 text-xs text-yellow-700">
        ⚠️ These alerts are AI-generated for decision-support only. Always verify with a licensed
        pharmacist or physician before taking clinical action.
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["all", "unreviewed", "reviewed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition capitalize ${
              filter === f
                ? "bg-[#1a3a5c] text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-sm text-gray-400">
            {filter === "unreviewed" ? "No unreviewed alerts." : "No alerts found."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const s = severityConfig[alert.severity] || severityConfig.minor;
            return (
              <div
                key={alert._id}
                className={`rounded-xl border p-5 transition ${s.bg} ${s.border} ${
                  alert.acknowledged ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <AlertIcon className={`flex-shrink-0 mt-0.5 ${s.icon}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${s.badge}`}>
                          {s.label}
                        </span>
                        {alert.acknowledged && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            Reviewed
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(alert.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {alert.description || "Potential drug interaction detected."}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 capitalize">
                        Source: {alert.source || "AI agent"}
                      </p>
                    </div>
                  </div>

                  {/* Acknowledge Button */}
                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert._id)}
                      disabled={acknowledging === alert._id}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition flex-shrink-0 disabled:opacity-50"
                    >
                      <CheckIcon />
                      {acknowledging === alert._id ? "Saving..." : "Mark reviewed"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-300 text-center">
        AI-generated alerts are for informational purposes only and do not replace professional medical judgment.
      </p>
    </div>
  );
}