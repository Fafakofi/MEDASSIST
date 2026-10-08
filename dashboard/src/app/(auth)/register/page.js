"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", role: "caregiver",
  });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        role:     form.role,
      });

      // Block patients from accessing dashboard
      if (data.user.role === "patient") {
        setError("Patient accounts cannot access the dashboard.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/overview");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="flex w-full max-w-3xl rounded-2xl overflow-hidden shadow-sm border border-gray-200">

        {/* Left Panel */}
        <div className="hidden md:flex flex-col justify-between bg-[#1a3a5c] p-10 w-80">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-9 h-9 rounded-lg bg-[#4a9ede] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
              </div>
              <span className="text-white font-medium text-sm">MedAssist</span>
            </div>
            <p className="text-[#a8c8e8] text-sm leading-relaxed">
              Create your caregiver or staff account to start monitoring your patients.
            </p>
          </div>
          <div className="border-t border-white/10 pt-6 space-y-3">
            {["Decision-support tool only", "Real-time alerts and reminders", "Adherence trend monitoring"].map((label) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[#4a9ede] text-sm">✓</span>
                <span className="text-[#a8c8e8] text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-white p-10">
          <h1 className="text-xl font-medium text-gray-800 mb-1">Create account</h1>
          <p className="text-sm text-gray-400 mb-8">Staff and caregiver accounts only</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Dr. Jane Doe"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-lg focus:outline-none focus:border-[#4a9ede] focus:ring-1 focus:ring-[#4a9ede] transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="doctor@hospital.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-lg focus:outline-none focus:border-[#4a9ede] focus:ring-1 focus:ring-[#4a9ede] transition"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                className="w-full px-4 py-2.5 text-sm text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:border-[#4a9ede] focus:ring-1 focus:ring-[#4a9ede] transition"
              >
                <option value="caregiver">Caregiver</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="w-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-lg focus:outline-none focus:border-[#4a9ede] focus:ring-1 focus:ring-[#4a9ede] transition"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                required
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                className="w-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-lg focus:outline-none focus:border-[#4a9ede] focus:ring-1 focus:ring-[#4a9ede] transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a3a5c] hover:bg-[#15304d] text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50 mt-2"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-400">
              Already have an account?{" "}
              <a href="/login" className="text-[#4a9ede] hover:underline font-medium">
                Sign in
              </a>
            </p>
          </form>

          <p className="text-xs text-gray-300 text-center mt-6 leading-relaxed">
            This system is a decision-support tool only and does not replace professional medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}