import { Button } from "@/components/ui/button";
import { getSelf } from "@/lib/auth-service";
import { AuthUserMenu } from "@/components/auth-user-menu";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default async function Actions() {
  const user = await getSelf().catch(() => null);

  return (
    <div className="ml-4 flex items-center justify-end gap-x-2 lg:ml-0">
      {!user && (
        <Button size="sm" variant="primary" asChild>
          <Link href="/sign-in">Iniciar sesión</Link>
        </Button>
      )}
      {!!user && (
        <div className="flex items-center gap-x-4">
          <NotificationBell username={user.username} role={user.role} />
          <AuthUserMenu />
        </div>
      )}
    </div>
  );
}
