function normalizeAbsoluteUrl(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function isLocalHostUrl(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

export function getBaseUrl(
  request: Request,
  fallback = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || ""
) {
  const requestOrigin = new URL(request.url).origin.replace(/\/$/, "");
  const forwardedHostHeader = request.headers.get("x-forwarded-host") || "";
  const forwardedProtoHeader = request.headers.get("x-forwarded-proto") || "https";
  const forwardedHost = forwardedHostHeader.split(",")[0]?.trim();
  const forwardedOrigin = forwardedHost
    ? normalizeAbsoluteUrl(`${forwardedProtoHeader}://${forwardedHost}`)
    : "";
  const configuredBase = normalizeAbsoluteUrl(fallback);
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (configuredBase && !isLocalHostUrl(configuredBase)) {
      return configuredBase;
    }

    if (forwardedOrigin && !isLocalHostUrl(forwardedOrigin)) {
      return forwardedOrigin;
    }

    return requestOrigin;
  }

  if (forwardedOrigin) {
    return forwardedOrigin;
  }

  if (configuredBase) {
    return configuredBase;
  }

  return requestOrigin;
}
