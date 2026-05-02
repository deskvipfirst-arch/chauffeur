function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    // Accept host-only env values like "www.example.com" by defaulting to https.
    try {
      const parsed = new URL(`https://${String(url || "").trim()}`);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return "";
    }
  }
}

export function getBaseUrl(request?: Request): string {
  // Priority 1: Environment variable
  let envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
  if (envUrl) {
    if (!/^https?:\/\//i.test(envUrl)) {
      envUrl = `https://${envUrl}`;
    }

    const normalized = normalizeUrl(envUrl);
    if (normalized && (!normalized.includes("localhost") || process.env.NODE_ENV === "production")) {
      return normalized;
    }
  }

  // Priority 2: Request headers (for Vercel/cloud deployments)
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (host) {
      return `${proto}://${host.split(",")[0].trim()}`;
    }
  }

  // Priority 3: Fallback for development
  return process.env.NODE_ENV === "production" ? "https://www.vipgreeters.co.uk" : "http://localhost:3000";
}

export function extractTokensFromInviteUrl(inviteUrl: string): {
  accessToken?: string;
  refreshToken?: string;
  tokenHash?: string;
  type?: string;
  code?: string;
} {
  try {
    const parsed = new URL(inviteUrl);

    // Check hash fragment first (Supabase's preferred format)
    const hash = parsed.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);

    let accessToken = hashParams.get("access_token") || undefined;
    let refreshToken = hashParams.get("refresh_token") || undefined;
    let tokenHash = hashParams.get("token_hash") || undefined;
    let type = hashParams.get("type") || undefined;
    let code = hashParams.get("code") || undefined;

    // Fallback to query params
    if (!accessToken && !tokenHash) {
      accessToken = parsed.searchParams.get("access_token") || undefined;
      refreshToken = parsed.searchParams.get("refresh_token") || undefined;
      tokenHash = parsed.searchParams.get("token_hash") || undefined;
      type = parsed.searchParams.get("type") || undefined;
      code = parsed.searchParams.get("code") || undefined;
    }

    return { accessToken, refreshToken, tokenHash, type, code };
  } catch {
    return {};
  }
}

export function buildInviteCallbackUrl(
  baseUrl: string,
  tokens: {
    accessToken?: string;
    refreshToken?: string;
    tokenHash?: string;
    type?: string;
    code?: string;
  },
  nextPath?: string
): string {
  const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";

  if (tokens.code) {
    return `${baseUrl}/auth/callback${nextParam ? `${nextParam}&` : "?"}code=${encodeURIComponent(tokens.code)}`;
  }

  if (tokens.accessToken && tokens.refreshToken) {
    return `${baseUrl}/auth/callback${nextParam}#access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}&type=invite`;
  }

  if (tokens.tokenHash && tokens.type) {
    return `${baseUrl}/auth/callback${nextParam ? `${nextParam}&` : "?"}token_hash=${tokens.tokenHash}&type=${tokens.type}`;
  }

  // Fallback - return just the callback URL
  return `${baseUrl}/auth/callback${nextParam}`;
}

export function rewriteInviteVerifyRedirect(actionLink: string, baseUrl: string, nextPath?: string): string {
  try {
    const parsed = new URL(actionLink);
    // Build a proper callback URL with the next param
    const callbackUrl = `${baseUrl}/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
    parsed.searchParams.set("redirect_to", callbackUrl);
    return parsed.toString();
  } catch {
    return actionLink;
  }
}