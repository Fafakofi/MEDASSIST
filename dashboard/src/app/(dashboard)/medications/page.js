"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const badge = (text, color) => {
  const styles = {
    green:  "bg-green-50 text-green-700",
    red:    "bg-red-50 text-red-600",
    gray:   "bg-gray-100 text-gray-500",
    blue:   "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${styles[color] || styles.gray}`}>
      {text}
    </span>
  );
};

export default function MedicationsPage() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");

  useEffect(() => {
    api.get("/medications")
      .then(({ data }) => setMedications(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = medications.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.genericName?.toLowerCase().includes(search.toLowerCase())
  );

  const stockLevel = (remaining, total) => {
    if (!remaining || !total) return { label: "Unknown", color: "gray" };
    const pct = (remaining / total) * 100;
    if (pct <= 20) return { label: "Low stock",  color: "red" };
    if (pct <= 50) return { label: "Half stock", color: "yellow" };
    return { label: "In stock", color: "green" };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-sm">Loading medications...</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-800">Medications</h1>
          <p className="text-sm text-gray-400 mt-0.5">All active medications across patients.</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
          {medications.length} total
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name or generic name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#4a9ede] focus:ring-1 focus:ring-[#4a9ede] transition"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">💊</p>
            <p className="text-sm text-gray-400">
              {search ? "No medications match your search." : "No medications found."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Medication</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Dosage</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Form</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Stock</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Prescribed by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((med) => {
                const stock = stockLevel(med.remainingQuantity, med.totalQuantity);
                return (
                  <tr key={med._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">{med.name}</p>
                      {med.genericName && (
                        <p className="text-xs text-gray-400 mt-0.5">{med.genericName}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{med.dosage}</td>
                    <td className="px-5 py-4 text-gray-500 capitalize">{med.form || "—"}</td>
                    <td className="px-5 py-4">
                      <div>
                        {badge(stock.label, stock.color)}
                        {med.remainingQuantity != null && (
                          <p className="text-xs text-gray-400 mt-1">
                            {med.remainingQuantity} / {med.totalQuantity || "?"} remaining
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {badge(med.isActive ? "Active" : "Inactive", med.isActive ? "blue" : "gray")}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {med.prescribedBy || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-300 text-center">
        This information is for monitoring purposes only and does not constitute medical advice.
      </p>
    </div>
  );
}