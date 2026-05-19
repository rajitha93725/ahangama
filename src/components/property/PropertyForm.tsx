"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PROPERTY_TYPES, AMENITIES, SRI_LANKA_DISTRICTS, ROOM_TYPES } from "@/lib/constants";
import { useLKRRate } from "@/hooks/useLKRRate";
import { Upload, X, Plus, Trash2, MapPin } from "lucide-react";

const LocationPicker = dynamic(() => import("@/components/property/LocationPicker"), {
  ssr: false,
  loading: () => <div className="w-full h-[220px] rounded-xl bg-gray-100 animate-pulse" />,
});

const DISTRICT_COORDS: Record<string, [number, number]> = {
  Colombo: [6.9271, 79.8612],
  Galle: [6.0535, 80.2210],
  Ella: [6.8667, 81.0466],
  Kandy: [7.2906, 80.6337],
  Mirissa: [5.9483, 80.4591],
  Unawatuna: [6.0089, 80.2503],
  Tangalle: [6.0258, 80.7959],
  "Arugam Bay": [6.8408, 81.8335],
  Sigiriya: [7.9570, 80.7603],
  Trincomalee: [8.5874, 81.2152],
  Negombo: [7.2083, 79.8358],
  Hikkaduwa: [6.1395, 80.1030],
  "Nuwara Eliya": [6.9497, 80.7891],
  Jaffna: [9.6615, 80.0255],
  Bentota: [6.4182, 80.0005],
  Weligama: [5.9745, 80.4289],
  Matara: [5.9549, 80.5550],
  Anuradhapura: [8.3114, 80.4037],
  Polonnaruwa: [7.9403, 81.0188],
  Hambantota: [6.1429, 81.1212],
};

interface RoomTypeInput {
  _id: string;
  typeName: string;
  displayLabel: string;
  roomCount: number;
  beds: number;
  maxGuests: number;
  bathrooms: number;
  amenities: string[];
  pricePerNight: number;
  priceBnB: string | number;
  priceHalfBoard: string | number;
  priceFullBoard: string | number;
}

function newRoomType(): RoomTypeInput {
  return {
    _id: Math.random().toString(36).slice(2),
    typeName: "SINGLE",
    displayLabel: "Single Room",
    roomCount: 1,
    beds: 1,
    maxGuests: 1,
    bathrooms: 1,
    amenities: [],
    pricePerNight: 60,
    priceBnB: "",
    priceHalfBoard: "",
    priceFullBoard: "",
  };
}

const STEP_LABELS = ["Basic Info", "Room Types", "Room Rates", "Photos"];

