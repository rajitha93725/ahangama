"use client";

import Link from "next/link";
import { MapPin, Star, Users, BedDouble } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useLKRRate } from "@/hooks/useLKRRate";

interface PropertyCardProps {
  id: string;
  title: string;
  district: string;
  propertyType: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  avgRating: number | null;
  reviewCount: number;
  images: { url: string; alt?: string | null }[];
  host: { name?: string | null; image?: string | null };
}

export default function PropertyCard({
  id, title, district, propertyType, pricePerNight,
  maxGuests, bedrooms, avgRating, reviewCount, images, host,
}: PropertyCardProps) {
  const img = images[0]?.url || "/images/placeholder.jpg";
  const lkrRate = useLKRRate();
  const lkrPrice = lkrRate ? Math.round(pricePerNight * lkrRate) : null;

  return (
    <Link href={`/properties/${id}`} className="group block">
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 hover:shadow-lg transition-shadow duration-200">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            src={img}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
            {propertyType.replace("_", " ")}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1">{title}</h3>
            {avgRating !== null && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-gray-700">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({reviewCount})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
            <MapPin className="w-3 h-3" />
            <span>{district}, Sri Lanka</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{maxGuests} guests</span>
            <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{bedrooms} bed{bedrooms !== 1 ? "s" : ""}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-base font-bold text-gray-900">{formatCurrency(pricePerNight)}</span>
              <span className="text-xs text-gray-500"> / night</span>
              {lkrPrice !== null && (
                <span className="block text-xs text-gray-400 mt-0.5">
                  ≈ LKR {lkrPrice.toLocaleString()}/night
                </span>
              )}
            </div>
            <div className="text-xs text-teal-600 font-medium">Price negotiable</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
