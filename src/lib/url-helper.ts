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

function isLocalUrl(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

function isSupabaseHost(value: string) {
  try {
    return /\.supabase\.co$/i.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function getAppBaseUrl(request?: Request): string {
  const envBase = normalizeAbsoluteUrl(process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "");

  if (envBase && !(process.env.NODE_ENV === "production" && isLocalUrl(envBase))) {
    if (!isSupabaseHost(envBase)) {
      return envBase;
    }
  }

  if (request) {
    const forwardedHostHeader = request.headers.get("x-forwarded-host") || "";
    const forwardedProtoHeader = request.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = forwardedHostHeader.split(",")[0]?.trim();

    if (forwardedHost) {
      const forwarded = normalizeAbsoluteUrl(`${forwardedProtoHeader}://${forwardedHost}`);
      if (forwarded && !isSupabaseHost(forwarded)) {
        return forwarded;
      }
    }

    const origin = normalizeAbsoluteUrl(new URL(request.url).origin);
    if (origin && !isSupabaseHost(origin)) {
      return origin;
    }
  }

  return "http://localhost:3000";
}

export function normalizeInviteUrl(inviteUrl: string, baseUrl: string, nextPath: string): string {
  const safeBase = normalizeAbsoluteUrl(baseUrl) || "http://localhost:3000";
  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  const callbackBase = `${safeBase}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  try {
    const parsed = new URL(inviteUrl);
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : "";
    const hashParams = new URLSearchParams(hash);

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      return `${callbackBase}#${hash}`;
    }

    const hashTokenHash = hashParams.get("token_hash");
    const hashType = hashParams.get("type");
    if (hashTokenHash && hashType) {
      return `${callbackBase}&token_hash=${encodeURIComponent(hashTokenHash)}&type=${encodeURIComponent(hashType)}`;
    }

    const tokenHash = parsed.searchParams.get("token_hash");
    const type = parsed.searchParams.get("type");
    if (tokenHash && type) {
      return `${callbackBase}&token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;
    }

    // Unknown shape: fail-safe to app callback rather than leaking Supabase-hosted malformed path.
    return callbackBase;
  } catch {
    return callbackBase;
  }
}
