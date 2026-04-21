// components/mobile-nav.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from 'lucide-react'
import { Button } from "@/components/ui/button"

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="container h-full flex flex-col">
            <div className="flex h-16 items-center justify-between">
              <Link href="/" className="text-2xl font-bold" onClick={() => setIsOpen(false)}>
                VIP Greeters
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close Menu"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="flex flex-col space-y-6 py-8">
              <Link
                href="/"
                className="text-lg font-medium hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/about"
                className="text-lg font-medium hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                href="/services"
                className="text-lg font-medium hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Services
              </Link>
              <Link
                href="/contact"
                className="text-lg font-medium hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
              <Button asChild className="w-full">
                <Link href="/#estimate" onClick={() => setIsOpen(false)}>Get a Quote</Link>
              </Button>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}