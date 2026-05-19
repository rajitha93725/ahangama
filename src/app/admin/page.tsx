import { supabaseAdmin } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { Users, Home, CalendarCheck, DollarSign, UserCheck, UserCog, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const [
    { count: guestCount },
    { count: hostCount },
    { count: activeProperties },
    { count: pendingProperties },
    { count: pendingUsers },
    { count: totalBookings },
    { data: confirmedBookings },
    { data: recentUsers },
    { data: recentPropertiesRaw },
  ] = await Promise.all([
    supabaseAdmin.from("User").select("*", { count: "exact", head: true }).eq("role", "GUEST"),
    supabaseAdmin.from("User").select("*", { count: "exact", head: true }).eq("role", "HOST"),
    supabaseAdmin.from("Property").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabaseAdmin.from("Property").select("*", { count: "exact", head: true }).eq("status", "PENDING_APPROVAL"),
    supabaseAdmin.from("User").select("*", { count: "exact", head: true }).eq("isActive", false).neq("role", "ADMIN"),
    supabaseAdmin.from("Booking").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("Booking").select("totalPrice").in("status", ["ACCEPTED", "COMPLETED"]),
    supabaseAdmin.from("User").select("id, name, email, role, createdAt, isActive").order("createdAt", { ascending: false }).limit(8),
    supabaseAdmin.from("Property").select("id, title, district, status, category, hostId").order("createdAt", { ascending: false }).limit(8),
  ]);

  const revenue = (confirmedBookings || []).reduce((s: number, b: { totalPrice: number | null }) => s + (b.totalPrice || 0), 0);

  // Fetch host names for recent properties
  const hostIds = [...new Set((recentPropertiesRaw || []).map((p: { hostId: string }) => p.hostId))];
  const { data: hosts } = hostIds.length
    ? await supabaseAdmin.from("User").select("id, name").in("id", hostIds)
    : { data: [] };
  const hostMap = Object.fromEntries((hosts || []).map((h: { id: string; name: string | null }) => [h.id, h]));

  const recentProperties = (recentPropertiesRaw || []).map((p: { id: string; title: string; district: string; status: string; category: string; hostId: string }) => ({
    ...p,
    host: { name: (hostMap[p.hostId] as { name: string | null } | undefined)?.name ?? null },
  }));

  const pending = (pendingUsers || 0) + (pendingProperties || 0);

  const stats = [
    { icon: UserCheck, label: "Total Guests", value: guestCount || 0, color: "blue", href: "/admin/users?role=GUEST" },
    { icon: UserCog, label: "Total Hosts", value: hostCount || 0, color: "teal", href: "/admin/users?role=HOST" },
    { icon: Home, label: "Active Listings", value: activeProperties || 0, color: "emerald", href: "/admin/properties" },
    { icon: CalendarCheck, label: "Total Bookings", value: totalBookings || 0, color: "amber", href: "/admin/bookings" },
    { icon: DollarSign, label: "Confirmed Revenue", value: formatCurrency(revenue), color: "green", href: "/admin/bookings" },
    { icon: Clock, label: "Pending Approvals", value: pending, color: "orange", href: "/admin/approvals" },
    { icon: TrendingUp, label: "Pending Properties", value: pendingProperties || 0, color: "purple", href: "/admin/approvals" },
    { icon: Users, label: "Inactive Users", value: pendingUsers || 0, color: "red", href: "/admin/approvals" },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
        {pending > 0 && (
          <Link
            href="/admin/approvals"
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors"
          >
            <Clock className="w-4 h-4" />
            {pending} pending approvals
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
            <Link href="/admin/users" className="text-sm text-teal-600 hover:underline">View all →</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(recentUsers || []).map((u: { id: string; name: string | null; email: string; role: string; isActive: boolean }) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${u.role === "HOST" ? "bg-teal-100 text-teal-700" : u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {u.isActive ? "Active" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Listings</h2>
            <Link href="/admin/properties" className="text-sm text-teal-600 hover:underline">View all →</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Property</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Host</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentProperties.map((p: { id: string; title: string; district: string; category: string; status: string; host: { name: string | null } }) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-36">{p.title}</p>
                      <p className="text-xs text-gray-400">{p.district} · {p.category}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.host.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        p.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                        p.status === "PENDING_APPROVAL" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {p.status === "PENDING_APPROVAL" ? "Pending" : p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
