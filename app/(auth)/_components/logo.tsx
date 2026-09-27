import Image from "next/image";
import { cn } from "@/lib/utils";

export  function Logo () {
    return (
        <div className="flex flex-col items-center gap-y-4">
            <div className="bg-white rounded-full p-1">
                <Image
                 src='/SD-LAB.png'
                 alt="SD LAB"
                 height="80"
                 width="80"
                />
            </div>
            <div className={cn("flex flex-col items-center")}>
                <p className="text-xl font-semibold">SD LAB</p>
                <p className="text-sm text-muted-foreground">Continúa para transmitir</p>
            </div>
        </div>
    )
}
