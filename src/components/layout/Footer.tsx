import Link from "next/link";
import { MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
              <MapPin className="w-5 h-5 text-teal-400" />
              Visit Sri Lanka
            </Link>
            <p className="text-sm leading-relaxed">
              Discover Sri Lanka's most unique stays through flexible, negotiated pricing.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/properties?district=Galle" className="hover:text-white transition-colors">Galle</Link></li>
              <li><Link href="/properties?district=Ella" className="hover:text-white transition-colors">Ella</Link></li>
              <li><Link href="/properties?district=Colombo" className="hover:text-white transition-colors">Colombo</Link></li>
              <li><Link href="/properties?district=Kandy" className="hover:text-white transition-colors">Kandy</Link></li>
              <li><Link href="/properties?district=Mirissa" className="hover:text-white transition-colors">Mirissa</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Hosting</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register?role=HOST" className="hover:text-white transition-colors">Become a Host</Link></li>
              <li><Link href="/properties/new" className="hover:text-white transition-colors">List Your Property</Link></li>
              <li><Link href="/dashboard/host" className="hover:text-white transition-colors">Host Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p>© {new Date().getFullYear()} Visit Sri Lanka. All rights reserved.</p>
          <p className="text-teal-400">Made with ♥ for Sri Lanka tourism</p>
        </div>
      </div>
    </footer>
  );
}
