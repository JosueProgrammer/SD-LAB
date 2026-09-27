"use client"

import { Switch } from "@/components/ui/switch"
import { useTransition } from "react"
import { updateStream } from "@/actions/stream"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

type FieldTypes = "isChatEnabled" | "isChatDelayed" | "isChatFollowersOnly"

interface ToogleCardProps {
    label: string
    value: boolean
    field: FieldTypes
}

export function ToogleCard ({label, value, field} : ToogleCardProps) {

    const [isPending, startTransition] = useTransition()

    const onChange = async () => {
        startTransition(() => {
            updateStream({ [field]: !value})
            .then(() => toast.success("Chat settings updated!"))
            .catch(() => toast.error("Something went wrong"))
        })
    }

    return (
        <div className="rounded-xl bg-muted p-6">
            <div className="flex items-center justify-between">
                <p className="font-semibold shrink-0">
                    {label}
                </p>
                <div className="space-y-2">
                    <Switch disabled={isPending} onCheckedChange={onChange} checked={value} >
                        {value ? "on": "off"}
                    </Switch>
                </div>
            </div>
        </div>
    )
}

export function ToogleCardSkeleton () {
    return (
        <Skeleton className="rounded-xl p-10 w-full" />
    )
}