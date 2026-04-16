-- Room type definitions per property
CREATE TABLE "RoomType" (
  id            TEXT NOT NULL PRIMARY KEY,
  propertyId    TEXT NOT NULL,
  typeName      TEXT NOT NULL,
  displayLabel  TEXT NOT NULL,
  roomCount     INTEGER NOT NULL DEFAULT 1,
  beds          INTEGER NOT NULL DEFAULT 1,
  maxGuests     INTEGER NOT NULL DEFAULT 2,
  bathrooms     INTEGER NOT NULL DEFAULT 1,
  amenities     TEXT NOT NULL DEFAULT '[]',
  pricePerNight REAL NOT NULL,
  priceBnB      REAL,
  priceHalfBoard REAL,
  priceFullBoard REAL,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL,
  FOREIGN KEY (propertyId) REFERENCES "Property"(id) ON DELETE CASCADE
);

-- Link individual room instances to their type
ALTER TABLE "Room" ADD COLUMN roomTypeId TEXT REFERENCES "RoomType"(id);

-- Store guest's room type selections as JSON on a booking
ALTER TABLE "Booking" ADD COLUMN roomSelections TEXT;
