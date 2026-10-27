"use server";

import { v4 } from "uuid";
import { getSelf } from "@/lib/auth-service";
import { getUserById } from "@/lib/user-service";
import { isBlockedByUser } from "@/lib/block-service";

export type ViewerIdentity = {
  identity: string;
  name: string;
  isHost: boolean;
};

/** Identidad de viewer para salas OBS/HLS. */
export async function createViewerToken(hostIdentity: string): Promise<ViewerIdentity> {
  let self: { id: string; username: string };

  try {
    self = await getSelf();
  } catch {
    self = {
      id: v4(),
      username: `gest#${Math.floor(Math.random() * 1000)}`,
    };
  }

  const host = await getUserById(hostIdentity);
  if (!host) throw new Error("User not found");

  const isBlocked = await isBlockedByUser(host.id);
  if (isBlocked) throw new Error("User is blocked");

  const isHost = self.id === host.id;

  return {
    identity: isHost ? `host-${self.id}` : self.id,
    name: self.username,
    isHost,
  };
}
