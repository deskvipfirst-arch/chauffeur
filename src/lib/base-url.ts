export function getBaseUrl(
  request: Request,
  fallback = process.env.NEXT_PUBLIC_BASE_URL || ""
) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`.replace(/\/$/, "");
  }

  const requestOrigin = new URL(request.url).origin.replace(/\/$/, "");

  if (!fallback) {
    return requestOrigin;
  }

  const normalizedFallback = fallback.replace(/\/$/, "");
  const isLocalRequest = /localhost|127\.0\.0\.1/i.test(requestOrigin);
  const isLocalFallback = /localhost|127\.0\.0\.1/i.test(normalizedFallback);

  if (isLocalRequest && !isLocalFallback) {
    return normalizedFallback;
  }

  if (!isLocalRequest) {
    return requestOrigin;
  }

  return normalizedFallback || requestOrigin;
}
