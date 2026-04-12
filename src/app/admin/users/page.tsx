"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Users, UserCheck, UserCog, Search } from "lucide-react";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { properties: number; bookingsAsGuest: number };
};

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const roleFilter = searchParams.get("role") || "";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(roleFilter);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("role", filter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (userId: string, action: string) => {
    setActioning(userId);
    await fetch(`/api/admin/users/${userId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchUsers();
    setActioning(null);
  };

  const counts = {
    all: users.length,
    guests: users.filter((u) => u.role === "GUEST").length,
    hosts: users.filter((u) => u.role === "HOST").length,
    pending: users.filter((u) => !u.isActive).length,
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Users</h1>
      <p className="text-gray-500 mb-8">Manage guest and host accounts</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: "All Users", value: counts.all, color: "gray" },
          { icon: UserCheck, label: "Guests", value: counts.guests, color: "blue" },
          { icon: UserCog, label: "Hosts", value: counts.hosts, color: "teal" },
          { icon: Users, label: "Pending Approval", value: counts.pending, color: "orange" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-xl bg-${s.color}-100 flex items-center justify-center mb-2`}>
              <s.icon className={`w-4 h-4 text-${s.color}-600`} />
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        >
          <option value="">All Roles</option>
          <option value="GUEST">Guests</option>
          <option value="HOST">Hosts</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No users found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Activity</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name || "—"}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "HOST" ? "bg-teal-100 text-teal-700" :
                      u.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.role === "HOST" ? (
                      <span>{u._count.properties} listings</span>
                    ) : (
                      <span>{u._count.bookingsAsGuest} bookings</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.isActive ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {u.isActive ? "Active" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!u.isActive && (
                        <button
                          onClick={() => handleAction(u.id, "approve")}
                          disabled={actioning === u.id}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {u.isActive ? (
                        <button
                          onClick={() => handleAction(u.id, "deactivate")}
                          disabled={actioning === u.id}
                          className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(u.id, "activate")}
                          disabled={actioning === u.id}
                          className="px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
