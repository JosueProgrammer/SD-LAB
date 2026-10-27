"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";
import { createStreamCredentials } from "@/lib/mediamtx";

export async function createIntegress() {
  const self = await getSelf();
  const creds = createStreamCredentials("usr");

  await db.stream.update({
    where: { userId: self.id },
    data: {
      streamPath: creds.streamPath,
      serverUrl: creds.serverUrl,
      streamKey: creds.streamKey,
      playbackUrl: creds.playbackUrl,
      isLive: false,
    },
  });

  revalidatePath(`/u/${self.username}/keys`);

  return {
    url: creds.serverUrl,
    streamKey: creds.streamKey,
    playbackUrl: creds.playbackUrl,
    streamPath: creds.streamPath,
  };
}
