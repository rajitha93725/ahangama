import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import BookingDetailClient from "./BookingDetailClient";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";
import RatingForm from "@/components/booking/RatingForm";
import StarRating from "@/components/shared/StarRating";
import { formatDateRange, formatCurrency, getInitials } from "@/lib/utils";
import { ratingToStars } from "@/lib/ratingQuestions";
import Link from "next/link";
import { MapPin, Calendar, Users, ArrowLeft, Navigation, Car, Star, UtensilsCrossed, Phone } from "lucide-react";
import { MEAL_PLANS } from "@/lib/constants";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const { data: booking } = await supabaseAdmin.from("Booking").select("*").eq("id", id).maybeSingle();
  if (!booking) notFound();

  const [
    { data: guest },
    { data: property },
    { data: offers },
    { data: review },
  ] = await Promise.all([
    supabaseAdmin.from("User").select("id, name, image, email, phone").eq("id", booking.guestId).single(),
    supabaseAdmin.from("Property").select("*").eq("id", booking.propertyId).single(),
    supabaseAdmin.from("Offer").select("*").eq("bookingId", id).order("createdAt"),
    supabaseAdmin.from("Review").select("*").eq("bookingId", id).maybeSingle(),
  ]);

  const senderIds = [...new Set((offers || []).map((o: { senderId: string }) => o.senderId))];
  const [{ data: host }, { data: propertyImages }, { data: propertyRatings }, { data: senders }] = await Promise.all([
    supabaseAdmin.from("User").select("id, name, image, phone").eq("id", property.hostId).single(),
    supabaseAdmin.from("PropertyImage").select("url").eq("propertyId", booking.propertyId).eq("isPrimary", true).limit(1),
    supabaseAdmin.from("PropertyRating").select("avgScore").eq("propertyId", booking.propertyId).order("createdAt", { ascending: false }),
    senderIds.length ? supabaseAdmin.from("User").select("id, name, image, role").in("id", senderIds) : { data: [] },
  ]);

  const senderMap = Object.fromEntries((senders || []).map((s: { id: string; [key: string]: unknown }) => [s.id, s]));
  const enrichedOffers = (offers || []).map((o: { id: string; senderId: string; amount: number; type: string; message: string | null; createdAt: string; bookingId: string }) => ({
    ...o,
    createdAt: o.createdAt,
    sender: { ...(senderMap[o.senderId] ?? { id: o.senderId, name: null, image: null, role: null }), role: (senderMap[o.senderId] as { role?: string } | undefined)?.role as string ?? "" },
  }));

  // Auto-complete if ACCEPTED and past checkout
  let currentStatus = booking.status;
  if (booking.status === "ACCEPTED") {
    const checkOut = new Date(booking.checkOut);
    const completionTime = new Date(checkOut);
    completionTime.setDate(completionTime.getDate() + 1);
    completionTime.setHours(0, 1, 0, 0);
    if (completionTime <= new Date()) {
      await supabaseAdmin.from("Booking").update({ status: "COMPLETED", updatedAt: new Date().toISOString() }).eq("id", id);
      currentStatus = "COMPLETED";
    }
  }

  const isTransportBooking = property.category === "TRANSPORT";
  type RoomSelection = { typeId: string; typeName: string; displayLabel: string; count: number };
  const roomSelections: RoomSelection[] | null = booking.roomSelections
    ? (() => { try { return JSON.parse(booking.roomSelections as string); } catch { return null; } })()
    : null;
  const transportInfo = {
    pickupPoint: booking.pickupPoint,
    dropPoint: booking.dropPoint,
    distanceKm: booking.distanceKm,
    mealPlan: booking.mealPlan ?? "ROOM_ONLY",
  };

  const isGuest = booking.guestId === session.user.id;
  const isHost = property.hostId === session.user.id;
  if (!isGuest && !isHost && session.user.role !== "ADMIN") redirect("/bookings");

  const ratingRows = propertyRatings || [];
  const propertyAvgScore = ratingRows.length > 0
    ? (ratingRows as { avgScore: number }[]).reduce((s, r) => s + Number(r.avgScore), 0) / ratingRows.length
    : null;

  const canRate = isGuest && currentStatus === "COMPLETED";
  let hasRated = false;
  if (canRate) {
    const { count } = await supabaseAdmin.from("PropertyRating").select("*", { count: "exact", head: true }).eq("bookingId", booking.id);
    hasRated = (count || 0) > 0;
  }

  const fullProperty = {
    ...property,
    host: { ...host, phone: host?.phone ?? null },
    images: propertyImages || [],
    latitude: property.latitude,
    longitude: property.longitude,
    address: property.address,
    district: property.district,
    hostId: property.hostId,
    category: property.category,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/bookings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to bookings
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {(propertyImages || [])[0]?.url ? (
                  <img src={(propertyImages || [])[0].url} alt={property.title} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full bg-teal-50" />}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/properties/${property.id}`} className="font-semibold text-gray-900 hover:text-teal-600 truncate block">{property.title}</Link>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><MapPin className="w-3 h-3" /> {property.address}, {property.district}</div>
                <div className="flex items-center gap-2 mt-2">
                  {host?.image ? (
                    <img src={host.image} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-semibold">{getInitials(host?.name)}</div>
                  )}
                  <span className="text-xs text-gray-500">Host: {host?.name}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Booking Details</h2>
              <BookingStatusBadge status={currentStatus} />
            </div>
            {isTransportBooking && transportInfo.pickupPoint ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-gray-600"><MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /><div><p className="text-xs text-gray-400 mb-0.5">Pickup Point</p><p className="font-medium">{transportInfo.pickupPoint}</p></div></div>
                <div className="flex items-start gap-2 text-gray-600"><Navigation className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" /><div><p className="text-xs text-gray-400 mb-0.5">Drop Point</p><p className="font-medium">{transportInfo.dropPoint}</p></div></div>
                <div className="grid grid-cols-2 gap-3">
                  {transportInfo.distanceKm !== null && (
                    <div className="flex items-center gap-2 text-gray-600"><Car className="w-4 h-4 text-amber-500" /><div><p className="text-xs text-gray-400 mb-0.5">Distance</p><p>{transportInfo.distanceKm} km</p></div></div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600"><Calendar className="w-4 h-4 text-amber-500" /><div><p className="text-xs text-gray-400 mb-0.5">Trip Dates</p><p>{formatDateRange(new Date(booking.checkIn), new Date(booking.checkOut))}</p></div></div>
                </div>
                <div className="flex items-center gap-2 text-gray-600"><Users className="w-4 h-4 text-amber-500" /><div><p className="text-xs text-gray-400 mb-0.5">Passengers · Nights</p><p>{booking.guests} passengers · {booking.nights} nights</p></div></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600"><Calendar className="w-4 h-4 text-teal-500" /><div><p className="text-xs text-gray-400 mb-0.5">Dates</p><p>{formatDateRange(new Date(booking.checkIn), new Date(booking.checkOut))}</p></div></div>
                <div className="flex items-center gap-2 text-gray-600"><Users className="w-4 h-4 text-teal-500" /><div><p className="text-xs text-gray-400 mb-0.5">Guests · Nights</p><p>{booking.guests} guests · {booking.nights} nights</p></div></div>
                <div className="flex items-center gap-2 text-gray-600 col-span-2"><UtensilsCrossed className="w-4 h-4 text-teal-500" /><div><p className="text-xs text-gray-400 mb-0.5">Meal Plan</p><p>{MEAL_PLANS.find((m) => m.value === transportInfo.mealPlan)?.label ?? "Room Only"}</p></div></div>
                {roomSelections && roomSelections.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1.5">Room Selection</p>
                    <div className="flex flex-wrap gap-1.5">
                      {roomSelections.map((rs) => (
                        <span key={rs.typeId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-xs font-medium">
                          <span className="font-bold">{rs.count}×</span> {rs.displayLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStatus === "ACCEPTED" && booking.totalPrice !== null && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm text-green-800 font-medium">Booking Confirmed</p>
                <p className="text-lg font-bold text-green-900 mt-1">{formatCurrency(booking.totalPrice!)} total</p>
                {isTransportBooking ? (
                  transportInfo.distanceKm ? <p className="text-xs text-green-600">{transportInfo.distanceKm} km · {booking.nights} nights parking</p> : null
                ) : (
                  <p className="text-xs text-green-600">{formatCurrency(booking.totalPrice! / booking.nights)}/night for {booking.nights} nights</p>
                )}
              </div>
            )}

            {["ACCEPTED", "COMPLETED"].includes(currentStatus) && (
              <>
                {isHost && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Guest Contact</p>
                    <div className="flex items-center gap-2">
                      {guest?.image ? <img src={guest.image} alt="" className="w-9 h-9 rounded-full" /> : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold">{getInitials(guest?.name)}</div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{guest?.name}</p>
                        <p className="text-xs text-gray-500">{guest?.email}</p>
                        {guest?.phone && <a href={`tel:${guest.phone}`} className="flex items-center gap-1 text-xs text-blue-600 font-medium mt-0.5 hover:underline"><Phone className="w-3 h-3" />{guest.phone}</a>}
                      </div>
                    </div>
                  </div>
                )}
                {isGuest && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Property Location & Host Contact</p>
                    <div className="rounded-lg overflow-hidden border border-teal-200">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.03},${property.latitude - 0.03},${property.longitude + 0.03},${property.latitude + 0.03}&layer=mapnik&marker=${property.latitude},${property.longitude}`}
                        className="w-full h-44" loading="lazy" title="Property location"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-teal-700"><MapPin className="w-3.5 h-3.5" /><span>{property.address}, {property.district}</span></div>
                    <div className="flex items-center gap-2 pt-2 border-t border-teal-200">
                      {host?.image ? <img src={host.image} alt="" className="w-8 h-8 rounded-full" /> : (
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-semibold">{getInitials(host?.name)}</div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-gray-800">{host?.name}</p>
                        {host?.phone && <a href={`tel:${host.phone}`} className="flex items-center gap-1 text-xs text-teal-600 font-medium hover:underline"><Phone className="w-3 h-3" />{host.phone}</a>}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {isGuest && !["ACCEPTED", "COMPLETED"].includes(currentStatus) && (
              <div className="flex items-center gap-2">
                {guest?.image ? <img src={guest.image} alt="" className="w-8 h-8 rounded-full" /> : (
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-semibold">{getInitials(guest?.name)}</div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{guest?.name}</p>
                  <p className="text-xs text-gray-400">{guest?.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {propertyAvgScore !== null && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5"><StarRating value={ratingToStars(propertyAvgScore)} readonly size="sm" /></div>
              <div className="flex items-center gap-1.5"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /><span className="text-sm font-bold text-gray-900">{propertyAvgScore.toFixed(1)}</span><span className="text-xs text-gray-400">/ 10</span></div>
              <span className="text-xs text-gray-400 ml-auto">{ratingRows.length} rating{ratingRows.length !== 1 ? "s" : ""}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <BookingDetailClient
              bookingId={booking.id}
              initialOffers={enrichedOffers.map((o) => ({
                ...o,
                createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date(o.createdAt as Date).toISOString(),
                sender: { ...o.sender, role: o.sender.role as string },
              }))}
              initialStatus={currentStatus}
              nights={booking.nights}
              checkIn={booking.checkIn}
              isGuest={isGuest}
              isHost={isHost}
              currentUserId={session.user.id}
            />
          </div>

          {canRate && !hasRated && (
            <RatingForm propertyId={booking.propertyId} bookingId={booking.id} isTransport={isTransportBooking} />
          )}
          {canRate && hasRated && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center">
              <p className="text-sm text-teal-700 font-medium">You have already rated this booking.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
