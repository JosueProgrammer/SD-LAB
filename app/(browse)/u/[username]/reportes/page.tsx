import { requireRole } from "@/lib/auth-service";
import { ReportsPanel } from "./_components/reports-panel";

export default async function ReportesPage() {
  await requireRole("ADMIN");
  return <ReportsPanel />;
}
