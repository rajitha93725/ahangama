-- Guest selects meal plan at booking time (not property level)
ALTER TABLE "Booking" ADD COLUMN "mealPlan" TEXT NOT NULL DEFAULT 'ROOM_ONLY';
