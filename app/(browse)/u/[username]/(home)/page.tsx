import { StreamPlayer } from "@/components/stream-player"
import { getUserByUsername } from "@/lib/user-service"
import { getSelf } from "@/lib/auth-service"

interface CreatorPageProps {
    params: {
        username: string
    }
}


export default async function CreatorPage ({params}: CreatorPageProps) {
    
    const self = await getSelf()
    const user = await getUserByUsername(params.username)

    if(!user || user.id !== self?.id || !user.stream) {
        throw new Error("Unauthorized")
    }
    return (

        <div className="h-full ">
            <StreamPlayer
              user={user}
              stream={user.stream}
              isFollowing={true}
            />
        </div>
    )
}