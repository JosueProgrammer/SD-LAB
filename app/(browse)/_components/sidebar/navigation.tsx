"use client"

import { usePathname } from "next/navigation"
import {
  Archive,
  Award,
  BarChart3,
  Calendar,
  ClipboardCheck,
  FileText,
  Home,
  LayoutDashboard,
  LayoutList,
  PlusCircle,
  Users,
  UserPlus,
  Video,
  Inbox,
} from "lucide-react"
import { Role } from "@prisma/client"
import { NavItem, NavItemSkeleton } from "./nav-item"

interface NavigationProps {
  username: string
  role: Role
}

type RouteItem = {
  label: string
  href: string
  icon: typeof Home
}

function routesForRole(username: string, role: Role): RouteItem[] {
  const base = `/u/${username}`

  if (role === "INVITADO") {
    return [
      { label: "Inicio", href: base, icon: Home },
      { label: "En vivo", href: `${base}/live`, icon: Video },
      { label: "Mis asistencias", href: `${base}/asistencias`, icon: ClipboardCheck },
      { label: "Próximos eventos", href: `${base}/upcoming`, icon: Calendar },
      { label: "Repositorio", href: `${base}/repository`, icon: Archive },
      { label: "Mis certificados", href: `${base}/certificados`, icon: Award },
    ]
  }

  if (role === "JEFE_DEPARTAMENTO") {
    return [
      { label: "Inicio", href: base, icon: Home },
      { label: "Solicitudes", href: `${base}/solicitudes`, icon: Inbox },
      { label: "Eventos", href: `${base}/eventos`, icon: LayoutList },
      { label: "Crear evento", href: `${base}/create-event`, icon: PlusCircle },
      { label: "En vivo", href: `${base}/live`, icon: Video },
      { label: "Calendario", href: `${base}/calendario`, icon: Calendar },
      { label: "Docentes", href: `${base}/docentes`, icon: Users },
      { label: "Invitados", href: `${base}/invitados`, icon: UserPlus },
      { label: "Asistencia", href: `${base}/attendance`, icon: ClipboardCheck },
    ]
  }

  if (role === "ADMIN") {
    return [
      { label: "Dashboard", href: `${base}/dashboard`, icon: LayoutDashboard },
      { label: "Usuarios", href: `${base}/usuarios`, icon: Users },
      { label: "Estadísticas", href: `${base}/estadisticas`, icon: BarChart3 },
      { label: "Reportes", href: `${base}/reportes`, icon: FileText },
      { label: "Calendario", href: `${base}/calendario`, icon: Calendar },
      { label: "Solicitudes", href: `${base}/solicitudes`, icon: Inbox },
    ]
  }

  return [
    { label: "Inicio", href: base, icon: Home },
    { label: "Crear evento", href: `${base}/create-event`, icon: PlusCircle },
    { label: "En vivo", href: `${base}/live`, icon: Video },
    { label: "Participantes", href: `${base}/participants`, icon: Users },
    { label: "Asistencia", href: `${base}/attendance`, icon: ClipboardCheck },
    { label: "Próximos eventos", href: `${base}/upcoming`, icon: Calendar },
    { label: "Repositorio", href: `${base}/repository`, icon: Archive },
  ]
}

export function Navigation({ username, role }: NavigationProps) {
  const pathname = usePathname()
  const routes = routesForRole(username, role)

  if (!username) {
    return (
      <ul className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <NavItemSkeleton key={i} />
        ))}
      </ul>
    )
  }

  return (
    <ul className="space-y-2 px-2 pt-4 lg:pt-0">
      {routes.map((route) => (
        <NavItem
          key={route.href + route.label}
          label={route.label}
          icon={route.icon}
          href={route.href}
          isActive={pathname === route.href}
        />
      ))}
    </ul>
  )
}
