import { Suspense } from "react";
import type { Metadata } from "next";
import SigninClient from "@/app/user/signin/SigninClient";

export const metadata: Metadata = {
  title: "Greeter Sign In",
};

type GreeterSigninPageProps = {
  searchParams: Promise<unknown> | undefined;
};

export default async function GreeterSigninPage({ searchParams }: GreeterSigninPageProps) {
  const resolvedSearchParams = await (searchParams as Promise<{ [key: string]: string | string[] | undefined }>);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SigninClient searchParams={resolvedSearchParams} portal="greeter" />
    </Suspense>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-brand-600" />
    </div>
  );
}
