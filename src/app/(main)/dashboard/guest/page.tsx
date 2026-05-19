import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";
import { formatCurrency, formatDateRange } from "@/lib/utils";
import { Search, MapPin } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export default async function GuestDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const { data: bookings } = await supabaseAdmin
    .from("Booking")
    .select("id, checkIn, checkOut, guests, status, totalPrice, nights, updatedAt, propertyId")
    .eq("guestId", session.user.id)
    .order("updatedAt", { ascending: false })
    .limit(10);

  if (!bookings?.length) {
    const confirmed = 0, pending = 0;
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {session.user.name?.split(" ")[0]}</h1>
          <p className="text-gray-500 text-sm mt-1">Your Sri Lanka travel hub</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center"><p className="text-3xl font-bold text-gray-900">0</p><p className="text-sm text-gray-500 mt-1">Total Trips</p></div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center"><p className="text-3xl font-bold text-green-600">{confirmed}</p><p className="text-sm text-gray-500 mt-1">Confirmed</p></div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center"><p className="text-3xl font-bold text-amber-500">{pending}</p><p className="text-sm text-gray-500 mt-1">Pending Offers</p></div>
        </div>
        <EmptyState icon={Search} title="No trips yet" description="Start exploring Sri Lanka's amazing accommodations!" action={<Link href="/properties" className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">Explore Properties</Link>} />
      </div>
    );
  }

  const propertyIds = [...new Set(bookings.map((b: { propertyId: string }) => b.propertyId))];
  const bookingIds = bookings.map((b: { id: string }) => b.id);

  const [{ data: properties }, { data: images }, { data: offers }] = await Promise.all([
    supabaseAdmin.from("Property").select("id, title, district").in("id", propertyIds),
    supabaseAdmin.from("PropertyImage").select("propertyId, url").in("propertyId", propertyIds).eq("isPrimary", true),
    supabaseAdmin.from("Offer").select("bookingId, amount").in("bookingId", bookingIds).order("createdAt", { ascending: false }),
  ]);

  const propMap = Object.fromEntries((properties || []).map((p: { id: string; title: string | null; district: string | null }) => [p.id, p]));
  const imageMap = Object.fromEntries((images || []).map((img: { propertyId: string; url: string }) => [img.propertyId, img]));
  const latestOffer: Record<string, { amount: number }> = {};
  (offers || []).forEach((o: { bookingId: string; amount: number }) => {
    if (!latestOffer[o.bookingId]) latestOffer[o.bookingId] = o;
  });

  const enriched = (bookings as { id: string; status: string; checkIn: string; checkOut: string; propertyId: string; [key: string]: unknown }[]).map((b) => ({
    ...b,
    property: { ...(propMap[b.propertyId] ?? { id: b.propertyId, title: null, district: null }), images: imageMap[b.propertyId] ? [imageMap[b.propertyId]] : [] },
    offers: latestOffer[b.id] ? [latestOffer[b.id]] : [],
  }));

  const confirmed = enriched.filter((b) => b.status === "ACCEPTED").length;
  const pending = enriched.filter((b) => ["PENDING_OFFER", "COUNTERED"].includes(b.status)).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {session.user.name?.split(" ")[0]}</h1>
        <p className="text-gray-500 text-sm mt-1">Your Sri Lanka travel hub</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center"><p className="text-3xl font-bold text-gray-900">{enriched.length}</p><p className="text-sm text-gray-500 mt-1">Total Trips</p></div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center"><p className="text-3xl font-bold text-green-600">{confirmed}</p><p className="text-sm text-gray-500 mt-1">Confirmed</p></div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center"><p className="text-3xl font-bold text-amber-500">{pending}</p><p className="text-sm text-gray-500 mt-1">Pending Offers</p></div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
        <Link href="/bookings" className="text-sm text-teal-600 hover:underline">View all</Link>
      </div>

      <div className="space-y-4">
        {enriched.map((b) => (
          <Link key={b.id} href={`/bookings/${b.id}`} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              {(b.property as { images: { url: string }[] }).images[0]?.url ? (
                <img src={(b.property as { images: { url: string }[] }).images[0].url} alt={(b.property as { title: string | null }).title ?? ""} className="w-full h-full object-cover" />
              ) : <div className="w-full h-full bg-teal-50" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 truncate">{(b.property as { title: string | null }).title}</h3>
                <BookingStatusBadge status={b.status} size="sm" />
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <MapPin className="w-3 h-3" /> {(b.property as { district: string | null }).district}
              </div>
              <p className="text-xs text-gray-500 mt-1">{formatDateRange(new Date(b.checkIn), new Date(b.checkOut))}</p>
              {(b.offers as { amount: number }[])[0] && (
                <p className="text-sm font-medium text-teal-600 mt-1">{formatCurrency((b.offers as { amount: number }[])[0].amount)}/night</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
