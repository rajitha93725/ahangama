import PropertyCard from "./PropertyCard";
import EmptyState from "@/components/shared/EmptyState";
import { Home } from "lucide-react";

interface Property {
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

interface Props {
  properties: Property[];
}

export default function PropertyGrid({ properties }: Props) {
  if (properties.length === 0) {
    return (
      <EmptyState
        icon={Home}
        title="No properties found"
        description="Try adjusting your search filters to find more options."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {properties.map((p) => (
        <PropertyCard key={p.id} {...p} />
      ))}
    </div>
  );
}
