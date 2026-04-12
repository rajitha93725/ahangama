import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import PropertyForm from "@/components/property/PropertyForm";
import TransportForm from "@/components/property/TransportForm";
import { Home, Car } from "lucide-react";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
    redirect("/profile/edit");
  }

  const { category } = await searchParams;

  if (!category) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create a New Listing</h1>
        <p className="text-gray-500 mb-10">What type of listing would you like to create?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/properties/new?category=STAY"
            className="group flex flex-col items-center gap-5 p-10 rounded-3xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
              <Home className="w-8 h-8 text-teal-600" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Stay</h2>
              <p className="text-sm text-gray-500">Villa, guesthouse, hotel, bungalow, eco-lodge or any accommodation</p>
            </div>
          </Link>

          <Link
            href="/properties/new?category=TRANSPORT"
            className="group flex flex-col items-center gap-5 p-10 rounded-3xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <Car className="w-8 h-8 text-amber-600" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Transport</h2>
              <p className="text-sm text-gray-500">Car, van, tuk-tuk, boat, motorbike or any vehicle for hire</p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  if (category === "TRANSPORT") {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Car className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">List a Transport</h1>
        </div>
        <p className="text-gray-500 mb-8">Offer your vehicle to travelers across Sri Lanka.</p>
        <TransportForm />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
          <Home className="w-5 h-5 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">List a Stay</h1>
      </div>
      <p className="text-gray-500 mb-8">Fill in the details to get your property in front of thousands of travelers.</p>
      <PropertyForm />
    </div>
  );
}
