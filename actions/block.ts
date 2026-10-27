"use server";

import { getSelf } from "@/lib/auth-service";
import { blockUser, unblockUser } from "@/lib/block-service";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function onBlock(id: string) {
  const self = await getSelf();
  let blockedUser;
  try {
    blockedUser = await blockUser(id);
  } catch {
    // Usuario invitado sin cuenta persistente
  }

  try {
    await db.streamPresence.deleteMany({
      where: { userId: id, roomKey: self.id },
    });
  } catch {
    // No estaba en presencia
  }

  revalidatePath(`/u/${self.username}/community`);
  return blockedUser;
}

export async function onUnBlock(id: string) {
  const self = await getSelf();
  const unblockedUser = await unblockUser(id);
  revalidatePath(`/u/${self.username}/community`);
  return unblockedUser;
}
