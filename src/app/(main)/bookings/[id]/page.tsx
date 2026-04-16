import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: { select: { id: true, name: true, image: true, email: true, phone: true } },
      property: {
        include: {
          host: { select: { id: true, name: true, image: true, phone: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      offers: {
        include: { sender: { select: { id: true, name: true, image: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      review: true,
    },
  });

  if (!booking) notFound();

  // Auto-complete: if ACCEPTED and checkout was before 12:01 AM today, mark COMPLETED
  if (booking.status === "ACCEPTED") {
    const checkOut = new Date(booking.checkOut);
    const completionTime = new Date(checkOut);
    completionTime.setDate(completionTime.getDate() + 1);
    completionTime.setHours(0, 1, 0, 0);
    if (completionTime <= new Date()) {
      await prisma.booking.update({ where: { id }, data: { status: "COMPLETED" } });
      // @ts-expect-error mutate for display
      booking.status = "COMPLETED";
    }
  }

  // Enrich with raw columns (stale Prisma client doesn't know them)
  const transportRow = await prisma.$queryRaw<
    { pickupPoint: string | null; dropPoint: string | null; distanceKm: number | null; category: string; mealPlan: string; roomSelections: string | null }[]
  >`
    SELECT b.pickupPoint, b.dropPoint, b.distanceKm, b.mealPlan, b.roomSelections, p.category
    FROM "Booking" b
    JOIN "Property" p ON p.id = b.propertyId
    WHERE b.id = ${id}
  `;
  const transportInfo = transportRow[0] ?? { pickupPoint: null, dropPoint: null, distanceKm: null, category: "STAY", mealPlan: "ROOM_ONLY", roomSelections: null };
  type RoomSelection = { typeId: string; typeName: string; displayLabel: string; count: number };
  const roomSelections: RoomSelection[] | null = transportInfo.roomSelections
    ? (() => { try { return JSON.parse(transportInfo.roomSelections); } catch { return null; } })()
    : null;
  const isTransportBooking = transportInfo.category === "TRANSPORT";

  const isGuest = booking.guestId === session.user.id;
  const isHost = booking.property.hostId === session.user.id;
  if (!isGuest && !isHost && session.user.role !== "ADMIN") redirect("/bookings");

  // Fetch the property's current PropertyRating (avg across all rated rows)
  const ratingRows = await prisma.$queryRawUnsafe<{ avgScore: number }[]>(
    `SELECT avgScore FROM "PropertyRating" WHERE propertyId = ?`,
    booking.propertyId
  );
  const propertyAvgScore =
    ratingRows.length > 0
      ? ratingRows.reduce((s, r) => s + r.avgScore, 0) / ratingRows.length
      : null;

  // Check if this guest has already rated this booking — only allowed once COMPLETED
  const canRate = isGuest && booking.status === "COMPLETED";
  const hasRated = canRate
    ? (await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "PropertyRating" WHERE bookingId = ? LIMIT 1`,
        booking.id
      )).length > 0
    : false;

  const property = booking.property;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/bookings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to bookings
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Details */}
        <div className="lg:col-span-3 space-y-6">
          {/* Property card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {property.images[0]?.url ? (
                  <img src={property.images[0].url} alt={property.title} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full bg-teal-50" />}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/properties/${property.id}`} className="font-semibold text-gray-900 hover:text-teal-600 truncate block">
                  {property.title}
                </Link>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <MapPin className="w-3 h-3" /> {property.address}, {property.district}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {property.host.image ? (
                    <img src={property.host.image} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-semibold">
                      {getInitials(property.host.name)}
                    </div>
                  )}
                  <span className="text-xs text-gray-500">Host: {property.host.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Booking Details</h2>
              <BookingStatusBadge status={booking.status} />
            </div>
            {isTransportBooking && transportInfo.pickupPoint ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Pickup Point</p>
                    <p className="font-medium">{transportInfo.pickupPoint}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <Navigation className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Drop Point</p>
                    <p className="font-medium">{transportInfo.dropPoint}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {transportInfo.distanceKm !== null && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Car className="w-4 h-4 text-amber-500" />
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Distance</p>
                        <p>{transportInfo.distanceKm} km</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Trip Dates</p>
                      <p>{formatDateRange(booking.checkIn, booking.checkOut)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Passengers · Nights</p>
                    <p>{booking.guests} passengers · {booking.nights} nights</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-teal-500" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Dates</p>
                    <p>{formatDateRange(booking.checkIn, booking.checkOut)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 text-teal-500" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Guests · Nights</p>
                    <p>{booking.guests} guests · {booking.nights} nights</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600 col-span-2">
                  <UtensilsCrossed className="w-4 h-4 text-teal-500" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Meal Plan</p>
                    <p>{MEAL_PLANS.find((m) => m.value === transportInfo.mealPlan)?.label ?? "Room Only"}</p>
                  </div>
                </div>
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

            {booking.status === "ACCEPTED" && booking.totalPrice !== null && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm text-green-800 font-medium">Booking Confirmed</p>
                <p className="text-lg font-bold text-green-900 mt-1">{formatCurrency(booking.totalPrice!)} total</p>
                {isTransportBooking ? (
                  transportInfo.distanceKm
                    ? <p className="text-xs text-green-600">{transportInfo.distanceKm} km · {booking.nights} nights parking</p>
                    : null
                ) : (
                  <p className="text-xs text-green-600">{formatCurrency(booking.totalPrice! / booking.nights)}/night for {booking.nights} nights</p>
                )}
              </div>
            )}

            {/* ── Contact info revealed after acceptance ── */}
            {["ACCEPTED", "COMPLETED"].includes(booking.status) && (
              <>
                {/* Host sees guest phone */}
                {isHost && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Guest Contact</p>
                    <div className="flex items-center gap-2">
                      {booking.guest.image ? (
                        <img src={booking.guest.image} alt="" className="w-9 h-9 rounded-full" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold">
                          {getInitials(booking.guest.name)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.guest.name}</p>
                        <p className="text-xs text-gray-500">{booking.guest.email}</p>
                        {(booking.guest as { phone?: string | null }).phone && (
                          <a href={`tel:${(booking.guest as { phone?: string | null }).phone}`}
                            className="flex items-center gap-1 text-xs text-blue-600 font-medium mt-0.5 hover:underline">
                            <Phone className="w-3 h-3" />
                            {(booking.guest as { phone?: string | null }).phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Guest sees property location map + host phone */}
                {isGuest && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Property Location & Host Contact</p>
                    {/* Map */}
                    <div className="rounded-lg overflow-hidden border border-teal-200">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.03},${property.latitude - 0.03},${property.longitude + 0.03},${property.latitude + 0.03}&layer=mapnik&marker=${property.latitude},${property.longitude}`}
                        className="w-full h-44"
                        loading="lazy"
                        title="Property location"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-teal-700">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{property.address}, {property.district}</span>
                    </div>
                    {/* Host contact */}
                    <div className="flex items-center gap-2 pt-2 border-t border-teal-200">
                      {property.host.image ? (
                        <img src={property.host.image} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-semibold">
                          {getInitials(property.host.name)}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-gray-800">{property.host.name}</p>
                        {(property.host as { phone?: string | null }).phone && (
                          <a href={`tel:${(property.host as { phone?: string | null }).phone}`}
                            className="flex items-center gap-1 text-xs text-teal-600 font-medium hover:underline">
                            <Phone className="w-3 h-3" />
                            {(property.host as { phone?: string | null }).phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {isGuest && !["ACCEPTED", "COMPLETED"].includes(booking.status) && (
              <div className="flex items-center gap-2">
                {booking.guest.image ? (
                  <img src={booking.guest.image} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-semibold">
                    {getInitials(booking.guest.name)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{booking.guest.name}</p>
                  <p className="text-xs text-gray-400">{booking.guest.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Negotiation + Rating */}
        <div className="lg:col-span-2 space-y-4">
          {/* Property rating badge */}
          {propertyAvgScore !== null && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <StarRating value={ratingToStars(propertyAvgScore)} readonly size="sm" />
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-gray-900">{propertyAvgScore.toFixed(1)}</span>
                <span className="text-xs text-gray-400">/ 10</span>
              </div>
              <span className="text-xs text-gray-400 ml-auto">
                {ratingRows.length} rating{ratingRows.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <BookingDetailClient
              bookingId={booking.id}
              initialOffers={booking.offers.map((o) => ({
                ...o,
                createdAt: o.createdAt.toISOString(),
                sender: { ...o.sender, role: o.sender.role as string },
              }))}
              initialStatus={booking.status}
              nights={booking.nights}
              isGuest={isGuest}
              isHost={isHost}
              currentUserId={session.user.id}
            />
          </div>

          {/* Rating form: shown to guest after booking is ACCEPTED or COMPLETED */}
          {canRate && !hasRated && (
            <RatingForm
              propertyId={booking.propertyId}
              bookingId={booking.id}
              isTransport={isTransportBooking}
            />
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
