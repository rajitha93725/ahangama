export const SRI_LANKA_DISTRICTS = [
  "Colombo",
  "Galle",
  "Ella",
  "Kandy",
  "Mirissa",
  "Unawatuna",
  "Tangalle",
  "Arugam Bay",
  "Sigiriya",
  "Trincomalee",
  "Negombo",
  "Hikkaduwa",
  "Nuwara Eliya",
  "Jaffna",
  "Bentota",
  "Weligama",
  "Matara",
  "Anuradhapura",
  "Polonnaruwa",
  "Hambantota",
] as const;

export type District = (typeof SRI_LANKA_DISTRICTS)[number];

export const AMENITIES = [
  { name: "WiFi", icon: "Wifi" },
  { name: "Pool", icon: "Waves" },
  { name: "Air Conditioning", icon: "Wind" },
  { name: "Free Parking", icon: "Car" },
  { name: "Kitchen", icon: "UtensilsCrossed" },
  { name: "TV", icon: "Tv" },
  { name: "Washer", icon: "WashingMachine" },
  { name: "Hot Water", icon: "Droplets" },
  { name: "Garden", icon: "TreePine" },
  { name: "Beach Access", icon: "Waves" },
  { name: "Gym", icon: "Dumbbell" },
  { name: "Breakfast Included", icon: "Coffee" },
  { name: "Restaurant", icon: "UtensilsCrossed" },
  { name: "Bar", icon: "Beer" },
  { name: "Security", icon: "Shield" },
  { name: "Pet Friendly", icon: "PawPrint" },
  { name: "Balcony", icon: "BuildingBalcony" },
  { name: "Ocean View", icon: "Sunset" },
  { name: "Mountain View", icon: "Mountain" },
  { name: "Tour Assistance", icon: "Map" },
] as const;

export const PROPERTY_TYPES = [
  { value: "VILLA", label: "Villa" },
  { value: "GUESTHOUSE", label: "Guesthouse" },
  { value: "HOTEL", label: "Hotel" },
  { value: "BUNGALOW", label: "Bungalow" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "TREEHOUSE", label: "Treehouse" },
  { value: "BEACH_HUT", label: "Beach Hut" },
  { value: "ECO_LODGE", label: "Eco Lodge" },
] as const;

export const TRANSPORT_TYPES = [
  { value: "CAR", label: "Car" },
  { value: "VAN", label: "Van / Minivan" },
  { value: "TUK_TUK", label: "Tuk-Tuk" },
  { value: "BUS", label: "Bus / Minibus" },
  { value: "BOAT", label: "Boat" },
  { value: "MOTORBIKE", label: "Motorbike" },
  { value: "JEEP", label: "Jeep / 4WD" },
  { value: "BICYCLE", label: "Bicycle" },
] as const;

export const MEAL_PLANS = [
  { value: "ROOM_ONLY", label: "Room Only", short: "RO", color: "bg-gray-100 text-gray-600" },
  { value: "BED_BREAKFAST", label: "Bed & Breakfast", short: "B&B", color: "bg-amber-100 text-amber-700" },
  { value: "HALF_BOARD", label: "Half Board", short: "HB", color: "bg-orange-100 text-orange-700" },
  { value: "FULL_BOARD", label: "Full Board", short: "FB", color: "bg-teal-100 text-teal-700" },
] as const;

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING_OFFER: "Awaiting Response",
  COUNTERED: "Counter Offer Received",
  ACCEPTED: "Confirmed",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  PENDING_OFFER: "bg-yellow-100 text-yellow-800",
  COUNTERED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  COMPLETED: "bg-teal-100 text-teal-800",
};
