import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NegotiationThread from "@/components/booking/NegotiationThread";
import BookingDetailClient from "./BookingDetailClient";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";
import { formatDateRange, formatCurrency, getInitials } from "@/lib/utils";
import Link from "next/link";
import { MapPin, Calendar, Users, ArrowLeft } from "lucide-react";

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
      guest: { select: { id: true, name: true, image: true, email: true } },
      property: {
        include: {
          host: { select: { id: true, name: true, image: true } },
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

  const isGuest = booking.guestId === session.user.id;
  const isHost = booking.property.hostId === session.user.id;
  if (!isGuest && !isHost && session.user.role !== "ADMIN") redirect("/bookings");

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
                  <p className="text-xs text-gray-400 mb-0.5">Guests & Nights</p>
                  <p>{booking.guests} guests · {booking.nights} nights</p>
                </div>
              </div>
            </div>

            {booking.status === "ACCEPTED" && booking.totalPrice !== null && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-sm text-green-800 font-medium">Booking Confirmed</p>
                <p className="text-lg font-bold text-green-900 mt-1">{formatCurrency(booking.totalPrice!)} total</p>
                <p className="text-xs text-green-600">{formatCurrency(booking.totalPrice! / booking.nights)}/night for {booking.nights} nights</p>
              </div>
            )}

            {isGuest && (
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

        {/* Right: Negotiation */}
        <div className="lg:col-span-2">
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
        </div>
      </div>
    </div>
  );
}
