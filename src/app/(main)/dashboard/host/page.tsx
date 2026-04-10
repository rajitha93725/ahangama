import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";
import { formatCurrency, formatDateRange } from "@/lib/utils";
import { Plus, Home, CalendarCheck, DollarSign, Star } from "lucide-react";

export default async function HostDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") redirect("/dashboard/guest");

  const [properties, bookings] = await Promise.all([
    prisma.property.findMany({
      where: { hostId: session.user.id },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        bookings: { where: { status: { in: ["ACCEPTED", "COMPLETED"] } }, select: { totalPrice: true } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.booking.findMany({
      where: { property: { hostId: session.user.id } },
      include: {
        guest: { select: { name: true } },
        property: { select: { title: true } },
        offers: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const totalRevenue = properties.reduce(
    (sum, p) => sum + p.bookings.reduce((s, b) => s + (b.totalPrice || 0), 0),
    0
  );
  const pendingBookings = bookings.filter((b) => b.status === "PENDING_OFFER" || b.status === "COUNTERED").length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {session.user.name?.split(" ")[0]}</p>
        </div>
        <Link
          href="/properties/new"
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Listing
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Home, label: "Properties", value: properties.length, color: "teal" },
          { icon: CalendarCheck, label: "Pending Offers", value: pendingBookings, color: "amber" },
          { icon: DollarSign, label: "Total Revenue", value: formatCurrency(totalRevenue), color: "green" },
          {
            icon: Star,
            label: "Avg Rating",
            value: properties.flatMap((p) => p.reviews).length > 0
              ? (properties.flatMap((p) => p.reviews).reduce((s, r) => s + r.rating, 0) / properties.flatMap((p) => p.reviews).length).toFixed(1)
              : "—",
            color: "purple",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Listings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Listings</h2>
          {properties.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500 mb-4">No listings yet</p>
              <Link href="/properties/new" className="text-sm text-teal-600 font-medium hover:underline">
                Create your first listing →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {properties.map((p) => (
                <Link
                  key={p.id}
                  href={`/properties/${p.id}`}
                  className="flex gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.images[0]?.url && <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.bookings.length} confirmed bookings</p>
                    <p className="text-xs text-teal-600 font-medium mt-1">
                      {formatCurrency(p.bookings.reduce((s, b) => s + (b.totalPrice || 0), 0))} earned
                    </p>
                  </div>
                  <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>{p.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Booking Requests</h2>
          {bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500">No booking requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={`/bookings/${b.id}`}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.guest.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-48">{b.property.title}</p>
                    {b.offers[0] && (
                      <p className="text-xs text-teal-600 font-medium mt-0.5">
                        {formatCurrency(b.offers[0].amount)}/night
                      </p>
                    )}
                  </div>
                  <BookingStatusBadge status={b.status} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
