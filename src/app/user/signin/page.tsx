import { Suspense } from "react";
import SigninClient from "./SigninClient";
import type { Metadata } from "next";

// Define metadata
export const metadata: Metadata = {
  title: "Sign In",
};

// Define the props type for the page with unknown to satisfy PageProps constraint
type SigninPageProps = {
  searchParams: Promise<unknown> | undefined;
};

export default async function SigninPage({ searchParams }: SigninPageProps) {
  // Await searchParams and assert the expected shape
  const resolvedSearchParams = await (searchParams as Promise<{ [key: string]: string | string[] | undefined }>);
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SigninClient searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600" />
    </div>
  );
}