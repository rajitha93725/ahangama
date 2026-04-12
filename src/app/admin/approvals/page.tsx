"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Home, Car, Clock } from "lucide-react";

type PendingUser = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  type: "user";
};

type PendingProperty = {
  id: string;
  title: string;
  district: string;
  category: string;
  pricePerNight: number;
  createdAt: string;
  host: { name: string | null; email: string };
  type: "property";
};

type PendingItem = PendingUser | PendingProperty;

export default function AdminApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingProperties, setPendingProperties] = useState<PendingProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "users" | "properties">("all");

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const [usersRes, propsRes] = await Promise.all([
      fetch("/api/admin/users?active=false"),
      fetch("/api/admin/properties?status=PENDING_APPROVAL"),
    ]);
    if (usersRes.ok) {
      const data: (PendingUser & { isActive?: boolean })[] = await usersRes.json();
      setPendingUsers(data.filter((u) => !u.isActive).map((u) => ({ ...u, type: "user" as const })));
    }
    if (propsRes.ok) {
      const data: PendingProperty[] = await propsRes.json();
      setPendingProperties(data.map((p) => ({ ...p, type: "property" as const })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleUserAction = async (userId: string, action: string) => {
    setActioning(userId);
    await fetch(`/api/admin/users/${userId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchPending();
    setActioning(null);
  };

  const handlePropertyAction = async (propertyId: string, action: string) => {
    setActioning(propertyId);
    await fetch(`/api/admin/properties/${propertyId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchPending();
    setActioning(null);
  };

  const totalPending = pendingUsers.length + pendingProperties.length;

  const items: PendingItem[] = [
    ...pendingUsers,
    ...pendingProperties,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayed =
    tab === "users" ? pendingUsers :
    tab === "properties" ? pendingProperties :
    items;

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <Clock className="w-6 h-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        {totalPending > 0 && (
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {totalPending}
          </span>
        )}
      </div>
      <p className="text-gray-500 mb-8">Review and approve new user registrations and property listings</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[
          { key: "all", label: `All (${totalPending})` },
          { key: "users", label: `Users (${pendingUsers.length})` },
          { key: "properties", label: `Properties (${pendingProperties.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-gray-200">
          <Clock className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No pending approvals</p>
          <p className="text-sm text-gray-400 mt-1">Everything is up to date</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tab !== "properties" && pendingUsers.length > 0 && (tab === "all" || tab === "users") && (
            <>
              {tab === "all" && <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-2 mb-3">New User Registrations</h2>}
              {pendingUsers.map((u) => (
                <div key={u.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{u.name || "Unnamed User"}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      {u.phone && (
                        <p className="text-sm text-gray-500">{u.phone}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "HOST" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}>
                          {u.role}
                        </span>
                        <span className="text-xs text-gray-400">
                          Registered {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleUserAction(u.id, "approve")}
                      disabled={actioning === u.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUserAction(u.id, "deactivate")}
                      disabled={actioning === u.id}
                      className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab !== "users" && pendingProperties.length > 0 && (tab === "all" || tab === "properties") && (
            <>
              {tab === "all" && <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">New Listing Requests</h2>}
              {pendingProperties.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${p.category === "TRANSPORT" ? "bg-amber-100" : "bg-teal-100"}`}>
                      {p.category === "TRANSPORT" ? (
                        <Car className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Home className="w-5 h-5 text-teal-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.title}</p>
                      <p className="text-sm text-gray-500">{p.district} · ${p.pricePerNight}/night</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">by {p.host.name || p.host.email}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">
                          Submitted {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handlePropertyAction(p.id, "approve")}
                      disabled={actioning === p.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handlePropertyAction(p.id, "reject")}
                      disabled={actioning === p.id}
                      className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
