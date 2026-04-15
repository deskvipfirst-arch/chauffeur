import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import LayoutWithConditionalHeaderFooter from "@/components/ui/LayoutWithConditionalHeaderFooter";
import { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Premium Chauffeur Services",
  description: "Experience luxury transportation with our professional chauffeur services",
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
