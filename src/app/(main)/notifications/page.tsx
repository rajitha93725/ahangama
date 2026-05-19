import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { Bell } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { data: notifications } = await supabaseAdmin
    .from("Notification")
    .select("*")
    .eq("userId", session.user.id)
    .order("createdAt", { ascending: false })
    .limit(50);

  await supabaseAdmin
    .from("Notification")
    .update({ isRead: true })
    .eq("userId", session.user.id)
    .eq("isRead", false);

  const getBookingId = (data?: string | null) => {
    try { return data ? JSON.parse(data).bookingId : null; } catch { return null; }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Notifications</h1>

      {!notifications?.length ? (
        <EmptyState icon={Bell} title="No notifications" description="You'll see booking requests, offers, and updates here." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n: { id: string; isRead: boolean; title: string; message: string; createdAt: string; data: string | null; type: string }) => {
            const bookingId = getBookingId(n.data);
            const content = (
              <div className={`p-4 rounded-2xl border transition-colors ${n.isRead ? "bg-white border-gray-100" : "bg-teal-50 border-teal-200"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.isRead ? "bg-gray-100" : "bg-teal-100"}`}>
                    <Bell className={`w-4 h-4 ${n.isRead ? "text-gray-400" : "text-teal-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(new Date(n.createdAt))}</p>
                  </div>
                </div>
              </div>
            );
            return bookingId ? (
              <Link key={n.id} href={`/bookings/${bookingId}`}>{content}</Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
