"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Star, Users, BedDouble, Navigation, Car } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useLKRRate } from "@/hooks/useLKRRate";
import { ratingToStars } from "@/lib/ratingQuestions";

interface PropertyCardProps {
  id: string;
  title: string;
  district: string;
  propertyType: string;
  category?: string;
  pricePerNight: number;
  pricePerKm?: number | null;
  maxGuests: number;
  bedrooms: number;
  avgRating: number | null;
  reviewCount: number;
  propertyRating?: number | null;
  images: { url: string; alt?: string | null }[];
  host: { name?: string | null; image?: string | null };
}

export default function PropertyCard({
  id, title, district, propertyType, category, pricePerNight, pricePerKm,
  maxGuests, bedrooms, avgRating, reviewCount, propertyRating, images, host,
}: PropertyCardProps) {
  const [imgError, setImgError] = useState(false);
  const rawImg = images[0]?.url;
  const lkrRate = useLKRRate();
  const lkrPrice = lkrRate ? Math.round(pricePerNight * lkrRate) : null;
  const lkrKmPrice = lkrRate && pricePerKm ? Math.round(pricePerKm * lkrRate) : null;
  const displayRating = propertyRating ?? avgRating;
  const starCount = propertyRating != null ? ratingToStars(propertyRating) : null;
  const isTransport = category === "TRANSPORT";

  return (
    <Link href={`/properties/${id}`} className="group block">
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 hover:shadow-lg transition-shadow duration-200">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-teal-50 to-teal-100">
          {rawImg && !imgError ? (
            <img
              src={rawImg}
              alt={title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-30">{isTransport ? "🚗" : "🏠"}</span>
            </div>
          )}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
            {propertyType.replace(/_/g, " ")}
          </div>
          {isTransport && (
            <div className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-white">
              Transport
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1">{title}</h3>
            {displayRating !== null && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Show filled stars derived from 10-point score */}
                {starCount !== null && Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < starCount ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
                  />
                ))}
                <span className="text-xs font-medium text-gray-700 ml-0.5">
                  {propertyRating != null ? propertyRating.toFixed(1) : (avgRating?.toFixed(1) ?? "")}
                </span>
                {propertyRating == null && <span className="text-xs text-gray-400">({reviewCount})</span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
            <MapPin className="w-3 h-3" />
            <span>{district}, Sri Lanka</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{maxGuests} {isTransport ? "passengers" : "guests"}</span>
            {!isTransport && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{bedrooms} bed{bedrooms !== 1 ? "s" : ""}</span>}
          </div>

          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              {isTransport ? (
                <>
                  {(pricePerKm ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Navigation className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      <span className="font-bold text-gray-900">{formatCurrency(pricePerKm!)}</span>
                      <span className="text-xs text-gray-500">/km</span>
                      {lkrKmPrice !== null && <span className="text-xs text-gray-400">≈ LKR {lkrKmPrice.toLocaleString()}</span>}
                    </div>
                  )}
                  {pricePerNight > 0 && (
                    <div className="flex items-center gap-1 text-xs mt-0.5">
                      <Car className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="font-semibold text-gray-700">{formatCurrency(pricePerNight)}</span>
                      <span className="text-gray-500">/night parking</span>
                      {lkrPrice !== null && <span className="text-gray-400">≈ LKR {lkrPrice.toLocaleString()}</span>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="text-base font-bold text-gray-900">{formatCurrency(pricePerNight)}</span>
                  <span className="text-xs text-gray-500"> / night</span>
                  {lkrPrice !== null && (
                    <span className="block text-xs text-gray-400 mt-0.5">
                      ≈ LKR {lkrPrice.toLocaleString()}/night
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="text-xs text-teal-600 font-medium ml-2 flex-shrink-0">Negotiable</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
