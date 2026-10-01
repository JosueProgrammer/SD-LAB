import { getSelf } from "@/lib/auth-service";
import { getRepositoryRecordings } from "@/lib/event-service";
import { Repository } from "./_components/repository";

export default async function RepositoryPage() {
  const self = await getSelf();
  return <Repository recordings={await getRepositoryRecordings(self.id)} username={self.username} />;
}
