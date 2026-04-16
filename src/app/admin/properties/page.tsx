"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Home, Car, Star, ChevronLeft, ChevronRight } from "lucide-react";
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

type RatingRow = {
  q1: number; q2: number; q3: number; q4: number; q5: number;
  avgScore: number;
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  // Rating modal state
  const [ratingModal, setRatingModal] = useState<{ property: Property; scores: number[] } | null>(null);
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

  // Reset to page 1 when filters change
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
    let existing: RatingRow | null = null;
    if (res.ok) existing = await res.json();
    if (existing) {
      setRatingModal({ property, scores: [existing.q1, existing.q2, existing.q3, existing.q4, existing.q5] });
    } else {
      setRatingModal({ property, scores: Array(5).fill(10) });
    }
    setRatingLoading(false);
  };

  const saveRating = async () => {
    if (!ratingModal) return;
    setRatingSaving(true);
    const { property, scores } = ratingModal;
    const body: Record<string, number> = {};
    scores.forEach((v, i) => { body[`q${i + 1}`] = v; });
    await fetch(`/api/admin/properties/${property.id}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setRatingSaving(false);
    setRatingSaved(property.title);
    setRatingModal(null);
    setTimeout(() => setRatingSaved(null), 4000);
  };

  const questions = ratingModal?.property.category === "TRANSPORT" ? TRANSPORT_QUESTIONS : STAY_QUESTIONS;
  const avgScore = ratingModal ? parseFloat((ratingModal.scores.reduce((a, b) => a + b, 0) / 5).toFixed(1)) : 0;
  const avgColor = avgScore >= 9 ? "text-emerald-600" : avgScore >= 7 ? "text-teal-600" : avgScore >= 5 ? "text-amber-500" : "text-red-500";

  return (
    <div className="p-8">
      {/* Success toast */}
      {ratingSaved && (
        <div className="fixed top-5 right-5 z-50 bg-teal-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <Star className="w-4 h-4 fill-white text-white" />
          Rating saved — visible in explore immediately
        </div>
      )}

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
                      <button
                        onClick={() => openRatingModal(p)}
                        disabled={ratingLoading}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors flex items-center gap-1"
                      >
                        <Star className="w-3 h-3" /> Rating
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
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              const pg = i + 1;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    pg === page ? "bg-teal-600 text-white" : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Edit Seeded Rating <span className="text-xs text-gray-400 font-normal">(10 reviewers)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-80">{ratingModal.property.title}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className={`text-base font-bold ${avgColor}`}>{avgScore}</span>
                  <span className="text-xs text-gray-400">/ 10</span>
                </div>
                <StarRating value={ratingToStars(avgScore)} readonly size="sm" />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* 5-question sliders */}
              {questions.map((question, i) => {
                const s = ratingModal.scores[i];
                const sc = s >= 9 ? "text-emerald-600" : s >= 7 ? "text-teal-600" : s >= 5 ? "text-amber-500" : "text-red-500";
                const pts = parseFloat(((s / 10) * 2).toFixed(1));
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700 flex-1 pr-4">
                        <span className="text-gray-400 mr-1">Q{i + 1}.</span>{question}
                      </label>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-base font-bold ${sc}`}>{s}</span>
                        <span className="text-xs text-gray-400">({pts}pts)</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={s}
                      onChange={(e) => {
                        const newScores = [...ratingModal.scores];
                        newScores[i] = parseFloat(e.target.value);
                        setRatingModal({ ...ratingModal, scores: newScores });
                      }}
                      className="w-full accent-teal-600"
                    />
                    <div className="flex justify-between text-xs text-gray-300 mt-0.5">
                      <span>1</span><span>5</span><span>10</span>
                    </div>
                  </div>
                );
              })}

              {/* Seeded feedback preview */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Default 10 Feedback Entries Preview
                </p>
                <div className="space-y-2">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <StarRating value={ratingToStars(avgScore)} readonly size="sm" />
                      <span className="text-xs text-gray-500 ml-1">{avgScore} / 10</span>
                      <span className="text-xs text-gray-400 ml-auto">Verified Guest</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setRatingModal(null)}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRating}
                disabled={ratingSaving}
                className="px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {ratingSaving ? "Saving…" : "Save Rating"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
