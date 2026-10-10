ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "egressId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Event_egressId_key" ON "Event"("egressId");
