"use client";

import { useState } from "react";
import { STAY_QUESTIONS, TRANSPORT_QUESTIONS } from "@/lib/ratingQuestions";
import { Star, CheckCircle } from "lucide-react";

interface Props {
  propertyId: string;
  bookingId: string;
  isTransport?: boolean;
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
              n <= value
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
          >
            {n}
          </button>
        ))}
        <span className="ml-2 text-sm font-bold text-teal-700 w-4">{value}</span>
      </div>
    </div>
  );
}

export default function RatingForm({ propertyId, bookingId, isTransport = false }: Props) {
  const questions = isTransport ? TRANSPORT_QUESTIONS : STAY_QUESTIONS;
  const [scores, setScores] = useState<number[]>(questions.map(() => 10));
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${propertyId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, scores, comment: comment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit rating");
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <CheckCircle className="w-10 h-10 text-green-600" />
        <p className="font-semibold text-green-800">Thank you for your rating!</p>
        <p className="text-sm text-green-600">Your feedback helps other travellers discover great experiences.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Rate your experience</h3>
        <div className="flex items-center gap-1.5 bg-teal-50 px-3 py-1 rounded-full">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-bold text-teal-700">{avgScore} / 10</span>
        </div>
      </div>

      <div className="space-y-0">
        {questions.map((q, i) => (
          <ScoreInput
            key={i}
            label={q}
            value={scores[i]}
            onChange={(v) => setScores((prev) => { const next = [...prev]; next[i] = v; return next; })}
          />
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Share your experience..."
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? "Submitting…" : "Submit Rating"}
      </button>
    </div>
  );
}
