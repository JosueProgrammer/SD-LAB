-- Stream: LiveKit ingressId → MediaMTX streamPath + playbackUrl
ALTER TABLE "Stream" RENAME COLUMN "ingressId" TO "streamPath";
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "playbackUrl" TEXT;
DROP INDEX IF EXISTS "Stream_ingressId_key";
DROP INDEX IF EXISTS "Stream_ingressId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Stream_streamPath_key" ON "Stream"("streamPath");
CREATE INDEX IF NOT EXISTS "Stream_streamPath_idx" ON "Stream"("streamPath");

-- Event: same rename + playbackUrl
ALTER TABLE "Event" RENAME COLUMN "ingressId" TO "streamPath";
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "playbackUrl" TEXT;
DROP INDEX IF EXISTS "Event_ingressId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Event_streamPath_key" ON "Event"("streamPath");

-- Chat + presence (app-owned, replaces LiveKit data channel)
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "roomKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatMessage_roomKey_createdAt_idx" ON "ChatMessage"("roomKey", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId");

CREATE TABLE IF NOT EXISTS "StreamPresence" (
    "id" TEXT NOT NULL,
    "roomKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreamPresence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StreamPresence_roomKey_userId_key" ON "StreamPresence"("roomKey", "userId");
CREATE INDEX IF NOT EXISTS "StreamPresence_roomKey_lastSeenAt_idx" ON "StreamPresence"("roomKey", "lastSeenAt");
