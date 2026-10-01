import { getSelf } from "@/lib/auth-service";
import { getRepositoryRecordings } from "@/lib/event-service";
import { redirect } from "next/navigation";
import { Repository } from "./_components/repository";

export default async function RepositoryPage() {
  const self = await getSelf();
  if (self.role !== "DOCENTE" && self.role !== "ADMIN" && self.role !== "JEFE_DEPARTAMENTO") redirect(`/u/${self.username}/home`);
  return <Repository recordings={await getRepositoryRecordings(self.id)} username={self.username} />;
}
