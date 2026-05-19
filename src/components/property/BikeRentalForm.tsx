"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { BIKE_RENTAL_TYPES, SRI_LANKA_DISTRICTS } from "@/lib/constants";
import { Plus, Trash2, Upload, X, MapPin } from "lucide-react";
import { useLKRRate } from "@/hooks/useLKRRate";

type RentalGroup = { type: string; count: number; maxPassengers: number };

const LocationPicker = dynamic(() => import("@/components/property/LocationPicker"), {
  ssr: false,
  loading: () => <div className="w-full h-[220px] rounded-xl bg-gray-100 animate-pulse" />,
});

const DISTRICT_COORDS: Record<string, [number, number]> = {
  Colombo: [6.9271, 79.8612], Galle: [6.0535, 80.2210], Ella: [6.8667, 81.0466],
  Kandy: [7.2906, 80.6337], Mirissa: [5.9483, 80.4591], Unawatuna: [6.0089, 80.2503],
  Tangalle: [6.0258, 80.7959], "Arugam Bay": [6.8408, 81.8335], Sigiriya: [7.9570, 80.7603],
  Trincomalee: [8.5874, 81.2152], Negombo: [7.2083, 79.8358], Hikkaduwa: [6.1395, 80.1030],
  "Nuwara Eliya": [6.9497, 80.7891], Jaffna: [9.6615, 80.0255], Bentota: [6.4182, 80.0005],
  Weligama: [5.9745, 80.4289], Matara: [5.9549, 80.5550], Anuradhapura: [8.3114, 80.4037],
  Polonnaruwa: [7.9403, 81.0188], Hambantota: [6.1429, 81.1212],
};

const BIKE_FEATURES = [
  "Helmet Included", "Lock & Key Included", "Repair Kit", "Delivery to Hotel",
  "ID Required", "Multi-day Discount", "GPS Tracker", "Child Seat Available",
  "Basket Included", "Phone Mount", "Luggage Rack", "Free Map Included",
];

