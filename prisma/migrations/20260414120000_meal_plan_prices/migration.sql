-- Optional per-night prices for meal plan upgrades (NULL = not offered)
ALTER TABLE "Property" ADD COLUMN "priceBnB"       REAL;
ALTER TABLE "Property" ADD COLUMN "priceHalfBoard"  REAL;
ALTER TABLE "Property" ADD COLUMN "priceFullBoard"  REAL;
