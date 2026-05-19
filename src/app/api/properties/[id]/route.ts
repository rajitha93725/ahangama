import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { PropertySchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: property } = await supabaseAdmin.from("Property").select("*").eq("id", id).maybeSingle();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [
    { data: images },
    { data: amenities },
    { data: host },
    { data: reviews },
    { data: propertyRatings },
    { data: roomTypes },
  ] = await Promise.all([
    supabaseAdmin.from("PropertyImage").select("*").eq("propertyId", id).order("order"),
    supabaseAdmin.from("PropertyAmenity").select("*").eq("propertyId", id),
    supabaseAdmin.from("User").select("id, name, image, bio, createdAt").eq("id", property.hostId).single(),
    supabaseAdmin.from("Review").select("*").eq("propertyId", id).order("createdAt", { ascending: false }).limit(10),
    supabaseAdmin.from("PropertyRating").select("avgScore, isSeeded, createdAt, comment, guestId").eq("propertyId", id).order("createdAt", { ascending: false }),
    supabaseAdmin.from("RoomType").select("id, typeName, displayLabel, roomCount, beds, maxGuests, bathrooms, amenities, pricePerNight, priceBnB, priceHalfBoard, priceFullBoard").eq("propertyId", id).order("createdAt"),
  ]);

  // Fetch review authors
  const authorIds = [...new Set((reviews || []).map((r: { authorId: string }) => r.authorId))];
  const { data: authors } = authorIds.length
    ? await supabaseAdmin.from("User").select("id, name, image").in("id", authorIds)
    : { data: [] };
  const authorMap = Object.fromEntries((authors || []).map((a: { id: string; [key: string]: unknown }) => [a.id, a]));

  const enrichedReviews = (reviews || []).map((r: { authorId: string; [key: string]: unknown }) => ({
    ...r,
    author: authorMap[r.authorId] ?? { id: r.authorId, name: null, image: null },
  }));

  const vehicleGroups = property.vehicleGroups
    ? (() => { try { return JSON.parse(property.vehicleGroups as string); } catch { return null; } })()
    : null;

  const avgRating = (reviews || []).length > 0
    ? (reviews as { rating: number }[]).reduce((sum, r) => sum + r.rating, 0) / (reviews || []).length
    : null;

  const allRatings = propertyRatings || [];
  const propertyRating = allRatings.length > 0
    ? parseFloat((allRatings.reduce((s: number, r: { avgScore: number }) => s + Number(r.avgScore), 0) / allRatings.length).toFixed(1))
    : null;

  const seededFeedback = (allRatings as { isSeeded: boolean; avgScore: number; createdAt: string; comment: string | null }[])
    .filter((r) => r.isSeeded)
    .map((r) => ({ avgScore: Number(r.avgScore), createdAt: r.createdAt, comment: r.comment }));

  const nonSeeded = (allRatings as { isSeeded: boolean; guestId: string | null; avgScore: number; createdAt: string; comment: string | null }[]).filter((r) => !r.isSeeded);
  const guestIds = [...new Set(nonSeeded.map((r) => r.guestId).filter(Boolean))] as string[];
  const { data: guestUsers } = guestIds.length
    ? await supabaseAdmin.from("User").select("id, name, image").in("id", guestIds)
    : { data: [] };
  const guestMap = Object.fromEntries((guestUsers || []).map((g: { id: string; [key: string]: unknown }) => [g.id, g]));

  const guestFeedback = nonSeeded.map((r) => ({
    avgScore: Number(r.avgScore),
    createdAt: r.createdAt,
    comment: r.comment,
    guestName: r.guestId ? ((guestMap[r.guestId] as { name?: string | null })?.name ?? null) : null,
    guestImage: r.guestId ? ((guestMap[r.guestId] as { image?: string | null })?.image ?? null) : null,
  }));

  const enrichedRoomTypes = (roomTypes || []).map((rt: { amenities: string; [key: string]: unknown }) => ({
    ...rt,
    amenities: (() => { try { return JSON.parse(rt.amenities as string); } catch { return []; } })(),
  }));

  return NextResponse.json({
    ...property,
    vehicleGroups,
    images: images || [],
    amenities: amenities || [],
    host,
    reviews: enrichedReviews,
    propertyRatings: undefined,
    avgRating,
    reviewCount: (reviews || []).length,
    propertyRating,
    propertyRatingCount: allRatings.length,
    roomTypes: enrichedRoomTypes.length > 0 ? enrichedRoomTypes : null,
    seededFeedback,
    guestFeedback,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: property } = await supabaseAdmin.from("Property").select("hostId").eq("id", id).maybeSingle();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = PropertySchema.partial().safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { amenities, ...data } = result.data;

  const rawPricePerKm = typeof body.pricePerKm === "number" ? body.pricePerKm : undefined;
  const rawMealPlan = typeof body.mealPlan === "string" ? body.mealPlan : undefined;
  const rawPriceBnB = body.priceBnB !== undefined ? (body.priceBnB === null ? null : Number(body.priceBnB)) : undefined;
  const rawPriceHalf = body.priceHalfBoard !== undefined ? (body.priceHalfBoard === null ? null : Number(body.priceHalfBoard)) : undefined;
  const rawPriceFull = body.priceFullBoard !== undefined ? (body.priceFullBoard === null ? null : Number(body.priceFullBoard)) : undefined;

  const updatePayload: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
    ...(rawPricePerKm !== undefined ? { pricePerKm: rawPricePerKm } : {}),
    ...(rawMealPlan !== undefined ? { mealPlan: rawMealPlan } : {}),
    ...(rawPriceBnB !== undefined ? { priceBnB: rawPriceBnB } : {}),
    ...(rawPriceHalf !== undefined ? { priceHalfBoard: rawPriceHalf } : {}),
    ...(rawPriceFull !== undefined ? { priceFullBoard: rawPriceFull } : {}),
  };

  const { data: updated } = await supabaseAdmin.from("Property").update(updatePayload).eq("id", id).select().single();

  if (amenities) {
    await supabaseAdmin.from("PropertyAmenity").delete().eq("propertyId", id);
    if (amenities.length) {
      await supabaseAdmin.from("PropertyAmenity").insert(amenities.map((name) => ({ propertyId: id, name })));
    }
  }

  const { data: amenityRows } = await supabaseAdmin.from("PropertyAmenity").select("*").eq("propertyId", id);
  const { data: imageRows } = await supabaseAdmin.from("PropertyImage").select("*").eq("propertyId", id);

  return NextResponse.json({ ...updated, amenities: amenityRows || [], images: imageRows || [] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: property } = await supabaseAdmin.from("Property").select("hostId").eq("id", id).maybeSingle();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabaseAdmin.from("Property").update({ status: "INACTIVE", updatedAt: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ success: true });
}
