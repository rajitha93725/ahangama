-- CreateTable: PropertyRating
-- 10-question rating form (1-10 scale each), averaged to avgScore (0-10)
-- bookingId is nullable so a seeded default can be inserted on property approval

CREATE TABLE IF NOT EXISTS "PropertyRating" (
  "id"         TEXT    NOT NULL PRIMARY KEY,
  "propertyId" TEXT    NOT NULL,
  "bookingId"  TEXT,
  "guestId"    TEXT,
  "q1"         REAL    NOT NULL DEFAULT 10,
  "q2"         REAL    NOT NULL DEFAULT 10,
  "q3"         REAL    NOT NULL DEFAULT 10,
  "q4"         REAL    NOT NULL DEFAULT 10,
  "q5"         REAL    NOT NULL DEFAULT 10,
  "q6"         REAL    NOT NULL DEFAULT 10,
  "q7"         REAL    NOT NULL DEFAULT 10,
  "q8"         REAL    NOT NULL DEFAULT 10,
  "q9"         REAL    NOT NULL DEFAULT 10,
  "q10"        REAL    NOT NULL DEFAULT 10,
  "avgScore"   REAL    NOT NULL DEFAULT 10,
  "isSeeded"   INTEGER NOT NULL DEFAULT 0,
  "comment"    TEXT,
  "createdAt"  TEXT    NOT NULL,

  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE,
  FOREIGN KEY ("bookingId")  REFERENCES "Booking"("id")  ON DELETE SET NULL,
  FOREIGN KEY ("guestId")    REFERENCES "User"("id")     ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "PropertyRating_bookingId_key"
  ON "PropertyRating"("bookingId") WHERE "bookingId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "PropertyRating_propertyId_idx"
  ON "PropertyRating"("propertyId");
