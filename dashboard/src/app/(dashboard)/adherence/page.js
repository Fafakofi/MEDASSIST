"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const statusConfig = {
  taken:   { label: "Taken",   style: "bg-green-50 text-green-700"  },
  missed:  { label: "Missed",  style: "bg-red-50 text-red-600"      },
  skipped: { label: "Skipped", style: "bg-yellow-50 text-yellow-700"},
  pending: { label: "Pending", style: "bg-gray-100 text-gray-500"   },
};

export default function AdherencePage() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");

  useEffect(() => {
    api.get("/schedules/adherence")
      .then(({ data }) => setLogs(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total   = logs.length;
  const taken   = logs.filter((l) => l.status === "taken").length;
  const missed  = logs.filter((l) => l.status === "missed").length;
  const pending = logs.filter((l) => l.status === "pending").length;
  const rate    = total > 0 ? Math.round((taken / total) * 100) : 0;

  // ── Chart Data — group by date ─────────────────────────────────────────────
  const chartData = (() => {
    const grouped = {};
    logs.forEach((log) => {
      const date = new Date(log.scheduledTime).toLocaleDateString("en-US", {
        month: "short", day: "numeric",
      });
      if (!grouped[date]) grouped[date] = { date, taken: 0, missed: 0, skipped: 0 };
      if (log.status === "taken")   grouped[date].taken++;
      if (log.status === "missed")  grouped[date].missed++;
      if (log.status === "skipped") grouped[date].skipped++;
    });
    return Object.values(grouped).slice(-14);
  })();

  // ── Filtered Logs ──────────────────────────────────────────────────────────
  const filtered = logs.filter((l) =>
    filter === "all" ? true : l.status === filter
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-sm">Loading adherence data...</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-lg font-medium text-gray-800">Adherence</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Track how consistently patients are taking their medications.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Adherence rate",  value: `${rate}%`,  color: rate >= 80 ? "text-green-600" : "text-red-500" },
          { label: "Doses taken",     value: taken,        color: "text-gray-800" },
          { label: "Doses missed",    value: missed,       color: missed > 0 ? "text-red-500" : "text-gray-800" },
          { label: "Pending doses",   value: pending,      color: "text-gray-800" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-medium ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-medium text-gray-800 mb-4">
            Dose history — last 14 days
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="taken"   stroke="#22c55e" strokeWidth={2} dot={false} name="Taken" />
              <Line type="monotone" dataKey="missed"  stroke="#ef4444" strokeWidth={2} dot={false} name="Missed" />
              <Line type="monotone" dataKey="skipped" stroke="#f59e0b" strokeWidth={2} dot={false} name="Skipped" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter + Log Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-medium text-gray-800">Dose log</h2>
          <div className="flex gap-2">
            {["all", "taken", "missed", "skipped", "pending"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition capitalize ${
                  filter === f
                    ? "bg-[#1a3a5c] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm text-gray-400">No dose logs found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Medication</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Scheduled</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Taken at</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((log) => {
                const s = statusConfig[log.status] || statusConfig.pending;
                return (
                  <tr key={log._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {log.medicationId?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(log.scheduledTime).toLocaleString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {log.takenAt
                        ? new Date(log.takenAt).toLocaleString("en-US", {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${s.style}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {log.notes || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-300 text-center">
        Adherence data is for monitoring purposes only and does not replace clinical assessment.
      </p>
    </div>
  );
}