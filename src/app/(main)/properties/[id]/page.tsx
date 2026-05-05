import { notFound } from "next/navigation";
import PropertyGallery from "@/components/property/PropertyGallery";
import BookingWidget from "@/components/booking/BookingWidget";
import StarRating from "@/components/shared/StarRating";
import { formatDate, getInitials, formatCurrency } from "@/lib/utils";
import { ratingToStars } from "@/lib/ratingQuestions";
import {
  MapPin, Users, BedDouble, Bath, Car, Navigation, Star,
  Wifi, Waves, Wind, UtensilsCrossed, Tv, Droplets, TreePine,
  Dumbbell, Coffee, Beer, Shield, PawPrint, Sunset, Mountain, Map,
  Home, Shirt, BadgeCheck,
} from "lucide-react";

/** Masks a name: capitalises first letter of each word, replaces rest with *** */
function maskName(name: string | null | undefined): string {
  if (!name?.trim()) return "G***";
  return name.trim().split(/\s+/).map((word) => {
    if (!word) return "";
    return word[0].toUpperCase() + "***";
  }).join(" ");
}
import type { LucideIcon } from "lucide-react";

const AMENITY_ICON_MAP: Record<string, LucideIcon> = {
  "WiFi": Wifi,
  "Pool": Waves,
  "Air Conditioning": Wind,
  "Free Parking": Car,
  "Kitchen": UtensilsCrossed,
  "TV": Tv,
  "Washer": Shirt,
  "Hot Water": Droplets,
  "Garden": TreePine,
  "Beach Access": Waves,
  "Gym": Dumbbell,
  "Breakfast Included": Coffee,
  "Restaurant": UtensilsCrossed,
  "Bar": Beer,
  "Security": Shield,
  "Pet Friendly": PawPrint,
  "Balcony": Home,
  "Ocean View": Sunset,
  "Mountain View": Mountain,
  "Tour Assistance": Map,
};

