"use client"

import { ArrowLeftFromLine, ArrowRightFromLine } from "lucide-react"

import Hint from "@/components/hint"
import { Button } from "@/components/ui/button"
import { useChatSidebar } from "@/store/use-chat-sidebar"

export function ChatToggle () {
    const { collapsed, onCollapse, onExpand} = useChatSidebar((state) => state)

    let Icon = collapsed ? ArrowLeftFromLine : ArrowRightFromLine

    const onToggle = () => {
        if(collapsed) {
            onExpand()

        } else {
            onCollapse()
        }
    }

    const label = collapsed ? "Expandir" : "Contraer"

    return (
        <Hint asChild label={label} side="left">
            <Button onClick={onToggle} variant="ghost" className="h-auto p-2 hover:bg-white/10 hover:text-primary bg-transparent">
                <Icon className="h-4 w-4" />
            </Button>
        </Hint>
    )
}