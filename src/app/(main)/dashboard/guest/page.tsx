import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";
import { formatCurrency, formatDateRange } from "@/lib/utils";
import { Search, MapPin } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export default async function GuestDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const bookings = await prisma.booking.findMany({
    where: { guestId: session.user.id },
    include: {
      property: {
        select: {
          id: true, title: true, district: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      offers: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const confirmed = bookings.filter((b) => b.status === "ACCEPTED").length;
  const pending = bookings.filter((b) => ["PENDING_OFFER", "COUNTERED"].includes(b.status)).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {session.user.name?.split(" ")[0]}</h1>
        <p className="text-gray-500 text-sm mt-1">Your Sri Lanka travel hub</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{bookings.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Trips</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <p className="text-3xl font-bold text-green-600">{confirmed}</p>
          <p className="text-sm text-gray-500 mt-1">Confirmed</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <p className="text-3xl font-bold text-amber-500">{pending}</p>
          <p className="text-sm text-gray-500 mt-1">Pending Offers</p>
        </div>
      </div>

      {/* Upcoming */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
        <Link href="/bookings" className="text-sm text-teal-600 hover:underline">View all</Link>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No trips yet"
          description="Start exploring Sri Lanka's amazing accommodations!"
          action={
            <Link href="/properties" className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">
              Explore Properties
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {b.property.images[0]?.url ? (
                  <img src={b.property.images[0].url} alt={b.property.title} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full bg-teal-50" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{b.property.title}</h3>
                  <BookingStatusBadge status={b.status} size="sm" />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <MapPin className="w-3 h-3" /> {b.property.district}
                </div>
                <p className="text-xs text-gray-500 mt-1">{formatDateRange(b.checkIn, b.checkOut)}</p>
                {b.offers[0] && (
                  <p className="text-sm font-medium text-teal-600 mt-1">
                    {formatCurrency(b.offers[0].amount)}/night
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
