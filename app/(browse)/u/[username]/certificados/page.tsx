import { getSelf } from "@/lib/auth-service";
import { getGuestCertificates } from "@/lib/event-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CertificadosPage() {
  const self = await getSelf();
  if (self.role !== "INVITADO" && self.role !== "ADMIN") {
    redirect(`/u/${self.username}`);
  }

  const certificates = await getGuestCertificates(self.id);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis certificados</h1>
        <p className="text-muted-foreground">Certificados otorgados por los docentes.</p>
      </div>
      <div className="space-y-3">
        {certificates.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="text-lg">{item.event.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                {new Intl.DateTimeFormat("es-NI", { dateStyle: "long" }).format(item.event.date)}
                {" · Docente: "}
                {`${item.event.creator.firstName ?? ""} ${item.event.creator.lastName ?? ""}`.trim() ||
                  item.event.creator.username}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href={`/api/certificates/${item.id}`} target="_blank">
                    Visualizar
                  </Link>
                </Button>
                <Button asChild variant="primary">
                  <a href={`/api/certificates/${item.id}`} download>
                    Descargar PDF
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {certificates.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              Aún no tienes certificados emitidos.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
