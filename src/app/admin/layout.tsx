import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Home, CalendarCheck, MapPin, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  const [pendingUsers, pendingProperties] = await Promise.all([
    prisma.user.count({ where: { isActive: false, role: { not: "ADMIN" } } }),
    prisma.property.count({ where: { status: "PENDING_APPROVAL" } }),
  ]);
  const pendingCount = pendingUsers + pendingProperties;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2 text-white">
            <MapPin className="w-5 h-5 text-teal-400 flex-shrink-0" />
            <span className="text-xl" style={{ fontFamily: "var(--font-dancing)" }}>Visit Sri Lanka</span>
            <img src="https://flagcdn.com/w20/lk.png" alt="Sri Lanka" width={20} height={14} className="rounded-sm flex-shrink-0" />
          </Link>
          <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { href: "/admin", icon: LayoutDashboard, label: "Analytics" },
            { href: "/admin/users", icon: Users, label: "Users" },
            { href: "/admin/properties", icon: Home, label: "Properties" },
            { href: "/admin/bookings", icon: CalendarCheck, label: "Bookings" },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <Link
            href="/admin/approvals"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-3">
              <Clock className="w-4 h-4" />
              Approvals
            </span>
            {pendingCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300">← Back to site</Link>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  );
}
