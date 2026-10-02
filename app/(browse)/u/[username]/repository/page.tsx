import { getSelf } from "@/lib/auth-service";
import { getGuestRepositoryRecordings, getRepositoryRecordings } from "@/lib/event-service";
import { Repository } from "./_components/repository";

export default async function RepositoryPage() {
  const self = await getSelf();
  const recordings =
    self.role === "INVITADO"
      ? await getGuestRepositoryRecordings(self.id)
      : await getRepositoryRecordings(self.id);
  return <Repository recordings={recordings} username={self.username} />;
}
