"use client"

import { usePathname } from "next/navigation"
import { Fullscreen, KeyRound, MessageSquare, Users, Home, PlusCircle, Video, ClipboardCheck, Calendar, Archive } from "lucide-react"
import { NavItem, NavItemSkeleton } from "./nav-item"

interface NavigationProps {
    username: string;
}

export function Navigation ({ username }: NavigationProps) {

    const pathname = usePathname()

    const routes = [
        {
            label: "Inicio",
            href: `/u/${username}`,
            icon: Home
        },
        {
            label: "Crear evento",
            href: `/u/${username}/create-event`,
            icon: PlusCircle
        },
        {
            label: "En vivo",
            href: `/u/${username}/live`,
            icon: Video
        },
        {
            label: "Participantes",
            href: `/u/${username}/participants`,
            icon: Users
        },
        {
            label: "Asistencia",
            href: `/u/${username}/attendance`,
            icon: ClipboardCheck
        },
        {
            label: "Próximos eventos",
            href: `/u/${username}/upcoming`,
            icon: Calendar
        },
        {
            label: "Repositorio",
            href: `/u/${username}/repository`,
            icon: Archive
        },
        {
            label: "Transmisión",
            href: `/u/${username}`,
            icon: Fullscreen
        },
        {
            label: "Claves",
            href: `/u/${username}/keys`,
            icon: KeyRound
        },
        {
            label: "Chat",
            href: `/u/${username}/chat`,
            icon: MessageSquare
        },
        {
            label: "Comunidad",
            href: `/u/${username}/community`,
            icon: Users
        }
    ]

    if(!username) {
        return (
            <ul className="space-y-2">
                {
                    [...Array(4)].map((_, i) => (
                        <NavItemSkeleton key={i} />
                    ))
                }
            </ul>
        )
    }

    return (
        <ul className="space-y-2 px-2 pt-4 lg:pt-0">
            {
                routes.map((route) => (
                    <NavItem
                     key={route.href}
                     label={route.label}
                     icon={route.icon}
                     href={route.href}
                     isActive={pathname === route.href}
                    />
                ))
            }
        </ul>
    )
}
