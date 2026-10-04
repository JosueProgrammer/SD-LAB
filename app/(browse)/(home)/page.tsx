import { redirect } from "next/navigation";
import { getSelf } from "@/lib/auth-service";

export default async function Home() {
  const user = await getSelf().catch(() => null);
  if (!user) {
    redirect("/sign-in");
  }
  if (user.role === "ADMIN") {
    redirect(`/u/${user.username}/dashboard`);
  }
  redirect(`/u/${user.username}`);
}
