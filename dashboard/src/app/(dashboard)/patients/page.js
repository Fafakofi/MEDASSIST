"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const adherenceColor = (rate) => {
  if (rate === null) return "text-gray-400";
  if (rate >= 80) return "text-green-600";
  if (rate >= 50) return "text-yellow-600";
  return "text-red-500";
};

export default function PatientsPage() {
  const [patients, setPatients]       = useState([]);
  const [selected, setSelected]       = useState(null);
  const [overview, setOverview]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [assigning, setAssigning]     = useState(false);
  const [email, setEmail]             = useState("");
  const [message, setMessage]         = useState("");
  const [error, setError]             = useState("");
  const [scheduleModal, setScheduleModal] = useState({ open: false, med: null, patientId: null });
  const [scheduleForm, setScheduleForm]   = useState({ frequency: "daily", times: ["08:00"], withFood: false });
  const [scheduling, setScheduling]   = useState(false);

  useEffect(() => {
    api.get("/patients")
      .then(({ data }) => setPatients(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadOverview = async (patientId) => {
    setSelected(patientId);
    setOverview(null);
    try {
      const { data } = await api.get(`/patients/${patientId}/overview`);
      setOverview(data);
    } catch (err) {
      console.error("Failed to load patient overview", err);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setAssigning(true);
    setMessage("");
    setError("");
    try {
      const { data } = await api.post("/patients/assign", { patientEmail: email });
      setMessage(data.message);
      setEmail("");
      const { data: updated } = await api.get("/patients");
      setPatients(updated);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign patient.");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (patientId, name) => {
    if (!confirm(`Remove ${name} from your patient list?`)) return;
    try {
      await api.delete(`/patients/${patientId}`);
      setPatients((prev) => prev.filter((p) => p._id !== patientId));
      if (selected === patientId) { setSelected(null); setOverview(null); }
    } catch (err) {
      console.error("Failed to unassign patient", err);
    }
  };

  const handleCreateSchedule = async () => {
    setScheduling(true);
    try {
      await api.post("/schedules/caregiver", {
        patientId:    scheduleModal.patientId,
        medicationId: scheduleModal.med._id,
        frequency:    scheduleForm.frequency,
        times:        scheduleForm.times,
        withFood:     scheduleForm.withFood,
      });
      setScheduleModal({ open: false, med: null, patientId: null });
      setScheduleForm({ frequency: "daily", times: ["08:00"], withFood: false });
      loadOverview(scheduleModal.patientId);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create schedule.");
    } finally {
      setScheduling(false);
    }
  };

  const selectedPatient = patients.find((p) => p._id === selected);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-sm">Loading patients...</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-800">Patients</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage and monitor your assigned patients.
          </p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
          {patients.length} assigned
        </span>
      </div>

      {/* Assign Patient */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-medium text-gray-800 mb-4">Assign a patient</h2>
        <form onSubmit={handleAssign} className="flex gap-3">
          <input
            type="email"
            placeholder="Patient's email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#4a9ede] focus:ring-1 focus:ring-[#4a9ede] transition"
          />
          <button
            type="submit"
            disabled={assigning}
            className="bg-[#1a3a5c] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#15304d] transition disabled:opacity-50"
          >
            {assigning ? "Assigning..." : "Assign"}
          </button>
        </form>
        {message && <p className="text-green-600 text-xs mt-2">{message}</p>}
        {error   && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Patient List + Detail */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Patient List */}
        <div className="md:col-span-1 space-y-3">
          {patients.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-3xl mb-3">👤</p>
              <p className="text-sm text-gray-400">No patients assigned yet.</p>
            </div>
          ) : (
            patients.map((patient) => {
              const initials = patient.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div
                  key={patient._id}
                  onClick={() => loadOverview(patient._id)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition ${
                    selected === patient._id
                      ? "border-[#4a9ede] ring-1 ring-[#4a9ede]"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{patient.name}</p>
                      <p className="text-xs text-gray-400 truncate">{patient.email}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnassign(patient._id, patient.name); }}
                      className="text-gray-300 hover:text-red-400 transition text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Patient Detail */}
        <div className="md:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-3xl mb-3">👈</p>
              <p className="text-sm text-gray-400">Select a patient to view their overview.</p>
            </div>
          ) : !overview ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-sm text-gray-400">Loading patient data...</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Patient Header */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-sm font-medium">
                    {selectedPatient?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{selectedPatient?.name}</p>
                    <p className="text-xs text-gray-400">{selectedPatient?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Medications",  value: overview.summary.totalMedications },
                    { label: "Adherence",    value: overview.summary.adherenceRate !== null ? `${overview.summary.adherenceRate}%` : "N/A", color: adherenceColor(overview.summary.adherenceRate) },
                    { label: "Active alerts", value: overview.summary.activeAlerts,       color: overview.summary.activeAlerts > 0 ? "text-red-500" : "text-gray-800" },
                    { label: "Flagged SEs",  value: overview.summary.flaggedSideEffects,  color: overview.summary.flaggedSideEffects > 0 ? "text-yellow-600" : "text-gray-800" },
                  ].map(({ label, value, color = "text-gray-800" }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className={`text-lg font-medium ${color}`}>{value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Medications */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-medium text-gray-800 mb-3">Active medications</h3>
                {overview.medications.length === 0 ? (
                  <p className="text-sm text-gray-400">No active medications.</p>
                ) : (
                  <div className="space-y-2">
                    {overview.medications.map((med) => (
                      <div key={med._id} className="py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{med.name}</p>
                            <p className="text-xs text-gray-400">{med.dosage} · {med.form || "—"}</p>
                          </div>
                          {med.remainingQuantity != null && (
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              med.remainingQuantity / med.totalQuantity <= 0.2
                                ? "bg-red-50 text-red-600"
                                : "bg-green-50 text-green-700"
                            }`}>
                              {med.remainingQuantity} left
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setScheduleModal({ open: true, med, patientId: selected })}
                          className="text-xs text-[#4a9ede] hover:underline"
                        >
                          + Add schedule
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Alerts */}
              {overview.alerts.length > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-5">
                  <h3 className="text-sm font-medium text-red-800 mb-3">
                    ⚠️ Active interaction alerts
                  </h3>
                  <div className="space-y-2">
                    {overview.alerts.map((alert) => (
                      <div key={alert._id} className="bg-white rounded-lg p-3 border border-red-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full capitalize">
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{alert.description?.slice(0, 120)}...</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Side Effects */}
              {overview.sideEffects.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-medium text-gray-800 mb-3">Recent side effect reports</h3>
                  <div className="space-y-2">
                    {overview.sideEffects.slice(0, 3).map((report) => (
                      <div key={report._id} className={`rounded-lg p-3 border ${
                        report.flaggedForReview
                          ? "bg-yellow-50 border-yellow-200"
                          : "bg-gray-50 border-gray-100"
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600 capitalize">{report.severity}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(report.createdAt).toLocaleDateString("en-US", {
                              month: "short", day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{report.symptoms.join(", ")}</p>
                        {report.flaggedForReview && (
                          <p className="text-xs text-yellow-700 mt-1 font-medium">⚑ Flagged for review</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {selectedPatient?.emergencyContact?.name && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-medium text-gray-800 mb-3">Emergency contact</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{selectedPatient.emergencyContact.name}</p>
                      <p className="text-xs text-gray-400">{selectedPatient.emergencyContact.relation}</p>
                    </div>
                    <a
                      href={`tel:${selectedPatient.emergencyContact.phone}`}
                      className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition"
                    >
                      📞 {selectedPatient.emergencyContact.phone}
                    </a>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-300 text-center">
                Patient data is for monitoring purposes only and does not replace clinical assessment.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {scheduleModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-base font-medium text-gray-800 mb-1">
              Add schedule — {scheduleModal.med?.name}
            </h3>
            <p className="text-xs text-gray-400 mb-4">{scheduleModal.med?.dosage}</p>

            {/* Frequency */}
            <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
            <select
              value={scheduleForm.frequency}
              onChange={(e) => {
                const freq = e.target.value;
                const timesMap = {
                  daily:             ["08:00"],
                  twice_daily:       ["08:00", "20:00"],
                  three_times_daily: ["08:00", "14:00", "20:00"],
                  weekly:            ["08:00"],
                  as_needed:         ["08:00"],
                };
                setScheduleForm({ ...scheduleForm, frequency: freq, times: timesMap[freq] || ["08:00"] });
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-[#4a9ede]"
            >
              <option value="daily">Once daily</option>
              <option value="twice_daily">Twice daily</option>
              <option value="three_times_daily">Three times daily</option>
              <option value="weekly">Weekly</option>
              <option value="as_needed">As needed</option>
            </select>

            {/* Times */}
            <label className="block text-xs font-medium text-gray-500 mb-1">Dose times</label>
            <div className="space-y-2 mb-4">
              {scheduleForm.times.map((time, index) => (
                <input
                  key={index}
                  type="time"
                  value={time}
                  onChange={(e) => {
                    const updated = [...scheduleForm.times];
                    updated[index] = e.target.value;
                    setScheduleForm({ ...scheduleForm, times: updated });
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4a9ede]"
                />
              ))}
            </div>

            {/* With Food */}
            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleForm.withFood}
                onChange={(e) => setScheduleForm({ ...scheduleForm, withFood: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-600">Take with food</span>
            </label>

            {/* Disclaimer */}
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg p-3 mb-4">
              This schedule will be created for the patient and they will see it on their app immediately.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setScheduleModal({ open: false, med: null, patientId: null })}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={scheduling}
                className="flex-1 bg-[#1a3a5c] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#15304d] transition disabled:opacity-50"
              >
                {scheduling ? "Creating..." : "Create schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}