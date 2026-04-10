"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatCurrency, calcNights } from "@/lib/utils";
import { Calendar, Users } from "lucide-react";

interface Props {
  propertyId: string;
  pricePerNight: number;
  minPrice: number;
  maxGuests: number;
}

export default function BookingWidget({ propertyId, pricePerNight, minPrice, maxGuests }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [offerAmount, setOfferAmount] = useState(String(pricePerNight));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const nights = checkIn && checkOut ? calcNights(checkIn, checkOut) : 0;
  const total = nights > 0 ? parseFloat(offerAmount) * nights : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { router.push("/login"); return; }
    if (nights <= 0) { setError("Please select valid dates"); return; }
    if (parseFloat(offerAmount) < minPrice) {
      setError(`Minimum offer is ${formatCurrency(minPrice)}/night`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          checkIn: new Date(checkIn).toISOString(),
          checkOut: new Date(checkOut).toISOString(),
          guests,
          offerAmount: parseFloat(offerAmount),
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send offer");
      router.push(`/bookings/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send offer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 sticky top-24">
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-2xl font-bold text-gray-900">{formatCurrency(pricePerNight)}</span>
        <span className="text-gray-500 text-sm">/ night</span>
      </div>
      <p className="text-xs text-teal-600 mb-4">Price is negotiable — make your offer below</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Check-in</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={checkIn}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setCheckIn(e.target.value)}
                required
                className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Check-out</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={checkOut}
                min={checkIn || new Date().toISOString().split("T")[0]}
                onChange={(e) => setCheckOut(e.target.value)}
                required
                className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Guests */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Guests</label>
          <div className="relative">
            <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value))}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none appearance-none"
            >
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} guest{n !== 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Offer amount */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Your offer per night <span className="text-gray-400">(min {formatCurrency(minPrice)})</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              min={minPrice}
              step="1"
              required
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Message to host (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Tell the host about your trip..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Summary */}
        {nights > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>{formatCurrency(parseFloat(offerAmount) || 0)} × {nights} nights</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1">
              <span>Total offer</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Sending offer…" : session ? "Send Offer" : "Sign in to book"}
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-3">You won't be charged until the host accepts</p>
    </div>
  );
}
