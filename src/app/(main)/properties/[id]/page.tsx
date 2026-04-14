import { notFound } from "next/navigation";
import PropertyGallery from "@/components/property/PropertyGallery";
import BookingWidget from "@/components/booking/BookingWidget";
import StarRating from "@/components/shared/StarRating";
import { formatDate, getInitials, formatCurrency } from "@/lib/utils";
import { ratingToStars } from "@/lib/ratingQuestions";
import { MapPin, Users, BedDouble, Bath, Wifi, Car, Navigation, Star } from "lucide-react";

async function fetchProperty(id: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/properties/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;
  const property = await fetchProperty(id);
  if (!property) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
        {(property.propertyRating != null || property.avgRating !== null) && (
          <div className="flex items-center gap-1.5">
            {property.propertyRating != null ? (
              <>
                <StarRating value={ratingToStars(property.propertyRating)} readonly size="sm" />
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{property.propertyRating.toFixed(1)}</span>
                <span className="text-gray-400">/ 10</span>
                <span className="text-gray-400">({property.propertyRatingCount ?? property.reviewCount} ratings)</span>
              </>
            ) : (
              <>
                <StarRating value={Math.round(property.avgRating)} readonly size="sm" />
                <span className="font-medium">{property.avgRating.toFixed(1)}</span>
                <span className="text-gray-400">({property.reviewCount} reviews)</span>
              </>
            )}
          </div>
        )}
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-teal-600" />
          <span>{property.address}, {property.district}, Sri Lanka</span>
        </div>
      </div>

      {/* Gallery */}
      <PropertyGallery images={property.images} title={property.title} />

      {/* Content + Booking Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Host + Quick Stats */}
          <div className="flex items-start justify-between pb-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {property.propertyType.replace(/_/g, " ")} {property.category === "TRANSPORT" ? "offered" : "hosted"} by {property.host.name}
              </h2>
              {property.category === "TRANSPORT" ? (
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" />{property.maxGuests} passengers</span>
                  {property.pricePerKm > 0 && (
                    <span className="flex items-center gap-1"><Navigation className="w-4 h-4 text-amber-500" />{formatCurrency(property.pricePerKm)}/km</span>
                  )}
                  {property.pricePerNight > 0 && (
                    <span className="flex items-center gap-1"><Car className="w-4 h-4 text-amber-500" />{formatCurrency(property.pricePerNight)}/night parking</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" />{property.maxGuests} guests</span>
                  <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" />{property.bedrooms} bedrooms</span>
                  <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{property.bathrooms} bathrooms</span>
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              {property.host.image ? (
                <img src={property.host.image} alt={property.host.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold">
                  {getInitials(property.host.name)}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">About this place</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{property.description}</p>
          </div>

          {/* Amenities */}
          {property.amenities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What this place offers</h3>
              <div className="grid grid-cols-2 gap-3">
                {property.amenities.map((a: { name: string }) => (
                  <div key={a.name} className="flex items-center gap-2 text-sm text-gray-700">
                    <Wifi className="w-4 h-4 text-gray-400" />
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {property.reviews.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Guest Reviews · {property.avgRating?.toFixed(1)}/5
              </h3>
              <div className="space-y-6">
                {property.reviews.slice(0, 5).map((r: {
                  id: string;
                  rating: number;
                  comment: string;
                  createdAt: string;
                  author: { name?: string | null; image?: string | null };
                }) => (
                  <div key={r.id} className="pb-6 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3 mb-2">
                      {r.author.image ? (
                        <img src={r.author.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold">
                          {getInitials(r.author.name)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.author.name}</p>
                        <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <StarRating value={r.rating} readonly size="sm" />
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking Widget */}
        <div className="lg:col-span-1">
          <BookingWidget
            propertyId={property.id}
            pricePerNight={property.pricePerNight}
            minPrice={property.minPrice}
            maxGuests={property.maxGuests}
            category={property.category ?? "STAY"}
            pricePerKm={property.pricePerKm ?? 0}
            priceBnB={property.priceBnB ?? null}
            priceHalfBoard={property.priceHalfBoard ?? null}
            priceFullBoard={property.priceFullBoard ?? null}
            vehicleGroups={property.vehicleGroups ?? null}
          />
        </div>
      </div>
    </div>
  );
}
