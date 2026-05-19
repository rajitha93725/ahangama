import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";
import { formatCurrency, formatDateRange } from "@/lib/utils";
import { Plus, Home, CalendarCheck, DollarSign, Star, CalendarDays } from "lucide-react";

export default async function HostDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") redirect("/dashboard/guest");

  const { data: properties } = await supabaseAdmin
    .from("Property")
    .select("id, title, status, district")
    .eq("hostId", session.user.id);

  const propertyIds = (properties || []).map((p: { id: string }) => p.id);

  const [{ data: propImages }, { data: propBookings }, { data: propReviews }, { data: bookings }] = await Promise.all([
    propertyIds.length ? supabaseAdmin.from("PropertyImage").select("propertyId, url").in("propertyId", propertyIds).eq("isPrimary", true) : { data: [] },
    propertyIds.length ? supabaseAdmin.from("Booking").select("propertyId, totalPrice").in("propertyId", propertyIds).in("status", ["ACCEPTED", "COMPLETED"]) : { data: [] },
    propertyIds.length ? supabaseAdmin.from("Review").select("propertyId, rating").in("propertyId", propertyIds) : { data: [] },
    propertyIds.length
      ? supabaseAdmin.from("Booking").select("id, checkIn, checkOut, status, guestId, propertyId, updatedAt").in("propertyId", propertyIds).order("updatedAt", { ascending: false }).limit(10)
      : { data: [] },
  ]);

  const imageMap = Object.fromEntries((propImages || []).map((img: { propertyId: string; url: string }) => [img.propertyId, img]));
  const revenueByProp: Record<string, number> = {};
  const bookingCountByProp: Record<string, number> = {};
  (propBookings || []).forEach((b: { propertyId: string; totalPrice: number | null }) => {
    revenueByProp[b.propertyId] = (revenueByProp[b.propertyId] || 0) + (b.totalPrice || 0);
    bookingCountByProp[b.propertyId] = (bookingCountByProp[b.propertyId] || 0) + 1;
  });

  const allRatings = (propReviews || []).map((r: { rating: number }) => r.rating);
  const avgRating = allRatings.length > 0
    ? (allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length).toFixed(1)
    : "—";

  const totalRevenue = Object.values(revenueByProp).reduce((a, b) => a + b, 0);
  const pendingBookings = (bookings || []).filter((b: { status: string }) => b.status === "PENDING_OFFER" || b.status === "COUNTERED").length;

  // Fetch guest names and offer amounts for recent bookings
  const bookingIds = (bookings || []).map((b: { id: string }) => b.id);
  const guestIds = [...new Set((bookings || []).map((b: { guestId: string }) => b.guestId))];

  const [{ data: guests }, { data: offers }, { data: bookingProps }] = await Promise.all([
    guestIds.length ? supabaseAdmin.from("User").select("id, name").in("id", guestIds) : { data: [] },
    bookingIds.length ? supabaseAdmin.from("Offer").select("bookingId, amount").in("bookingId", bookingIds).order("createdAt", { ascending: false }) : { data: [] },
    propertyIds.length ? supabaseAdmin.from("Property").select("id, title").in("id", propertyIds) : { data: [] },
  ]);

  const guestMap = Object.fromEntries((guests || []).map((g: { id: string; name: string | null }) => [g.id, g]));
  const propMap = Object.fromEntries((bookingProps || []).map((p: { id: string; title: string }) => [p.id, p]));
  const latestOfferMap: Record<string, { amount: number }> = {};
  (offers || []).forEach((o: { bookingId: string; amount: number }) => { if (!latestOfferMap[o.bookingId]) latestOfferMap[o.bookingId] = o; });

  const enrichedBookings = (bookings as { id: string; guestId: string; propertyId: string; status: string; checkIn: string; checkOut: string; [key: string]: unknown }[] || []).map((b) => ({
    ...b,
    guest: guestMap[b.guestId] ?? { id: b.guestId, name: null },
    property: propMap[b.propertyId] ?? { id: b.propertyId, title: null },
    offers: latestOfferMap[b.id] ? [latestOfferMap[b.id]] : [],
  }));

  const enrichedProperties = (properties as { id: string; title: string; status: string }[] || []).map((p) => ({
    ...p,
    images: imageMap[p.id] ? [{ url: (imageMap[p.id] as { url: string }).url }] : [],
    bookings: Array.from({ length: bookingCountByProp[p.id] || 0 }, (_, i) => ({ totalPrice: revenueByProp[p.id] ? revenueByProp[p.id] / (bookingCountByProp[p.id] || 1) : 0 })),
    _revenue: revenueByProp[p.id] || 0,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {session.user.name?.split(" ")[0]}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/host/calendar" className="flex items-center gap-2 px-4 py-2 bg-white border border-teal-200 text-teal-700 rounded-xl text-sm font-medium hover:bg-teal-50 transition-colors">
            <CalendarDays className="w-4 h-4" /> Booking Calendar
          </Link>
          <Link href="/properties/new" className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors">
            <Plus className="w-4 h-4" /> New Listing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Home, label: "Properties", value: enrichedProperties.length, color: "teal" },
          { icon: CalendarCheck, label: "Pending Offers", value: pendingBookings, color: "amber" },
          { icon: DollarSign, label: "Total Revenue", value: formatCurrency(totalRevenue), color: "green" },
          { icon: Star, label: "Avg Rating", value: avgRating, color: "purple" },
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
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Listings</h2>
          {enrichedProperties.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500 mb-4">No listings yet</p>
              <Link href="/properties/new" className="text-sm text-teal-600 font-medium hover:underline">Create your first listing →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enrichedProperties.map((p) => (
                <div key={p.id} className="flex gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
                  <Link href={`/properties/${p.id}`} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.images[0]?.url && <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/properties/${p.id}`}><p className="text-sm font-medium text-gray-900 truncate hover:text-teal-600">{p.title}</p></Link>
                    <p className="text-xs text-gray-400 mt-0.5">{bookingCountByProp[p.id] || 0} confirmed bookings</p>
                    <p className="text-xs text-teal-600 font-medium mt-1">{formatCurrency(p._revenue)} earned</p>
                    <Link href={`/properties/${p.id}/edit`} className="text-xs text-gray-400 hover:text-teal-600 hover:underline mt-1 inline-block">Edit pricing & meal plan →</Link>
                  </div>
                  <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "ACTIVE" ? "bg-green-100 text-green-700" : p.status === "PENDING_APPROVAL" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                    {p.status === "PENDING_APPROVAL" ? "Pending" : p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Booking Requests</h2>
          {enrichedBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500">No booking requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrichedBookings.slice(0, 6).map((b) => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{(b.guest as { name: string | null }).name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-48">{(b.property as { title: string | null }).title}</p>
                    {(b.offers as { amount: number }[])[0] && (
                      <p className="text-xs text-teal-600 font-medium mt-0.5">{formatCurrency((b.offers as { amount: number }[])[0].amount)}/night</p>
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
