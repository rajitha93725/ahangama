import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import PropertyForm from "@/components/property/PropertyForm";
import TransportForm from "@/components/property/TransportForm";
import BikeRentalForm from "@/components/property/BikeRentalForm";
import SurfRentalForm from "@/components/property/SurfRentalForm";
import { Home, Car, Bike, Waves } from "lucide-react";

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Link href="/properties/new?category=STAY"
            className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
              <Home className="w-7 h-7 text-teal-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Stay</h2>
              <p className="text-sm text-gray-500">Villa, guesthouse, hotel, bungalow, eco-lodge or any accommodation</p>
            </div>
          </Link>

          <Link href="/properties/new?category=TRANSPORT"
            className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <Car className="w-7 h-7 text-amber-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Transport</h2>
              <p className="text-sm text-gray-500">Car, van, tuk-tuk, boat, motorbike or any vehicle for hire</p>
            </div>
          </Link>

          <Link href="/properties/new?category=BIKE_RENTAL"
            className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
              <Bike className="w-7 h-7 text-violet-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Rent Bikes</h2>
              <p className="text-sm text-gray-500">Bicycles, e-bikes, mountain bikes, scooters or motorbikes by the day</p>
            </div>
          </Link>

          <Link href="/properties/new?category=SURF_RENTAL"
            className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100 flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
              <Waves className="w-7 h-7 text-cyan-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Rent Surf Gear</h2>
              <p className="text-sm text-gray-500">Surfboards, bodyboards, SUPs, wetsuits and beach equipment</p>
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

  if (category === "BIKE_RENTAL") {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Bike className="w-5 h-5 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">List Bikes for Rent</h1>
        </div>
        <p className="text-gray-500 mb-8">Rent out bicycles, e-bikes, scooters or motorbikes to travelers.</p>
        <BikeRentalForm />
      </div>
    );
  }

  if (category === "SURF_RENTAL") {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center">
            <Waves className="w-5 h-5 text-cyan-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">List Surf Equipment</h1>
        </div>
        <p className="text-gray-500 mb-8">Offer surfboards, bodyboards, SUPs and beach gear to surf enthusiasts.</p>
        <SurfRentalForm />
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
