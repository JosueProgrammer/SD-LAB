import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SD LAB",
  description: "Transmite y aprende con la plataforma educativa SD LAB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" style={{ colorScheme: "dark" }}>
      <body>
        <Toaster position="bottom-center" theme="dark" />
        {children}
      </body>
    </html>
  );
}
