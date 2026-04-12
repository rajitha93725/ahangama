"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X, MapPin, Bell, User, LogOut, Plus, LayoutDashboard, CalendarDays } from "lucide-react";
import { getInitials } from "@/lib/utils";
import NotificationBell from "@/components/notification/NotificationBell";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-teal-600">
            <MapPin className="w-6 h-6" />
            <span>Ahangama</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/properties" className="text-gray-600 hover:text-teal-600 text-sm font-medium transition-colors">
              Explore
            </Link>
            {session?.user.role === "HOST" && (
              <Link href="/properties/new" className="flex items-center gap-1 text-gray-600 hover:text-teal-600 text-sm font-medium">
                <Plus className="w-4 h-4" /> List Property
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <NotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    {session.user.image ? (
                      <img src={session.user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-semibold">
                        {getInitials(session.user.name)}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 max-w-24 truncate">
                      {session.user.name?.split(" ")[0] || "Me"}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{session.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">
                          {session.user.role}
                        </span>
                      </div>
                      <Link
                        href={session.user.role === "HOST" ? "/dashboard/host" : "/dashboard/guest"}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link
                        href="/bookings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Bell className="w-4 h-4" /> My Bookings
                      </Link>
                      {session.user.role === "HOST" && (
                        <Link
                          href="/dashboard/host/calendar"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 font-medium"
                          onClick={() => setProfileOpen(false)}
                        >
                          <CalendarDays className="w-4 h-4" /> Booking Calendar
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      {session.user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-teal-600 hover:bg-gray-50 font-medium"
                          onClick={() => setProfileOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-teal-600">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-teal-600 text-white rounded-full text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3">
          <Link href="/properties" className="block text-gray-700 hover:text-teal-600 font-medium" onClick={() => setMobileOpen(false)}>
            Explore Properties
          </Link>
          {session ? (
            <>
              <Link href="/bookings" className="block text-gray-700 hover:text-teal-600" onClick={() => setMobileOpen(false)}>
                My Bookings
              </Link>
              <Link href="/notifications" className="block text-gray-700 hover:text-teal-600" onClick={() => setMobileOpen(false)}>
                Notifications
              </Link>
              <Link
                href={session.user.role === "HOST" ? "/dashboard/host" : "/dashboard/guest"}
                className="block text-gray-700 hover:text-teal-600"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              {session.user.role === "HOST" && (
                <Link href="/properties/new" className="block text-gray-700 hover:text-teal-600" onClick={() => setMobileOpen(false)}>
                  List Property
                </Link>
              )}
              <button onClick={() => signOut({ callbackUrl: "/" })} className="block w-full text-left text-red-600 font-medium">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>
                Log in
              </Link>
              <Link href="/register" className="block text-teal-600 font-semibold" onClick={() => setMobileOpen(false)}>
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
