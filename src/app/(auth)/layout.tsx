import Link from "next/link";
import { MapPin } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-teal-600">
            <MapPin className="w-7 h-7" />
            <span className="text-3xl" style={{ fontFamily: "var(--font-dancing)" }}>Visit Sri Lanka</span>
            <img src="https://flagcdn.com/w20/lk.png" alt="Sri Lanka" width={20} height={14} className="rounded-sm" />
          </Link>
          <p className="text-gray-500 text-sm mt-2">Sri Lanka Tourism Marketplace</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
