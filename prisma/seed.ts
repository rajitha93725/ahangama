import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// ─── Stay Properties (Priya Fernando × 5) ────────────────────────────────────

const PRIYA_PROPERTIES = [
  {
    title: "Ahangama Beachfront Villa",
    description:
      "A stunning beachfront villa nestled among swaying coconut palms just steps from the warm Indian Ocean at Ahangama. This handcrafted wooden villa features a wraparound veranda overlooking the sea, a private plunge pool, and three airy bedrooms with hand-loomed cotton linen. Surf breaks within walking distance, and fresh seafood restaurants are just down the lane.",
    propertyType: "VILLA" as const,
    district: "Ahangama",
    address: "72 Beach Road, Ahangama, Southern Province",
    latitude: 5.9726,
    longitude: 80.3572,
    pricePerNight: 120,
    minPrice: 80,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    beds: 4,
    amenities: ["WiFi", "Pool", "Air Conditioning", "Beach Access", "Hot Water", "Kitchen", "Free Parking"],
    images: [
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
    ],
  },
  {
    title: "Galle Fort Dutch Colonial House",
    description:
      "Stay inside the UNESCO World Heritage Galle Fort walls in this lovingly restored 18th-century Dutch colonial townhouse. Soaring ceilings, polished limestone floors, and original teak woodwork are paired with contemporary comforts. The rooftop terrace overlooks the ramparts and ocean beyond — perfect for sunset G&Ts. Boutique shops, galleries, and fine dining are on your doorstep.",
    propertyType: "GUESTHOUSE" as const,
    district: "Galle",
    address: "28 Church Street, Galle Fort, Southern Province",
    latitude: 6.0296,
    longitude: 80.2169,
    pricePerNight: 95,
    minPrice: 65,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    beds: 2,
    amenities: ["WiFi", "Air Conditioning", "Hot Water", "Tour Assistance", "Breakfast Included"],
    images: [
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
    ],
  },
  {
    title: "Ella Mist Mountain Bungalow",
    description:
      "Perched on a misty hillside with sweeping views of Ella Gap and jade-green tea plantations, this colonial-era bungalow is a mountain lover's dream. Sip freshly picked Ceylon tea on the timber verandah as clouds roll through the valley. Walk to the Nine Arch Bridge in 20 minutes, or hike Ella Rock for panoramic island views. Homemade Sri Lankan breakfasts included.",
    propertyType: "BUNGALOW" as const,
    district: "Ella",
    address: "Passara Road, Ella, Uva Province",
    latitude: 6.8667,
    longitude: 81.0466,
    pricePerNight: 75,
    minPrice: 50,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    beds: 3,
    amenities: ["WiFi", "Hot Water", "Breakfast Included", "Mountain View", "Tour Assistance", "Garden"],
    images: [
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    ],
  },
  {
    title: "Mirissa Whale Song Cabana",
    description:
      "A magical eco-cabana perched above Mirissa Beach — one of the world's best spots for blue whale watching. The deck hangs over the cliffs and opens directly onto a private stretch of powder-white sand. Solar-powered, rainwater harvested, and completely surrounded by fragrant frangipani trees. Snorkelling gear and surfboards are available for guests.",
    propertyType: "BEACH_HUT" as const,
    district: "Mirissa",
    address: "Mirissa Beach Road, Mirissa, Southern Province",
    latitude: 5.9483,
    longitude: 80.4591,
    pricePerNight: 65,
    minPrice: 40,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    amenities: ["WiFi", "Beach Access", "Hot Water", "Ocean View", "Snorkelling Gear"],
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
      "https://images.unsplash.com/photo-1615880484746-a134be9a6ecf?w=800",
    ],
  },
  {
    title: "Unawatuna Coral Bay Villa",
    description:
      "A grand four-bedroom villa set in lush tropical gardens just 100 metres from the famous crescent of Unawatuna Bay. The property features an infinity pool shaded by century-old mango trees, a rooftop sundeck, a full-size kitchen, and a dedicated housekeeper. Ideal for families or groups wanting privacy without sacrificing proximity to restaurants and the reef.",
    propertyType: "VILLA" as const,
    district: "Unawatuna",
    address: "Yaddehimulla Road, Unawatuna, Southern Province",
    latitude: 6.0089,
    longitude: 80.2503,
    pricePerNight: 145,
    minPrice: 100,
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    beds: 5,
    amenities: ["WiFi", "Pool", "Air Conditioning", "Beach Access", "Hot Water", "Kitchen", "Free Parking", "Garden"],
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800",
    ],
  },
];

