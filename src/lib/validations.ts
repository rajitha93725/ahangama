import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["GUEST", "HOST"]).default("GUEST"),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid mobile number"),
});

export const LoginSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

export const PropertySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000),
  propertyType: z.enum([
    "VILLA", "GUESTHOUSE", "HOTEL", "BUNGALOW",
    "APARTMENT", "TREEHOUSE", "BEACH_HUT", "ECO_LODGE",
  ]),
  category: z.enum(["STAY", "TRANSPORT"]).default("STAY"),
  address: z.string().min(5),
  district: z.string().min(1, "District is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  pricePerNight: z.number().min(1, "Price must be at least $1"),
  minPrice: z.number().min(1, "Minimum price must be at least $1"),
  maxGuests: z.number().int().min(1).max(50),
  bedrooms: z.number().int().min(0).max(50),
  bathrooms: z.number().int().min(0).max(50),
  beds: z.number().int().min(1).max(100),
  amenities: z.array(z.string()).optional(),
});

export const TransportSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  propertyType: z.enum(["CAR", "VAN", "TUK_TUK", "BUS", "BOAT", "MOTORBIKE", "JEEP", "BICYCLE"]),
  category: z.literal("TRANSPORT"),
  address: z.string().min(5),
  district: z.string().min(1, "District is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  pricePerNight: z.number().min(0, "Parking charge must be at least $0"),  // per-night parking charge
  pricePerKm: z.number().min(0, "Per km charge must be at least $0"),
  minPrice: z.number().min(1, "Minimum price must be at least $1"),
  maxGuests: z.number().int().min(1).max(20),
  bedrooms: z.number().int().min(0).max(0).default(0),
  bathrooms: z.number().int().min(0).max(0).default(0),
  beds: z.number().int().min(0).max(0).default(0),
  amenities: z.array(z.string()).optional(),
});

export const SearchSchema = z.object({
  district: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  guests: z.number().int().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  propertyType: z.string().optional(),
  amenities: z.string().optional(),
  page: z.number().int().default(1),
  limit: z.number().int().default(12),
});

export const BookingRequestSchema = z.object({
  propertyId: z.string(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  guests: z.number().int().min(1),
  roomsRequested: z.number().int().min(1).default(1),
  offerAmount: z.number().min(1),
  message: z.string().max(500).optional(),
  // Transport-only fields
  pickupPoint: z.string().min(2).optional(),
  dropPoint: z.string().min(2).optional(),
  distanceKm: z.number().min(0).optional(),
});

export const OfferSchema = z.object({
  amount: z.number().min(1),
  message: z.string().max(500).optional(),
  type: z.enum(["COUNTER_OFFER", "ACCEPTANCE", "REJECTION"]),
});

export const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  cleanliness: z.number().int().min(1).max(5),
  accuracy: z.number().int().min(1).max(5),
  location: z.number().int().min(1).max(5),
  value: z.number().int().min(1).max(5),
  comment: z.string().min(10, "Comment must be at least 10 characters").max(1000),
});

export const ProfileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  role: z.enum(["GUEST", "HOST"]).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PropertyInput = z.infer<typeof PropertySchema>;
export type TransportInput = z.infer<typeof TransportSchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type BookingRequestInput = z.infer<typeof BookingRequestSchema>;
export type OfferInput = z.infer<typeof OfferSchema>;
export type ReviewInput = z.infer<typeof ReviewSchema>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
