"use client";

import { useState } from "react";
import { STAY_QUESTIONS, TRANSPORT_QUESTIONS } from "@/lib/ratingQuestions";
import { Star, CheckCircle } from "lucide-react";

interface Props {
  propertyId: string;
  bookingId: string;
  isTransport?: boolean;
}

export default function RatingForm({ propertyId, bookingId, isTransport = false }: Props) {
  const questions = isTransport ? TRANSPORT_QUESTIONS : STAY_QUESTIONS;
  const [scores, setScores] = useState<number[]>(questions.map(() => 10));
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // 5 questions × 2 pts each = 10 total max; avg = sum / 5
  const avgScore = parseFloat((scores.reduce((a, b) => a + b, 0) / 5).toFixed(1));

  // Colour band for a score 1–10
  const scoreColor = (v: number) =>
    v >= 9 ? "text-emerald-600" : v >= 7 ? "text-teal-600" : v >= 5 ? "text-amber-500" : "text-red-500";

  const trackColor = (v: number) =>
    v >= 9 ? "accent-emerald-500" : v >= 7 ? "accent-teal-500" : v >= 5 ? "accent-amber-400" : "accent-red-400";

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
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <h3 className="font-semibold text-gray-900 text-sm">Rate your experience</h3>
        <div className="flex items-center gap-1.5 bg-white border border-amber-200 px-2.5 py-1 rounded-full">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className={`text-sm font-bold ${scoreColor(avgScore)}`}>{avgScore}</span>
          <span className="text-xs text-gray-400">/ 10</span>
        </div>
      </div>

      {/* Questions */}
      <div className="px-5 py-3 space-y-4">
        {questions.map((q, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 flex-1 pr-3 leading-snug">
                <span className="text-gray-400 mr-1">{i + 1}.</span>{q}
              </span>
              <span className={`text-base font-bold w-7 text-right ${scoreColor(scores[i])}`}>
                {scores[i]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={scores[i]}
              onChange={(e) => {
                const next = [...scores];
                next[i] = parseInt(e.target.value);
                setScores(next);
              }}
              className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${trackColor(scores[i])}`}
            />
            <div className="flex justify-between text-xs text-gray-300 mt-0.5 px-0.5">
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>
        ))}
      </div>

      {/* Comment + Submit */}
      <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Comment (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Share your experience…"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting…" : "Submit Rating"}
        </button>
      </div>
    </div>
  );
}
