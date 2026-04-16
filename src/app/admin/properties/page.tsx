"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Home, Car, Star, ChevronLeft, ChevronRight, User, MessageSquare } from "lucide-react";
import { STAY_QUESTIONS, TRANSPORT_QUESTIONS, ratingToStars } from "@/lib/ratingQuestions";
import StarRating from "@/components/shared/StarRating";

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

type GuestRating = {
  q1: number; q2: number; q3: number; q4: number; q5: number;
  avgScore: number;
  comment: string;
};

type RatingModalState = {
  property: Property;
  guests: GuestRating[];   // 10 individual guests
  selectedGuest: number;   // 0–9
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PENDING_APPROVAL: "bg-orange-100 text-orange-700",
  INACTIVE: "bg-gray-100 text-gray-600",
  SUSPENDED: "bg-red-100 text-red-700",
};

function calcAvg(g: GuestRating) {
  return parseFloat(([g.q1, g.q2, g.q3, g.q4, g.q5].reduce((a, b) => a + b, 0) / 5).toFixed(1));
}

const scoreColor = (v: number) =>
  v >= 9 ? "text-emerald-600" : v >= 7 ? "text-teal-600" : v >= 5 ? "text-amber-500" : "text-red-500";

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const [ratingModal, setRatingModal] = useState<RatingModalState | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingSaved, setRatingSaved] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/properties?${params}`);
    if (res.ok) {
      const json = await res.json();
      setProperties(json.data ?? json);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
    }
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

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

  const openRatingModal = async (property: Property) => {
    setRatingLoading(true);
    const res = await fetch(`/api/admin/properties/${property.id}/rating`);
    let fetchedGuests: GuestRating[] = Array.from({ length: 10 }, () => ({
      q1: 10, q2: 10, q3: 10, q4: 10, q5: 10, avgScore: 10, comment: "",
    }));
    if (res.ok) {
      const data = await res.json();
      if (data?.guests) {
        fetchedGuests = data.guests.map((g: Partial<GuestRating>) => ({
          q1: g.q1 ?? 10, q2: g.q2 ?? 10, q3: g.q3 ?? 10, q4: g.q4 ?? 10, q5: g.q5 ?? 10,
          avgScore: g.avgScore ?? 10,
          comment: g.comment ?? "",
        }));
      }
    }
    setRatingModal({ property, guests: fetchedGuests, selectedGuest: 0 });
    setRatingLoading(false);
  };

  const updateGuest = (field: keyof GuestRating, value: number | string) => {
    if (!ratingModal) return;
    const guests = [...ratingModal.guests];
    const g = { ...guests[ratingModal.selectedGuest], [field]: value };
    g.avgScore = calcAvg(g);
    guests[ratingModal.selectedGuest] = g;
    setRatingModal({ ...ratingModal, guests });
  };

  const saveRating = async () => {
    if (!ratingModal) return;
    setRatingSaving(true);
    await fetch(`/api/admin/properties/${ratingModal.property.id}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guests: ratingModal.guests }),
    });
    setRatingSaving(false);
    setRatingSaved(ratingModal.property.title);
    setRatingModal(null);
    setTimeout(() => setRatingSaved(null), 4000);
  };

  const questions = ratingModal?.property.category === "TRANSPORT" ? TRANSPORT_QUESTIONS : STAY_QUESTIONS;
  const activeGuest = ratingModal ? ratingModal.guests[ratingModal.selectedGuest] : null;
  const overallAvg = ratingModal
    ? parseFloat((ratingModal.guests.reduce((s, g) => s + g.avgScore, 0) / 10).toFixed(1))
    : 0;

  return (
    <div className="p-8">
      {ratingSaved && (
        <div className="fixed top-5 right-5 z-50 bg-teal-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <Star className="w-4 h-4 fill-white text-white" />
          Ratings saved for "{ratingSaved}"
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Properties</h1>
      <p className="text-gray-500 mb-8">Manage stays and transport listings</p>

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

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading…</div>
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
                          <button onClick={() => handleAction(p.id, "approve")} disabled={actioning === p.id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                            Approve
                          </button>
                          <button onClick={() => handleAction(p.id, "reject")} disabled={actioning === p.id}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                            Reject
                          </button>
                        </>
                      )}
                      {p.status === "ACTIVE" && (
                        <button onClick={() => handleAction(p.id, "deactivate")} disabled={actioning === p.id}
                          className="px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors">
                          Deactivate
                        </button>
                      )}
                      {(p.status === "INACTIVE" || p.status === "SUSPENDED") && (
                        <button onClick={() => handleAction(p.id, "activate")} disabled={actioning === p.id}
                          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                          Activate
                        </button>
                      )}
                      <button onClick={() => openRatingModal(p)} disabled={ratingLoading}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors flex items-center gap-1">
                        <Star className="w-3 h-3" /> Ratings
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">{total} properties · page {page} of {totalPages}</p>
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

      {/* ── Rating Modal — per-guest editing ── */}
      {ratingModal && activeGuest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900">Edit Seeded Reviews</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{ratingModal.property.title}</p>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className={`text-sm font-bold ${scoreColor(overallAvg)}`}>{overallAvg}</span>
                  <span className="text-xs text-gray-400">/ 10 overall</span>
                </div>
                <StarRating value={ratingToStars(overallAvg)} readonly size="sm" />
              </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: guest selector */}
              <div className="w-44 flex-shrink-0 border-r border-gray-100 overflow-y-auto py-2">
                {ratingModal.guests.map((g, i) => {
                  const avg = g.avgScore;
                  const isActive = ratingModal.selectedGuest === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRatingModal({ ...ratingModal, selectedGuest: i })}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? "bg-teal-50 border-r-2 border-teal-500"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isActive ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? "text-teal-700" : "text-gray-700"}`}>
                          Verified Guest {i + 1}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-xs font-semibold ${scoreColor(avg)}`}>{avg.toFixed(1)}</span>
                          {g.comment && <MessageSquare className="w-2.5 h-2.5 text-gray-400" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: selected guest editor */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Guest score summary */}
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Verified Guest {ratingModal.selectedGuest + 1}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating value={ratingToStars(activeGuest.avgScore)} readonly size="sm" />
                      <span className={`text-sm font-bold ${scoreColor(activeGuest.avgScore)}`}>
                        {activeGuest.avgScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">/ 10</span>
                    </div>
                  </div>
                </div>

                {/* 5 question sliders */}
                {questions.map((question, qi) => {
                  const fieldName = `q${qi + 1}` as keyof GuestRating;
                  const s = activeGuest[fieldName] as number;
                  const pts = parseFloat(((s / 10) * 2).toFixed(1));
                  return (
                    <div key={qi}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700 flex-1 pr-4 leading-snug">
                          <span className="text-gray-400 mr-1">Q{qi + 1}.</span>{question}
                        </label>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-base font-bold ${scoreColor(s)}`}>{s}</span>
                          <span className="text-xs text-gray-400">({pts} pts)</span>
                        </div>
                      </div>
                      <input
                        type="range" min="1" max="10" step="1"
                        value={s}
                        onChange={(e) => updateGuest(fieldName, parseInt(e.target.value))}
                        className="w-full accent-teal-600"
                      />
                      <div className="flex justify-between text-xs text-gray-300 mt-0.5">
                        <span>1</span><span>5</span><span>10</span>
                      </div>
                    </div>
                  );
                })}

                {/* Review comment */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Review Comment
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={activeGuest.comment}
                    onChange={(e) => updateGuest("comment", e.target.value)}
                    placeholder="Add a review comment for this guest…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                  />
                </div>

                {/* Navigate prev/next guest */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setRatingModal({ ...ratingModal, selectedGuest: Math.max(0, ratingModal.selectedGuest - 1) })}
                    disabled={ratingModal.selectedGuest === 0}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous guest
                  </button>
                  <span className="text-xs text-gray-400">
                    {ratingModal.selectedGuest + 1} / 10
                  </span>
                  <button
                    type="button"
                    onClick={() => setRatingModal({ ...ratingModal, selectedGuest: Math.min(9, ratingModal.selectedGuest + 1) })}
                    disabled={ratingModal.selectedGuest === 9}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 disabled:opacity-40 transition-colors"
                  >
                    Next guest <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Changes apply to all 10 verified guest reviews at once
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRatingModal(null)}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={saveRating} disabled={ratingSaving}
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  {ratingSaving ? "Saving…" : "Save All Reviews"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
