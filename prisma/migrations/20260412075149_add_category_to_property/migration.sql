-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "pricePerNight" REAL NOT NULL,
    "minPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "maxGuests" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "beds" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'STAY',
    "hostId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Property" ("address", "bathrooms", "bedrooms", "beds", "createdAt", "currency", "description", "district", "hostId", "id", "latitude", "longitude", "maxGuests", "minPrice", "pricePerNight", "propertyType", "status", "title", "updatedAt") SELECT "address", "bathrooms", "bedrooms", "beds", "createdAt", "currency", "description", "district", "hostId", "id", "latitude", "longitude", "maxGuests", "minPrice", "pricePerNight", "propertyType", "status", "title", "updatedAt" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
