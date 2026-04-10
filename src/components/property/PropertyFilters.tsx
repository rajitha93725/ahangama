"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROPERTY_TYPES } from "@/lib/constants";
import { Search, RotateCcw } from "lucide-react";

interface Props {
  districts: string[];
  currentFilters: {
    district?: string;
    minPrice?: string;
    maxPrice?: string;
    guests?: string;
    propertyType?: string;
  };
}

export default function PropertyFilters({ districts, currentFilters }: Props) {
  const router = useRouter();
  const [district, setDistrict] = useState(currentFilters.district || "");
  const [minPrice, setMinPrice] = useState(currentFilters.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(currentFilters.maxPrice || "");
  const [guests, setGuests] = useState(currentFilters.guests || "");
  const [propertyType, setPropertyType] = useState(currentFilters.propertyType || "");

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (district) params.set("district", district);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (guests) params.set("guests", guests);
    if (propertyType) params.set("propertyType", propertyType);
    router.push(`/properties?${params}`);
  };

  const reset = () => {
    setDistrict("");
    setMinPrice("");
    setMaxPrice("");
    setGuests("");
    setPropertyType("");
    router.push("/properties");
  };

  const hasFilters = district || minPrice || maxPrice || guests || propertyType;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Filters</h2>
        {hasFilters && (
          <button onClick={reset} className="flex items-center gap-1 text-xs text-teal-600 hover:underline">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Location</label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        >
          <option value="">All locations</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Price per night (USD)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Guests */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Guests</label>
        <input
          type="number"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          placeholder="Number of guests"
          min="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Property type */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Property Type</label>
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        >
          <option value="">All types</option>
          {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <button
        onClick={applyFilters}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
      >
        <Search className="w-4 h-4" /> Search
      </button>
    </div>
  );
}
