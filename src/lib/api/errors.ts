import { NextResponse } from "next/server";

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function getErrorStatus(error: unknown) {
  const message = getErrorMessage(error, "Unexpected error");

  if (message === "Missing authorization token" || message === "Invalid authorization token") {
    return 401;
  }

  if (message === "Forbidden") {
    return 403;
  }

  return 500;
}

export function apiErrorResponse(error: unknown, fallbackMessage: string) {
  return NextResponse.json(
    {
      error: getErrorMessage(error, fallbackMessage),
    },
    {
      status: getErrorStatus(error),
    }
  );
}
