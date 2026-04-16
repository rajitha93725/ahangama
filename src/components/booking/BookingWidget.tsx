"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatCurrency, calcNights } from "@/lib/utils";
import { useLKRRate } from "@/hooks/useLKRRate";
import { Calendar, Users, MapPin, Navigation, Car, BedDouble, Bath } from "lucide-react";
import { MEAL_PLANS, VEHICLE_SHORT_NAMES } from "@/lib/constants";

interface VehicleGroupProp { type: string; count: number; maxPassengers: number; }

interface RoomTypeProp {
  typeId: string;
  typeName: string;
  displayLabel: string;
  total: number;
  available: number;
  beds: number;
  maxGuests: number;
  bathrooms: number;
  pricePerNight: number;
  priceBnB?: number | null;
  priceHalfBoard?: number | null;
  priceFullBoard?: number | null;
}

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
  vehicleGroups?: VehicleGroupProp[] | null;
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
  vehicleGroups = null,
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
  const [availableRoomNames, setAvailableRoomNames] = useState<string[]>([]);
  const [availableRoomTypes, setAvailableRoomTypes] = useState<RoomTypeProp[] | null>(null);
  // Per-type quantities: { [typeId]: count }
  const [roomTypeQty, setRoomTypeQty] = useState<Record<string, number>>({});
  const [selectedVehicleType, setSelectedVehicleType] = useState("");
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
    // For non-typed properties update offer from property-level price
    if (!availableRoomTypes) {
      const price = mealPlanPrices[value];
      if (price !== null && price !== undefined) setOfferAmount(String(price));
    }
  };

  // Transport-only
  const [pickupPoint, setPickupPoint] = useState("");
  const [dropPoint, setDropPoint] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [transportOffer, setTransportOffer] = useState("");

  const nights = checkIn && checkOut ? calcNights(checkIn, checkOut) : 0;
  const lkrRate = useLKRRate();

  // Compute suggested total for typed room selection
  const roomTypeSuggestedNightTotal = availableRoomTypes
    ? availableRoomTypes.reduce((sum, rt) => {
        const qty = roomTypeQty[rt.typeId] ?? 0;
        if (qty === 0) return sum;
        const price =
          mealPlan === "BED_BREAKFAST" && rt.priceBnB ? rt.priceBnB :
          mealPlan === "HALF_BOARD" && rt.priceHalfBoard ? rt.priceHalfBoard :
          mealPlan === "FULL_BOARD" && rt.priceFullBoard ? rt.priceFullBoard :
          rt.pricePerNight;
        return sum + price * qty;
      }, 0)
    : 0;

  const totalRoomsSelected = availableRoomTypes
    ? Object.values(roomTypeQty).reduce((s, v) => s + v, 0)
    : roomsRequested;

  // Derive which meal plans all selected types share
  const sharedMealPlans: Record<string, number | null> = availableRoomTypes
    ? (() => {
        const selected = availableRoomTypes.filter((rt) => (roomTypeQty[rt.typeId] ?? 0) > 0);
        if (selected.length === 0) return mealPlanPrices; // fall back to property prices
        const plans: Record<string, number | null> = { ROOM_ONLY: roomTypeSuggestedNightTotal };
        const planKeys = ["priceBnB", "priceHalfBoard", "priceFullBoard"] as const;
        const planMap = { priceBnB: "BED_BREAKFAST", priceHalfBoard: "HALF_BOARD", priceFullBoard: "FULL_BOARD" };
        for (const key of planKeys) {
          const allHave = selected.every((rt) => rt[key] != null);
          if (allHave) {
            const total = selected.reduce((s, rt) => s + (rt[key] as number) * (roomTypeQty[rt.typeId] ?? 0), 0);
            plans[planMap[key]] = total;
          } else {
            plans[planMap[key]] = null;
          }
        }
        return plans;
      })()
    : mealPlanPrices;

  // Fetch available room/vehicle count whenever dates change
  const fetchAvailableRooms = async (ci: string, co: string) => {
    if (!ci || !co) return;
    setRoomsLoading(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/available-rooms?checkIn=${new Date(ci).toISOString()}&checkOut=${new Date(co).toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(data.availableCount ?? 0);
        setAvailableRoomNames(data.roomNames ?? []);
        setAvailableRoomTypes(data.roomTypes ?? null);
        setRoomsRequested(1);
        setRoomTypeQty({});
        setSelectedVehicleType("");

        // Auto-set offer from min room type price
        if (data.roomTypes?.length > 0) {
          const minRoomPrice = Math.min(...data.roomTypes.map((rt: RoomTypeProp) => rt.pricePerNight));
          setOfferAmount(String(minRoomPrice));
        }
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

  // Stay total — typed or untyped
  const stayNightlyRate = availableRoomTypes
    ? roomTypeSuggestedNightTotal
    : parseFloat(offerAmount) || 0;
  const stayTotal = nights > 0 ? stayNightlyRate * nights : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { router.push("/login"); return; }

    if (isTransport) {
      if (!pickupPoint.trim()) { setError("Please enter a pickup point"); return; }
      if (!dropPoint.trim()) { setError("Please enter a drop point"); return; }
      if (!distanceKm || parseFloat(distanceKm) <= 0) { setError("Please enter distance in km"); return; }
      if (nights < 0) { setError("Invalid dates"); return; }
      if (availableRooms === 0) { setError("No vehicles available for this date"); return; }
    } else {
      if (nights <= 0) { setError("Please select valid dates"); return; }
      if (availableRooms === 0) { setError("No rooms available for these dates"); return; }
      if (availableRooms === null) { setError("Please select dates to check availability"); return; }
      if (availableRoomTypes) {
        if (totalRoomsSelected === 0) { setError("Please select at least one room"); return; }
      } else {
        if (parseFloat(offerAmount) < effectiveMinPrice) {
          setError(`Minimum offer is ${formatCurrency(effectiveMinPrice)}/night`);
          return;
        }
      }
    }

    const finalOfferPerNight = availableRoomTypes ? roomTypeSuggestedNightTotal : parseFloat(offerAmount);
    const finalOffer = isTransport
      ? parseFloat(transportOffer) || suggestedTotal
      : finalOfferPerNight * nights;

    if (!isTransport && !availableRoomTypes && finalOffer < effectiveMinPrice * nights) {
      setError(`Minimum offer is ${formatCurrency(effectiveMinPrice)}/night`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      // Build room selections for typed rooms
      const roomSelections = availableRoomTypes
        ? availableRoomTypes
            .filter((rt) => (roomTypeQty[rt.typeId] ?? 0) > 0)
            .map((rt) => ({ typeId: rt.typeId, typeName: rt.typeName, displayLabel: rt.displayLabel, count: roomTypeQty[rt.typeId] }))
        : undefined;

      const payload: Record<string, unknown> = {
        propertyId,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut || checkIn).toISOString(),
        guests,
        roomsRequested: totalRoomsSelected,
        offerAmount: finalOffer,
        message,
        mealPlan: isTransport ? undefined : mealPlan,
        roomSelections,
      };
      if (isTransport) {
        payload.pickupPoint = pickupPoint;
        payload.dropPoint = dropPoint;
        payload.distanceKm = parseFloat(distanceKm);
        if (selectedVehicleType) payload.vehicleType = selectedVehicleType;
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
            </div>
          )}
        </div>
        <p className="text-xs text-amber-600 mb-4">Prices are negotiable — make your offer below</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Pickup Point</label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              <input type="text" value={pickupPoint} onChange={(e) => setPickupPoint(e.target.value)} required
                placeholder="e.g. Galle Fort entrance"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Drop Point</label>
            <div className="relative">
              <Navigation className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              <input type="text" value={dropPoint} onChange={(e) => setDropPoint(e.target.value)} required
                placeholder="e.g. Mirissa beach"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Approximate Distance <span className="text-gray-400">(km)</span></label>
            <div className="relative">
              <Car className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="number" min="0" step="0.5" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} required placeholder="0"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="date" value={checkIn} min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    const co = checkOut || new Date(new Date(e.target.value).getTime() + 86400000).toISOString().split("T")[0];
                    fetchAvailableRooms(e.target.value, co);
                  }}
                  required className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">End Date <span className="text-gray-400">(optional)</span></label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="date" value={checkOut} min={checkIn || new Date().toISOString().split("T")[0]}
                  onChange={(e) => { setCheckOut(e.target.value); if (checkIn) fetchAvailableRooms(checkIn, e.target.value); }}
                  className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
            </div>
          </div>

          {checkIn && (() => {
            if (roomsLoading) return <p className="text-xs text-gray-400">Checking vehicle availability…</p>;
            if (availableRooms === 0) return (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">All vehicles booked for this date.</p>
            );
            if (availableRoomNames.length === 0) return null;
            const typeMap: Record<string, number> = {};
            for (const name of availableRoomNames) {
              const type = name.replace(/ \d+$/, "").trim();
              typeMap[type] = (typeMap[type] || 0) + 1;
            }
            const typeEntries = Object.entries(typeMap);
            const selectedTypeMaxPassengers = vehicleGroups
              ? (vehicleGroups.find((g) => (VEHICLE_SHORT_NAMES[g.type] ?? g.type) === selectedVehicleType)?.maxPassengers ?? maxGuests)
              : maxGuests;
            const countForSelected = typeMap[selectedVehicleType] ?? 0;
            return (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 block">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {typeEntries.map(([type, avail]) => (
                    <button key={type} type="button"
                      onClick={() => { setSelectedVehicleType(type); setRoomsRequested(1); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all ${selectedVehicleType === type ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                      <span>{type}</span>
                      <span className={`text-xs ${selectedVehicleType === type ? "text-amber-600" : "text-gray-400"}`}>{avail} avail.</span>
                    </button>
                  ))}
                </div>
                {selectedVehicleType && countForSelected > 0 && (
                  <>
                    <label className="text-xs font-medium text-gray-700 block mt-1">Number of {selectedVehicleType}s</label>
                    <div className="relative">
                      <Car className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select value={roomsRequested} onChange={(e) => setRoomsRequested(parseInt(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none appearance-none">
                        {Array.from({ length: countForSelected }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n} {selectedVehicleType}{n !== 1 ? "s" : ""}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {selectedVehicleType && <div className="text-xs text-gray-400">Max {selectedTypeMaxPassengers} passengers per vehicle</div>}
              </div>
            );
          })()}

          {(() => {
            const cap = selectedVehicleType && vehicleGroups
              ? (vehicleGroups.find((g) => (VEHICLE_SHORT_NAMES[g.type] ?? g.type) === selectedVehicleType)?.maxPassengers ?? maxGuests)
              : maxGuests;
            return (
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Passengers</label>
                <div className="relative">
                  <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={guests} onChange={(e) => setGuests(parseInt(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none appearance-none">
                    {Array.from({ length: cap }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} passenger{n !== 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })()}

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

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Your offer (total trip)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input type="number" value={transportOffer} onChange={(e) => setTransportOffer(e.target.value)}
                min={minPrice} step="1" placeholder={suggestedTotal > 0 ? String(Math.round(suggestedTotal)) : "0"}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Leave blank to use the suggested total above</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Message (optional)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
              placeholder="Any special requirements..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors">
            {submitting ? "Sending offer…" : session ? "Send Offer" : "Sign in to book"}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-3">You won't be charged until the provider accepts</p>
      </div>
    );
  }

  // ─── Stay widget ────────────────────────────────────────────────────────────
  const selectedPlanPrice = availableRoomTypes ? roomTypeSuggestedNightTotal : (sharedMealPlans[mealPlan] ?? pricePerNight);
  const selectedPlanLabel = MEAL_PLANS.find((m) => m.value === mealPlan)?.label ?? "Room Only";
  const effectiveMinPrice = availableRoomTypes
    ? 0 // not used in typed mode
    : Math.round((sharedMealPlans[mealPlan] ?? pricePerNight) * 0.8);

  const hasTypedRooms = !!availableRoomTypes;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 sticky top-24">
      {!hasTypedRooms && (
        <>
          <div className="flex items-baseline gap-1 mb-0.5">
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(selectedPlanPrice)}</span>
            <span className="text-gray-500 text-sm">/ night</span>
          </div>
          {lkrRate && <p className="text-xs text-gray-400 mb-0.5">≈ LKR {Math.round(selectedPlanPrice * lkrRate).toLocaleString()} / night</p>}
          <p className="text-xs text-gray-500 mb-1">{selectedPlanLabel}</p>
        </>
      )}
      {hasTypedRooms && totalRoomsSelected > 0 && nights > 0 && (
        <div className="mb-3">
          <span className="text-xl font-bold text-gray-900">{formatCurrency(stayTotal)}</span>
          <span className="text-gray-500 text-sm ml-1">total ({nights} night{nights !== 1 ? "s" : ""})</span>
          {lkrRate && stayTotal > 0 && (
            <p className="text-xs text-gray-400">≈ LKR {Math.round(stayTotal * lkrRate).toLocaleString()}</p>
          )}
        </div>
      )}
      <p className="text-xs text-teal-600 mb-4">Price is negotiable — make your offer below</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Check-in</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={checkIn} min={new Date().toISOString().split("T")[0]}
                onChange={(e) => { setCheckIn(e.target.value); fetchAvailableRooms(e.target.value, checkOut); }}
                required className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Check-out</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={checkOut} min={checkIn || new Date().toISOString().split("T")[0]}
                onChange={(e) => { setCheckOut(e.target.value); fetchAvailableRooms(checkIn, e.target.value); }}
                required className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
        </div>

        {/* ─── Typed Room Selection ─── */}
        {checkIn && checkOut && nights > 0 && hasTypedRooms && availableRoomTypes && (
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">
              Select Rooms
              {roomsLoading && <span className="ml-2 text-gray-400">checking…</span>}
            </label>
            {availableRoomTypes.every((rt) => rt.available === 0) ? (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Fully booked for these dates — try different dates.
              </p>
            ) : (
              <div className="space-y-2">
                {availableRoomTypes.map((rt) => {
                  const qty = roomTypeQty[rt.typeId] ?? 0;
                  const planPrice =
                    mealPlan === "BED_BREAKFAST" && rt.priceBnB ? rt.priceBnB :
                    mealPlan === "HALF_BOARD" && rt.priceHalfBoard ? rt.priceHalfBoard :
                    mealPlan === "FULL_BOARD" && rt.priceFullBoard ? rt.priceFullBoard :
                    rt.pricePerNight;
                  return (
                    <div key={rt.typeId} className={`border rounded-xl p-3 transition-all ${qty > 0 ? "border-teal-400 bg-teal-50" : "border-gray-200"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{rt.displayLabel}</span>
                            {rt.available === 0 && (
                              <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">Sold out</span>
                            )}
                            {rt.available > 0 && rt.available <= 2 && (
                              <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{rt.available} left</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{rt.beds} bed{rt.beds !== 1 ? "s" : ""}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />max {rt.maxGuests}</span>
                            <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{rt.bathrooms} bath</span>
                          </div>
                          <p className="text-xs font-semibold text-teal-700 mt-1">
                            {formatCurrency(planPrice)}/night
                            {lkrRate && <span className="font-normal text-gray-400 ml-1">≈ LKR {Math.round(planPrice * lkrRate).toLocaleString()}</span>}
                          </p>
                        </div>
                        {/* Quantity selector */}
                        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                          <button type="button" disabled={qty === 0}
                            onClick={() => setRoomTypeQty((prev) => ({ ...prev, [rt.typeId]: Math.max(0, (prev[rt.typeId] ?? 0) - 1) }))}
                            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">−</button>
                          <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                          <button type="button" disabled={qty >= rt.available}
                            onClick={() => setRoomTypeQty((prev) => ({ ...prev, [rt.typeId]: Math.min(rt.available, (prev[rt.typeId] ?? 0) + 1) }))}
                            className="w-7 h-7 rounded-full border border-teal-400 bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700 hover:bg-teal-100 disabled:opacity-30 transition-colors">+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Simple Room Selector (non-typed) ─── */}
        {checkIn && checkOut && nights > 0 && !hasTypedRooms && (
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
                <select value={roomsRequested} onChange={(e) => setRoomsRequested(parseInt(e.target.value))} required
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
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
            <select value={guests} onChange={(e) => setGuests(parseInt(e.target.value))}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none appearance-none">
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} guest{n !== 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Meal Plan */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Meal Plan</label>
          <div className="grid grid-cols-1 gap-1.5">
            {MEAL_PLANS.map((m) => {
              const price = sharedMealPlans[m.value];
              if (price === null) return null;
              return (
                <button key={m.value} type="button" onClick={() => selectMealPlan(m.value)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all ${mealPlan === m.value ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  <span>{m.label}</span>
                  {hasTypedRooms ? (
                    <span className={`font-semibold ${mealPlan === m.value ? "text-teal-700" : "text-gray-700"}`}>
                      {totalRoomsSelected > 0 ? `${formatCurrency(price as number)}/night total` : "—"}
                    </span>
                  ) : (
                    <span className={`font-semibold ${mealPlan === m.value ? "text-teal-700" : "text-gray-700"}`}>
                      {formatCurrency(price as number)}/night
                      {lkrRate && <span className="font-normal text-gray-400 ml-1">≈ LKR {Math.round((price as number) * lkrRate).toLocaleString()}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Offer field — untyped only */}
        {!hasTypedRooms && (
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Your offer per night <span className="text-gray-400">(min {formatCurrency(effectiveMinPrice)})</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)}
                min={effectiveMinPrice} step="1" required
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            {lkrRate && parseFloat(offerAmount) > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                ≈ LKR {Math.round(parseFloat(offerAmount) * lkrRate).toLocaleString()} / night
                {nights > 0 && <> · LKR {Math.round(parseFloat(offerAmount) * nights * lkrRate).toLocaleString()} total</>}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Message to host (optional)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
            placeholder="Tell the host about your trip..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {nights > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            {hasTypedRooms && totalRoomsSelected > 0
              ? availableRoomTypes
                  ?.filter((rt) => (roomTypeQty[rt.typeId] ?? 0) > 0)
                  .map((rt) => {
                    const qty = roomTypeQty[rt.typeId];
                    const planPrice =
                      mealPlan === "BED_BREAKFAST" && rt.priceBnB ? rt.priceBnB :
                      mealPlan === "HALF_BOARD" && rt.priceHalfBoard ? rt.priceHalfBoard :
                      mealPlan === "FULL_BOARD" && rt.priceFullBoard ? rt.priceFullBoard :
                      rt.pricePerNight;
                    return (
                      <div key={rt.typeId} className="flex justify-between text-gray-600">
                        <span>{rt.displayLabel} × {qty} × {nights} nights</span>
                        <span>{formatCurrency(planPrice * qty * nights)}</span>
                      </div>
                    );
                  })
              : (
                <div className="flex justify-between text-gray-600">
                  <span>{formatCurrency(parseFloat(offerAmount) || 0)} × {nights} nights</span>
                  <span>{formatCurrency(stayTotal)}</span>
                </div>
              )
            }
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

        <button type="submit" disabled={submitting}
          className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors">
          {submitting ? "Sending offer…" : session ? "Send Offer" : "Sign in to book"}
        </button>
      </form>
      <p className="text-xs text-gray-400 text-center mt-3">You won't be charged until the host accepts</p>
    </div>
  );
}
