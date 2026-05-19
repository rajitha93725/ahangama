import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";
import { formatDateRange, formatCurrency } from "@/lib/utils";
import { MapPin, Calendar, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export default async function BookingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isHost = session.user.role === "HOST";

  let bookings: { id: string; checkIn: string; checkOut: string; guests: number; nights: number; status: string; propertyId: string; guestId?: string; [key: string]: unknown }[] = [];

  if (isHost) {
    const { data: hostProperties } = await supabaseAdmin.from("Property").select("id").eq("hostId", session.user.id);
    const propertyIds = (hostProperties || []).map((p: { id: string }) => p.id);
    if (propertyIds.length) {
      const { data } = await supabaseAdmin
        .from("Booking")
        .select("id, checkIn, checkOut, guests, nights, status, propertyId, guestId, updatedAt")
        .in("propertyId", propertyIds)
        .order("updatedAt", { ascending: false });
      bookings = (data || []) as typeof bookings;
    }
  } else {
    const { data } = await supabaseAdmin
      .from("Booking")
      .select("id, checkIn, checkOut, guests, nights, status, propertyId, updatedAt")
      .eq("guestId", session.user.id)
      .order("updatedAt", { ascending: false });
    bookings = (data || []) as typeof bookings;
  }

  if (!bookings.length) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{isHost ? "Booking Requests" : "My Trips"}</h1>
        <p className="text-gray-500 text-sm mb-8">0 bookings</p>
        <EmptyState
          icon={Calendar}
          title={isHost ? "No bookings yet" : "No trips yet"}
          description={isHost ? "When guests make offers on your properties, they'll appear here." : "Start exploring Sri Lanka and send your first offer!"}
          action={!isHost ? <Link href="/properties" className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">Explore Properties</Link> : undefined}
        />
      </div>
    );
  }

  const propertyIds = [...new Set(bookings.map((b) => b.propertyId))];
  const bookingIds = bookings.map((b) => b.id);
  const guestIds = isHost ? [...new Set(bookings.map((b) => b.guestId).filter(Boolean))] as string[] : [];

  const [{ data: properties }, { data: images }, { data: offers }, { data: guests }] = await Promise.all([
    supabaseAdmin.from("Property").select("id, title, district, hostId").in("id", propertyIds),
    supabaseAdmin.from("PropertyImage").select("propertyId, url").in("propertyId", propertyIds).eq("isPrimary", true),
    supabaseAdmin.from("Offer").select("bookingId, amount").in("bookingId", bookingIds).order("createdAt", { ascending: false }),
    guestIds.length ? supabaseAdmin.from("User").select("id, name, image").in("id", guestIds) : { data: [] },
  ]);

  const propMap = Object.fromEntries((properties || []).map((p: { id: string; [key: string]: unknown }) => [p.id, p]));
  const imageMap = Object.fromEntries((images || []).map((img: { propertyId: string; url: string }) => [img.propertyId, img]));
  const latestOffer: Record<string, { amount: number }> = {};
  (offers || []).forEach((o: { bookingId: string; amount: number }) => { if (!latestOffer[o.bookingId]) latestOffer[o.bookingId] = o; });
  const guestMap = Object.fromEntries((guests || []).map((g: { id: string; [key: string]: unknown }) => [g.id, g]));

  const hostIds = isHost ? [] : [...new Set((properties || []).map((p: { hostId: string }) => p.hostId))];
  const { data: hostUsers } = hostIds.length ? await supabaseAdmin.from("User").select("id, name").in("id", hostIds) : { data: [] };
  const hostMap = Object.fromEntries((hostUsers || []).map((h: { id: string; name: string | null }) => [h.id, h]));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{isHost ? "Booking Requests" : "My Trips"}</h1>
      <p className="text-gray-500 text-sm mb-8">{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>

      <div className="space-y-4">
        {bookings.map((b) => {
          const property = (propMap[b.propertyId] ?? { id: b.propertyId, title: null, district: null, hostId: null }) as { id: string; title: string | null; district: string | null; hostId: string | null };
          const lastOffer = latestOffer[b.id];
          const guest = isHost && b.guestId ? (guestMap[b.guestId] as { name?: string | null; image?: string | null } | undefined) : undefined;
          const host = !isHost && property.hostId ? (hostMap[property.hostId] as { name?: string | null } | undefined) : undefined;

          return (
            <Link key={b.id} href={`/bookings/${b.id}`} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow group">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {imageMap[b.propertyId] ? (
                  <img src={(imageMap[b.propertyId] as { url: string }).url} alt={property.title ?? ""} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full bg-teal-100" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                  <BookingStatusBadge status={b.status} size="sm" />
                </div>
                {property.district && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><MapPin className="w-3 h-3" /> {property.district}</div>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateRange(new Date(b.checkIn), new Date(b.checkOut))}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.guests} guest{b.guests !== 1 ? "s" : ""} · {b.nights} night{b.nights !== 1 ? "s" : ""}</span>
                </div>
                {lastOffer && <p className="text-sm text-teal-600 font-medium mt-1">Current offer: {formatCurrency(lastOffer.amount)}/night</p>}
                {isHost && guest?.name && <p className="text-xs text-gray-400 mt-1">Guest: {guest.name}</p>}
                {!isHost && host?.name && <p className="text-xs text-gray-400 mt-1">Host: {host.name}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
