import {
  SRI_LANKA_DISTRICTS,
  AMENITIES,
  PROPERTY_TYPES,
  TRANSPORT_TYPES,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
} from "@/lib/constants";

describe("SRI_LANKA_DISTRICTS", () => {
  it("is a non-empty array", () => {
    expect(SRI_LANKA_DISTRICTS.length).toBeGreaterThan(0);
  });

  it("contains key tourist destinations", () => {
    expect(SRI_LANKA_DISTRICTS).toContain("Colombo");
    expect(SRI_LANKA_DISTRICTS).toContain("Galle");
    expect(SRI_LANKA_DISTRICTS).toContain("Kandy");
    expect(SRI_LANKA_DISTRICTS).toContain("Ella");
  });

  it("contains 20 districts", () => {
    expect(SRI_LANKA_DISTRICTS).toHaveLength(20);
  });

  it("has no duplicates", () => {
    const unique = new Set(SRI_LANKA_DISTRICTS);
    expect(unique.size).toBe(SRI_LANKA_DISTRICTS.length);
  });
});

describe("AMENITIES", () => {
  it("is a non-empty array", () => {
    expect(AMENITIES.length).toBeGreaterThan(0);
  });

  it("each amenity has name and icon", () => {
    for (const amenity of AMENITIES) {
      expect(amenity).toHaveProperty("name");
      expect(amenity).toHaveProperty("icon");
      expect(amenity.name.length).toBeGreaterThan(0);
      expect(amenity.icon.length).toBeGreaterThan(0);
    }
  });

  it("includes common amenities", () => {
    const names = AMENITIES.map((a) => a.name);
    expect(names).toContain("WiFi");
    expect(names).toContain("Pool");
    expect(names).toContain("Kitchen");
  });
});

describe("PROPERTY_TYPES", () => {
  it("has 8 property types", () => {
    expect(PROPERTY_TYPES).toHaveLength(8);
  });

  it("each type has value and label", () => {
    for (const type of PROPERTY_TYPES) {
      expect(type).toHaveProperty("value");
      expect(type).toHaveProperty("label");
    }
  });

  it("contains VILLA", () => {
    expect(PROPERTY_TYPES.find((t) => t.value === "VILLA")).toBeDefined();
  });
});

describe("TRANSPORT_TYPES", () => {
  it("has 8 transport types", () => {
    expect(TRANSPORT_TYPES).toHaveLength(8);
  });

  it("includes TUK_TUK", () => {
    expect(TRANSPORT_TYPES.find((t) => t.value === "TUK_TUK")).toBeDefined();
  });

  it("each type has value and label", () => {
    for (const type of TRANSPORT_TYPES) {
      expect(type).toHaveProperty("value");
      expect(type).toHaveProperty("label");
    }
  });
});

describe("BOOKING_STATUS_LABELS", () => {
  it("maps all statuses to labels", () => {
    const statuses = ["PENDING_OFFER", "COUNTERED", "ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"];
    for (const s of statuses) {
      expect(BOOKING_STATUS_LABELS[s]).toBeDefined();
      expect(typeof BOOKING_STATUS_LABELS[s]).toBe("string");
    }
  });

  it("ACCEPTED maps to Confirmed", () => {
    expect(BOOKING_STATUS_LABELS["ACCEPTED"]).toBe("Confirmed");
  });

  it("CANCELLED maps to Cancelled", () => {
    expect(BOOKING_STATUS_LABELS["CANCELLED"]).toBe("Cancelled");
  });
});

describe("BOOKING_STATUS_COLORS", () => {
  it("maps all statuses to Tailwind classes", () => {
    const statuses = ["PENDING_OFFER", "COUNTERED", "ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"];
    for (const s of statuses) {
      expect(BOOKING_STATUS_COLORS[s]).toBeDefined();
      expect(BOOKING_STATUS_COLORS[s]).toContain("bg-");
      expect(BOOKING_STATUS_COLORS[s]).toContain("text-");
    }
  });

  it("ACCEPTED uses green", () => {
    expect(BOOKING_STATUS_COLORS["ACCEPTED"]).toContain("green");
  });

  it("REJECTED uses red", () => {
    expect(BOOKING_STATUS_COLORS["REJECTED"]).toContain("red");
  });
});
