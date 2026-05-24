"use client";

import { useAuthStore } from "@/store/auth-store";
import { CitizenDashboard } from "@/features/dashboard/citizen-dashboard";
import { OfficerDashboard } from "@/features/dashboard/officer-dashboard";
import { AdminDashboard } from "@/features/dashboard/admin-dashboard";

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case "admin":
      return <AdminDashboard />;
    case "officer":
      return <OfficerDashboard />;
    case "citizen":
    default:
      return <CitizenDashboard />;
  }
}
