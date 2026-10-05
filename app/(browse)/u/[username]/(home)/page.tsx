import { StreamPlayer } from "@/components/stream-player"
import { getUserByUsername } from "@/lib/user-service"
import { getSelf } from "@/lib/auth-service"
import { getGuestHomeData, getPendingEventRequests, getUpcomingEvents } from "@/lib/event-service"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, Video, Archive, ClipboardCheck, Inbox } from "lucide-react"

interface CreatorPageProps {
    params: Promise<{
        username: string
    }>
}

export default async function CreatorPage ({params}: CreatorPageProps) {
    const { username } = await params
    const self = await getSelf()
    const user = await getUserByUsername(username)

    if(!user || user.id !== self.id) {
        throw new Error("Unauthorized")
    }

    if (self.role === "INVITADO") {
        const { upcoming, recentRecordings } = await getGuestHomeData(self.id)
        return (
            <div className="mx-auto max-w-6xl space-y-8 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inicio</h1>
                    <p className="text-muted-foreground">Tus actividades, grabaciones recientes y accesos rápidos.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Button asChild variant="outline"><Link href={`/u/${username}/live`}><Video className="mr-2 h-4 w-4" />En vivo</Link></Button>
                    <Button asChild variant="outline"><Link href={`/u/${username}/asistencias`}><ClipboardCheck className="mr-2 h-4 w-4" />Mis asistencias</Link></Button>
                    <Button asChild variant="outline"><Link href={`/u/${username}/upcoming`}><CalendarDays className="mr-2 h-4 w-4" />Próximos</Link></Button>
                    <Button asChild variant="outline"><Link href={`/u/${username}/repository`}><Archive className="mr-2 h-4 w-4" />Repositorio</Link></Button>
                </div>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold">Eventos próximos a los que fuiste invitado</h2>
                    {upcoming.length === 0 ? (
                        <Card><CardContent className="p-6 text-muted-foreground">No tienes invitaciones próximas.</CardContent></Card>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {upcoming.slice(0, 6).map((event) => (
                                <Card key={event.id}>
                                    <CardHeader><CardTitle className="text-base">{event.title}</CardTitle></CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        {new Intl.DateTimeFormat("es-NI", { dateStyle: "medium", timeStyle: "short" }).format(event.startTime)}
                                        {" · "}{event.location}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold">Contenido pregrabado (última semana)</h2>
                    {recentRecordings.length === 0 ? (
                        <Card><CardContent className="p-6 text-muted-foreground">Sin grabaciones recientes.</CardContent></Card>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {recentRecordings.map((item) => (
                                <Card key={item.id}>
                                    <CardHeader><CardTitle className="text-base">{item.title}</CardTitle></CardHeader>
                                    <CardContent>
                                        <Button asChild size="sm" variant="secondary">
                                            <Link href={`/u/${username}/repository/${item.id}`}>Ver grabación</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        )
    }

    if (self.role === "JEFE_DEPARTAMENTO") {
        const [pending, upcoming] = await Promise.all([
            getPendingEventRequests(),
            getUpcomingEvents(self.id),
        ])
        return (
            <div className="mx-auto max-w-6xl space-y-8 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Panel del Jefe de Departamento</h1>
                    <p className="text-muted-foreground">Resumen de solicitudes y actividades próximas.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" />Solicitudes pendientes</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{pending.length}</p>
                            <Button asChild className="mt-4" variant="outline"><Link href={`/u/${username}/solicitudes`}>Gestionar solicitudes</Link></Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Eventos próximos</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {upcoming.slice(0, 5).map((event) => (
                                <p key={event.id} className="text-sm">{event.title}</p>
                            ))}
                            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos próximos propios.</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    if (self.role === "ADMIN") {
        return (
            <div className="mx-auto max-w-4xl space-y-4 p-6">
                <h1 className="text-3xl font-bold">Administración SD Lab</h1>
                <p className="text-muted-foreground">Usa el menú para acceder al dashboard, usuarios, estadísticas y reportes.</p>
                <Button asChild variant="primary"><Link href={`/u/${username}/dashboard`}>Ir al dashboard</Link></Button>
            </div>
        )
    }

    if (self.role === "DOCENTE") {
        const upcoming = await getUpcomingEvents(self.id)
        return (
            <div className="mx-auto max-w-6xl space-y-8 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inicio</h1>
                    <p className="text-muted-foreground">
                        Tus actividades y accesos rápidos. La señal de la transmisión se ve en En vivo, cuando el evento está al aire.
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Button asChild variant="outline"><Link href={`/u/${username}/create-event`}><Video className="mr-2 h-4 w-4" />Crear evento</Link></Button>
                    <Button asChild variant="outline"><Link href={`/u/${username}/live`}><Video className="mr-2 h-4 w-4" />En vivo</Link></Button>
                    <Button asChild variant="outline"><Link href={`/u/${username}/participants`}><ClipboardCheck className="mr-2 h-4 w-4" />Participantes</Link></Button>
                    <Button asChild variant="outline"><Link href={`/u/${username}/attendance`}><ClipboardCheck className="mr-2 h-4 w-4" />Asistencia</Link></Button>
                </div>
                <section className="space-y-3">
                    <h2 className="text-xl font-semibold">Tus eventos</h2>
                    {upcoming.length === 0 ? (
                        <Card><CardContent className="p-6 text-muted-foreground">No tienes eventos pendientes ni en curso.</CardContent></Card>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {upcoming.slice(0, 6).map((event) => (
                                <Card key={event.id}>
                                    <CardHeader>
                                        <CardTitle className="text-base">{event.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                                        <p>
                                            {new Intl.DateTimeFormat("es-NI", { dateStyle: "medium", timeStyle: "short" }).format(event.startTime)}
                                            {" · "}{event.location}
                                        </p>
                                        {event.status === "LIVE" ? (
                                            <Button asChild size="sm" variant="primary">
                                                <Link href={`/u/${username}/live/${event.id}`}>Ver transmisión</Link>
                                            </Button>
                                        ) : (
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/u/${username}/live`}>Ir a En vivo</Link>
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        )
    }

    if (!user.stream) {
        throw new Error("Unauthorized")
    }

    return (
        <div className="h-full ">
            <StreamPlayer
              user={user}
              stream={user.stream}
              isFollowing={true}
            />
        </div>
    )
}
