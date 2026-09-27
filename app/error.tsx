"use client"

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ErrorPage () {
    return (
        <div className="h-full flex flex-col space-y-4 items-center justify-center text-muted-foreground">
            <h1 className="text-4xl">Error</h1>
            <p>Algo salió mal</p>
            <Button variant="secondary" asChild>
                <Link href="/">
                    Volver al inicio
                </Link>
            </Button>
        </div>
    )
}