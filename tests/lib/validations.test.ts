import {
  RegisterSchema,
  LoginSchema,
  PropertySchema,
  TransportSchema,
  SearchSchema,
  BookingRequestSchema,
  OfferSchema,
  ReviewSchema,
  ProfileUpdateSchema,
} from "@/lib/validations";

describe("RegisterSchema", () => {
  const validData = {
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
    role: "GUEST" as const,
  };

  it("accepts valid registration data", () => {
    const result = RegisterSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("defaults role to GUEST", () => {
    const { ...data } = validData;
    const result = RegisterSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe("GUEST");
  });

  it("rejects short name", () => {
    const result = RegisterSchema.safeParse({ ...validData, name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = RegisterSchema.safeParse({ ...validData, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = RegisterSchema.safeParse({ ...validData, password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = RegisterSchema.safeParse({ ...validData, role: "SUPERADMIN" });
    expect(result.success).toBe(false);
  });

  it("accepts HOST role", () => {
    const result = RegisterSchema.safeParse({ ...validData, role: "HOST" });
    expect(result.success).toBe(true);
  });

  // ── phone field (added in this session) ──────────────────────────────────
  it("accepts valid mobile number", () => {
    const result = RegisterSchema.safeParse({ ...validData, phone: "+94771234567" });
    expect(result.success).toBe(true);
  });

  it("accepts mobile number with spaces and dashes", () => {
    const result = RegisterSchema.safeParse({ ...validData, phone: "+94 77 123-4567" });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for phone (optional)", () => {
    const result = RegisterSchema.safeParse({ ...validData, phone: "" });
    expect(result.success).toBe(true);
  });

  it("accepts missing phone (optional)", () => {
    const result = RegisterSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects phone that is too short", () => {
    const result = RegisterSchema.safeParse({ ...validData, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects phone with letters", () => {
    const result = RegisterSchema.safeParse({ ...validData, phone: "ABCDEFGHIJ" });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts valid login data", () => {
    const result = LoginSchema.safeParse({
      email: "john@example.com",
      password: "mypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = LoginSchema.safeParse({
      email: "invalid",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = LoginSchema.safeParse({
      email: "john@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("PropertySchema", () => {
  const validProperty = {
    title: "Beautiful Beach Villa",
    description: "A stunning villa right on the beach with amazing ocean views and modern amenities",
    propertyType: "VILLA" as const,
    category: "STAY" as const,
    address: "123 Beach Road, Galle",
    district: "Galle",
    latitude: 6.0535,
    longitude: 80.2210,
    pricePerNight: 150,
    minPrice: 100,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    beds: 4,
  };

  it("accepts valid property data", () => {
    const result = PropertySchema.safeParse(validProperty);
    expect(result.success).toBe(true);
  });

  it("rejects short title", () => {
    const result = PropertySchema.safeParse({ ...validProperty, title: "Hi" });
    expect(result.success).toBe(false);
  });

  it("rejects short description", () => {
    const result = PropertySchema.safeParse({ ...validProperty, description: "Too short" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid property type", () => {
    const result = PropertySchema.safeParse({ ...validProperty, propertyType: "CASTLE" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid latitude", () => {
    const result = PropertySchema.safeParse({ ...validProperty, latitude: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid longitude", () => {
    const result = PropertySchema.safeParse({ ...validProperty, longitude: 200 });
    expect(result.success).toBe(false);
  });

  it("rejects zero price", () => {
    const result = PropertySchema.safeParse({ ...validProperty, pricePerNight: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts optional amenities", () => {
    const result = PropertySchema.safeParse({
      ...validProperty,
      amenities: ["WiFi", "Pool"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative bedrooms", () => {
    const result = PropertySchema.safeParse({ ...validProperty, bedrooms: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects guests exceeding 50", () => {
    const result = PropertySchema.safeParse({ ...validProperty, maxGuests: 51 });
    expect(result.success).toBe(false);
  });
});

describe("TransportSchema", () => {
  const validTransport = {
    title: "Comfortable Toyota Van",
    description: "Well-maintained van for island tours",
    propertyType: "VAN" as const,
    category: "TRANSPORT" as const,
    address: "45 Main St, Colombo",
    district: "Colombo",
    latitude: 6.9271,
    longitude: 79.8612,
    pricePerNight: 10,
    pricePerKm: 0.5,
    minPrice: 5,
    maxGuests: 8,
    bedrooms: 0,
    bathrooms: 0,
    beds: 0,
  };

  it("accepts valid transport data", () => {
    const result = TransportSchema.safeParse(validTransport);
    expect(result.success).toBe(true);
  });

  it("requires category to be TRANSPORT", () => {
    const result = TransportSchema.safeParse({ ...validTransport, category: "STAY" });
    expect(result.success).toBe(false);
  });

  it("accepts all transport vehicle types", () => {
    const types = ["CAR", "VAN", "TUK_TUK", "BUS", "BOAT", "MOTORBIKE", "JEEP", "BICYCLE"] as const;
    for (const t of types) {
      const result = TransportSchema.safeParse({ ...validTransport, propertyType: t });
      expect(result.success).toBe(true);
    }
  });

  it("rejects non-zero bedrooms", () => {
    const result = TransportSchema.safeParse({ ...validTransport, bedrooms: 1 });
    expect(result.success).toBe(false);
  });

  it("accepts zero pricePerKm", () => {
    const result = TransportSchema.safeParse({ ...validTransport, pricePerKm: 0 });
    expect(result.success).toBe(true);
  });
});

describe("SearchSchema", () => {
  it("accepts empty search (all optional)", () => {
    const result = SearchSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("defaults page to 1", () => {
    const result = SearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(1);
  });

  it("defaults limit to 12", () => {
    const result = SearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(12);
  });

  it("accepts full search params", () => {
    const result = SearchSchema.safeParse({
      district: "Galle",
      minPrice: 50,
      maxPrice: 200,
      guests: 4,
      checkIn: "2026-01-01",
      checkOut: "2026-01-05",
      propertyType: "VILLA",
      page: 2,
      limit: 20,
    });
    expect(result.success).toBe(true);
  });
});

describe("BookingRequestSchema", () => {
  const validBooking = {
    propertyId: "clx1234567890",
    checkIn: "2026-06-01T00:00:00.000Z",
    checkOut: "2026-06-05T00:00:00.000Z",
    guests: 2,
    offerAmount: 100,
  };

  it("accepts valid booking data", () => {
    const result = BookingRequestSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it("rejects zero guests", () => {
    const result = BookingRequestSchema.safeParse({ ...validBooking, guests: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects zero offer amount", () => {
    const result = BookingRequestSchema.safeParse({ ...validBooking, offerAmount: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts optional message", () => {
    const result = BookingRequestSchema.safeParse({
      ...validBooking,
      message: "Looking forward to staying!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects message over 500 chars", () => {
    const result = BookingRequestSchema.safeParse({
      ...validBooking,
      message: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts transport-specific fields", () => {
    const result = BookingRequestSchema.safeParse({
      ...validBooking,
      pickupPoint: "Colombo Fort",
      dropPoint: "Galle Fort",
      distanceKm: 120,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-datetime checkIn", () => {
    const result = BookingRequestSchema.safeParse({
      ...validBooking,
      checkIn: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  // ── roomsRequested field (added in this session) ─────────────────────────
  it("defaults roomsRequested to 1 when omitted", () => {
    const result = BookingRequestSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.roomsRequested).toBe(1);
  });

  it("accepts roomsRequested of 2", () => {
    const result = BookingRequestSchema.safeParse({ ...validBooking, roomsRequested: 2 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.roomsRequested).toBe(2);
  });

  it("rejects roomsRequested of 0", () => {
    const result = BookingRequestSchema.safeParse({ ...validBooking, roomsRequested: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects fractional roomsRequested", () => {
    const result = BookingRequestSchema.safeParse({ ...validBooking, roomsRequested: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe("OfferSchema", () => {
  it("accepts valid counter offer", () => {
    const result = OfferSchema.safeParse({
      amount: 80,
      type: "COUNTER_OFFER",
      message: "How about this price?",
    });
    expect(result.success).toBe(true);
  });

  it("accepts acceptance", () => {
    const result = OfferSchema.safeParse({
      amount: 100,
      type: "ACCEPTANCE",
    });
    expect(result.success).toBe(true);
  });

  it("accepts rejection", () => {
    const result = OfferSchema.safeParse({
      amount: 100,
      type: "REJECTION",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid offer type", () => {
    const result = OfferSchema.safeParse({
      amount: 100,
      type: "HAGGLE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = OfferSchema.safeParse({
      amount: 0,
      type: "COUNTER_OFFER",
    });
    expect(result.success).toBe(false);
  });
});

describe("ReviewSchema", () => {
  const validReview = {
    rating: 4,
    cleanliness: 5,
    accuracy: 4,
    location: 5,
    value: 3,
    comment: "Great stay, wonderful host and beautiful location!",
  };

  it("accepts valid review", () => {
    const result = ReviewSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it("rejects rating below 1", () => {
    const result = ReviewSchema.safeParse({ ...validReview, rating: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects rating above 5", () => {
    const result = ReviewSchema.safeParse({ ...validReview, rating: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects short comment", () => {
    const result = ReviewSchema.safeParse({ ...validReview, comment: "Good" });
    expect(result.success).toBe(false);
  });

  it("rejects comment over 1000 chars", () => {
    const result = ReviewSchema.safeParse({ ...validReview, comment: "x".repeat(1001) });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer ratings", () => {
    const result = ReviewSchema.safeParse({ ...validReview, rating: 3.5 });
    expect(result.success).toBe(false);
  });
});

describe("ProfileUpdateSchema", () => {
  it("accepts all optional fields", () => {
    const result = ProfileUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts name update", () => {
    const result = ProfileUpdateSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts role change", () => {
    const result = ProfileUpdateSchema.safeParse({ role: "HOST" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const result = ProfileUpdateSchema.safeParse({ role: "ADMIN" });
    expect(result.success).toBe(false);
  });

  it("rejects bio over 500 chars", () => {
    const result = ProfileUpdateSchema.safeParse({ bio: "x".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("accepts short name minimum of 2 chars", () => {
    const result = ProfileUpdateSchema.safeParse({ name: "Jo" });
    expect(result.success).toBe(true);
  });

  it("rejects name with 1 char", () => {
    const result = ProfileUpdateSchema.safeParse({ name: "J" });
    expect(result.success).toBe(false);
  });
});
