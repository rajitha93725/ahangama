"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Home, Car } from "lucide-react";

type Property = {
  id: string;
  title: string;
  district: string;
  status: string;
  category: string;
  pricePerNight: number;
  createdAt: string;
  host: { name: string | null; email: string };
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PENDING_APPROVAL: "bg-orange-100 text-orange-700",
  INACTIVE: "bg-gray-100 text-gray-600",
  SUSPENDED: "bg-red-100 text-red-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
};

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/properties?${params}`);
    if (res.ok) setProperties(await res.json());
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleAction = async (propertyId: string, action: string) => {
    setActioning(propertyId);
    await fetch(`/api/admin/properties/${propertyId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchProperties();
    setActioning(null);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Properties</h1>
      <p className="text-gray-500 mb-8">Manage stays and transport listings</p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or host..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading properties…</div>
        ) : properties.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No properties found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Listing</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Host</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Price</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {properties.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-48">{p.title}</p>
                    <p className="text-xs text-gray-400">{p.district}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <p>{p.host.name || "—"}</p>
                    <p className="text-gray-400">{p.host.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.category === "TRANSPORT" ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>
                      {p.category === "TRANSPORT" ? <Car className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">${p.pricePerNight}/night</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600"}`}>
                      {p.status === "PENDING_APPROVAL" ? "Pending" : p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {p.status === "PENDING_APPROVAL" && (
                        <>
                          <button
                            onClick={() => handleAction(p.id, "approve")}
                            disabled={actioning === p.id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(p.id, "reject")}
                            disabled={actioning === p.id}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {p.status === "ACTIVE" && (
                        <button
                          onClick={() => handleAction(p.id, "deactivate")}
                          disabled={actioning === p.id}
                          className="px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                      {(p.status === "INACTIVE" || p.status === "SUSPENDED") && (
                        <button
                          onClick={() => handleAction(p.id, "activate")}
                          disabled={actioning === p.id}
                          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
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
