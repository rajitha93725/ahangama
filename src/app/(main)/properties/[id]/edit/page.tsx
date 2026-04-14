"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useLKRRate } from "@/hooks/useLKRRate";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

type PropertyData = {
  id: string;
  title: string;
  pricePerNight: number;
  minPrice: number;
  category: string;
  pricePerKm: number | null;
  priceBnB: number | null;
  priceHalfBoard: number | null;
  priceFullBoard: number | null;
};

function PriceField({
  label, value, onChange, min = 0, required = false, lkrRate, suffix,
}: {
  label: string;
  value: string | number;
  onChange: (v: string | number) => void;
  min?: number;
  required?: boolean;
  lkrRate: number | null;
  suffix?: string;
}) {
  const num = typeof value === "number" ? value : parseFloat(value as string);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
        <input
          type="number" min={min} step="1"
          placeholder={required ? undefined : "— not offered"}
          value={value === "" ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
          className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        />
      </div>
      {lkrRate && !isNaN(num) && num > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          ≈ LKR {Math.round(num * lkrRate).toLocaleString()}{suffix ? ` ${suffix}` : "/night"}
        </p>
      )}
    </div>
  );
}

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const lkrRate = useLKRRate();

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [pricePerNight, setPricePerNight] = useState<string | number>(0);
  const [minPrice, setMinPrice] = useState<string | number>(0);
  const [pricePerKm, setPricePerKm] = useState<string | number>(0);
  const [priceBnB, setPriceBnB] = useState<string | number>("");
  const [priceHalfBoard, setPriceHalfBoard] = useState<string | number>("");
  const [priceFullBoard, setPriceFullBoard] = useState<string | number>("");

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then((data: PropertyData) => {
        setProperty(data);
        setPricePerNight(data.pricePerNight);
        setMinPrice(data.minPrice);
        setPricePerKm(data.pricePerKm ?? 0);
        setPriceBnB(data.priceBnB ?? "");
        setPriceHalfBoard(data.priceHalfBoard ?? "");
        setPriceFullBoard(data.priceFullBoard ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const toNum = (v: string | number) => (v === "" ? null : typeof v === "number" ? v : parseFloat(v));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const basePrice = toNum(pricePerNight);
      const autoMinPrice = basePrice !== null ? Math.round(basePrice * 0.8) : null;
      const body: Record<string, unknown> = {
        pricePerNight: basePrice,
        minPrice: autoMinPrice,
        priceBnB: toNum(priceBnB),
        priceHalfBoard: toNum(priceHalfBoard),
        priceFullBoard: toNum(priceFullBoard),
      };
      if (property?.category === "TRANSPORT") body.pricePerKm = toNum(pricePerKm);

      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setSuccess(true);
      setTimeout(() => router.push(`/properties/${id}`), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;
  if (!property) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">Property not found.</div>;

  const isTransport = property.category === "TRANSPORT";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/properties/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Pricing</h1>
          <p className="text-xs text-gray-500 mt-0.5">{isTransport ? "Transport" : "Stay"} listing</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        {/* Base rates */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {isTransport ? "Transport Pricing" : "Room Only Rate"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <PriceField
                label={isTransport ? "Parking / Night" : "Room Only / Night"}
                value={pricePerNight} onChange={setPricePerNight}
                min={0} required lkrRate={lkrRate}
              />
              {!isTransport && typeof pricePerNight === "number" && pricePerNight > 0 && (
                <p className="text-xs text-teal-600 mt-1">
                  Minimum guests can offer: ${Math.round(pricePerNight * 0.8)}/night (80%)
                </p>
              )}
            </div>
            {isTransport && (
              <PriceField
                label="Per Kilometer"
                value={pricePerKm} onChange={setPricePerKm}
                min={0} lkrRate={lkrRate} suffix="/ km"
              />
            )}
          </div>
        </div>

        {/* Meal plan rates — stays only */}
        {!isTransport && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Meal Plan Rates <span className="font-normal normal-case text-gray-400">(leave blank to hide from guests)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <PriceField label="Bed & Breakfast" value={priceBnB} onChange={setPriceBnB} lkrRate={lkrRate} />
              <PriceField label="Half Board" value={priceHalfBoard} onChange={setPriceHalfBoard} lkrRate={lkrRate} />
              <PriceField label="Full Board" value={priceFullBoard} onChange={setPriceFullBoard} lkrRate={lkrRate} />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-xl">Saved! Redirecting…</p>}

        <button
          onClick={handleSave}
          disabled={saving || success}
          className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