export default function BikeRentalForm() {
  const router = useRouter();
  const lkrRate = useLKRRate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [locationCenterKey, setLocationCenterKey] = useState(0);

  const [form, setForm] = useState({
    title: "", description: "",
    propertyType: "BICYCLE",
    category: "BIKE_RENTAL",
    address: "", district: "Colombo",
    latitude: DISTRICT_COORDS["Colombo"][0],
    longitude: DISTRICT_COORDS["Colombo"][1],
    pricePerNight: 10,
    minPrice: 8,
    currency: "USD",
    maxGuests: 1,
    bedrooms: 0, bathrooms: 0, beds: 0,
    amenities: [] as string[],
  });

  const [rentalGroups, setRentalGroups] = useState<RentalGroup[]>([{ type: "BICYCLE", count: 1, maxPassengers: 1 }]);

  const totalUnits = rentalGroups.reduce((s, g) => s + g.count, 0);

  const update = (field: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "district" && DISTRICT_COORDS[value as string]) {
        const [lat, lng] = DISTRICT_COORDS[value as string];
        next.latitude = lat; next.longitude = lng;
        setLocationCenterKey((k) => k + 1);
      }
      return next;
    });
  };

  const updateGroup = (i: number, field: keyof RentalGroup, value: string | number) => {
    setRentalGroups((prev) => {
      const next = prev.map((g, j) => j === i ? { ...g, [field]: value } : g);
      if (i === 0 && field === "type") update("propertyType", value);
      return next;
    });
  };

  const toggleFeature = (name: string) =>
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(name)
        ? prev.amenities.filter((a) => a !== name)
        : [...prev.amenities, name],
    }));

  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setImages((prev) => [...prev, ...data.urls.map((url: string) => ({ url }))]);
    } catch { setError("Image upload failed"); }
    finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    setSubmitting(true); setError("");
    try {
      const computedMaxGuests = rentalGroups.reduce((s, g) => s + g.count * g.maxPassengers, 0);
      const autoMinPrice = Math.round(form.pricePerNight * 0.8) || 5;
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, minPrice: autoMinPrice, maxGuests: computedMaxGuests, vehicleGroups: rentalGroups }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgs = data.error?.fieldErrors ? Object.values(data.error.fieldErrors as Record<string, string[]>).flat() : [data.error || "Failed"];
        throw new Error(msgs.join(" · "));
      }
      if (images.length > 0) {
        await Promise.all(images.map((img, i) =>
          fetch(`/api/properties/${data.id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: img.url, isPrimary: i === 0, order: i }),
          })
        ));
      }
      router.push("/dashboard/host");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create listing");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-8">
      {/* Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step >= s ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-400"}`}>{s}</div>
            {s < 3 && <div className={`h-px w-16 ${step > s ? "bg-violet-500" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {step === 1 ? "Fleet Details" : step === 2 ? "Pricing & Features" : "Photos"}
        </span>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listing Title</label>
            <input value={form.title} onChange={(e) => update("title", e.target.value)}
              placeholder="e.g., Mountain Bikes for Rent – Ella Hills"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
              rows={4} placeholder="Describe your bikes, condition, included accessories, routes..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none" />
          </div>

          {/* Fleet builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Your Bike Fleet</label>
              <span className="text-xs text-violet-600 font-medium">{totalUnits} unit{totalUnits !== 1 ? "s" : ""} total</span>
            </div>
            <div className="grid grid-cols-[1fr_56px_80px_32px] gap-2 px-1 mb-1">
              <span className="text-xs text-gray-400">Bike Type</span>
              <span className="text-xs text-gray-400 text-center">Count</span>
              <span className="text-xs text-gray-400 text-center">Per Rider</span>
              <span />
            </div>
            <div className="space-y-2">
              {rentalGroups.map((group, i) => (
                <div key={i} className="grid grid-cols-[1fr_56px_80px_32px] items-center gap-2">
                  <select value={group.type} onChange={(e) => updateGroup(i, "type", e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none">
                    {BIKE_RENTAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input type="number" min="1" max="100" value={group.count}
                    onChange={(e) => updateGroup(i, "count", Math.max(1, parseInt(e.target.value) || 1))}
                    className="px-2 py-2.5 border border-gray-300 rounded-xl text-sm text-center focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" />
                  <input type="number" min="1" max="2" value={group.maxPassengers}
                    onChange={(e) => updateGroup(i, "maxPassengers", Math.max(1, parseInt(e.target.value) || 1))}
                    className="px-2 py-2.5 border border-gray-300 rounded-xl text-sm text-center focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" />
                  {rentalGroups.length > 1 ? (
                    <button type="button" onClick={() => setRentalGroups((p) => p.filter((_, j) => j !== i))}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : <span />}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setRentalGroups((p) => [...p, { type: "BICYCLE", count: 1, maxPassengers: 1 }])}
              className="mt-2 flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add another bike type
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
            <select value={form.district} onChange={(e) => update("district", e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none">
              {SRI_LANKA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
            <input value={form.address} onChange={(e) => update("address", e.target.value)}
              placeholder="Where can guests pick up the bikes?"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-violet-500" />
              <label className="text-sm font-medium text-gray-700">Exact Pickup Location</label>
              <span className="text-xs text-gray-400">{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</span>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <LocationPicker lat={form.latitude} lng={form.longitude} centerKey={locationCenterKey}
                onChange={(lat, lng) => setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Daily Rental Rate (USD) <span className="text-xs text-gray-400">per bike / per day</span>
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input type="number" min="1" step="0.5" value={form.pricePerNight}
                onChange={(e) => update("pricePerNight", parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" />
            </div>
            {lkrRate && form.pricePerNight > 0 && (
              <p className="text-xs text-gray-400 mt-1">≈ LKR {Math.round(form.pricePerNight * lkrRate).toLocaleString()} / day</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Guests can negotiate — minimum accepted is 80% of this rate</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Features & Inclusions</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BIKE_FEATURES.map((f) => (
                <button key={f} type="button" onClick={() => toggleFeature(f)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    form.amenities.includes(f) ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  <span className="text-base">{form.amenities.includes(f) ? "✓" : "+"}</span> {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <p className="text-sm text-violet-800 font-medium">
              {rentalGroups.map((g) => {
                const t = BIKE_RENTAL_TYPES.find((t) => t.value === g.type);
                return `${g.count}× ${t?.label ?? g.type}`;
              }).join(", ")} · {form.district}
            </p>
            <p className="text-xs text-violet-600 mt-1">${form.pricePerNight}/day per bike · guests negotiate from 80%</p>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Bike Photos <span className="text-gray-400">(first photo is the main image)</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-violet-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Click to upload photos</p>
                <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP up to 5MB each</p>
              </div>
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)} />
            </label>
          </div>
          {uploading && <p className="text-sm text-violet-600">Uploading images…</p>}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full">Main</span>}
                  <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-800">Your listing will be reviewed by our team before going live. Usually less than 24 hours.</p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

      <div className="flex justify-between gap-4">
        {step > 1 ? (
          <button onClick={() => setStep((s) => s - 1)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Back
          </button>
        ) : <div />}
        {step < 3 ? (
          <button onClick={() => setStep((s) => s + 1)}
            className="px-8 py-3 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:bg-violet-600 transition-colors">
            Continue
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="px-8 py-3 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:bg-violet-600 disabled:opacity-50 transition-colors">
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
        )}
      </div>
    </div>
  );
}