async function fetchProperty(id: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/properties/${id}`, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return res.json();
}

interface RoomType {
  id: string;
  typeName: string;
  displayLabel: string;
  roomCount: number;
  beds: number;
  maxGuests: number;
  bathrooms: number;
  amenities: string[];
  pricePerNight: number;
  priceBnB?: number | null;
  priceHalfBoard?: number | null;
  priceFullBoard?: number | null;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;
  const property = await fetchProperty(id);
  if (!property) notFound();

  const roomTypes: RoomType[] | null = property.roomTypes ?? null;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.03},${property.latitude - 0.03},${property.longitude + 0.03},${property.latitude + 0.03}&layer=mapnik&marker=${property.latitude},${property.longitude}`;

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
                <span className="text-gray-400">({property.propertyRatingCount ?? property.reviewCount} Reviews)</span>
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
              ) : !roomTypes ? (
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" />{property.maxGuests} guests</span>
                  <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" />{property.bedrooms} bedrooms</span>
                  <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{property.bathrooms} bathrooms</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" />{property.maxGuests} guests total</span>
                  <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" />{roomTypes.length} room type{roomTypes.length !== 1 ? "s" : ""}</span>
                  <span className="text-teal-600 font-medium">from {formatCurrency(Math.min(...roomTypes.map((rt) => rt.pricePerNight)))}/night</span>
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

          {/* Room Types */}
          {roomTypes && roomTypes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Rooms</h3>
              <div className="space-y-3">
                {roomTypes.map((rt) => (
                  <div key={rt.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">
                          {rt.roomCount}
                        </div>
                        <span className="font-semibold text-gray-900">{rt.displayLabel}</span>
                      </div>
                      <span className="text-sm font-semibold text-teal-700">{formatCurrency(rt.pricePerNight)}/night</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-gray-400" />{rt.beds} bed{rt.beds !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-400" />Max {rt.maxGuests} guests</span>
                        <span className="flex items-center gap-1.5"><Bath className="w-4 h-4 text-gray-400" />{rt.bathrooms} bathroom{rt.bathrooms !== 1 ? "s" : ""}</span>
                        <span className="text-xs text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-medium">
                          {rt.roomCount} room{rt.roomCount !== 1 ? "s" : ""} of this type
                        </span>
                      </div>
                      {/* Meal plan pricing */}
                      {(rt.priceBnB || rt.priceHalfBoard || rt.priceFullBoard) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rt.priceBnB && (
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              B&amp;B {formatCurrency(rt.priceBnB)}/night
                            </span>
                          )}
                          {rt.priceHalfBoard && (
                            <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                              HB {formatCurrency(rt.priceHalfBoard)}/night
                            </span>
                          )}
                          {rt.priceFullBoard && (
                            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                              FB {formatCurrency(rt.priceFullBoard)}/night
                            </span>
                          )}
                        </div>
                      )}
                      {/* Room amenities */}
                      {rt.amenities?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {rt.amenities.map((a: string) => {
                            const AIcon = AMENITY_ICON_MAP[a] ?? Wifi;
                            return (
                              <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AIcon className="w-3 h-3" />{a}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Property Amenities */}
          {property.amenities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What this place offers</h3>
              <div className="grid grid-cols-2 gap-3">
                {property.amenities.map((a: { name: string }) => {
                  const Icon = AMENITY_ICON_MAP[a.name] ?? Wifi;
                  return (
                    <div key={a.name} className="flex items-center gap-2 text-sm text-gray-700">
                      <Icon className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      <span>{a.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location Map */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600" /> Location
            </h3>
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              <iframe
                src={mapSrc}
                className="w-full h-72"
                loading="lazy"
                title="Property location"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-500" />
              {property.address}, {property.district}, Sri Lanka
            </p>
            <p className="text-xs text-gray-400 mt-1">Exact address shared after booking confirmation</p>
          </div>

          {/* All Reviews — seeded first, then real guest reviews */}
          {(() => {
            type SeededEntry = { avgScore: number; createdAt: string; comment?: string | null; isSeeded: 1 };
            type GuestEntry  = { avgScore: number; createdAt: string; comment?: string | null; guestName?: string | null; guestImage?: string | null; isSeeded: 0 };
            const seeded: SeededEntry[] = property.seededFeedback ?? [];
            const guests: GuestEntry[]  = property.guestFeedback  ?? [];
            const totalCount = property.propertyRatingCount ?? (seeded.length + guests.length);
            if (seeded.length === 0 && guests.length === 0) return null;
            return (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Featured Reviews
                  {property.propertyRating != null && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      · {property.propertyRating.toFixed(1)} / 10
                      <span className="text-gray-400 ml-1">({totalCount} Reviews)</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400 mb-4">Based on verified guest experiences</p>
                <div className="space-y-0 divide-y divide-gray-50">
                  {/* 10 seeded entries */}
                  {seeded.map((fb, i) => (
                    <div key={`s-${i}`} className="py-3">
                      <div className="flex items-center gap-3">
                        {/* Anonymous avatar — initial only */}
                        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0">
                          V
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-800">V*** G***</p>
                            <span className="inline-flex items-center gap-0.5 bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded-full text-xs font-medium">
                              <BadgeCheck className="w-3 h-3" /> Verified
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{formatDate(fb.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StarRating value={ratingToStars(fb.avgScore)} readonly size="sm" />
                          <span className="text-xs font-semibold text-gray-700">{fb.avgScore.toFixed(1)}</span>
                          <span className="text-xs text-gray-400">/ 10</span>
                        </div>
                      </div>
                      {fb.comment && (
                        <p className="text-sm text-gray-600 mt-1.5 ml-11 leading-relaxed">{fb.comment}</p>
                      )}
                    </div>
                  ))}

                  {/* Real guest reviews — appended below seeded */}
                  {guests.length > 0 && (
                    <>
                      {seeded.length > 0 && (
                        <div className="py-2 px-3 bg-gray-50 rounded-lg my-2">
                          <p className="text-xs text-gray-400 font-medium">{guests.length} more review{guests.length !== 1 ? "s" : ""} from guests</p>
                        </div>
                      )}
                      {guests.map((fb, i) => {
                        const masked = maskName(fb.guestName);
                        const initial = masked[0] ?? "G";
                        return (
                          <div key={`g-${i}`} className="py-3">
                            <div className="flex items-center gap-3">
                              {/* Masked avatar — first letter only, no real photo */}
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
                                {initial}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-gray-800">{masked}</p>
                                  <span className="inline-flex items-center gap-0.5 bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded-full text-xs font-medium">
                                    <BadgeCheck className="w-3 h-3" /> Verified
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">{formatDate(fb.createdAt)}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <StarRating value={ratingToStars(fb.avgScore)} readonly size="sm" />
                                <span className="text-xs font-semibold text-gray-700">{fb.avgScore.toFixed(1)}</span>
                                <span className="text-xs text-gray-400">/ 10</span>
                              </div>
                            </div>
                            {fb.comment && (
                              <p className="text-sm text-gray-600 mt-1.5 ml-11 leading-relaxed">{fb.comment}</p>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
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
