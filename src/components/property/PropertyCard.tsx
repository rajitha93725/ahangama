"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Star, Users, BedDouble, Navigation, Car, CircleDot } from "lucide-react";
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
  propertyRatingCount?: number | null;
  availableRoomsTonight?: number | null;
  images: { url: string; alt?: string | null }[];
  host: { name?: string | null; image?: string | null };
}

export default function PropertyCard({
  id, title, district, propertyType, category, pricePerNight, pricePerKm,
  maxGuests, bedrooms, avgRating, reviewCount, propertyRating, propertyRatingCount,
  availableRoomsTonight, images, host,
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
    <Link href={`/properties/${id}`} className="group/card block">
      {/* Outer wrapper: no overflow-hidden so the tooltip can escape upward */}
      <div className="rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow duration-200 bg-white">

        {/* Image — own overflow-hidden + rounded top keeps zoom effect & corner clipping */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-gradient-to-br from-teal-50 to-teal-100">
          {rawImg && !imgError ? (
            <img
              src={rawImg}
              alt={title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-30">{isTransport ? "🚗" : "🏠"}</span>
            </div>
          )}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
            {propertyType.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
          </div>
          {isTransport && (
            <div className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-white">
              Transport
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">

          {/* Title — full width, wraps up to 2 lines */}
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug mb-1">{title}</h3>

          {/* Rating row — sits below title, no longer competing for same-line space */}
          {displayRating !== null && (() => {
            const count = propertyRating != null ? (propertyRatingCount ?? reviewCount) : reviewCount;
            return (
              <div className="relative group/rating inline-flex items-center gap-1 cursor-default mb-1.5">
                {/* Hover tooltip */}
                <div className="pointer-events-none absolute bottom-full left-0 mb-2 z-50 opacity-0 group-hover/rating:opacity-100 transition-opacity duration-150">
                  <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    {title} has {count} Review{count !== 1 ? "s" : ""}
                  </div>
                  <div className="absolute top-full left-3 border-4 border-transparent border-t-gray-900" />
                </div>
                {starCount !== null && Array.from({ length: 5 }, (_, i) => {
                  const full = starCount >= i + 1;
                  const half = !full && starCount >= i + 0.5;
                  return (
                    <span key={i} className="relative inline-flex">
                      <Star className="w-3 h-3 fill-gray-200 text-gray-200" />
                      {(full || half) && (
                        <span className={`absolute inset-0 overflow-hidden ${half ? "w-1/2" : "w-full"}`}>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </span>
                      )}
                    </span>
                  );
                })}
                <span className="text-xs font-medium text-gray-700 ml-0.5">
                  {propertyRating != null ? propertyRating.toFixed(1) : (avgRating?.toFixed(1) ?? "")}
                </span>
                <span className="text-xs text-gray-400">({count})</span>
              </div>
            );
          })()}

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{district}, Sri Lanka</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{maxGuests} {isTransport ? "passengers" : "guests"}</span>
            {!isTransport && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{bedrooms} bed{bedrooms !== 1 ? "s" : ""}</span>}
          </div>

          {/* Tonight availability */}
          {availableRoomsTonight != null && (
            availableRoomsTonight > 0 ? (
              <div className="flex items-center gap-1 text-xs font-medium text-green-600 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block flex-shrink-0 animate-pulse" />
                {availableRoomsTonight} {isTransport ? "vehicle" : "room"}{availableRoomsTonight !== 1 ? "s" : ""} free {isTransport ? "today" : "tonight"}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-medium text-gray-400 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block flex-shrink-0" />
                Fully booked {isTransport ? "today" : "tonight"}
              </div>
            )
          )}

          {/* Host name */}
          {host.name && (
            <p className="text-xs text-gray-400 truncate mb-2">Hosted by {host.name}</p>
          )}

          {/* Price + Negotiable */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              {isTransport ? (
                <>
                  {(pricePerKm ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-sm flex-wrap">
                      <Navigation className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      <span className="font-bold text-gray-900">{formatCurrency(pricePerKm!)}</span>
                      <span className="text-xs text-gray-500">/km</span>
                      {lkrKmPrice !== null && <span className="text-xs text-gray-400">· LKR {lkrKmPrice.toLocaleString()}</span>}
                    </div>
                  )}
                  {pricePerNight > 0 && (
                    <div className="flex items-center gap-1 text-xs mt-0.5 flex-wrap">
                      <Car className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="font-semibold text-gray-700">{formatCurrency(pricePerNight)}/night</span>
                      {lkrPrice !== null && <span className="text-gray-400">· LKR {lkrPrice.toLocaleString()}</span>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold text-gray-900">{formatCurrency(pricePerNight)}</span>
                    <span className="text-xs text-gray-500">/night</span>
                  </div>
                  {lkrPrice !== null && (
                    <p className="text-xs text-gray-400">≈ LKR {lkrPrice.toLocaleString()}/night</p>
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