// ─── Transport Listings (Sampath Perera × 3) ──────────────────────────────────

const SAMPATH_TRANSPORTS = [
  {
    title: "Toyota HiAce — Airport & South Coast Transfers",
    description:
      "Comfortable 8-seater Toyota HiAce with AC, USB charging, and ample luggage space. Ideal for Colombo Bandaranaike Airport pickups/drop-offs and transfers along the South Coast (Galle, Unawatuna, Ahangama, Mirissa, Tangalle). Available 24/7. Bottled water provided. Driver speaks English and German.",
    propertyType: "VAN" as const,
    district: "Colombo",
    address: "Colombo 03, Western Province",
    latitude: 6.9271,
    longitude: 79.8612,
    pricePerNight: 0,
    pricePerKm: 2.5,
    minPrice: 40,
    maxGuests: 8,
    bedrooms: 0,
    bathrooms: 0,
    beds: 0,
    amenities: ["Air Conditioning", "USB Charging", "Luggage Space", "English Speaking Driver", "24/7 Available", "Bottled Water"],
    images: [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800",
    ],
  },
  {
    title: "Private Car — South Coast Scenic Rides",
    description:
      "A well-maintained Toyota Prius for comfortable private transfers between Galle, Mirissa, Tangalle, and the surrounding coast. Perfect for couples or small families. Sampath knows all the hidden beaches, local fish markets, and roadside gem stalls along the Southern Expressway and coastal road. Flexible pick-up and drop-off anywhere on the south coast.",
    propertyType: "CAR" as const,
    district: "Galle",
    address: "Galle City, Southern Province",
    latitude: 6.0535,
    longitude: 80.2210,
    pricePerNight: 0,
    pricePerKm: 1.5,
    minPrice: 25,
    maxGuests: 4,
    bedrooms: 0,
    bathrooms: 0,
    beds: 0,
    amenities: ["Air Conditioning", "USB Charging", "English Speaking Driver", "Music System", "Child Seat Available"],
    images: [
      "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=800",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
    ],
  },
  {
    title: "4WD Jeep — Cultural Triangle & Hill Country Tours",
    description:
      "An adventure-ready Land Rover Defender for full-day or multi-day tours through Sri Lanka's Cultural Triangle and Hill Country. Conquer the mountain passes to Nuwara Eliya, explore the ancient cities of Sigiriya and Polonnaruwa, or push off-road through Minneriya National Park for the famous elephant gathering. Sampath is a licensed wildlife guide with 12 years of experience.",
    propertyType: "JEEP" as const,
    district: "Kandy",
    address: "Kandy City, Central Province",
    latitude: 7.2906,
    longitude: 80.6337,
    pricePerNight: 0,
    pricePerKm: 3.0,
    minPrice: 80,
    maxGuests: 6,
    bedrooms: 0,
    bathrooms: 0,
    beds: 0,
    amenities: ["4WD", "Air Conditioning", "USB Charging", "Licensed Guide", "Cooler Box", "First Aid Kit", "Safari Roof Hatch"],
    images: [
      "https://images.unsplash.com/photo-1519638831568-d9897f54ed69?w=800",
      "https://images.unsplash.com/photo-1533591380348-14193f1de18f?w=800",
    ],
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding database — clean slate…");

  // ── Wipe all data in dependency order ────────────────────────────────────────
  // Room and ExternalBooking are unknown to the stale Prisma client → raw SQL
  await prisma.$executeRaw`DELETE FROM "ExternalBooking"`;
  await prisma.$executeRaw`DELETE FROM "Room"`;
  await prisma.notification.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.review.deleteMany();
  await prisma.savedProperty.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log("✓  All tables cleared");

  const adminHash  = await bcrypt.hash("admin123",    12);
  const userHash   = await bcrypt.hash("password123", 12);

  // ── Users ─────────────────────────────────────────────────────────────────────

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@ahangama.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: "Priya Fernando",
      email: "priya@example.com",
      passwordHash: userHash,
      role: "HOST",
      bio: "Born and raised in Galle, I love sharing the beauty of southern Sri Lanka with visitors from around the world. My five properties span the best of the coast and hill country.",
    },
  });

  const sampath = await prisma.user.create({
    data: {
      name: "Sampath Perera",
      email: "sampath@example.com",
      passwordHash: userHash,
      role: "HOST",
      bio: "Experienced driver and licensed wildlife guide with 12 years on Sri Lanka's roads. I know every shortcut, hidden beach, and local gem on the island — from Colombo to the Cultural Triangle.",
    },
  });

  const james = await prisma.user.create({
    data: {
      name: "James Wilson",
      email: "james@example.com",
      passwordHash: userHash,
      role: "HOST",
      bio: "New to hosting on Ahangama. Excited to welcome guests and explore what this beautiful island has to offer.",
    },
  });

  console.log(`✓  Users: admin, Priya Fernando, Sampath Perera, James Wilson`);

  // ── Priya's 5 STAY Properties ─────────────────────────────────────────────────

  let priyaPropertyCount = 0;
  for (const p of PRIYA_PROPERTIES) {
    const property = await prisma.property.create({
      data: {
        title: p.title,
        description: p.description,
        propertyType: p.propertyType,
        address: p.address,
        district: p.district,
        latitude: p.latitude,
        longitude: p.longitude,
        pricePerNight: p.pricePerNight,
        minPrice: p.minPrice,
        maxGuests: p.maxGuests,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        beds: p.beds,
        hostId: priya.id,
        status: "ACTIVE",
        amenities: { create: p.amenities.map((name) => ({ name })) },
        images: {
          create: p.images.map((url, idx) => ({
            url,
            alt: `${p.title} — photo ${idx + 1}`,
            isPrimary: idx === 0,
            order: idx,
          })),
        },
      },
    });

    // category column unknown to stale Prisma client — write via raw SQL
    await prisma.$executeRaw`UPDATE "Property" SET category = 'STAY' WHERE id = ${property.id}`;

    // Auto-create rooms from bedroom count (Room 1, Room 2, …)
    const now = new Date().toISOString();
    for (let i = 1; i <= p.bedrooms; i++) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "Room" (id, propertyId, name, maxGuests, isActive, createdAt) VALUES (?, ?, ?, 2, 1, ?)`,
        randomUUID(), property.id, `Room ${i}`, now
      );
    }

    priyaPropertyCount++;
  }

  console.log(`✓  Priya Fernando: ${priyaPropertyCount} stay properties + rooms provisioned`);

  // ── Sampath's 3 TRANSPORT Listings ───────────────────────────────────────────

  let sampathCount = 0;
  for (const t of SAMPATH_TRANSPORTS) {
    const property = await prisma.property.create({
      data: {
        title: t.title,
        description: t.description,
        propertyType: t.propertyType,
        address: t.address,
        district: t.district,
        latitude: t.latitude,
        longitude: t.longitude,
        pricePerNight: t.pricePerNight,
        minPrice: t.minPrice,
        maxGuests: t.maxGuests,
        bedrooms: t.bedrooms,
        bathrooms: t.bathrooms,
        beds: t.beds,
        hostId: sampath.id,
        status: "ACTIVE",
        amenities: { create: t.amenities.map((name) => ({ name })) },
        images: {
          create: t.images.map((url, idx) => ({
            url,
            alt: `${t.title} — photo ${idx + 1}`,
            isPrimary: idx === 0,
            order: idx,
          })),
        },
      },
    });

    // category and pricePerKm are unknown to stale Prisma client
    await prisma.$executeRaw`UPDATE "Property" SET category = 'TRANSPORT' WHERE id = ${property.id}`;
    await prisma.$executeRaw`UPDATE "Property" SET pricePerKm = ${t.pricePerKm} WHERE id = ${property.id}`;

    sampathCount++;
  }

  console.log(`✓  Sampath Perera: ${sampathCount} transport listings`);
  console.log(`✓  James Wilson: host account (no properties yet)`);

  console.log("");
  console.log("──────────────────────────────────────────────");
  console.log("  SEED COMPLETE");
  console.log("──────────────────────────────────────────────");
  console.log("  Admin    →  admin@ahangama.com   / admin123");
  console.log("  Host 1   →  priya@example.com    / password123  (5 properties)");
  console.log("  Host 2   →  sampath@example.com  / password123  (3 transports)");
  console.log("  Host 3   →  james@example.com    / password123  (no properties)");
  console.log("──────────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
