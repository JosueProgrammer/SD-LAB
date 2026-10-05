import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'SD LAB',
  description: 'Transmite y aprende con la plataforma educativa SD LAB',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          storageKey="sd-lab-theme"
        >
          <Toaster position="bottom-center" theme="light" />
          {children}
        </ThemeProvider>
        </body>
    </html>
  )
}
