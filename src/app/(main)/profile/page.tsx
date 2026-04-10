import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getInitials, formatDate } from "@/lib/utils";
import { Edit, Star, Home, Calendar } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      properties: { where: { status: "ACTIVE" }, include: { images: { where: { isPrimary: true }, take: 1 } }, take: 6 },
      reviewsGiven: { select: { rating: true } },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img src={user.image} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-2xl font-bold">
                {getInitials(user.name)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">{user.role}</span>
                <span className="text-xs text-gray-400">Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
          <Link href="/profile/edit" className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Edit className="w-4 h-4" /> Edit Profile
          </Link>
        </div>

        {user.bio && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">About</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{user.bio}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-lg font-bold text-gray-900">{user.properties.length}</p>
            <p className="text-xs text-gray-500">Listings</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {user.reviewsGiven.length > 0
                ? (user.reviewsGiven.reduce((s, r) => s + r.rating, 0) / user.reviewsGiven.length).toFixed(1)
                : "—"}
            </p>
            <p className="text-xs text-gray-500">Avg Review</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Home className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-lg font-bold text-gray-900">{user.reviewsGiven.length}</p>
            <p className="text-xs text-gray-500">Reviews</p>
          </div>
        </div>

        {user.properties.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">My Listings</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {user.properties.map((p) => (
                <Link key={p.id} href={`/properties/${p.id}`} className="group block rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    {p.images[0]?.url && (
                      <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
