import { WifiOff } from "lucide-react";

interface OffLineVideoProps {
    username: string
}

export function OffLineVideo ({username}: OffLineVideoProps) {
    return (
        <div className="h-full flex flex-col space-y-4 justify-center items-center">
            <WifiOff className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
                <span className="text-muted-foreground">
                    {username} está desconectado
                </span>
            </p>
        </div>
    )
}