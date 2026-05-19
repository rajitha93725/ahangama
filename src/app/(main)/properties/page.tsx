import { Suspense } from "react";
import PropertyGrid from "@/components/property/PropertyGrid";
import PropertyFilters from "@/components/property/PropertyFilters";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { SRI_LANKA_DISTRICTS } from "@/lib/constants";

const CATEGORY_TABS = [
  { label: "All", value: "", emoji: null },
  { label: "Stays", value: "STAY", emoji: "🏠" },
  { label: "Transport", value: "TRANSPORT", emoji: "🚗" },
  { label: "Bike Rental", value: "BIKE_RENTAL", emoji: "🚲" },
  { label: "Surf Gear", value: "SURF_RENTAL", emoji: "🏄" },
] as const;

interface SearchParams {
  district?: string;
  minPrice?: string;
  maxPrice?: string;
  guests?: string;
  propertyType?: string;
  category?: string;
  page?: string;
  sortBy?: string;
}

async function fetchProperties(params: SearchParams) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
  const res = await fetch(`${baseUrl}/api/properties?${query}`, { next: { revalidate: 30 } });
  if (!res.ok) return { data: [], total: 0, page: 1, totalPages: 1 };
  return res.json();
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function PropertiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const { data: properties, total, totalPages, page } = await fetchProperties(params);

  const currentPage = parseInt(params.page || "1");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <PropertyFilters
            districts={[...SRI_LANKA_DISTRICTS]}
            currentFilters={params}
            activeCategory={params.category}
          />
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {params.category === "TRANSPORT"
                  ? params.district ? `Transport in ${params.district}` : "Transport in Sri Lanka"
                  : params.category === "BIKE_RENTAL"
                  ? params.district ? `Bike Rentals in ${params.district}` : "Bike Rentals in Sri Lanka"
                  : params.category === "SURF_RENTAL"
                  ? params.district ? `Surf Gear in ${params.district}` : "Surf Gear in Sri Lanka"
                  : params.district ? `Stays in ${params.district}` : params.category === "STAY" ? "Stays in Sri Lanka" : "All Listings in Sri Lanka"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{total} listings found</p>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
            {CATEGORY_TABS.map((tab) => {
              const q = new URLSearchParams();
              if (params.district) q.set("district", params.district);
              if (params.minPrice) q.set("minPrice", params.minPrice);
              if (params.maxPrice) q.set("maxPrice", params.maxPrice);
              if (params.guests) q.set("guests", params.guests);
              if (params.sortBy) q.set("sortBy", params.sortBy);
              if (tab.value) q.set("category", tab.value);
              const isActive = (params.category ?? "") === tab.value;
              return (
                <a
                  key={tab.value}
                  href={`/properties?${q}`}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                    isActive
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700"
                  }`}
                >
                  {tab.emoji && <span>{tab.emoji}</span>}
                  {tab.label}
                </a>
              );
            })}
          </div>

          <Suspense fallback={<LoadingSpinner className="py-20" size="lg" />}>
            <PropertyGrid properties={properties} />
          </Suspense>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const query = new URLSearchParams(params as Record<string, string>);
                query.set("page", String(p));
                return (
                  <a
                    key={p}
                    href={`/properties?${query}`}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      p === currentPage
                        ? "bg-teal-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
