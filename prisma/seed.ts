import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const PROPERTIES = [
  {
    title: "Sunset Villa Unawatuna",
    description: "A stunning beachfront villa nestled among coconut palms just steps from the turquoise waters of Unawatuna Bay. Wake up to the sound of waves, enjoy breakfast on your private terrace, and spend your days snorkeling the coral reef. The villa features handcrafted wooden furniture, a plunge pool, and all modern comforts while maintaining authentic Sri Lankan character.",
    propertyType: "VILLA" as const,
    district: "Unawatuna",
    address: "47 Matara Road, Unawatuna",
    latitude: 6.0089,
    longitude: 80.2503,
    pricePerNight: 120,
    minPrice: 80,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    beds: 4,
    amenities: ["WiFi", "Pool", "Air Conditioning", "Beach Access", "Hot Water", "Kitchen"],
  },
  {
    title: "Ella Rock Bungalow",
    description: "Perched on a hillside with panoramic views of Ella Rock and the surrounding tea plantations, this charming bungalow offers an unforgettable mountain retreat. Sip fresh Ceylon tea on the wraparound porch as clouds drift through the valley below. The property is within walking distance of hiking trails, the famous Nine Arch Bridge, and local restaurants.",
    propertyType: "BUNGALOW" as const,
    district: "Ella",
    address: "Near Nine Arch Bridge, Ella",
    latitude: 6.8667,
    longitude: 81.0466,
    pricePerNight: 75,
    minPrice: 50,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    beds: 3,
    amenities: ["WiFi", "Hot Water", "Breakfast Included", "Mountain View", "Tour Assistance"],
  },
  {
    title: "Galle Fort Heritage Home",
    description: "Stay in a beautifully restored colonial townhouse within the UNESCO-listed Galle Fort walls. This 300-year-old Dutch-era building has been lovingly converted into a boutique guesthouse with high ceilings, antique furniture, and all modern amenities. Explore the fort's cobblestone streets, boutique shops, and fine dining restaurants directly from your doorstep.",
    propertyType: "GUESTHOUSE" as const,
    district: "Galle",
    address: "Church Street, Galle Fort",
    latitude: 6.0296,
    longitude: 80.2169,
    pricePerNight: 95,
    minPrice: 65,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    beds: 2,
    amenities: ["WiFi", "Air Conditioning", "Hot Water", "Tour Assistance"],
  },
  {
    title: "Mirissa Whale Song Cabana",
    description: "A magical beach cabana retreat set on the famous whale-watching coast of Mirissa. This eco-friendly property uses solar energy and recycled water while providing a luxurious stay. The highlight is the deck that juts over the beach, perfect for watching boats depart at dawn for whale-watching tours. Surf boards available for rent.",
    propertyType: "BEACH_HUT" as const,
    district: "Mirissa",
    address: "Mirissa Beach Road, Mirissa",
    latitude: 5.9483,
    longitude: 80.4591,
    pricePerNight: 60,
    minPrice: 40,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    amenities: ["WiFi", "Beach Access", "Hot Water", "Ocean View"],
  },
  {
    title: "Sigiriya Rock View Eco Lodge",
    description: "Wake up to the majestic sight of Sigiriya Rock Fortress from your private villa at this boutique eco-lodge. Surrounded by jungle gardens and rice paddies, the lodge offers a true cultural immersion experience with guided tours to Sigiriya, Dambulla Cave Temple, and authentic village life. Traditional Sri Lankan meals included.",
    propertyType: "ECO_LODGE" as const,
    district: "Sigiriya",
    address: "Sigiriya Village, Dambulla",
    latitude: 7.9570,
    longitude: 80.7603,
    pricePerNight: 110,
    minPrice: 75,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    beds: 2,
    amenities: ["WiFi", "Breakfast Included", "Tour Assistance", "Garden"],
  },
  {
    title: "Colombo City Center Apartment",
    description: "A sleek, modern apartment in the heart of Colombo's bustling city center. Located in a high-rise building with stunning city and sea views, this apartment is perfect for business travelers and urban explorers alike. Minutes from Galle Face Green, Pettah market, and the best restaurants and bars the capital has to offer.",
    propertyType: "APARTMENT" as const,
    district: "Colombo",
    address: "Union Place, Colombo 02",
    latitude: 6.9271,
    longitude: 79.8612,
    pricePerNight: 85,
    minPrice: 60,
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    amenities: ["WiFi", "Air Conditioning", "TV", "Kitchen", "Security", "Free Parking"],
  },
  {
    title: "Kandy Lake House",
    description: "Overlooking the serene Kandy Lake with the famous Temple of the Tooth Relic visible from the balcony, this heritage guesthouse offers an authentic upcountry experience. The property has been in the family for four generations and every room is decorated with traditional Kandyan craftsmanship. Homemade Sri Lankan breakfasts included.",
    propertyType: "GUESTHOUSE" as const,
    district: "Kandy",
    address: "Rajapihilla Mawatha, Kandy",
    latitude: 7.2906,
    longitude: 80.6337,
    pricePerNight: 70,
    minPrice: 45,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    beds: 4,
    amenities: ["WiFi", "Breakfast Included", "Hot Water", "Tour Assistance", "Garden"],
  },
  {
    title: "Trincomalee Bay Diving Villa",
    description: "A diver's paradise located on the shores of Trincomalee Bay, widely regarded as one of the world's top diving destinations. This villa offers direct access to the famous Swami Rock dive site and whale shark encounters. The property features an open-plan living area, a full equipment storage and rinse station, and experienced dive masters on site.",
    propertyType: "VILLA" as const,
    district: "Trincomalee",
    address: "Nilaveli Beach, Trincomalee",
    latitude: 8.5874,
    longitude: 81.2152,
    pricePerNight: 130,
    minPrice: 90,
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    beds: 5,
    amenities: ["WiFi", "Air Conditioning", "Beach Access", "Hot Water", "Free Parking", "Ocean View"],
  },
  {
    title: "Arugam Bay Surf Shack",
    description: "The ultimate surf retreat right at the point break of Arugam Bay, one of the world's top surfing destinations. This laid-back surf shack caters to wave riders of all levels with board rental, surf lessons, and a chilled beach bar on-site. The property has a social vibe with communal dining and regular bonfire nights.",
    propertyType: "BEACH_HUT" as const,
    district: "Arugam Bay",
    address: "Main Bay Road, Arugam Bay",
    latitude: 6.8408,
    longitude: 81.8335,
    pricePerNight: 45,
    minPrice: 30,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    amenities: ["WiFi", "Beach Access", "Hot Water", "Bar"],
  },
  {
    title: "Nuwara Eliya Tea Estate Retreat",
    description: "Experience life on a working tea estate high in the Sri Lankan hill country. This beautifully preserved planter's bungalow from the British colonial era sits amidst 50 acres of manicured tea bushes. Guests can join the tea plucking and processing experience, trek through fragrant tea fields, and enjoy afternoon tea as the original planters did.",
    propertyType: "BUNGALOW" as const,
    district: "Nuwara Eliya",
    address: "Lover's Leap Tea Estate, Nuwara Eliya",
    latitude: 6.9497,
    longitude: 80.7891,
    pricePerNight: 140,
    minPrice: 100,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    beds: 4,
    amenities: ["WiFi", "Breakfast Included", "Garden", "Mountain View", "Tour Assistance"],
  },
];

