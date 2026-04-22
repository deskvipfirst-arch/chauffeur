import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import LayoutWithConditionalHeaderFooter from "@/components/ui/LayoutWithConditionalHeaderFooter";
import { ReactNode } from "react";
import { APP_TITLE, APP_DESCRIPTION } from "@/lib/globalConfig";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: APP_TITLE,
  description: APP_DESCRIPTION,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <meta charSet="UTF-8" />
      <body className={inter.className}>
        <LayoutWithConditionalHeaderFooter>
          {children}
        </LayoutWithConditionalHeaderFooter>
      </body>
    </html>
  )
}
