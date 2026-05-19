"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, CalendarCheck, ChevronLeft, ChevronRight, Home, Car } from "lucide-react";
import Link from "next/link";

type Booking = {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  status: string;
  totalPrice: number | null;
  mealPlan: string | null;
  roomsRequested: number | null;
  pickupPoint: string | null;
  dropPoint: string | null;
  distanceKm: number | null;
  createdAt: string;
  guest: { id: string; name: string | null; email: string };
  property: { id: string; title: string | null; district: string | null; category: string | null };
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_OFFER:   "bg-blue-100 text-blue-700",
  ACCEPTED:        "bg-green-100 text-green-700",
  COMPLETED:       "bg-teal-100 text-teal-700",
  CANCELLED:       "bg-gray-100 text-gray-600",
  REJECTED:        "bg-red-100 text-red-700",
  COUNTER_OFFERED: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_OFFER:   "Pending",
  ACCEPTED:        "Accepted",
  COMPLETED:       "Completed",
  CANCELLED:       "Cancelled",
  REJECTED:        "Rejected",
  COUNTER_OFFERED: "Countered",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/bookings?${params}`);
    if (res.ok) {
      const json = await res.json();
      setBookings(json.data ?? []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
    }
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bookings</h1>
      <p className="text-gray-500 mb-8">All guest bookings across stays and transport</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest or property..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_OFFER">Pending</option>
          <option value="COUNTER_OFFERED">Countered</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className="p-16 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-medium text-gray-700">No bookings found</p>
            <p className="text-sm text-gray-400">
              {search || statusFilter ? "Try adjusting your filters." : "Bookings will appear here once guests start making requests."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Guest</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Property</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Dates</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Details</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Price</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => {
                const isTransport = b.property.category === "TRANSPORT";
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{b.guest.name || "—"}</p>
                      <p className="text-xs text-gray-400">{b.guest.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isTransport
                          ? <Car className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          : <Home className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-36">{b.property.title || "—"}</p>
                          <p className="text-xs text-gray-400">{b.property.district || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <p>{new Date(b.checkIn).toLocaleDateString()}</p>
                      <p className="text-gray-400">→ {new Date(b.checkOut).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {isTransport ? (
                        <span>{b.distanceKm ? `${b.distanceKm} km` : "—"}</span>
                      ) : (
                        <span>{b.nights} night{b.nights !== 1 ? "s" : ""} · {b.guests} guest{b.guests !== 1 ? "s" : ""}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {b.totalPrice != null ? `$${b.totalPrice.toLocaleString()}` : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">{total} bookings · page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  i + 1 === page ? "bg-teal-600 text-white" : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                }`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
