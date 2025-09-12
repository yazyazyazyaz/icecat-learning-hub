import "./globals.css"
import { Roboto_Mono } from "next/font/google"
import AppShell from "@/components/AppShell"
import Providers from "@/components/Providers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const mono = Roboto_Mono({ subsets: ["latin"], weight: ["300","400","500","700"], variable: '--font-mono' })

export const metadata = {
  title: "Icecat Learning Hub",
  description: "Training and quizzes for Icecat",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en">
      <body className={`${mono.className} ${mono.variable} min-h-screen bg-[hsl(var(--bg))] text-[hsl(var(--fg))]`}>
        <Providers session={session}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
