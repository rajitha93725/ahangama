import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Users, Home, CalendarCheck, DollarSign } from "lucide-react";

export default async function AdminDashboard() {
  const [totalUsers, totalProperties, totalBookings, acceptedBookings] = await Promise.all([
    prisma.user.count(),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.booking.count(),
    prisma.booking.findMany({
      where: { status: { in: ["ACCEPTED", "COMPLETED"] } },
      select: { totalPrice: true },
    }),
  ]);

  const revenue = acceptedBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, name: true, email: true, role: true, createdAt: true, isActive: true },
  });

  const recentProperties = await prisma.property.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      host: { select: { name: true } },
      images: { where: { isPrimary: true }, take: 1 },
    },
  });

  const stats = [
    { icon: Users, label: "Total Users", value: totalUsers, color: "blue" },
    { icon: Home, label: "Active Properties", value: totalProperties, color: "teal" },
    { icon: CalendarCheck, label: "Total Bookings", value: totalBookings, color: "amber" },
    { icon: DollarSign, label: "Total Revenue", value: formatCurrency(revenue), color: "green" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Analytics Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h2>
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
                      <span className="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700">{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.isActive ? "Active" : "Banned"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Listings</h2>
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
                      <p className="text-xs text-gray-400">{p.district}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.host.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {p.status}
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
