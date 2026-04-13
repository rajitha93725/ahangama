"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRANSPORT_TYPES, SRI_LANKA_DISTRICTS } from "@/lib/constants";
import { Upload, X } from "lucide-react";

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

const TRANSPORT_FEATURES = [
  "Air Conditioning",
  "GPS Navigation",
  "Driver Included",
  "Fuel Included",
  "Airport Pickup",
  "Island Tour Package",
  "Child Seat",
  "Luggage Space",
  "English Speaking Driver",
  "24/7 Support",
  "Insurance Included",
  "Free Cancellation",
];

export default function TransportForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    propertyType: "CAR",
    category: "TRANSPORT",
    address: "",
    district: "Colombo",
    latitude: DISTRICT_COORDS["Colombo"][0],
    longitude: DISTRICT_COORDS["Colombo"][1],
    pricePerNight: 10,   // per-night parking charge
    pricePerKm: 0.5,     // per-kilometer charge
    minPrice: 20,
    currency: "USD",
    maxGuests: 4,
    bedrooms: 0,
    bathrooms: 0,
    beds: 0,
    amenities: [] as string[],
  });

  const update = (field: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "district" && DISTRICT_COORDS[value as string]) {
        const [lat, lng] = DISTRICT_COORDS[value as string];
        next.latitude = lat;
        next.longitude = lng;
      }
      return next;
    });
  };

  const toggleFeature = (name: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(name)
        ? prev.amenities.filter((a) => a !== name)
        : [...prev.amenities, name],
    }));
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
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
        await Promise.all(images.map((img, i) =>
          fetch(`/api/properties/${data.id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: img.url, isPrimary: i === 0, order: i }),
          })
        ));
      }

      router.push(`/properties/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = TRANSPORT_TYPES.find((t) => t.value === form.propertyType);

  return (
    <div className="space-y-8">
      {/* Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step >= s ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-400"}`}>
              {s}
            </div>
            {s < 3 && <div className={`h-px w-16 ${step > s ? "bg-amber-500" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {step === 1 ? "Vehicle Details" : step === 2 ? "Features & Pricing" : "Photos"}
        </span>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listing Title</label>
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g., Comfortable AC Car with English Driver – Galle"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
              placeholder="Describe your vehicle, routes, and what's included..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select
                value={form.propertyType}
                onChange={(e) => update("propertyType", e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              >
                {TRANSPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base District</label>
              <select
                value={form.district}
                onChange={(e) => update("district", e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              >
                {SRI_LANKA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address / Location</label>
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Where can travelers find or pick up this vehicle?"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Passengers</label>
            <input
              type="number"
              min="1"
              max="20"
              value={form.maxGuests}
              onChange={(e) => update("maxGuests", parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Per Kilometer Charge (USD)
                <span className="ml-1 text-xs text-gray-400">per km</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pricePerKm}
                  onChange={(e) => update("pricePerKm", parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Charged per km driven</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parking Charge (USD)
                <span className="ml-1 text-xs text-gray-400">per night</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.pricePerNight}
                  onChange={(e) => update("pricePerNight", parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Overnight parking / per-day holding fee</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Acceptable Offer (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input
                type="number"
                min="1"
                value={form.minPrice}
                onChange={(e) => update("minPrice", parseFloat(e.target.value))}
                className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Lowest total offer you'll accept from a guest</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Features & Inclusions</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRANSPORT_FEATURES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFeature(f)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    form.amenities.includes(f)
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="text-base">{form.amenities.includes(f) ? "✓" : "+"}</span>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800 font-medium">
              {selectedType?.label} · {form.district} · up to {form.maxGuests} passengers
            </p>
            <p className="text-xs text-amber-600 mt-1">
              ${form.pricePerKm}/km · ${form.pricePerNight}/night parking · min offer ${form.minPrice}
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Photos */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Vehicle Photos <span className="text-gray-400">(first photo is the main image)</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-amber-400 transition-colors">
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

          {uploading && <p className="text-sm text-amber-600">Uploading images…</p>}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">Main</span>
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

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-800">
              Your listing will be reviewed by our admin team before going live. This usually takes less than 24 hours.
            </p>
          </div>
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
        ) : <div />}

        {step < 3 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="px-8 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
        )}
      </div>
    </div>
  );
}
