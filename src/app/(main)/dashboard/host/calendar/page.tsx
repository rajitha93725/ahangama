import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BookingCalendarClient from "./BookingCalendarClient";

export const metadata = { title: "Booking Calendar — Ahangama" };

export default async function BookingCalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") redirect("/dashboard/guest");

  return <BookingCalendarClient />;
}
