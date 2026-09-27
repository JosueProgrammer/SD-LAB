import { getFollowedUsers } from "@/lib/follow-service";
import Recommended, { RecommendedSkeleton } from "./recommended";
import { Toggle, ToogleSkeleton } from "./toggle";
import Wrapper from "./wrapper";
import { getRecommended } from "@/lib/recommended-service"
import { Following, FollowingSkeleton } from "./following";
import { getSelf } from "@/lib/auth-service";
import { Navigation } from "./navigation";


export default async function Sidebar() {

    const recommended = await getRecommended()
    const following = await getFollowedUsers()
    const user = await getSelf().catch(() => null)

    return (
        <Wrapper>
            <Toggle />
            <div className="space-y-4 py-4 lg:pt-0">
                {user && <Navigation username={user.username} />}
                <Following data={following} />
                <Recommended data={recommended} />
            </div>
        </Wrapper>
    )
}

export function SidebarSkeleton() {
    return (
        <aside className="fixed h-full z-50 bg-background border-r border-[#2D2E35] left-0 flex flex-col w-[70px] lg:w-60">
            <ToogleSkeleton />
            <FollowingSkeleton />
            <RecommendedSkeleton />
        </aside>
    )
}