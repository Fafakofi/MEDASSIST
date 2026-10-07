"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import api from "@/lib/api";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [alertCount, setAlertCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get("/interactions");
      const unacked = data.filter((a) => !a.acknowledged);
      setAlertCount(unacked.length);
    } catch {
      setAlertCount(0);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);
    fetchAlerts();
  }, [router, fetchAlerts]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar user={user} alertCount={alertCount} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar alertCount={alertCount} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}