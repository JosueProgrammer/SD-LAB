import { ToogleSkeleton } from "@/app/(browse)/_components/sidebar/toggle";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading () {
    return (
        <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-[200px]" />
            <div className="space-y-4">
                <ToogleSkeleton />
                <ToogleSkeleton />
                <ToogleSkeleton />
            </div>
        </div>
    )
}