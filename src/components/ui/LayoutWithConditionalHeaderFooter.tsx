"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { ReactNode } from "react";

export default function LayoutWithConditionalHeaderFooter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldHideHeaderFooter =
    pathname.startsWith("/administrator/dashboard") ||
    pathname.startsWith("/user/signin") ||
    pathname.startsWith("/user/signup");

  return (
    <>
      {!shouldHideHeaderFooter && <Header />}

      {children}

      {!shouldHideHeaderFooter && <Footer />}
    </>
  );
}