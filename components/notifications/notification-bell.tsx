"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2 } from "lucide-react";
import { Role } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  deleteAllNotifications,
  getNotifications,
  markNotificationAsRead,
} from "@/actions/notification";

type Notification = {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
};

function pathForNotification(type: string, username: string, role: Role) {
  const base = `/u/${username}`;
  switch (type) {
    case "EVENT_CREATED":
      return role === "JEFE_DEPARTAMENTO" || role === "ADMIN"
        ? `${base}/solicitudes`
        : `${base}/create-event`;
    case "REQUEST_STATUS":
    case "EVENT_UPDATED":
      return role === "JEFE_DEPARTAMENTO" || role === "ADMIN"
        ? `${base}/eventos`
        : `${base}/upcoming`;
    case "INVITATION":
    case "EVENT_UPCOMING":
    case "EVENT_REMINDER_10":
    case "EVENT_REMINDER_5":
      return role === "INVITADO" ? `${base}/asistencias` : `${base}/upcoming`;
    case "EVENT_STARTING":
    case "EVENT_LIVE":
      return `${base}/live`;
    case "PARTICIPANT_RESPONSE":
      return `${base}/participants`;
    default: {
      const msg = type.toLowerCase();
      if (msg.includes("solicitud") || type.includes("REQUEST")) return `${base}/solicitudes`;
      if (msg.includes("asist")) return `${base}/asistencias`;
      if (msg.includes("live") || msg.includes("vivo")) return `${base}/live`;
      return `${base}/upcoming`;
    }
  }
}

export const NotificationBell = ({
  username,
  role,
}: {
  username: string;
  role: Role;
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    let active = true;

    const fetchNotifications = async () => {
      try {
        const data = await getNotifications();
        if (active) setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleDeleteAll = async () => {
    if (!window.confirm("¿Eliminar todas las notificaciones?")) return;
    try {
      await deleteAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRead = async (id: string) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error(error);
    }
    router.push(pathForNotification(notification.type, username, role));
  };

  const handleClearAll = async () => {
    try {
      await deleteAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-semibold">Notificaciones</span>
          {notifications.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Eliminar todas las notificaciones"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void handleDeleteAll();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No tienes notificaciones nuevas
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`flex cursor-pointer flex-col items-start gap-1 border-b p-4 last:border-0 ${!n.read ? "bg-muted/50" : ""}`}
                onClick={() => void handleOpen(n)}
              >
                <div className="text-sm">{n.message}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleDateString("es-NI")}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
