import { Suspense } from "react";
import PropertyGrid from "@/components/property/PropertyGrid";
import PropertyFilters from "@/components/property/PropertyFilters";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { SRI_LANKA_DISTRICTS } from "@/lib/constants";

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
  const res = await fetch(`${baseUrl}/api/properties?${query}`, { cache: "no-store" });
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
          />
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {params.category === "TRANSPORT"
                  ? params.district ? `Transport in ${params.district}` : "Transport in Sri Lanka"
                  : params.district ? `Stays in ${params.district}` : params.category === "STAY" ? "Stays in Sri Lanka" : "All Listings in Sri Lanka"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{total} listings found</p>
            </div>
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
