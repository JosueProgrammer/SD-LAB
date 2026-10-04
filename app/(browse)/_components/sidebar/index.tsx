import { getFollowedUsers } from "@/lib/follow-service";
import { Toggle, ToogleSkeleton } from "./toggle";
import Wrapper from "./wrapper";
import { Following, FollowingSkeleton } from "./following";
import { getSelf } from "@/lib/auth-service";
import { Navigation } from "./navigation";

export default async function Sidebar() {
  const following = await getFollowedUsers();
  const user = await getSelf().catch(() => null);

  return (
    <Wrapper>
      <Toggle />
      <div className="space-y-4 py-4 lg:pt-0">
        {user && <Navigation username={user.username} role={user.role} />}
        {user?.role !== "INVITADO" && user?.role !== "ADMIN" && (
          <Following data={following} />
        )}
      </div>
    </Wrapper>
  );
}

export function SidebarSkeleton() {
  return (
    <aside className="fixed left-0 z-50 flex h-full w-[70px] flex-col border-r border-[#2D2E35] bg-background lg:w-60">
      <ToogleSkeleton />
      <FollowingSkeleton />
    </aside>
  );
}
