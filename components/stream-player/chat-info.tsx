import { useMemo } from "react";
import { Info } from "lucide-react";
import Hint from "../hint";

interface ChatInfoProps {
    isDelayed: boolean
    isFollowersOnly: boolean
}

export function ChatInfo ({ isDelayed, isFollowersOnly }: ChatInfoProps) {
    
    const hint = useMemo(() => {
        if (isFollowersOnly && !isDelayed) {
            return "Solo los seguidores pueden chatear"
        }
        if (isDelayed && !isFollowersOnly) {
            return "Los mensajes tienen un retraso de 3 segundos"
        }

        if(isDelayed && isFollowersOnly) {
            return "Solo seguidores pueden chatear. Los mensajes tienen un retraso de 3 segundos"
        }

        return ""
    }, [isDelayed, isFollowersOnly])

    const label = useMemo(() => {
        if (isFollowersOnly && !isDelayed) {
            return "Solo seguidores"
        }
        if (isDelayed && !isFollowersOnly) {
            return "Modo lento"
        }

        if(isDelayed && isFollowersOnly) {
            return "Solo seguidores y modo lento"
        }

        return ""
    }, [isDelayed, isFollowersOnly])

    if (!isDelayed && !isFollowersOnly) {
        return null
    }

    return (
        <div className="p-2 text-muted-foreground bg-white/5 border border-white/10 w-full rounded-t-md flex items-center gap-x-2">
            <Hint label={hint}>
                <Info className="h-4 w-4" />
            </Hint>
            <p className="text-xs font-semibold">
                {label}
            </p>
        </div>
    )
}