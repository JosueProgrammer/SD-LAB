"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getNotifications, markNotificationAsRead } from "@/actions/notification";

type Notification = {
  id: string;
  message: string;
  read: boolean;
  createdAt: Date;
};

export const NotificationBell = () => {
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

  const handleRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
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
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="border-b px-4 py-2 text-sm font-semibold">Notificaciones</div>
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
                onClick={() => !n.read && handleRead(n.id)}
              >
                <div className="text-sm">{n.message}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleDateString()}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
