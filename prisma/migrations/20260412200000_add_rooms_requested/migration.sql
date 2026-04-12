-- AlterTable: add roomsRequested to Booking (default 1)
ALTER TABLE "Booking" ADD COLUMN "roomsRequested" INTEGER NOT NULL DEFAULT 1;
