-- Enforce unique phone numbers (NULL values are still allowed for existing rows without phones)
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key"
  ON "User"("phone")
  WHERE "phone" IS NOT NULL;