const UNSPLASH_IMAGES: Record<string, string[]> = {
  VILLA: [
    "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
  ],
  BUNGALOW: [
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
  ],
  GUESTHOUSE: [
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
  ],
  BEACH_HUT: [
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
    "https://images.unsplash.com/photo-1615880484746-a134be9a6ecf?w=800",
  ],
  ECO_LODGE: [
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800",
    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800",
  ],
  APARTMENT: [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  ],
};

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash("admin123", 12);
  const userHash = await bcrypt.hash("password123", 12);

  // Create admin
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@ahangama.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  // Create hosts
  const hosts = await Promise.all([
    prisma.user.create({ data: { name: "Priya Fernando", email: "priya@example.com", passwordHash: userHash, role: "HOST", bio: "Born and raised in Galle, I love sharing the beauty of southern Sri Lanka with visitors from around the world." } }),
    prisma.user.create({ data: { name: "Sampath Perera", email: "sampath@example.com", passwordHash: userHash, role: "HOST", bio: "Third-generation guesthouse owner from Ella. My family has been welcoming travelers since 1985." } }),
    prisma.user.create({ data: { name: "Niluka Jayawardena", email: "niluka@example.com", passwordHash: userHash, role: "HOST", bio: "Eco-tourism advocate and wildlife photographer based in Sigiriya." } }),
    prisma.user.create({ data: { name: "Dinesh Kumara", email: "dinesh@example.com", passwordHash: userHash, role: "HOST", bio: "Surf instructor and beach property owner in Mirissa and Arugam Bay." } }),
    prisma.user.create({ data: { name: "Chamari Silva", email: "chamari@example.com", passwordHash: userHash, role: "HOST", bio: "Heritage property restorer with four unique colonial properties across Sri Lanka." } }),
  ]);

  // Create guests
  const guests = await Promise.all([
    prisma.user.create({ data: { name: "James Wilson", email: "james@example.com", passwordHash: userHash, role: "GUEST" } }),
    prisma.user.create({ data: { name: "Emma Thompson", email: "emma@example.com", passwordHash: userHash, role: "GUEST" } }),
    prisma.user.create({ data: { name: "Liam Chen", email: "liam@example.com", passwordHash: userHash, role: "GUEST" } }),
    prisma.user.create({ data: { name: "Sofia Rodriguez", email: "sofia@example.com", passwordHash: userHash, role: "GUEST" } }),
    prisma.user.create({ data: { name: "Aiden Müller", email: "aiden@example.com", passwordHash: userHash, role: "GUEST" } }),
  ]);

  // Create properties
  const hostIds = hosts.map((h) => h.id);
  const createdProperties = [];

  for (let i = 0; i < PROPERTIES.length; i++) {
    const p = PROPERTIES[i];
    const hostId = hostIds[i % hostIds.length];
    const images = UNSPLASH_IMAGES[p.propertyType] || UNSPLASH_IMAGES.VILLA;

    const property = await prisma.property.create({
      data: {
        ...p,
        hostId,
        status: "ACTIVE",
        amenities: { create: p.amenities.map((name) => ({ name })) },
        images: {
          create: images.map((url, idx) => ({
            url,
            alt: `${p.title} photo ${idx + 1}`,
            isPrimary: idx === 0,
            order: idx,
          })),
        },
      },
    });
    createdProperties.push(property);
  }

  // Create some bookings with negotiations
  const booking1 = await prisma.booking.create({
    data: {
      propertyId: createdProperties[0].id,
      guestId: guests[0].id,
      checkIn: new Date("2026-05-15"),
      checkOut: new Date("2026-05-18"),
      guests: 2,
      nights: 3,
      status: "ACCEPTED",
      totalPrice: 270,
      offers: {
        create: [
          { senderId: guests[0].id, amount: 80, message: "We'd love to stay for our honeymoon!", type: "INITIAL_OFFER" },
          { senderId: hosts[0].id, amount: 100, message: "Thanks! I can do $100/night for such a special occasion.", type: "COUNTER_OFFER" },
          { senderId: guests[0].id, amount: 90, message: "How about $90/night? We'll write a great review!", type: "COUNTER_OFFER" },
          { senderId: hosts[0].id, amount: 90, message: "Deal! Looking forward to hosting you.", type: "ACCEPTANCE" },
        ],
      },
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      propertyId: createdProperties[1].id,
      guestId: guests[1].id,
      checkIn: new Date("2026-06-10"),
      checkOut: new Date("2026-06-14"),
      guests: 2,
      nights: 4,
      status: "PENDING_OFFER",
      offers: {
        create: [
          { senderId: guests[1].id, amount: 55, message: "Planning a hiking trip around Ella!", type: "INITIAL_OFFER" },
        ],
      },
    },
  });

  // Review for completed booking
  const completedBooking = await prisma.booking.create({
    data: {
      propertyId: createdProperties[2].id,
      guestId: guests[2].id,
      checkIn: new Date("2026-03-01"),
      checkOut: new Date("2026-03-05"),
      guests: 2,
      nights: 4,
      status: "COMPLETED",
      totalPrice: 340,
      offers: {
        create: [
          { senderId: guests[2].id, amount: 80, type: "INITIAL_OFFER" },
          { senderId: hosts[4 % hostIds.length].id, amount: 85, type: "COUNTER_OFFER" },
          { senderId: guests[2].id, amount: 85, type: "ACCEPTANCE" },
        ],
      },
    },
  });

  await prisma.review.create({
    data: {
      propertyId: createdProperties[2].id,
      bookingId: completedBooking.id,
      authorId: guests[2].id,
      hostId: hosts[2 % hostIds.length].id,
      rating: 5,
      cleanliness: 5,
      accuracy: 5,
      location: 5,
      value: 4,
      comment: "Absolutely stunning property inside the Galle Fort walls. The historical atmosphere, beautiful restoration, and the host's warm hospitality made this one of the best stays of our Sri Lanka trip. Will definitely return!",
    },
  });

  console.log(`Seeding complete!`);
  console.log(`Admin: admin@ahangama.com / admin123`);
  console.log(`Sample Host: priya@example.com / password123`);
  console.log(`Sample Guest: james@example.com / password123`);
  console.log(`Created ${createdProperties.length} properties, ${hosts.length} hosts, ${guests.length} guests`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
