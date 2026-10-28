import { Radio, WifiOff } from "lucide-react";

interface OffLineVideoProps {
  username: string;
  waitingLabel?: string;
}

export function OffLineVideo({ username, waitingLabel }: OffLineVideoProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4">
      {waitingLabel ? (
        <Radio className="h-10 w-10 animate-pulse text-red-500" />
      ) : (
        <WifiOff className="h-10 w-10 text-muted-foreground" />
      )}
      <p className="px-6 text-center text-muted-foreground">
        {waitingLabel || `${username} está desconectado`}
      </p>
    </div>
  );
}
