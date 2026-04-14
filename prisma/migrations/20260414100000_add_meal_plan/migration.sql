-- Add mealPlan to Property: Room Only | Bed & Breakfast | Half Board | Full Board
ALTER TABLE "Property" ADD COLUMN "mealPlan" TEXT NOT NULL DEFAULT 'ROOM_ONLY';
