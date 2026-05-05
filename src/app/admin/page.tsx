import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Users, Home, CalendarCheck, DollarSign, UserCheck, UserCog, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const [
    guestCount,
    hostCount,
    activeProperties,
    pendingProperties,
    pendingUsers,
    totalBookings,
    confirmedBookings,
    recentUsers,
    recentPropertiesRaw,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "GUEST" } }),
    prisma.user.count({ where: { role: "HOST" } }),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.property.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.user.count({ where: { isActive: false, role: { not: "ADMIN" } } }),
    prisma.booking.count(),
    prisma.booking.findMany({
      where: { status: { in: ["ACCEPTED", "COMPLETED"] } },
      select: { totalPrice: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, role: true, createdAt: true, isActive: true },
    }),
    prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, district: true, status: true, host: { select: { name: true } } },
    }),
  ]);

  // Enrich with category via raw SQL (Prisma client doesn't know the column yet)
  const propIds = recentPropertiesRaw.map((p) => p.id);
  const categoryRows = propIds.length
    ? await prisma.$queryRawUnsafe<{ id: string; category: string }[]>(
        `SELECT id, category FROM "Property" WHERE id IN (${propIds.map((_, i) => `$${i + 1}`).join(",")})`,
        ...propIds
      )
    : [];
  const categoryMap = Object.fromEntries(categoryRows.map((r) => [r.id, r.category]));
  const recentProperties = recentPropertiesRaw.map((p) => ({
    ...p,
    category: categoryMap[p.id] ?? "STAY",
  }));

  const revenue = confirmedBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);

  const stats = [
    { icon: UserCheck, label: "Total Guests", value: guestCount, color: "blue", href: "/admin/users?role=GUEST" },
    { icon: UserCog, label: "Total Hosts", value: hostCount, color: "teal", href: "/admin/users?role=HOST" },
    { icon: Home, label: "Active Listings", value: activeProperties, color: "emerald", href: "/admin/properties" },
    { icon: CalendarCheck, label: "Total Bookings", value: totalBookings, color: "amber", href: "/admin/bookings" },
    { icon: DollarSign, label: "Confirmed Revenue", value: formatCurrency(revenue), color: "green", href: "/admin/bookings" },
    { icon: Clock, label: "Pending Approvals", value: pendingUsers + pendingProperties, color: "orange", href: "/admin/approvals" },
    { icon: TrendingUp, label: "Pending Properties", value: pendingProperties, color: "purple", href: "/admin/approvals" },
    { icon: Users, label: "Inactive Users", value: pendingUsers, color: "red", href: "/admin/approvals" },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
        {(pendingUsers + pendingProperties) > 0 && (
          <Link
            href="/admin/approvals"
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors"
          >
            <Clock className="w-4 h-4" />
            {pendingUsers + pendingProperties} pending approvals
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow`}>
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
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
                {recentUsers.map((u) => (
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

        {/* Recent Listings */}
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
                {recentProperties.map((p) => (
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
