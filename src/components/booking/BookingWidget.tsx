"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatCurrency, calcNights } from "@/lib/utils";
import { useLKRRate } from "@/hooks/useLKRRate";
import { Calendar, Users, MapPin, Navigation, Car } from "lucide-react";
import { MEAL_PLANS } from "@/lib/constants";

interface Props {
  propertyId: string;
  pricePerNight: number;
  minPrice: number;
  maxGuests: number;
  category?: string;
  pricePerKm?: number;
  priceBnB?: number | null;
  priceHalfBoard?: number | null;
  priceFullBoard?: number | null;
}

export default function BookingWidget({
  propertyId,
  pricePerNight,
  minPrice,
  maxGuests,
  category = "STAY",
  pricePerKm = 0,
  priceBnB = null,
  priceHalfBoard = null,
  priceFullBoard = null,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const isTransport = category === "TRANSPORT";

  // Shared fields
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [roomsRequested, setRoomsRequested] = useState(1);
  const [availableRooms, setAvailableRooms] = useState<number | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Stay-only
  const [offerAmount, setOfferAmount] = useState(String(pricePerNight));
  const [mealPlan, setMealPlan] = useState("ROOM_ONLY");

  // Map each meal plan to its per-night price (null = not available)
  const mealPlanPrices: Record<string, number | null> = {
    ROOM_ONLY: pricePerNight,
    BED_BREAKFAST: priceBnB ?? null,
    HALF_BOARD: priceHalfBoard ?? null,
    FULL_BOARD: priceFullBoard ?? null,
  };

  const selectMealPlan = (value: string) => {
    setMealPlan(value);
    const price = mealPlanPrices[value];
    if (price !== null && price !== undefined) setOfferAmount(String(price));
  };

  // Transport-only
  const [pickupPoint, setPickupPoint] = useState("");
  const [dropPoint, setDropPoint] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [transportOffer, setTransportOffer] = useState("");

  const nights = checkIn && checkOut ? calcNights(checkIn, checkOut) : 0;
  const lkrRate = useLKRRate();

  // Fetch available room count whenever dates change (STAY only)
  const fetchAvailableRooms = async (ci: string, co: string) => {
    if (!ci || !co || isTransport) return;
    setRoomsLoading(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/available-rooms?checkIn=${new Date(ci).toISOString()}&checkOut=${new Date(co).toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(data.availableCount ?? 0);
        setRoomsRequested(1); // reset to 1 whenever dates change
      }
    } catch {
      setAvailableRooms(null);
    } finally {
      setRoomsLoading(false);
    }
  };

  // Transport auto-calculated total
  const suggestedTotal =
    isTransport && nights >= 0
      ? (parseFloat(distanceKm) || 0) * pricePerKm + nights * pricePerNight
      : 0;

  const stayTotal = nights > 0 ? parseFloat(offerAmount) * nights : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { router.push("/login"); return; }

    if (isTransport) {
      if (!pickupPoint.trim()) { setError("Please enter a pickup point"); return; }
      if (!dropPoint.trim()) { setError("Please enter a drop point"); return; }
      if (!distanceKm || parseFloat(distanceKm) <= 0) { setError("Please enter distance in km"); return; }
      if (nights < 0) { setError("Invalid dates"); return; }
    } else {
      if (nights <= 0) { setError("Please select valid dates"); return; }
      if (availableRooms === 0) { setError("No rooms available for these dates"); return; }
      if (availableRooms === null) { setError("Please select dates to check availability"); return; }
      if (parseFloat(offerAmount) < minPrice) {
        setError(`Minimum offer is ${formatCurrency(minPrice)}/night`);
        return;
      }
    }

    const finalOffer = isTransport
      ? parseFloat(transportOffer) || suggestedTotal
      : parseFloat(offerAmount) * nights;

    if (finalOffer < minPrice) {
      setError(`Minimum offer is ${formatCurrency(minPrice)}`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        propertyId,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut || checkIn).toISOString(),
        guests,
        roomsRequested: isTransport ? 1 : roomsRequested,
        offerAmount: finalOffer,
        message,
        mealPlan: isTransport ? undefined : mealPlan,
      };
      if (isTransport) {
        payload.pickupPoint = pickupPoint;
        payload.dropPoint = dropPoint;
        payload.distanceKm = parseFloat(distanceKm);
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  if (isTransport) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 shadow-lg p-6 sticky top-24">
        {/* Pricing header */}
        <div className="mb-4 space-y-1">
          {pricePerKm > 0 && (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-gray-900">{formatCurrency(pricePerKm)}</span>
                <span className="text-gray-500 text-sm">/ km</span>
              </div>
              {lkrRate && <p className="text-xs text-gray-400">≈ LKR {Math.round(pricePerKm * lkrRate).toLocaleString()} / km</p>}
            </div>
          )}
          {pricePerNight > 0 && (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-gray-700">{formatCurrency(pricePerNight)}</span>
                <span className="text-gray-500 text-sm">/ night parking</span>
              </div>
              {lkrRate && <p className="text-xs text-gray-400">≈ LKR {Math.round(pricePerNight * lkrRate).toLocaleString()} / night</p>}
            </div>
          )}
        </div>
        <p className="text-xs text-amber-600 mb-4">Prices are negotiable — make your offer below</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Pickup */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Pickup Point</label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              <input
                type="text"
                value={pickupPoint}
                onChange={(e) => setPickupPoint(e.target.value)}
                required
                placeholder="e.g. Galle Fort entrance"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Drop */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Drop Point</label>
            <div className="relative">
              <Navigation className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              <input
                type="text"
                value={dropPoint}
                onChange={(e) => setDropPoint(e.target.value)}
                required
                placeholder="e.g. Mirissa beach"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Distance */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Approximate Distance <span className="text-gray-400">(km)</span>
            </label>
            <div className="relative">
              <Car className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.5"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                required
                placeholder="0"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Dates (for parking nights) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={checkIn}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCheckIn(e.target.value)}
                  required
                  className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                End Date <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Passengers */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Passengers</label>
            <div className="relative">
              <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none appearance-none"
              >
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} passenger{n !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Live total breakdown */}
          {(parseFloat(distanceKm) > 0 || nights > 0) && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm space-y-1.5">
              {parseFloat(distanceKm) > 0 && pricePerKm > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{formatCurrency(pricePerKm)} × {distanceKm} km</span>
                  <span>{formatCurrency((parseFloat(distanceKm) || 0) * pricePerKm)}</span>
                </div>
              )}
              {nights > 0 && pricePerNight > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{formatCurrency(pricePerNight)} × {nights} night{nights !== 1 ? "s" : ""} parking</span>
                  <span>{formatCurrency(nights * pricePerNight)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 border-t border-amber-200 pt-1.5 mt-1">
                <span>Suggested total</span>
                <span className="text-amber-700">{formatCurrency(suggestedTotal)}</span>
              </div>
            </div>
          )}

          {/* Custom offer override */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Your offer (total trip)
              {suggestedTotal > 0 && (
                <button
                  type="button"
                  onClick={() => setTransportOffer(String(Math.round(suggestedTotal)))}
                  className="ml-2 text-amber-600 hover:underline"
                >
                  use {formatCurrency(suggestedTotal)}
                </button>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                value={transportOffer}
                onChange={(e) => setTransportOffer(e.target.value)}
                min={minPrice}
                step="1"
                placeholder={suggestedTotal > 0 ? String(Math.round(suggestedTotal)) : "0"}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
            {lkrRate && (parseFloat(transportOffer) > 0 || suggestedTotal > 0) && (
              <p className="text-xs text-gray-400 mt-1">
                ≈ LKR {Math.round((parseFloat(transportOffer) || suggestedTotal) * lkrRate).toLocaleString()} total
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">Leave blank to use the suggested total above</p>
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Message to provider (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Any special requirements, luggage, timing..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Sending offer…" : session ? "Send Offer" : "Sign in to book"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-3">You won't be charged until the provider accepts</p>
      </div>
    );
  }

  // ─── Stay widget (original) ────────────────────────────────────────────────
  const total = nights > 0 ? parseFloat(offerAmount) * nights : 0;
  const selectedPlanPrice = mealPlanPrices[mealPlan] ?? pricePerNight;
  const selectedPlanLabel = MEAL_PLANS.find((m) => m.value === mealPlan)?.label ?? "Room Only";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 sticky top-24">
      <div className="flex items-baseline gap-1 mb-0.5">
        <span className="text-2xl font-bold text-gray-900">{formatCurrency(selectedPlanPrice)}</span>
        <span className="text-gray-500 text-sm">/ night</span>
      </div>
      {lkrRate && <p className="text-xs text-gray-400 mb-0.5">≈ LKR {Math.round(selectedPlanPrice * lkrRate).toLocaleString()} / night</p>}
      <p className="text-xs text-gray-500 mb-1">{selectedPlanLabel}</p>
      <p className="text-xs text-teal-600 mb-4">Price is negotiable — make your offer below</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Check-in</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={checkIn}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  fetchAvailableRooms(e.target.value, checkOut);
                }}
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
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  fetchAvailableRooms(checkIn, e.target.value);
                }}
                required
                className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Rooms selector — shown once both dates are set */}
        {checkIn && checkOut && nights > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Number of Rooms
              {roomsLoading && <span className="ml-2 text-gray-400">checking…</span>}
              {!roomsLoading && availableRooms !== null && (
                <span className={`ml-2 font-normal ${availableRooms === 0 ? "text-red-500" : "text-teal-600"}`}>
                  {availableRooms === 0 ? "No rooms available" : `${availableRooms} available`}
                </span>
              )}
            </label>
            {availableRooms !== null && availableRooms > 0 ? (
              <div className="relative">
                <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={roomsRequested}
                  onChange={(e) => setRoomsRequested(parseInt(e.target.value))}
                  required
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none appearance-none"
                >
                  {Array.from({ length: availableRooms }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "room" : "rooms"}</option>
                  ))}
                </select>
              </div>
            ) : availableRooms === 0 ? (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Fully booked for these dates — try different dates.
              </p>
            ) : null}
          </div>
        )}

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

        {/* Meal Plan — shown before offer so selecting a plan updates the price */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Meal Plan</label>
          <div className="grid grid-cols-1 gap-1.5">
            {MEAL_PLANS.map((m) => {
              const price = mealPlanPrices[m.value];
              if (price === null) return null; // host didn't set a price — hide option
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => selectMealPlan(m.value)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    mealPlan === m.value
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span>{m.label}</span>
                  <span className={`font-semibold ${mealPlan === m.value ? "text-teal-700" : "text-gray-700"}`}>
                    {formatCurrency(price)}/night
                    {lkrRate && <span className="font-normal text-gray-400 ml-1">≈ LKR {Math.round(price * lkrRate).toLocaleString()}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
          {lkrRate && parseFloat(offerAmount) > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              ≈ LKR {Math.round(parseFloat(offerAmount) * lkrRate).toLocaleString()} / night
              {nights > 0 && <> · LKR {Math.round(parseFloat(offerAmount) * nights * lkrRate).toLocaleString()} total</>}
            </p>
          )}
        </div>

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

        {nights > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>{formatCurrency(parseFloat(offerAmount) || 0)} × {nights} nights</span>
              <span>{formatCurrency(stayTotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1">
              <span>Total offer</span>
              <div className="text-right">
                <span>{formatCurrency(stayTotal)}</span>
                {lkrRate && stayTotal > 0 && (
                  <p className="text-xs font-normal text-gray-400">≈ LKR {Math.round(stayTotal * lkrRate).toLocaleString()}</p>
                )}
              </div>
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
