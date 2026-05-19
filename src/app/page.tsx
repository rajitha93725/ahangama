import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PropertyGrid from "@/components/property/PropertyGrid";
import { SRI_LANKA_DISTRICTS } from "@/lib/constants";
import { Search, MapPin, Home, Car, Bike, Waves } from "lucide-react";

async function getFeaturedProperties() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/properties?limit=8`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

const POPULAR_DESTINATIONS = [
  { name: "Galle", emoji: "🏰", description: "Historic Dutch fort & beaches" },
  { name: "Ella", emoji: "🌿", description: "Misty hills & train rides" },
  { name: "Mirissa", emoji: "🐋", description: "Whale watching & surf" },
  { name: "Sigiriya", emoji: "🦁", description: "Ancient rock fortress" },
  { name: "Kandy", emoji: "🌺", description: "Cultural heartland" },
  { name: "Trincomalee", emoji: "🏖️", description: "Pristine beaches & diving" },
];

export default async function HomePage() {
  const featuredProperties = await getFeaturedProperties();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-teal-700 via-teal-500 to-emerald-500 text-white overflow-hidden">
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
          </div>
          {/* Decorative blobs */}
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 md:pt-20 md:pb-32 text-center">

            {/* Handwritten brand name */}
            <div className="mb-2 flex items-center justify-center gap-3">
              <span className="text-5xl md:text-7xl text-white/90 drop-shadow-lg"
                style={{ fontFamily: "var(--font-dancing)", textShadow: "0 2px 16px rgba(0,0,0,0.18)" }}>
                Visit Sri Lanka
              </span>
              <img
                src="https://flagcdn.com/w80/lk.png"
                alt="Sri Lanka"
                width={64}
                height={45}
                className="rounded-md shadow-lg flex-shrink-0"
              />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-8 mt-2">
              <MapPin className="w-4 h-4" /> Sri Lanka&apos;s #1 Tourism Marketplace
            </div>

            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
              Discover Sri Lanka,<br />
              <span className="text-amber-300">Your Way, Your Price</span>
            </h1>
            <p className="text-lg text-teal-100 mb-10 max-w-2xl mx-auto">
              Find unique villas, guesthouses, and eco-lodges. Send your own offer and negotiate directly with hosts.
            </p>

            {/* Search bar */}
            <div className="bg-white rounded-2xl shadow-2xl p-2 max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-700 text-sm focus:outline-none bg-gray-50 border-0">
                    <option value="">Where are you going?</option>
                    {SRI_LANKA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <Link
                  href="/properties"
                  className="flex items-center justify-center gap-2 px-8 py-3.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors text-sm"
                >
                  <Search className="w-4 h-4" /> Search
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-teal-100">
              <span>✓ No booking fees</span>
              <span>✓ Negotiate your price</span>
              <span>✓ Direct host contact</span>
              <span>✓ Verified listings</span>
            </div>
          </div>
        </section>

        {/* Category Selection */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">What are you looking for?</h2>
          <p className="text-gray-500 text-center mb-8">Choose a category to start exploring</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Link href="/properties?category=STAY"
              className="group relative flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Home className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">Stays</h3>
                <p className="text-teal-100 text-sm">Villas, guesthouses, hotels, eco-lodges & more</p>
              </div>
              <span className="absolute bottom-4 right-4 text-white/60 text-xs group-hover:text-white/90 transition-colors">Explore →</span>
            </Link>

            <Link href="/properties?category=TRANSPORT"
              className="group relative flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Car className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">Transport</h3>
                <p className="text-amber-100 text-sm">Cars, tuk-tuks, boats, vans & island tours</p>
              </div>
              <span className="absolute bottom-4 right-4 text-white/60 text-xs group-hover:text-white/90 transition-colors">Explore →</span>
            </Link>

            <Link href="/properties?category=BIKE_RENTAL"
              className="group relative flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Bike className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">Rent Bikes</h3>
                <p className="text-violet-100 text-sm">Bicycles, e-bikes, scooters & motorbikes by the day</p>
              </div>
              <span className="absolute bottom-4 right-4 text-white/60 text-xs group-hover:text-white/90 transition-colors">Explore →</span>
            </Link>

            <Link href="/properties?category=SURF_RENTAL"
              className="group relative flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Waves className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">Surf Gear</h3>
                <p className="text-cyan-100 text-sm">Surfboards, bodyboards, SUPs & beach equipment</p>
              </div>
              <span className="absolute bottom-4 right-4 text-white/60 text-xs group-hover:text-white/90 transition-colors">Explore →</span>
            </Link>
          </div>
        </section>

        {/* Popular Destinations */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Explore Sri Lanka</h2>
          <p className="text-gray-500 mb-8">Popular destinations loved by travelers</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {POPULAR_DESTINATIONS.map((dest) => (
              <Link
                key={dest.name}
                href={`/properties?district=${dest.name}`}
                className="group flex flex-col items-center p-4 rounded-2xl bg-white border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all text-center"
              >
                <span className="text-4xl mb-2">{dest.emoji}</span>
                <span className="font-semibold text-gray-900 text-sm">{dest.name}</span>
                <span className="text-xs text-gray-500 mt-1 line-clamp-2">{dest.description}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Properties */}
        {featuredProperties.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Featured Properties</h2>
                <p className="text-gray-500 mt-1">Handpicked stays across Sri Lanka</p>
              </div>
              <Link href="/properties" className="text-teal-600 text-sm font-semibold hover:underline">
                View all →
              </Link>
            </div>
            <PropertyGrid properties={featuredProperties} />
          </section>
        )}

        {/* How it Works */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">How Visit Sri Lanka Works</h2>
            <p className="text-gray-500 text-center mb-12">Flexible booking through direct negotiation</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: "🔍",
                  title: "1. Find Your Stay",
                  desc: "Search properties across Sri Lanka by location, budget, and style. Browse photos and read genuine reviews.",
                },
                {
                  icon: "💬",
                  title: "2. Send Your Offer",
                  desc: "Found a place you love? Send your own price offer for the dates you want. The host can accept, reject, or counter.",
                },
                {
                  icon: "✅",
                  title: "3. Get Confirmed",
                  desc: "Once you both agree on the price, the booking is confirmed. Your dream Sri Lanka getaway is booked!",
                },
              ].map((step) => (
                <div key={step.title} className="flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-gray-100">
                  <div className="text-4xl mb-4">{step.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-teal-600 text-white py-16">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Are you a property owner in Sri Lanka?</h2>
            <p className="text-teal-100 mb-8 text-lg">
              List your villa, guesthouse, or eco-lodge and start receiving offers from tourists worldwide.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors text-lg"
            >
              List Your Property Free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
