import { StreamPlayer } from "@/components/stream-player"
import { isBlockedByUser } from "@/lib/block-service"
import { isFollowingUser } from "@/lib/follow-service"
import { getUserByUsername } from "@/lib/user-service"
import { notFound } from "next/navigation"


interface UserPageProps {
    params: Promise<{
        username: string
    }>
}

export default async function UserPage ({params}: UserPageProps) {
    const resolvedParams = await params;
    const user = await getUserByUsername(resolvedParams.username)

    if (!user || !user.stream) {
        notFound()
    }

    const isFollowing = await isFollowingUser(user.id)
    const isBlocked = await isBlockedByUser(user.id)

    if (isBlocked) {
        notFound()
    }

    return (
        <StreamPlayer user={user} stream={user.stream} isFollowing={isFollowing} />
    )
}