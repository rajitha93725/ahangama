import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";
import { formatDateRange, formatCurrency } from "@/lib/utils";
import { MapPin, Calendar, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export default async function BookingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isHost = session.user.role === "HOST";

  const bookings = isHost
    ? await prisma.booking.findMany({
        where: { property: { hostId: session.user.id } },
        include: {
          guest: { select: { name: true, image: true } },
          property: { select: { id: true, title: true, images: { where: { isPrimary: true }, take: 1 } } },
          offers: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
      })
    : await prisma.booking.findMany({
        where: { guestId: session.user.id },
        include: {
          property: {
            select: {
              id: true, title: true, district: true,
              images: { where: { isPrimary: true }, take: 1 },
              host: { select: { name: true } },
            },
          },
          offers: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
      });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {isHost ? "Booking Requests" : "My Trips"}
      </h1>
      <p className="text-gray-500 text-sm mb-8">{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>

      {bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={isHost ? "No bookings yet" : "No trips yet"}
          description={isHost ? "When guests make offers on your properties, they'll appear here." : "Start exploring Sri Lanka and send your first offer!"}
          action={
            !isHost ? (
              <Link href="/properties" className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">
                Explore Properties
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const property = b.property as {
              id: string; title: string; district?: string;
              images: { url: string }[];
              host?: { name?: string | null };
            };
            const lastOffer = b.offers[0];
            return (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow group"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {property.images[0]?.url ? (
                    <img src={property.images[0].url} alt={property.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-teal-100" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                    <BookingStatusBadge status={b.status} size="sm" />
                  </div>
                  {property.district && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <MapPin className="w-3 h-3" /> {property.district}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateRange(b.checkIn, b.checkOut)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {b.guests} guest{b.guests !== 1 ? "s" : ""} · {b.nights} night{b.nights !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {lastOffer && (
                    <p className="text-sm text-teal-600 font-medium mt-1">
                      Current offer: {formatCurrency(lastOffer.amount)}/night
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
