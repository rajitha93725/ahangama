import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PropertyForm from "@/components/property/PropertyForm";

export default async function NewPropertyPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
    redirect("/profile/edit");
  }
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">List Your Property</h1>
      <p className="text-gray-500 mb-8">Fill in the details to get your property in front of thousands of travelers.</p>
      <PropertyForm />
    </div>
  );
}
