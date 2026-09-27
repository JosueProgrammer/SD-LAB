"use client"

import { firebaseAuth } from "@/lib/firebase-client"
import { Button } from "../ui/button"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { onFollow, onUnFollow } from "@/actions/follow"
import { useTransition } from "react"
import { toast } from "sonner"
import { Skeleton } from "../ui/skeleton"

interface ActionsProps {
    hostIdentity : string
    isFollowing: boolean
    isHost: boolean
}

export function Actions ({ hostIdentity, isFollowing, isHost }: ActionsProps) {
    
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleFollow = () => {
        startTransition(() => {
            onFollow(hostIdentity)
            .then((data) => toast.success(`Ahora sigues a ${data.following.username}`))
            .catch(() => toast.error("Algo salió mal"))
        })
    }

    const handleUnFollow = () => {
        startTransition(() => {
            onUnFollow(hostIdentity)
            .then((data) => toast.success(`Dejaste de seguir a ${data.following.username}`))
            .catch(() => toast.error("Algo salió mal"))
        })
    }

    const toggleFollow = () => {
        if (!firebaseAuth.currentUser) {
          return    router.push("/sign-in")
        }
        
        if (isHost) return

        if (isFollowing) {
            handleUnFollow()
        } else {
            handleFollow()
        }
    }

    return (
        <Button variant="primary" size="sm" className="w-full lg:w-auto" disabled={isPending || isHost} onClick={toggleFollow}>
            <Heart className={cn("h-4 w-4 mr-2", isFollowing ? "fill-white": "fill-none")} />
            {
                isFollowing ? "Dejar de seguir": "Seguir"
            }
        </Button>
    )
}

export function ActionsSkeleton () {
    return (
        <Skeleton className="h-10 w-full lg:w-24" />
    )
}