export default function PropertyForm() {
  const router = useRouter();
  const lkrRate = useLKRRate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationCenterKey, setLocationCenterKey] = useState(0);

  const [form, setForm] = useState({
    title: "",
    description: "",
    propertyType: "VILLA",
    category: "STAY",
    address: "",
    district: "Galle",
    latitude: DISTRICT_COORDS["Galle"][0],
    longitude: DISTRICT_COORDS["Galle"][1],
    currency: "USD",
    amenities: [] as string[],
  });

  const [roomTypes, setRoomTypes] = useState<RoomTypeInput[]>(() => [newRoomType()]);
  const [expandedRoomType, setExpandedRoomType] = useState<string | null>(
    () => roomTypes[0]?._id ?? null
  );

  const update = (field: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "district" && DISTRICT_COORDS[value as string]) {
        const [lat, lng] = DISTRICT_COORDS[value as string];
        next.latitude = lat;
        next.longitude = lng;
        setLocationCenterKey((k) => k + 1);
      }
      return next;
    });
  };

  const toggleAmenity = (name: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(name)
        ? prev.amenities.filter((a) => a !== name)
        : [...prev.amenities, name],
    }));
  };

  const updateRoomType = (id: string, field: keyof RoomTypeInput, value: unknown) => {
    setRoomTypes((prev) =>
      prev.map((rt) => {
        if (rt._id !== id) return rt;
        const updated = { ...rt, [field]: value };
        if (field === "typeName") {
          const found = ROOM_TYPES.find((t) => t.value === value);
          if (found) updated.displayLabel = found.label;
        }
        return updated;
      })
    );
  };

  const toggleRoomTypeAmenity = (id: string, name: string) => {
    setRoomTypes((prev) =>
      prev.map((rt) =>
        rt._id !== id
          ? rt
          : {
              ...rt,
              amenities: rt.amenities.includes(name)
                ? rt.amenities.filter((a) => a !== name)
                : [...rt.amenities, name],
            }
      )
    );
  };

  const addRoomType = () => {
    const rt = newRoomType();
    setRoomTypes((prev) => [...prev, rt]);
    setExpandedRoomType(rt._id);
  };

  const removeRoomType = (id: string) => {
    setRoomTypes((prev) => prev.filter((rt) => rt._id !== id));
    if (expandedRoomType === id) setExpandedRoomType(null);
  };

  const searchLocation = async () => {
    if (!locationQuery.trim()) return;
    setLocationSearching(true);
    setLocationError("");
    try {
      const q = encodeURIComponent(`${locationQuery}, Sri Lanka`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const results = await res.json();
      if (results.length === 0) {
        setLocationError("Location not found. Try a more specific address.");
        return;
      }
      const { lat, lon } = results[0];
      setForm((prev) => ({ ...prev, latitude: parseFloat(lat), longitude: parseFloat(lon) }));
      setLocationCenterKey((k) => k + 1);
    } catch {
      setLocationError("Search failed. Please try again.");
    } finally {
      setLocationSearching(false);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setImages((prev) => [...prev, ...data.urls.map((url: string) => ({ url }))]);
      }
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (roomTypes.length === 0) {
      setError("Please add at least one room type");
      return;
    }
    for (const rt of roomTypes) {
      if (!rt.pricePerNight || rt.pricePerNight < 1) {
        setError(`Please set a Room Only price for ${rt.displayLabel}`);
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      // Aggregate property-level stats from room types
      const totalRooms = roomTypes.reduce((s, rt) => s + rt.roomCount, 0);
      const maxGuestsTotal = roomTypes.reduce((s, rt) => s + rt.maxGuests * rt.roomCount, 0);
      const totalBeds = roomTypes.reduce((s, rt) => s + rt.beds * rt.roomCount, 0);
      const totalBathrooms = roomTypes.reduce((s, rt) => s + rt.bathrooms * rt.roomCount, 0);
      const minPrice = Math.min(...roomTypes.map((rt) => rt.pricePerNight));

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pricePerNight: minPrice,
          minPrice: Math.round(minPrice * 0.8),
          maxGuests: maxGuestsTotal,
          bedrooms: totalRooms,
          bathrooms: totalBathrooms,
          beds: totalBeds,
          roomTypes: roomTypes.map((rt) => ({
            typeName: rt.typeName,
            displayLabel: rt.displayLabel,
            roomCount: rt.roomCount,
            beds: rt.beds,
            maxGuests: rt.maxGuests,
            bathrooms: rt.bathrooms,
            amenities: rt.amenities,
            pricePerNight: rt.pricePerNight,
            priceBnB: rt.priceBnB === "" ? null : Number(rt.priceBnB) || null,
            priceHalfBoard: rt.priceHalfBoard === "" ? null : Number(rt.priceHalfBoard) || null,
            priceFullBoard: rt.priceFullBoard === "" ? null : Number(rt.priceFullBoard) || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.fieldErrors) {
          const msgs = Object.values(data.error.fieldErrors as Record<string, string[]>).flat();
          throw new Error(msgs.join(" · "));
        }
        throw new Error(data.error || "Failed to create listing");
      }

      if (images.length > 0) {
        await Promise.all(
          images.map((img, i) =>
            fetch(`/api/properties/${data.id}/images`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: img.url, isPrimary: i === 0, order: i }),
            })
          )
        );
      }

      router.push("/dashboard/host");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step >= s ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              {s}
            </div>
            {s < 4 && <div className={`h-px w-12 ${step > s ? "bg-teal-600" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">{STEP_LABELS[step - 1]}</span>
      </div>

      {/* ─── Step 1: Basic Info + Map ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Title</label>
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g., Cozy Beach Villa in Unawatuna"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
              placeholder="Describe your property, its surroundings, and what makes it special..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select
                value={form.propertyType}
                onChange={(e) => update("propertyType", e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <select
                value={form.district}
                onChange={(e) => update("district", e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Street address, neighborhood..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Map location search + draggable pin */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <label className="text-sm font-medium text-gray-700">Location</label>
              <span className="text-xs text-gray-400">{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchLocation())}
                placeholder="Search address to pin exact location…"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
              <button
                type="button"
                onClick={searchLocation}
                disabled={locationSearching}
                className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {locationSearching ? "…" : "Search"}
              </button>
            </div>
            {locationError && <p className="text-xs text-red-500 mb-2">{locationError}</p>}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <LocationPicker
                lat={form.latitude}
                lng={form.longitude}
                centerKey={locationCenterKey}
                onChange={(lat, lng) => setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Drag the pin to set your exact location. Zoom in for better precision.
            </p>
          </div>
        </div>
      )}

      {/* ─── Step 2: Room Types ──────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Room Types</p>
                <p className="text-xs text-gray-400 mt-0.5">Add each type of room your property offers</p>
              </div>
              <button
                type="button"
                onClick={addRoomType}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Room Type
              </button>
            </div>

            {roomTypes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                <p className="text-sm">No room types added yet</p>
                <button type="button" onClick={addRoomType} className="mt-2 text-teal-600 text-sm hover:underline">
                  Add your first room type →
                </button>
              </div>
            )}

            <div className="space-y-3">
              {roomTypes.map((rt) => {
                const isOpen = expandedRoomType === rt._id;
                return (
                  <div key={rt._id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Header row */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedRoomType(isOpen ? null : rt._id)}
                      onKeyDown={(e) => e.key === "Enter" && setExpandedRoomType(isOpen ? null : rt._id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">
                          {rt.roomCount}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{rt.displayLabel}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {rt.beds} bed{rt.beds !== 1 ? "s" : ""} · max {rt.maxGuests} · {rt.bathrooms} bath
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rt.amenities.length > 0 && (
                          <span className="text-xs text-teal-600 font-medium">{rt.amenities.length} amenities</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeRoomType(rt._id); }}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isOpen && (
                      <div className="px-4 py-4 space-y-4">
                        {/* Room type selector */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Room Type</label>
                            <select
                              value={rt.typeName}
                              onChange={(e) => updateRoomType(rt._id, "typeName", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                            >
                              {ROOM_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.emoji ? `${t.emoji} ` : ""}{t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Number of Rooms</label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={rt.roomCount}
                              onChange={(e) => updateRoomType(rt._id, "roomCount", parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Beds per room</label>
                            <input
                              type="number" min={1} max={10}
                              value={rt.beds}
                              onChange={(e) => updateRoomType(rt._id, "beds", parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Max guests per room</label>
                            <input
                              type="number" min={1} max={20}
                              value={rt.maxGuests}
                              onChange={(e) => updateRoomType(rt._id, "maxGuests", parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Bathrooms per room</label>
                            <input
                              type="number" min={0} max={10}
                              value={rt.bathrooms}
                              onChange={(e) => updateRoomType(rt._id, "bathrooms", parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                          </div>
                        </div>

                        {/* Room amenities */}
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">Room Amenities</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {AMENITIES.map((a) => (
                              <button
                                key={a.name}
                                type="button"
                                onClick={() => toggleRoomTypeAmenity(rt._id, a.name)}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                                  rt.amenities.includes(a.name)
                                    ? "border-teal-500 bg-teal-50 text-teal-700"
                                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                                }`}
                              >
                                <span>{rt.amenities.includes(a.name) ? "✓" : "+"}</span>
                                {a.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ─── Step 3: Room Rates ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Set nightly rates for each room type. Guests will be able to see these prices and make offers.
          </p>

          {roomTypes.map((rt) => (
            <div key={rt._id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">
                  {rt.roomCount}
                </div>
                <span className="text-sm font-semibold text-gray-900">{rt.displayLabel}</span>
                <span className="text-xs text-gray-400">
                  × {rt.roomCount} room{rt.roomCount !== 1 ? "s" : ""} · max {rt.maxGuests} guests
                </span>
              </div>
              <div className="px-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Room Only — required */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Room Only <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number" min={1}
                        value={rt.pricePerNight}
                        onChange={(e) => updateRoomType(rt._id, "pricePerNight", parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    {lkrRate && rt.pricePerNight > 0 && (
                      <p className="text-xs text-gray-400 mt-1">≈ LKR {Math.round(rt.pricePerNight * lkrRate).toLocaleString()}/night</p>
                    )}
                    {rt.pricePerNight > 0 && (
                      <p className="text-xs text-teal-600 mt-0.5">Min offer: ${Math.round(rt.pricePerNight * 0.8)}/night</p>
                    )}
                  </div>

                  {/* Meal plan rates */}
                  {[
                    { label: "Bed & Breakfast", field: "priceBnB" as const },
                    { label: "Half Board", field: "priceHalfBoard" as const },
                    { label: "Full Board", field: "priceFullBoard" as const },
                  ].map(({ label, field }) => {
                    const val = rt[field] as string | number;
                    const numVal = typeof val === "number" ? val : parseFloat(val as string);
                    return (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {label} <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input
                            type="number" min={1} placeholder="—"
                            value={val === "" ? "" : val}
                            onChange={(e) =>
                              updateRoomType(rt._id, field, e.target.value === "" ? "" : parseFloat(e.target.value))
                            }
                            className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </div>
                        {lkrRate && !isNaN(numVal) && numVal > 0 && (
                          <p className="text-xs text-gray-400 mt-1">≈ LKR {Math.round(numVal * lkrRate).toLocaleString()}/night</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Step 4: Photos ───────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Property Photos <span className="text-gray-400">(first photo will be the main image)</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-teal-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Click to upload photos</p>
                <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP up to 5MB each</p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
              />
            </label>
          </div>

          {uploading && <p className="text-sm text-teal-600">Uploading images…</p>}

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-800">
              Your listing will be reviewed by our admin team before going live. This usually takes less than 24 hours.
            </p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full">Main</span>
                  )}
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        {step > 1 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            onClick={() => {
              if (step === 2 && roomTypes.length === 0) {
                setError("Please add at least one room type");
                return;
              }
              setError("");
              setStep((s) => s + 1);
            }}
            className="px-8 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
        )}
      </div>
    </div>
  );
}
